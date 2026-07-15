import { globalSearch } from '../admin-search'
import { logAdminAction } from '../admin-audit'
import { createClient } from '@/utils/supabase/server'
import { detectIdentifier } from '@/lib/detect-identifier'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('../admin-audit', () => ({
  logAdminAction: jest.fn(),
}))

jest.mock('@/lib/detect-identifier', () => {
  const actual = jest.requireActual('@/lib/detect-identifier')
  return {
    detectIdentifier: jest.fn(actual.detectIdentifier),
  }
})

const adminUser = { id: 'admin-1' }

function queryWithLimit(data: unknown[] | null) {
  const limit = jest.fn().mockResolvedValue({ data, error: null })
  const or = jest.fn().mockReturnValue({ limit })
  const select = jest.fn().mockReturnValue({ or })
  return { select, or, limit }
}

function queryWithEqLimit(data: unknown[] | null) {
  const limit = jest.fn().mockResolvedValue({ data, error: null })
  const eq = jest.fn().mockReturnValue({ limit })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, limit }
}

function queryWithInLimit(data: unknown[] | null) {
  const limit = jest.fn().mockResolvedValue({ data, error: null })
  const inQuery = jest.fn().mockReturnValue({ limit })
  const select = jest.fn().mockReturnValue({ in: inQuery })
  return { select, in: inQuery, limit }
}

function profileRoleQuery(role: string | null) {
  const single = jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

function buildSupabase(tableQueues: Record<string, unknown[]>, user: typeof adminUser | null = adminUser, replayResults: unknown[] = []) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    rpc: jest.fn(() => Promise.resolve(replayResults.shift() || { data: [], error: null })),
    from: jest.fn((table: string) => {
      const query = tableQueues[table]?.shift()
      if (!query) throw new Error(`Unexpected admin-search table: ${table}`)
      return query
    }),
  }
}

