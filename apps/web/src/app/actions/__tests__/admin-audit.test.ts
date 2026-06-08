import { getAuditLog, logAdminAction } from '../admin-audit'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const adminUser = { id: 'admin-1' }

function buildSupabase(tableQueues: Record<string, unknown[]>, user: typeof adminUser | null = adminUser) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn((table: string) => {
      const query = tableQueues[table]?.shift()
      if (!query) throw new Error(`Unexpected admin-audit table: ${table}`)
      return query
    }),
  }
}

function roleQuery(role: string | null) {
  const single = jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

function auditLogQuery(result: { data: unknown[] | null; error: unknown }) {
  const limit = jest.fn().mockResolvedValue(result)
  const query: Record<string, jest.Mock> = {
    eq: jest.fn(() => query),
    gte: jest.fn(() => query),
    lte: jest.fn(() => query),
    limit,
  }
  const order = jest.fn(() => query)
  const select = jest.fn(() => ({ order }))
  return { select, order, query, limit }
}

function adminProfilesQuery(data: unknown[] | null) {
  const inFilter = jest.fn().mockResolvedValue({ data, error: null })
  const select = jest.fn().mockReturnValue({ in: inFilter })
  return { select, inFilter }
}

describe('admin audit actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReset()
  })

  it('registra acción admin con defaults derivados del adminId', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({ admin_audit_log: [{ insert }] }))

    await logAdminAction('admin-1', 'table_deleted', 'table', 'table-1', { reason: 'cleanup' })

    expect(insert).toHaveBeenCalledWith({
      admin_id: 'admin-1',
      action: 'table_deleted',
      target_type: 'table',
      target_id: 'table-1',
      details: { reason: 'cleanup' },
      context: null,
      before_state: null,
      after_state: null,
      actor_kind: 'admin',
      actor_label: null,
      ip_address: null,
    })
  })

  it('registra acción de sistema con opciones de contexto y estados', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({ admin_audit_log: [{ insert }] }))

    await logAdminAction(null, 'stale_games_cleanup', 'system', 'games', {}, {
      context: 'maintenance',
      before_state: { stale: 3 },
      after_state: { stale: 0 },
      actor_label: 'cron',
      ip_address: '127.0.0.1',
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      admin_id: null,
      actor_kind: 'system',
      actor_label: 'cron',
      context: 'maintenance',
      before_state: { stale: 3 },
      after_state: { stale: 0 },
      ip_address: '127.0.0.1',
    }))
  })

  it('requiere sesión y rol admin para leer auditoría', async () => {
    const unauthSupabase = buildSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(getAuditLog()).rejects.toThrow('No autenticado')
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    ;(createClient as jest.Mock).mockResolvedValueOnce(buildSupabase({ profiles: [roleQuery('player')] }))
    await expect(getAuditLog()).rejects.toThrow('Acceso denegado')
  })

  it('lee auditoría con límite numérico y resuelve nombres de admins únicos', async () => {
    const role = roleQuery('admin')
    const auditQuery = auditLogQuery({
      data: [
        { id: 'audit-1', admin_id: 'admin-1', action: 'a', created_at: '2026-01-01' },
        { id: 'audit-2', admin_id: 'admin-1', action: 'b', created_at: '2026-01-02' },
        { id: 'audit-3', admin_id: null, action: 'system', created_at: '2026-01-03' },
      ],
      error: null,
    })
    const admins = adminProfilesQuery([{ id: 'admin-1', full_name: 'Admin Mesa', username: 'adminmesa' }])
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      profiles: [role, admins],
      admin_audit_log: [auditQuery],
    }))

    await expect(getAuditLog(25)).resolves.toEqual([
      { id: 'audit-1', admin_id: 'admin-1', action: 'a', created_at: '2026-01-01', admin: { display_name: 'Admin Mesa' } },
      { id: 'audit-2', admin_id: 'admin-1', action: 'b', created_at: '2026-01-02', admin: { display_name: 'Admin Mesa' } },
      { id: 'audit-3', admin_id: null, action: 'system', created_at: '2026-01-03', admin: null },
    ])
    expect(auditQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(auditQuery.limit).toHaveBeenCalledWith(25)
    expect(admins.inFilter).toHaveBeenCalledWith('id', ['admin-1'])
  })

  it('aplica filtros, usa fallback de username/Admin y propaga error de consulta', async () => {
    const role = roleQuery('admin')
    const auditQuery = auditLogQuery({
      data: [
        { id: 'audit-1', admin_id: 'admin-2', action: 'global_search', created_at: '2026-02-01' },
        { id: 'audit-2', admin_id: 'admin-3', action: 'global_search', created_at: '2026-02-02' },
      ],
      error: null,
    })
    const admins = adminProfilesQuery([
      { id: 'admin-2', full_name: null, username: 'operador' },
      { id: 'admin-3', full_name: null, username: null },
    ])
    ;(createClient as jest.Mock).mockResolvedValueOnce(buildSupabase({ profiles: [role, admins], admin_audit_log: [auditQuery] }))

    await expect(getAuditLog({ action: 'global_search', context: 'search', adminId: 'admin-2', dateFrom: '2026-02-01', dateTo: '2026-02-28' })).resolves.toEqual([
      { id: 'audit-1', admin_id: 'admin-2', action: 'global_search', created_at: '2026-02-01', admin: { display_name: 'operador' } },
      { id: 'audit-2', admin_id: 'admin-3', action: 'global_search', created_at: '2026-02-02', admin: { display_name: 'Admin' } },
    ])
    expect(auditQuery.query.eq).toHaveBeenCalledWith('action', 'global_search')
    expect(auditQuery.query.eq).toHaveBeenCalledWith('context', 'search')
    expect(auditQuery.query.eq).toHaveBeenCalledWith('admin_id', 'admin-2')
    expect(auditQuery.query.gte).toHaveBeenCalledWith('created_at', '2026-02-01')
    expect(auditQuery.query.lte).toHaveBeenCalledWith('created_at', '2026-02-28')
    expect(auditQuery.limit).toHaveBeenCalledWith(200)

    const errorRole = roleQuery('admin')
    const auditError = new Error('audit failed')
    const auditErrorQuery = auditLogQuery({ data: null, error: auditError })
    ;(createClient as jest.Mock).mockResolvedValueOnce(buildSupabase({ profiles: [errorRole], admin_audit_log: [auditErrorQuery] }))

    await expect(getAuditLog()).rejects.toThrow('audit failed')
  })

  it('devuelve lista vacía sin consultar perfiles cuando no hay entradas', async () => {
    const role = roleQuery('admin')
    const auditQuery = auditLogQuery({ data: null, error: null })
    const supabase = buildSupabase({ profiles: [role], admin_audit_log: [auditQuery] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAuditLog()).resolves.toEqual([])
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })
})
