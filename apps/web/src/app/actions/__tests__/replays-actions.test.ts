import {
  getAdminReplayDetail,
  getAllReplays,
  getPlayerMesaReplays,
  getPlayerReplayDetail,
  getPlayerReplays,
  getPlayerReplaysForRoom,
} from '../replays'
import { sanitizeReplayFrames } from '@/lib/replay-sanitizer'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const user = { id: 'user-123' }
const admin = { id: 'admin-123' }

function buildAuth(authUser: { id: string } | null = user) {
  return {
    getUser: jest.fn().mockResolvedValue({ data: { user: authUser } }),
  }
}

function queuedSupabase(options: {
  authUser?: { id: string } | null
  rpc?: jest.Mock
  tables?: Record<string, unknown[]>
} = {}) {
  const authUser = Object.prototype.hasOwnProperty.call(options, 'authUser') ? options.authUser! : user

  return {
    auth: buildAuth(authUser),
    rpc: options.rpc ?? jest.fn().mockResolvedValue({ data: [], error: null }),
    from: jest.fn((table: string) => {
      const query = options.tables?.[table]?.shift()
      if (!query) throw new Error(`Unexpected replay query: ${table}`)
      return query
    }),
  }
}

function replayRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    game_id: 'game-1',
    created_at: '2026-01-01T00:00:00.000Z',
    players: [{ userId: 'user-123', nickname: 'Rivera' }],
    timeline: [{ type: 'start' }],
    admin_timeline: null,
    pot_breakdown: {},
    final_hands: {},
    rng_seed: 'seed-1',
    ...overrides,
  }
}

