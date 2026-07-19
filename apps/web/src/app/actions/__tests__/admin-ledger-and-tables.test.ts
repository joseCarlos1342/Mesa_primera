import {
  getLedgerEntries,
  getUserLedger,
  getUserProfile,
  getUsersWithBalances,
} from '../admin-ledger'
import {
  cleanupStaleGames,
  createCustomTable,
  createTable,
  deleteTable,
  getActiveGames,
  getLobbyTables,
  getTableFinancials,
  getTablesList,
  kickPlayer,
  setGameStatus,
  toggleTableActive,
  updateTable,
} from '../admin-tables'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAdminAction } from '../admin-audit'

jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('../admin-audit', () => ({ logAdminAction: jest.fn() }))

const adminUser = { id: 'admin-123' }

function auth(user: { id: string } | null = adminUser, error: unknown = null) {
  return { getUser: jest.fn().mockResolvedValue({ data: { user }, error }) }
}

function roleQuery(role = 'admin') {
  const single = jest.fn().mockResolvedValue({ data: { role }, error: null })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

function queuedSupabase(queues: Record<string, unknown[]>, rpc = jest.fn(), authMock = auth()) {
  return {
    auth: authMock,
    rpc,
    from: jest.fn((table: string) => {
      const query = queues[table]?.shift()
      if (!query) throw new Error(`Unexpected table query: ${table}`)
      return query
    }),
  }
}

function orderLimitQuery(data: unknown[], error: unknown = null) {
  const limit = jest.fn().mockResolvedValue({ data, error })
  const order = jest.fn().mockReturnValue({ limit })
  const select = jest.fn().mockReturnValue({ order })
  return { select, order, limit }
}

describe('admin ledger actions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rejects ledger reads for non-admin users', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery('player')] }))

    await expect(getLedgerEntries()).rejects.toThrow('Acceso denegado')
  })

  it('maps ledger entries and profile display names', async () => {
    const entries = [
      { id: 'l1', reference_id: 'game-1', user: [{ full_name: 'Ana Mesa', username: 'ana' }] },
      { id: 'l2', reference_id: null, user: { full_name: null, username: 'rivera' } },
      { id: 'l3', reference_id: 'ref-3', user: null },
    ]
    const ledger = orderLimitQuery(entries)
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], ledger: [{ select: ledger.select }] }))

    await expect(getLedgerEntries(25)).resolves.toEqual([
      expect.objectContaining({ id: 'l1', game_id: 'game-1', user: { display_name: 'Ana Mesa' } }),
      expect.objectContaining({ id: 'l2', game_id: null, user: { display_name: 'rivera' } }),
      expect.objectContaining({ id: 'l3', game_id: 'ref-3', user: null }),
    ])
    expect(ledger.order).toHaveBeenCalledWith('sequence', { ascending: false })
    expect(ledger.limit).toHaveBeenCalledWith(25)
  })

  it('normalizes admin ledger summary rows', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [{ id: 'u1', display_name: null, username: null }], error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()] }, rpc))

    await expect(getUsersWithBalances()).resolves.toEqual([{ id: 'u1', display_name: 'Desconocido', username: null, balance: 0, total_credits: 0, total_debits: 0, last_activity: null }])
  })

  it('loads one user ledger and profile balance', async () => {
    const userLedger = {
      limit: jest.fn().mockResolvedValue({ data: [{ id: 'l1', reference_id: 'game-1' }], error: null }),
    }
    const order = jest.fn().mockReturnValue(userLedger)
    const eq = jest.fn().mockReturnValue({ order })
    const ledgerSelect = jest.fn().mockReturnValue({ eq })
    const profileSingle = jest.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Ana' }, error: null })
    const profileEq = jest.fn().mockReturnValue({ single: profileSingle })
    const profileSelect = jest.fn().mockReturnValue({ eq: profileEq })
    const walletMaybeSingle = jest.fn().mockResolvedValue({ data: { balance_cents: 12345 }, error: null })
    const walletEq = jest.fn().mockReturnValue({ maybeSingle: walletMaybeSingle })
    const walletSelect = jest.fn().mockReturnValue({ eq: walletEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      profiles: [roleQuery(), roleQuery(), { select: profileSelect }],
      ledger: [{ select: ledgerSelect }],
      wallets: [{ select: walletSelect }],
    }))

    await expect(getUserLedger('u1', 10)).resolves.toEqual([expect.objectContaining({ id: 'l1', game_id: 'game-1', user: null })])
    await expect(getUserProfile('u1')).resolves.toEqual({ id: 'u1', full_name: 'Ana', balance: 12345 })
  })
})