describe('globalSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReset()
    ;(logAdminAction as jest.Mock).mockResolvedValue(undefined)
    ;(detectIdentifier as jest.Mock).mockImplementation(jest.requireActual('@/lib/detect-identifier').detectIdentifier)
  })

  it('rechaza consulta vacía sin abrir cliente Supabase', async () => {
    await expect(globalSearch('   ')).resolves.toEqual({ error: 'Consulta vacía' })

    expect(createClient).not.toHaveBeenCalled()
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('bloquea búsquedas sin sesión o sin rol admin', async () => {
    const unauthSupabase = buildSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(globalSearch('ana')).resolves.toEqual({ error: 'No autenticado' })
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const roleQuery = profileRoleQuery('player')
    ;(createClient as jest.Mock).mockResolvedValueOnce(buildSupabase({ profiles: [roleQuery] }))

    await expect(globalSearch('ana')).resolves.toEqual({ error: 'Acceso denegado' })
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('busca por UUID en ledger, depósitos, retiros, replays, tickets y alertas', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    const roleQuery = profileRoleQuery('admin')
    const ledgerQuery = queryWithLimit([{ id: 'ledger-1', type: 'buy_in', direction: 'credit', amount_cents: 123400, created_at: '2026-01-01' }])
    const depositQuery = queryWithLimit([{ id: 'deposit-1', amount_cents: 5000000, status: 'approved', created_at: '2026-01-02' }])
    const withdrawalQuery = queryWithLimit([{ id: 'withdrawal-1', amount_cents: 2500000, status: 'pending', created_at: '2026-01-03' }])
    const replayQuery = queryWithLimit([{ id: 'replay-1', game_id: 'game-1', created_at: '2026-01-04' }])
    const ticketQuery = queryWithLimit([{ id: 'ticket-1', status: 'open', created_at: '2026-01-05' }])
    const alertQuery = queryWithLimit([{ id: 'alert-1', severity: 'high', title: 'Mesa bloqueada', created_at: '2026-01-06' }])
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      profiles: [roleQuery],
      ledger: [ledgerQuery],
      deposit_requests: [depositQuery],
      withdrawal_requests: [withdrawalQuery],
      game_replays: [replayQuery],
      support_tickets: [ticketQuery],
      server_alerts: [alertQuery],
    }, adminUser, [{ data: [{ id: 'replay-1', game_id: 'game-1', created_at: '2026-01-04' }], error: null }]))

    const result = await globalSearch(uuid)

    expect(result.error).toBeUndefined()
    expect(result.data?.detected).toEqual({ raw: uuid, type: 'uuid', normalized: uuid })
    expect(result.data?.matches).toEqual([
      { entity: 'ledger', id: 'ledger-1', label: 'Ledger: buy_in credit $1234', detail: '2026-01-01' },
      { entity: 'deposit', id: 'deposit-1', label: 'Depósito: $50000 (approved)', detail: '2026-01-02' },
      { entity: 'withdrawal', id: 'withdrawal-1', label: 'Retiro: $25000 (pending)', detail: '2026-01-03' },
      { entity: 'replay', id: 'replay-1', target_id: 'game-1', label: 'Replay: game-1', detail: '2026-01-04' },
      { entity: 'ticket', id: 'ticket-1', label: 'Ticket: open', detail: '2026-01-05' },
      { entity: 'alert', id: 'alert-1', label: 'Alerta: [high] Mesa bloqueada', detail: '2026-01-06' },
    ])
    expect(ledgerQuery.or).toHaveBeenCalledWith(`id.eq.${uuid},reference_id.eq.${uuid},game_id.eq.${uuid}`)
    expect(alertQuery.or).toHaveBeenCalledWith(`id.eq.${uuid},game_id.eq.${uuid},player_id.eq.${uuid}`)
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'global_search', 'search', uuid, { detected_type: 'uuid', match_count: 6 })
  })

  it('busca por seed exacto y audita cantidad de replays encontrados', async () => {
    const seed = 'abcdef1234567890abcdef1234567890'
    const roleQuery = profileRoleQuery('admin')
    const replayQuery = queryWithEqLimit([{ id: 'replay-1', game_id: 'game-77', created_at: '2026-02-01' }])
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      profiles: [roleQuery],
      game_replays: [replayQuery],
    }, adminUser, [{ data: [{ id: 'replay-1', game_id: 'game-77', created_at: '2026-02-01' }], error: null }]))

    const result = await globalSearch(seed.toUpperCase())

    expect(result.data?.detected).toEqual({ raw: seed.toUpperCase(), type: 'seed', normalized: seed })
    expect(result.data?.matches).toEqual([{ entity: 'replay', id: 'replay-1', target_id: 'game-77', label: 'Replay: game-77', detail: '2026-02-01' }])
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'global_search', 'search', seed.toUpperCase(), { detected_type: 'seed', match_count: 1 })
  })

  it('busca por username o nombre y usa fallback de etiqueta sin nombre', async () => {
    const roleQuery = profileRoleQuery('admin')
    const profileSearch = queryWithLimit([
      { id: 'user-1', full_name: 'Ana Mesa', username: 'ana', role: 'player' },
      { id: 'user-2', full_name: null, username: null, role: 'player' },
    ])
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      profiles: [roleQuery, profileSearch],
      support_tickets: [queryWithInLimit([])],
      server_alerts: [queryWithInLimit([])],
    }, adminUser, [
      { data: [], error: null },
      { data: [{ id: 'replay-seed', game_id: 'game-seed', created_at: '2026-03-02' }], error: null },
    ]))

    const result = await globalSearch('@Ana')

    expect(result.data?.detected).toEqual({ raw: '@Ana', type: 'username', normalized: 'ana' })
    expect(profileSearch.or).toHaveBeenCalledWith('username.ilike.%ana%,full_name.ilike.%ana%')
    expect(result.data?.matches).toEqual([
      { entity: 'user', id: 'user-1', label: 'Ana Mesa (player)', detail: '@ana' },
      { entity: 'user', id: 'user-2', label: 'Sin nombre (player)', detail: null },
    ])
  })

  it('prueba la rama defensiva unknown combinando todas las estrategias', async () => {
    ;(detectIdentifier as jest.Mock).mockReturnValue({ raw: 'mesa rara', type: 'unknown', normalized: 'mesa rara' })
    const roleQuery = profileRoleQuery('admin')
    const ledgerQuery = queryWithLimit([{ id: 'ledger-1', type: 'rake', direction: 'debit', amount_cents: 10000, created_at: '2026-03-01' }])
    const depositQuery = queryWithLimit([])
    const withdrawalQuery = queryWithLimit([])
    const uuidReplayQuery = queryWithLimit([])
    const ticketQuery = queryWithLimit([])
    const alertQuery = queryWithLimit([])
    const seedReplayQuery = queryWithEqLimit([{ id: 'replay-seed', game_id: 'game-seed', created_at: '2026-03-02' }])
    const profileSearch = queryWithLimit([{ id: 'user-1', full_name: null, username: 'mesa-rara', role: 'player' }])
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      profiles: [roleQuery, profileSearch],
      ledger: [ledgerQuery],
      deposit_requests: [depositQuery],
      withdrawal_requests: [withdrawalQuery],
      game_replays: [uuidReplayQuery, seedReplayQuery],
      support_tickets: [ticketQuery, queryWithInLimit([])],
      server_alerts: [alertQuery, queryWithInLimit([])],
    }, adminUser, [{ data: [], error: null }, { data: [], error: null }]))

    const result = await globalSearch('mesa rara')

    expect(result.data?.matches.map((match) => match.entity)).toEqual(['ledger', 'user'])
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'global_search', 'search', 'mesa rara', { detected_type: 'unknown', match_count: 2 })
  })

  it('tolera respuestas null de Supabase sin romper el reporte', async () => {
    ;(detectIdentifier as jest.Mock).mockReturnValue({ raw: 'sin datos', type: 'unknown', normalized: 'sin datos' })
    const roleQuery = profileRoleQuery('admin')
    ;(createClient as jest.Mock).mockResolvedValue(buildSupabase({
      profiles: [roleQuery, queryWithLimit(null)],
      ledger: [queryWithLimit(null)],
      deposit_requests: [queryWithLimit(null)],
      withdrawal_requests: [queryWithLimit(null)],
      game_replays: [queryWithLimit(null), queryWithEqLimit(null)],
      support_tickets: [queryWithLimit(null), queryWithInLimit(null)],
      server_alerts: [queryWithLimit(null), queryWithInLimit(null)],
    }))

    const result = await globalSearch('sin datos')

    expect(result).toEqual({
      data: expect.objectContaining({
        detected: { raw: 'sin datos', type: 'unknown', normalized: 'sin datos' },
        matches: [],
      }),
    })
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'global_search', 'search', 'sin datos', { detected_type: 'unknown', match_count: 0 })
  })
})
