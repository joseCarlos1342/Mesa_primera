import {
  checkAccountEligibility,
  checkTableAccess,
  createSanction,
  getActiveSanctions,
  revokeSanction,
} from '../admin-sanctions'
import { logAdminAction } from '../admin-audit'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('../admin-audit', () => ({
  logAdminAction: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const adminUser = { id: 'admin-1' }

function roleQuery(role: string | null) {
  const single = jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

function buildSupabase({
  user = adminUser,
  userError = null,
  tableQueues = {},
  rpc = jest.fn(),
}: {
  user?: typeof adminUser | null
  userError?: Error | null
  tableQueues?: Record<string, unknown[]>
  rpc?: jest.Mock
}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: userError }),
    },
    from: jest.fn((table: string) => {
      const query = tableQueues[table]?.shift()
      if (!query) throw new Error(`Unexpected sanctions table: ${table}`)
      return query
    }),
    rpc,
  }
}

describe('admin sanctions actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReset()
    ;(logAdminAction as jest.Mock).mockResolvedValue(undefined)
  })

  it('rechaza crear sanción sin motivo antes de consultar Supabase', async () => {
    await expect(createSanction({ userId: 'user-1', sanctionType: 'game_suspension', reason: '   ' })).rejects.toThrow('El motivo es obligatorio')

    expect(createClient).not.toHaveBeenCalled()
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('exige sesión y rol admin para acciones administrativas', async () => {
    ;(createClient as jest.Mock).mockResolvedValueOnce(buildSupabase({ user: null }))

    await expect(getActiveSanctions('user-1')).rejects.toThrow('No autenticado')

    ;(createClient as jest.Mock).mockResolvedValueOnce(buildSupabase({
      tableQueues: { profiles: [roleQuery('player')] },
    }))

    await expect(revokeSanction('sanction-1')).rejects.toThrow('Acceso denegado')
  })

  it('crea sanción trimmeada con defaults, auditoría y revalidación', async () => {
    const sanction = { id: 'sanction-1', user_id: 'user-1', sanction_type: 'game_suspension' }
    const single = jest.fn().mockResolvedValue({ data: sanction, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const insert = jest.fn().mockReturnValue({ select })
    const supabase = buildSupabase({
      tableQueues: {
        profiles: [roleQuery('admin')],
        user_sanctions: [{ insert }],
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(createSanction({
      userId: 'user-1',
      sanctionType: 'game_suspension',
      reason: '  Abandono reiterado  ',
    })).resolves.toEqual({ success: true, sanction })

    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      sanction_type: 'game_suspension',
      reason: 'Abandono reiterado',
      applied_by: 'admin-1',
      source_room_id: null,
      expires_at: null,
      metadata: {},
    })
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'sanction_created', 'user', 'user-1', {
      sanction_id: 'sanction-1',
      sanction_type: 'game_suspension',
      reason: 'Abandono reiterado',
      expires_at: null,
      source_room_id: null,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
  })

  it('propaga error de inserción al crear sanción', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    const select = jest.fn().mockReturnValue({ single })
    const insert = jest.fn().mockReturnValue({ select })
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      tableQueues: {
        profiles: [roleQuery('admin')],
        user_sanctions: [{ insert }],
      },
    }))

    await expect(createSanction({ userId: 'user-1', sanctionType: 'permanent_ban', reason: 'Fraude' })).rejects.toThrow('insert failed')
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('revoca sanción con timestamp actual, auditoría y revalidación', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-08T12:00:00.000Z'))
    const sanction = { id: 'sanction-1', user_id: 'user-1', sanction_type: 'full_suspension' }
    const single = jest.fn().mockResolvedValue({ data: sanction, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const eq = jest.fn().mockReturnValue({ select })
    const update = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      tableQueues: {
        profiles: [roleQuery('admin')],
        user_sanctions: [{ update }],
      },
    }))

    await expect(revokeSanction('sanction-1')).resolves.toEqual({ success: true, sanction })

    expect(update).toHaveBeenCalledWith({ revoked_at: '2026-06-08T12:00:00.000Z', revoked_by: 'admin-1' })
    expect(eq).toHaveBeenCalledWith('id', 'sanction-1')
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'sanction_revoked', 'user', 'user-1', {
      sanction_id: 'sanction-1',
      sanction_type: 'full_suspension',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
    jest.useRealTimers()
  })

  it('obtiene sanciones activas por RPC y tolera respuesta null', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: [{ id: 'sanction-1' }], error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } })
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      tableQueues: { profiles: [roleQuery('admin'), roleQuery('admin'), roleQuery('admin')] },
      rpc,
    }))

    await expect(getActiveSanctions('user-1')).resolves.toEqual([{ id: 'sanction-1' }])
    await expect(getActiveSanctions('user-1')).resolves.toEqual([])
    await expect(getActiveSanctions('user-1')).rejects.toThrow('rpc failed')
    expect(rpc).toHaveBeenCalledWith('get_active_sanctions', { p_user_id: 'user-1' })
  })

  it('verifica elegibilidad de cuenta para login con estados bloqueado, libre y error', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { sanction_type: 'full_suspension', reason: 'Fraude', expires_at: '2026-07-01' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'eligibility failed' } })
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({ rpc }))

    await expect(checkAccountEligibility('user-1')).resolves.toEqual({ blocked: false })
    await expect(checkAccountEligibility('user-1')).resolves.toEqual({ blocked: true, sanctionType: 'full_suspension', reason: 'Fraude', expiresAt: '2026-07-01' })
    await expect(checkAccountEligibility('user-1')).rejects.toThrow('eligibility failed')
    expect(rpc).toHaveBeenCalledWith('check_account_eligibility', { p_user_id: 'user-1' })
  })

  it('verifica acceso a mesas para game-server con estados bloqueado, libre y error', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { sanction_type: 'game_suspension', reason: 'Colusión', expires_at: null }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'table access failed' } })
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({ rpc }))

    await expect(checkTableAccess('user-1')).resolves.toEqual({ blocked: false })
    await expect(checkTableAccess('user-1')).resolves.toEqual({ blocked: true, sanctionType: 'game_suspension', reason: 'Colusión', expiresAt: null })
    await expect(checkTableAccess('user-1')).rejects.toThrow('table access failed')
    expect(rpc).toHaveBeenCalledWith('check_table_access', { p_user_id: 'user-1' })
  })
})