describe('admin table actions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lists tables and computes active games count', async () => {
    const eq = jest.fn().mockResolvedValue({ data: [{ id: 't1', games: [{ count: 2 }] }], error: null })
    const order = jest.fn().mockReturnValue({ eq })
    const select = jest.fn().mockReturnValue({ order })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], tables: [{ select }] }))

    await expect(getTablesList('common')).resolves.toEqual([expect.objectContaining({ id: 't1', active_games: 2 })])
    expect(eq).toHaveBeenCalledWith('table_category', 'common')
  })

  it('enriches active games with profile names and playing/left status', async () => {
    const gameOrder = jest.fn().mockResolvedValue({ data: [{ id: 'g1', status: 'waiting', started_at: 'now', tables: { id: 't1', name: 'Mesa', max_players: 7, min_bet: 1, created_by: 'admin-123' }, players: [{ id: 'p1', user_id: 'u1', left_at: null }, { id: 'p2', user_id: 'u2', left_at: 'later' }] }], error: null })
    const gte = jest.fn().mockReturnValue({ order: gameOrder })
    const inFilter = jest.fn().mockReturnValue({ gte })
    const gamesSelect = jest.fn().mockReturnValue({ in: inFilter })
    const profilesIn = jest.fn().mockResolvedValue({ data: [{ id: 'u1', full_name: 'Ana', username: 'ana' }] })
    const profilesSelect = jest.fn().mockReturnValue({ in: profilesIn })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery(), { select: profilesSelect }], games: [{ select: gamesSelect }] }))

    const result = await getActiveGames()
    expect(result[0].players).toEqual([
      expect.objectContaining({ id: 'p1', display_name: 'Ana', status: 'playing' }),
      expect.objectContaining({ id: 'p2', display_name: 'Desconocido', status: 'left' }),
    ])
  })

  it('returns an empty active games list without querying profiles', async () => {
    const gameOrder = jest.fn().mockResolvedValue({ data: [], error: null })
    const gte = jest.fn().mockReturnValue({ order: gameOrder })
    const inFilter = jest.fn().mockReturnValue({ gte })
    const gamesSelect = jest.fn().mockReturnValue({ in: inFilter })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], games: [{ select: gamesSelect }] }))

    await expect(getActiveGames()).resolves.toEqual([])
  })

  it('updates game status, kicks players and audits both actions', async () => {
    const gameEq = jest.fn().mockResolvedValue({ error: null })
    const gameUpdate = jest.fn().mockReturnValue({ eq: gameEq })
    const playerGameEq = jest.fn().mockResolvedValue({ error: null })
    const playerIdEq = jest.fn().mockReturnValue({ eq: playerGameEq })
    const playerUpdate = jest.fn().mockReturnValue({ eq: playerIdEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery(), roleQuery()], games: [{ update: gameUpdate }], players: [{ update: playerUpdate }] }))

    await expect(setGameStatus('g1', 'paused', 'maintenance')).resolves.toEqual({ success: true })
    await expect(kickPlayer('g1', 'p1')).resolves.toEqual({ success: true })
    expect(gameUpdate).toHaveBeenCalledWith({ status: 'paused', paused_by: 'admin-123', pause_reason: 'maintenance' })
    expect(playerUpdate).toHaveBeenCalledWith({ status: 'expelled' })
    expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'player_kicked', 'player', 'p1', { game_id: 'g1' }, { context: 'tables' })
  })

  it('resumes a paused game by clearing pause metadata', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], games: [{ update }] }))

    await expect(setGameStatus('g1', 'playing')).resolves.toEqual({ success: true })
    expect(update).toHaveBeenCalledWith({ status: 'playing', paused_by: null, pause_reason: null })
  })

  it('closes a game by admin without pause metadata and still audits reason', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], games: [{ update }] }))

    await expect(setGameStatus('g1', 'closed_by_admin', 'mesa abandonada')).resolves.toEqual({ success: true })

    expect(update).toHaveBeenCalledWith({ status: 'closed_by_admin' })
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'game_status_changed',
      'game',
      'g1',
      { new_status: 'closed_by_admin', reason: 'mesa abandonada' },
      { context: 'tables' }
    )
  })

  it('creates common and custom tables with validation and revalidation', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery(), roleQuery()], tables: [{ insert }, { insert }] }))

    await expect(createTable({ name: 'Mesa 1', lobby_slot: 2 })).resolves.toEqual({ success: true })
    await expect(createCustomTable({ name: ' VIP ', max_players: 5, min_entry_cents: 1_000_000, min_pique_cents: 100_000, disabled_chips: [100000] })).resolves.toEqual({ success: true })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mesa 1', table_category: 'common', lobby_slot: 2 }))
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'VIP', table_category: 'custom', max_players: 5 }))
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tables')
  })

  it('rejects invalid custom tables before insert', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery(), roleQuery(), roleQuery(), roleQuery(), roleQuery()], tables: [{ insert: jest.fn() }] }))

    await expect(createCustomTable({ name: '', max_players: 5, min_entry_cents: 1_000_000, min_pique_cents: 100_000, disabled_chips: [] })).rejects.toThrow('El nombre de la mesa es requerido.')
    await expect(createCustomTable({ name: 'Mesa', max_players: 2, min_entry_cents: 1_000_000, min_pique_cents: 100_000, disabled_chips: [] })).rejects.toThrow('La capacidad debe estar entre 3 y 7 jugadores.')
    await expect(createCustomTable({ name: 'Mesa', max_players: 5, min_entry_cents: 0, min_pique_cents: 100_000, disabled_chips: [] })).rejects.toThrow('El saldo mínimo de ingreso debe ser mayor a 0.')
    await expect(createCustomTable({ name: 'Mesa', max_players: 5, min_entry_cents: 1_000_000, min_pique_cents: 0, disabled_chips: [] })).rejects.toThrow('El pique mínimo debe ser mayor a 0.')
    await expect(createCustomTable({ name: 'Mesa', max_players: 5, min_entry_cents: 1_000_000, min_pique_cents: 100_000, disabled_chips: [100000, 200000, 500000, 1000000, 2000000, 5000000] })).rejects.toThrow('Debe haber al menos 1 ficha habilitada.')
  })

  it('prevents common table financial updates and toggles active state', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 't1', table_category: 'common', is_active: true }, error: null })
    const eqFetch = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq: eqFetch })
    const eqUpdate = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: eqUpdate })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery(), roleQuery()], tables: [{ select }, { update }] }))

    await expect(updateTable('t1', { min_entry_cents: 5000 })).rejects.toThrow('No se pueden modificar los parámetros financieros de una mesa común.')
    await expect(toggleTableActive('t1', false)).resolves.toEqual({ success: true })
    expect(update).toHaveBeenCalledWith({ is_active: false })
  })

  it('updates custom table parameters', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 't1', table_category: 'custom', is_active: true }, error: null })
    const eqFetch = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq: eqFetch })
    const eqUpdate = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: eqUpdate })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], tables: [{ select }, { update }] }))

    await expect(updateTable('t1', { min_entry_cents: 5_000_000, min_pique_cents: 500_000, disabled_chips: [100000] })).resolves.toEqual({ success: true })
    expect(update).toHaveBeenCalledWith({ min_entry_cents: 5_000_000, min_pique_cents: 500_000, disabled_chips: [100000] })
  })

  it('allows non-financial updates on common tables', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 't1', table_category: 'common', is_active: true }, error: null })
    const eqFetch = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq: eqFetch })
    const eqUpdate = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: eqUpdate })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], tables: [{ select }, { update }] }))

    await expect(updateTable('t1', { name: 'Mesa visible', sort_order: 3 })).resolves.toEqual({ success: true })

    expect(update).toHaveBeenCalledWith({ name: 'Mesa visible', sort_order: 3 })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tables')
  })

  it('reports missing tables before update', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: new Error('not found') })
    const eqFetch = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq: eqFetch })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], tables: [{ select }] }))

    await expect(updateTable('missing', { name: 'No existe' })).rejects.toThrow('Mesa no encontrada.')
  })

  it('blocks deleting tables with active games and cleans stale games', async () => {
    const gamesIn = jest.fn().mockResolvedValue({ data: [{ id: 'g1' }], error: null })
    const gamesEq = jest.fn().mockReturnValue({ in: gamesIn })
    const gamesSelect = jest.fn().mockReturnValue({ eq: gamesEq })
    const staleSelect = jest.fn().mockResolvedValue({ data: [{ id: 'old-g1' }, { id: 'old-g2' }], error: null })
    const staleLt = jest.fn().mockReturnValue({ select: staleSelect })
    const staleIn = jest.fn().mockReturnValue({ lt: staleLt })
    const staleUpdate = jest.fn().mockReturnValue({ in: staleIn })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery(), roleQuery()], games: [{ select: gamesSelect }, { update: staleUpdate }] }))

    await expect(deleteTable('t1')).rejects.toThrow('No se puede eliminar una mesa con juegos activos.')
    await expect(cleanupStaleGames()).resolves.toEqual({ success: true, cleaned: 2 })
    expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'stale_games_cleanup', 'system', 'games', { cleaned: 2 }, { context: 'tables' })
  })

  it('deletes tables without active games and audits deletion', async () => {
    const gamesIn = jest.fn().mockResolvedValue({ data: [], error: null })
    const gamesEq = jest.fn().mockReturnValue({ in: gamesIn })
    const gamesSelect = jest.fn().mockReturnValue({ eq: gamesEq })
    const deleteEq = jest.fn().mockResolvedValue({ error: null })
    const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], games: [{ select: gamesSelect }], tables: [{ delete: deleteFn }] }))

    await expect(deleteTable('t1')).resolves.toEqual({ success: true })
    expect(deleteFn).toHaveBeenCalled()
    expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'table_deleted', 'table', 't1', {}, { context: 'tables' })
  })

  it('propagates delete errors without auditing deletion', async () => {
    const gamesIn = jest.fn().mockResolvedValue({ data: [], error: null })
    const gamesEq = jest.fn().mockReturnValue({ in: gamesIn })
    const gamesSelect = jest.fn().mockReturnValue({ eq: gamesEq })
    const deleteEq = jest.fn().mockResolvedValue({ error: new Error('delete failed') })
    const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], games: [{ select: gamesSelect }], tables: [{ delete: deleteFn }] }))

    await expect(deleteTable('t1')).rejects.toThrow('delete failed')

    expect(logAdminAction).not.toHaveBeenCalledWith('admin-123', 'table_deleted', expect.anything(), expect.anything(), expect.anything(), expect.anything())
  })

  it('cleans zero stale games without writing an audit event', async () => {
    const staleSelect = jest.fn().mockResolvedValue({ data: [], error: null })
    const staleLt = jest.fn().mockReturnValue({ select: staleSelect })
    const staleIn = jest.fn().mockReturnValue({ lt: staleLt })
    const staleUpdate = jest.fn().mockReturnValue({ in: staleIn })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], games: [{ update: staleUpdate }] }))

    await expect(cleanupStaleGames()).resolves.toEqual({ success: true, cleaned: 0 })

    expect(logAdminAction).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tables')
  })

  it('returns table financials and lobby table groups with RPC fallback', async () => {
    const financials = [{ table_id: 't1', table_name: 'Mesa' }]
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: financials, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
    const order = jest.fn().mockResolvedValue({ data: [{ id: 'c1', table_category: 'common' }, { id: 'x1', table_category: 'custom' }], error: null })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()], tables: [{ select }] }, rpc))

    await expect(getTableFinancials()).resolves.toEqual(financials)
    await expect(getLobbyTables()).resolves.toEqual({ common: [{ id: 'c1', table_category: 'common' }], custom: [{ id: 'x1', table_category: 'custom' }] })
  })

  it('returns empty financials when RPC migration is not deployed', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST202' } })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [roleQuery()] }, rpc))

    await expect(getTableFinancials()).resolves.toEqual([])
  })

  it('propagates lobby fallback query errors when RPC is unavailable', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { code: 'RPC_MISSING' } })
    const order = jest.fn().mockResolvedValue({ data: null, error: new Error('tables failed') })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ tables: [{ select }] }, rpc))

    await expect(getLobbyTables()).rejects.toThrow('tables failed')
  })
})
