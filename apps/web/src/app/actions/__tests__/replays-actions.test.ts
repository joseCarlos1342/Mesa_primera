import {
  getAdminReplayDetail,
  getAllReplays,
  getPlayerMesaReplays,
  getPlayerReplays,
  getPlayerReplaysForRoom,
  getReplayDetail,
} from '../replays'
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

function replaySelectQuery(result: unknown) {
  const single = jest.fn().mockResolvedValue(result)
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
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

    await expect(getPlayerReplays(12)).resolves.toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_player_replays', {
      p_user_id: 'user-123',
      p_limit: 12,
    })
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

    await expect(getPlayerMesaReplays(7)).resolves.toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_player_replays_by_mesa', {
      p_user_id: 'user-123',
      p_limit: 7,
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

    await expect(getPlayerReplaysForRoom('room-1', 20)).resolves.toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_player_replays_for_room', {
      p_user_id: 'user-123',
      p_room_id: 'room-1',
      p_limit: 20,
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

  it('devuelve detalle Supabase e hidrata frames desde el game-server si existen', async () => {
    process.env.GAME_SERVER_URL = 'https://game.test'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        ok: true,
        data: replayRow({ game_id: 'game-1', version: 2, frames: [{ tick: 1 }] }),
      }),
    })
    const query = replaySelectQuery({ data: replayRow(), error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { game_replays: [{ select: query.select }] },
    }))

    await expect(getReplayDetail('game-1')).resolves.toMatchObject({
      game_id: 'game-1',
      version: 2,
      frames: [{ tick: 1 }],
    })
    expect(global.fetch).toHaveBeenCalledWith('https://game.test/api/replays/game-1', {
      next: { revalidate: 60 },
    })
  })

  it('usa fallback del game-server cuando Supabase no tiene replay', async () => {
    const errorSpy = mockConsoleError()
    process.env.NEXT_PUBLIC_GAME_SERVER_URL = 'https://public-game.test'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true, data: replayRow({ game_id: 'game-2' }) }),
    })
    const query = replaySelectQuery({ data: null, error: { message: 'not found' } })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { game_replays: [{ select: query.select }] },
    }))

    await expect(getReplayDetail('game-2')).resolves.toMatchObject({ game_id: 'game-2' })
    expect(errorSpy).toHaveBeenCalledWith('[getReplayDetail] Supabase error, trying game server fallback:', 'not found')
    errorSpy.mockRestore()
  })

  it('devuelve detalle Supabase sin frames si el game-server no está configurado o no entrega frames', async () => {
    const queryWithoutUrl = replaySelectQuery({ data: replayRow({ game_id: 'game-3' }), error: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({
      tables: { game_replays: [{ select: queryWithoutUrl.select }] },
    }))
    await expect(getReplayDetail('game-3')).resolves.toEqual(replayRow({ game_id: 'game-3' }))
    expect(global.fetch).not.toHaveBeenCalled()

    process.env.GAME_SERVER_URL = 'https://game.test'
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const queryWithNotOk = replaySelectQuery({ data: replayRow({ game_id: 'game-4' }), error: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({
      tables: { game_replays: [{ select: queryWithNotOk.select }] },
    }))
    await expect(getReplayDetail('game-4')).resolves.toEqual(replayRow({ game_id: 'game-4' }))

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: false, data: replayRow({ game_id: 'game-5', frames: [{ tick: 1 }] }) }),
    })
    const queryWithInvalidJson = replaySelectQuery({ data: replayRow({ game_id: 'game-5' }), error: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({
      tables: { game_replays: [{ select: queryWithInvalidJson.select }] },
    }))
    await expect(getReplayDetail('game-5')).resolves.toEqual(replayRow({ game_id: 'game-5' }))
  })

  it('devuelve null si fallback game-server falla por excepción o payload vacío', async () => {
    const errorSpy = mockConsoleError()
    process.env.GAME_SERVER_URL = 'https://game.test'
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'))
    const queryWithNetworkError = replaySelectQuery({ data: null, error: { message: 'not found' } })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({
      tables: { game_replays: [{ select: queryWithNetworkError.select }] },
    }))
    await expect(getReplayDetail('game-6')).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalledWith('[fetchReplayFromGameServer] Error:', expect.any(Error))

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ ok: true, data: null }) })
    const queryWithEmptyPayload = replaySelectQuery({ data: null, error: { message: 'not found' } })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({
      tables: { game_replays: [{ select: queryWithEmptyPayload.select }] },
    }))
    await expect(getReplayDetail('game-7')).resolves.toBeNull()
    errorSpy.mockRestore()
  })

  it('devuelve null si no hay usuario al consultar detalle de replay', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getReplayDetail('game-1')).resolves.toBeNull()
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

  it('devuelve detalle admin con replay y ledger', async () => {
    const profile = profileRoleQuery('admin')
    const replayQuery = replaySelectQuery({ data: replayRow({ game_id: 'game-1' }), error: null })
    const ledger = [{ id: 'ledger-1', user_id: 'user-123', amount_cents: 5000 }]
    const rpc = jest.fn().mockResolvedValue({ data: ledger, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      authUser: admin,
      rpc,
      tables: {
        profiles: [{ select: profile.select }],
        game_replays: [{ select: replayQuery.select }],
      },
    }))

    await expect(getAdminReplayDetail('game-1')).resolves.toEqual({
      replay: replayRow({ game_id: 'game-1' }),
      ledger,
    })
    expect(rpc).toHaveBeenCalledWith('get_replay_ledger', { p_game_id: 'game-1' })
  })

  it('registra errores de replay/ledger admin y devuelve valores seguros', async () => {
    const errorSpy = mockConsoleError()
    const profile = profileRoleQuery('admin')
    const replayQuery = replaySelectQuery({ data: null, error: { message: 'replay missing' } })
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'ledger missing' } })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      authUser: admin,
      rpc,
      tables: {
        profiles: [{ select: profile.select }],
        game_replays: [{ select: replayQuery.select }],
      },
    }))

    await expect(getAdminReplayDetail('game-404')).resolves.toEqual({ replay: null, ledger: [] })
    expect(errorSpy).toHaveBeenCalledWith('[getAdminReplayDetail] Replay error:', { message: 'replay missing' })
    expect(errorSpy).toHaveBeenCalledWith('[getAdminReplayDetail] Ledger error:', { message: 'ledger missing' })
    errorSpy.mockRestore()
  })

  it('hidrata detalle admin con frames del game-server cuando existen', async () => {
    process.env.GAME_SERVER_URL = 'https://game.test'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true, data: replayRow({ game_id: 'game-9', version: 2, frames: [{ tick: 9 }] }) }),
    })
    const profile = profileRoleQuery('admin')
    const replayQuery = replaySelectQuery({ data: replayRow({ game_id: 'game-9' }), error: null })
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      authUser: admin,
      rpc,
      tables: {
        profiles: [{ select: profile.select }],
        game_replays: [{ select: replayQuery.select }],
      },
    }))

    await expect(getAdminReplayDetail('game-9')).resolves.toMatchObject({
      replay: { game_id: 'game-9', version: 2, frames: [{ tick: 9 }] },
      ledger: [],
    })
  })
})