function profileRoleQuery(role: string | null = 'admin') {
  const single = jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

function mockConsoleError() {
  return jest.spyOn(console, 'error').mockImplementation(() => {})
}

describe('replay actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReset()
    delete process.env.GAME_SERVER_URL
    delete process.env.NEXT_PUBLIC_GAME_SERVER_URL
    global.fetch = jest.fn()
  })

  afterEach(() => {
    delete process.env.GAME_SERVER_URL
    delete process.env.NEXT_PUBLIC_GAME_SERVER_URL
    ;(global.fetch as jest.Mock | undefined)?.mockRestore?.()
  })

  it('devuelve replays de jugador desde RPC con user id y límite', async () => {
    const data = [{ game_id: 'game-1', net_result: 5000 }]
    const rpc = jest.fn().mockResolvedValue({ data, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(getPlayerReplays({ period: 'all' })).resolves.toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_player_replays', {
      p_user_id: 'user-123',
      p_limit: 100,
      p_from: null,
      p_to: null,
    })
  })

  it('aplica periodo y rango de fechas al historial del jugador', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await getPlayerReplays({ period: '90d', from: '2026-01-10', to: '2026-02-10' })

    expect(rpc).toHaveBeenCalledWith('get_player_replays', {
      p_user_id: 'user-123',
      p_limit: 100,
      p_from: '2026-01-10T00:00:00.000Z',
      p_to: '2026-02-10T23:59:59.999Z',
    })
  })

  it('rechaza filtros de replay inválidos antes de llamar a Supabase', async () => {
    const supabase = queuedSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getPlayerReplays({ period: 'forever' as never })).resolves.toEqual([])
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('obtiene el detalle player mediante la RPC saneada, sin select directo', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [replayRow({ final_hands: { 'user-123': { cards: '1O,7E' } } })],
      error: null,
    })
    const supabase = queuedSupabase({ rpc })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getPlayerReplayDetail('game-1')).resolves.toMatchObject({ game_id: 'game-1' })
    expect(rpc).toHaveBeenCalledWith('get_player_replay_detail', {
      p_game_id: 'game-1',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('elimina cartas privadas ajenas y pistas de cartas de los frames player', () => {
    const frames = sanitizeReplayFrames([
      {
        players: [
          { id: 'mine-session', userId: 'user-123', privateCards: ['1O'], revealedCards: [] },
          { id: 'other-session', userId: 'user-456', privateCards: ['7E'], revealedCards: ['3B'] },
        ],
        hint: { kind: 'discard', targetPlayerId: 'other-session', cards: ['7E'] },
      },
    ], 'user-123')
    const [frame] = frames as Array<{
      players: Array<Record<string, unknown>>
      hint: Record<string, unknown>
    }>

    expect(frame.players[0].privateCards).toEqual(['1O'])
    expect(frame.players[1]).not.toHaveProperty('privateCards')
    expect(frame.players[1].revealedCards).toEqual(['3B'])
    expect(frame.hint).not.toHaveProperty('cards')
  })

  it('devuelve lista vacía si no hay usuario al consultar replays de jugador', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getPlayerReplays()).resolves.toEqual([])
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('devuelve lista vacía y registra error si falla la RPC de replays de jugador', async () => {
    const errorSpy = mockConsoleError()
    const error = { message: 'rpc down' }
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      rpc: jest.fn().mockResolvedValue({ data: null, error }),
    }))

    await expect(getPlayerReplays()).resolves.toEqual([])
    expect(errorSpy).toHaveBeenCalledWith('[getPlayerReplays] Error:', error)
    errorSpy.mockRestore()
  })

  it('consulta replays agrupados por mesa para el jugador', async () => {
    const data = [{ room_id: 'room-1', game_count: 3 }]
    const rpc = jest.fn().mockResolvedValue({ data, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(getPlayerMesaReplays({ period: 'all' })).resolves.toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_player_replays_by_mesa', {
      p_user_id: 'user-123',
      p_limit: 100,
      p_from: null,
      p_to: null,
    })
  })

  it('devuelve vacío para replays por mesa sin usuario, con error o con data null', async () => {
    const noUserSupabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(noUserSupabase)

    await expect(getPlayerMesaReplays()).resolves.toEqual([])
    expect(noUserSupabase.rpc).not.toHaveBeenCalled()

    const errorSpy = mockConsoleError()
    const rpcWithError = jest.fn().mockResolvedValue({ data: null, error: { message: 'mesa rpc failed' } })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ rpc: rpcWithError }))
    await expect(getPlayerMesaReplays()).resolves.toEqual([])
    expect(errorSpy).toHaveBeenCalledWith('[getPlayerMesaReplays] Error:', { message: 'mesa rpc failed' })

    const rpcWithNullData = jest.fn().mockResolvedValue({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ rpc: rpcWithNullData }))
    await expect(getPlayerMesaReplays()).resolves.toEqual([])
    errorSpy.mockRestore()
  })

  it('consulta replays del jugador para una sala específica', async () => {
    const data = [{ game_id: 'game-2', total_pot: 10000 }]
    const rpc = jest.fn().mockResolvedValue({ data, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(getPlayerReplaysForRoom('room-1', { period: 'all' })).resolves.toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_player_replays_for_room', {
      p_user_id: 'user-123',
      p_room_id: 'room-1',
      p_limit: 100,
      p_from: null,
      p_to: null,
    })
  })

  it('devuelve vacío para replays de sala sin usuario, con error o con data null', async () => {
    const noUserSupabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(noUserSupabase)

    await expect(getPlayerReplaysForRoom('room-1')).resolves.toEqual([])
    expect(noUserSupabase.rpc).not.toHaveBeenCalled()

    const errorSpy = mockConsoleError()
    const rpcWithError = jest.fn().mockResolvedValue({ data: null, error: { message: 'room rpc failed' } })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ rpc: rpcWithError }))
    await expect(getPlayerReplaysForRoom('room-1')).resolves.toEqual([])
    expect(errorSpy).toHaveBeenCalledWith('[getPlayerReplaysForRoom] Error:', { message: 'room rpc failed' })

    const rpcWithNullData = jest.fn().mockResolvedValue({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ rpc: rpcWithNullData }))
    await expect(getPlayerReplaysForRoom('room-1')).resolves.toEqual([])
    errorSpy.mockRestore()
  })

  it('devuelve null si no hay usuario al consultar detalle de replay', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getPlayerReplayDetail('game-1')).resolves.toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('requiere admin para listar todos los replays', async () => {
    const profile = profileRoleQuery('player')
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      authUser: admin,
      tables: { profiles: [{ select: profile.select }] },
    }))

    await expect(getAllReplays()).rejects.toThrow('No autorizado')
  })

  it('requiere sesión admin y maneja error o data null al listar replays admin', async () => {
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ authUser: null }))
    await expect(getAllReplays()).rejects.toThrow('No autenticado')

    const errorSpy = mockConsoleError()
    const profileWithError = profileRoleQuery('admin')
    const rpcWithError = jest.fn().mockResolvedValue({ data: null, error: { message: 'admin rpc failed' } })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({
      authUser: admin,
      rpc: rpcWithError,
      tables: { profiles: [{ select: profileWithError.select }] },
    }))
    await expect(getAllReplays()).resolves.toEqual([])
    expect(errorSpy).toHaveBeenCalledWith('[getAllReplays] Error:', { message: 'admin rpc failed' })

    const profileWithNullData = profileRoleQuery('admin')
    const rpcWithNullData = jest.fn().mockResolvedValue({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({
      authUser: admin,
      rpc: rpcWithNullData,
      tables: { profiles: [{ select: profileWithNullData.select }] },
    }))
    await expect(getAllReplays()).resolves.toEqual([])
    errorSpy.mockRestore()
  })

  it('lista replays admin con paginación', async () => {
    const data = [{ game_id: 'game-1', total_pot: 20000 }]
    const rpc = jest.fn().mockResolvedValue({ data, error: null })
    const profile = profileRoleQuery('admin')
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      authUser: admin,
      rpc,
      tables: { profiles: [{ select: profile.select }] },
    }))

    await expect(getAllReplays(25, 50)).resolves.toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_admin_replays', {
      p_limit: 25,
      p_offset: 50,
    })
  })

  it('obtiene el detalle admin por RPC autorizada y conserva el ledger', async () => {
    const profile = profileRoleQuery('admin')
    const replay = replayRow({ game_id: 'game-1' })
    const ledger = [{ id: 'ledger-1', user_id: 'user-123', amount_cents: 5000 }]
    const rpc = jest.fn((name: string) => Promise.resolve(name === 'get_admin_replay_detail'
      ? { data: [replay], error: null }
      : { data: ledger, error: null }))
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      authUser: admin,
      rpc,
      tables: { profiles: [{ select: profile.select }] },
    }))

    await expect(getAdminReplayDetail('game-1')).resolves.toEqual({
      replay,
      ledger,
    })
    expect(rpc).toHaveBeenCalledWith('get_admin_replay_detail', { p_game_id: 'game-1' })
    expect(rpc).toHaveBeenCalledWith('get_replay_ledger', { p_game_id: 'game-1' })
  })
})
