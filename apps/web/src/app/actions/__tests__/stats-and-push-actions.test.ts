import { getLeaderboard, getMyStats } from '../stats'
import { hasPushSubscription, savePushSubscription } from '../push-subscription'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockUser = { id: 'user-123' }

function buildAuth(user: { id: string } | null = mockUser) {
  return {
    getUser: jest.fn().mockResolvedValue({ data: { user } }),
  }
}

function mockConsoleError() {
  return jest.spyOn(console, 'error').mockImplementation(() => {})
}

describe('stats actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('devuelve null cuando getMyStats se ejecuta sin usuario autenticado', async () => {
    const supabase = {
      auth: buildAuth(null),
      from: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getMyStats()).resolves.toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('combina estadísticas del jugador con el perfil relacionado', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        user_id: 'user-123',
        games_played: 12,
        games_won: 7,
        total_won_cents: 150000,
        total_lost_cents: 50000,
        total_rake_paid_cents: 12000,
        current_streak: 3,
        best_streak: 5,
        primeras_count: 4,
        chivos_count: 2,
        segundas_count: 1,
        last_game_at: '2026-01-01T00:00:00.000Z',
        profiles: { username: 'rivera', avatar_url: '/avatar.png', level: 8 },
      },
      error: null,
    })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    const from = jest.fn().mockReturnValue({ select })
    const supabase = { auth: buildAuth(), from }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await getMyStats()

    expect(from).toHaveBeenCalledWith('player_stats')
    expect(eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(result).toMatchObject({
      user_id: 'user-123',
      games_played: 12,
      username: 'rivera',
      avatar_url: '/avatar.png',
      level: 8,
    })
  })

  it('acepta perfiles relacionados como arreglo en getMyStats', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        user_id: 'user-123',
        games_played: 1,
        profiles: [{ username: 'array-profile', avatar_url: null, level: 2 }],
      },
      error: null,
    })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: buildAuth(),
      from: jest.fn().mockReturnValue({ select }),
    })

    await expect(getMyStats()).resolves.toMatchObject({
      username: 'array-profile',
      avatar_url: null,
      level: 2,
    })
  })

  it('devuelve null sin registrar error cuando no existen estadísticas', async () => {
    const errorSpy = mockConsoleError()
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: buildAuth(),
      from: jest.fn().mockReturnValue({ select }),
    })

    await expect(getMyStats()).resolves.toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('registra errores de Supabase y devuelve null al consultar estadísticas', async () => {
    const errorSpy = mockConsoleError()
    const dbError = { code: 'XX000', message: 'db down' }
    const single = jest.fn().mockResolvedValue({ data: null, error: dbError })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: buildAuth(),
      from: jest.fn().mockReturnValue({ select }),
    })

    await expect(getMyStats()).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalledWith('Error fetching player stats:', dbError)
    errorSpy.mockRestore()
  })

  it('consulta el leaderboard con la categoría solicitada', async () => {
    const data = [
      { user_id: 'user-1', username: 'Ana', avatar_url: null, score: 42 },
    ]
    const rpc = jest.fn().mockResolvedValue({ data, error: null })
    ;(createClient as jest.Mock).mockResolvedValue({ rpc })

    await expect(getLeaderboard('mejor_racha')).resolves.toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_leaderboard', {
      p_period: 'all_time',
      p_category: 'mejor_racha',
    })
  })

  it('devuelve lista vacía cuando falla la RPC del leaderboard', async () => {
    const errorSpy = mockConsoleError()
    const dbError = { message: 'rpc failed' }
    ;(createClient as jest.Mock).mockResolvedValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: dbError }),
    })

    await expect(getLeaderboard()).resolves.toEqual([])
    expect(errorSpy).toHaveBeenCalledWith('Error fetching leaderboard:', dbError)
    errorSpy.mockRestore()
  })
})

describe('push subscription actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza guardar una suscripción push sin usuario autenticado', async () => {
    const supabase = {
      auth: buildAuth(null),
      from: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await savePushSubscription({
      endpoint: 'https://push.test/1',
      keys: { p256dh: 'key', auth: 'auth' },
    })

    expect(result).toEqual({ error: 'No autenticado' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('guarda la suscripción push con conflicto por user_id y endpoint', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null })
    const from = jest.fn().mockReturnValue({ upsert })
    ;(createClient as jest.Mock).mockResolvedValue({ auth: buildAuth(), from })

    await expect(savePushSubscription({
      endpoint: 'https://push.test/1',
      keys: { p256dh: 'public-key', auth: 'auth-secret' },
    })).resolves.toEqual({ success: true })

    expect(from).toHaveBeenCalledWith('push_subscriptions')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        endpoint: 'https://push.test/1',
        p256dh: 'public-key',
        auth: 'auth-secret',
      }),
      { onConflict: 'user_id,endpoint' }
    )
    expect(upsert.mock.calls[0][0].updated_at).toEqual(expect.any(String))
  })

  it('devuelve error de usuario cuando Supabase rechaza la suscripción push', async () => {
    const errorSpy = mockConsoleError()
    const dbError = { message: 'constraint violation' }
    const upsert = jest.fn().mockResolvedValue({ error: dbError })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: buildAuth(),
      from: jest.fn().mockReturnValue({ upsert }),
    })

    await expect(savePushSubscription({
      endpoint: 'https://push.test/1',
      keys: { p256dh: 'public-key', auth: 'auth-secret' },
    })).resolves.toEqual({ error: 'Error al guardar suscripción push' })
    expect(errorSpy).toHaveBeenCalledWith('Error saving push subscription:', dbError)
    errorSpy.mockRestore()
  })

  it('devuelve false si hasPushSubscription se ejecuta sin usuario', async () => {
    const supabase = { auth: buildAuth(null), from: jest.fn() }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(hasPushSubscription()).resolves.toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('indica si el usuario tiene al menos una suscripción push', async () => {
    const eq = jest.fn().mockResolvedValue({ count: 1 })
    const select = jest.fn().mockReturnValue({ eq })
    const from = jest.fn().mockReturnValue({ select })
    ;(createClient as jest.Mock).mockResolvedValue({ auth: buildAuth(), from })

    await expect(hasPushSubscription()).resolves.toBe(true)
    expect(from).toHaveBeenCalledWith('push_subscriptions')
    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('trata count null como ausencia de suscripciones push', async () => {
    const eq = jest.fn().mockResolvedValue({ count: null })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: buildAuth(),
      from: jest.fn().mockReturnValue({ select }),
    })

    await expect(hasPushSubscription()).resolves.toBe(false)
  })
})
