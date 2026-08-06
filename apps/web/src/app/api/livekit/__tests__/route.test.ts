/**
 * @jest-environment node
 */
import { AccessToken } from 'livekit-server-sdk'
import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'
import { checkDistributedRateLimit, getClientIp, redis } from '@/utils/redis'

const addGrant = jest.fn()
const toJwt = jest.fn(async () => 'livekit-jwt')

jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn(() => ({ addGrant, toJwt })),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/utils/redis', () => ({
  redis: { get: jest.fn().mockResolvedValue(null) },
  checkDistributedRateLimit: jest.fn().mockResolvedValue({ success: true, reset: 60 }),
  getClientIp: jest.fn().mockResolvedValue('127.0.0.1'),
}))

const mockCreateClient = createClient as jest.Mock
const mockRedisGet = redis.get as jest.Mock
const mockCheckDistributedRateLimit = checkDistributedRateLimit as jest.Mock
const mockGetClientIp = getClientIp as jest.Mock
const mockFetch = jest.fn()

describe('POST /api/livekit', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    mockRedisGet.mockResolvedValue(null)
    mockCheckDistributedRateLimit.mockResolvedValue({ success: true, reset: 60 })
    mockGetClientIp.mockResolvedValue('127.0.0.1')
    global.fetch = mockFetch
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      authorized: true,
      role: 'player',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-auth-1',
              user_metadata: { username: 'Ana Mesa', full_name: 'Ana Mesa' },
              email: 'ana@example.test',
            },
          },
          error: null,
        }),
      },
    })
    process.env = {
      ...originalEnv,
      LIVEKIT_API_KEY: 'api-key',
      LIVEKIT_API_SECRET: 'api-secret',
      LIVEKIT_URL: 'wss://voice.example.test',
      REDIS_URL: 'redis://voice.example.test',
      GAME_SERVER_URL: 'https://game.example.test',
      INTERNAL_API_SECRET: 'internal-secret',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('retorna token y url derivando identidad desde la sesión autenticada', async () => {
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1', username: 'Atacante', userId: 'otro-user' }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ token: 'livekit-jwt', url: 'wss://voice.example.test' })
    expect(AccessToken).toHaveBeenCalledWith('api-key', 'api-secret', {
      identity: 'user-auth-1',
      name: 'Ana Mesa',
      ttl: '5m',
    })
    expect(addGrant).toHaveBeenCalledWith({ roomJoin: true, room: 'mesa-1', canPublish: true })
  })

  it('rechaza requests no autenticados antes de generar tokens', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'No autenticado' })
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('emite un token sin permiso de publicación para jugadores silenciados', async () => {
    mockRedisGet.mockResolvedValueOnce('1')
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    })

    await POST(request as any)

    expect(addGrant).toHaveBeenCalledWith({ roomJoin: true, room: 'mesa-1', canPublish: false })
  })

  it('rechaza a un usuario autenticado que no pertenece a la sala', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: false,
      authorized: false,
    }), { status: 403, headers: { 'Content-Type': 'application/json' } }))
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-ajena', userId: 'attacker' }),
    })

    const response = await POST(request as any)

    expect(response.status).toBe(403)
    expect(AccessToken).not.toHaveBeenCalled()
    expect(mockRedisGet).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith('https://game.example.test/api/internal/livekit/authorize', expect.objectContaining({
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': 'internal-secret',
      },
      body: JSON.stringify({ roomId: 'mesa-ajena', userId: 'user-auth-1' }),
    }))
  })

  it('falla cerrado ante una respuesta interna malformada', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const response = await POST(new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    }) as any)

    expect(response.status).toBe(503)
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('falla cerrado ante un rol interno desconocido', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: true,
      authorized: true,
      role: 'admin',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const response = await POST(new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    }) as any)

    expect(response.status).toBe(503)
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('devuelve 429 y no consulta la room cuando se agota el rate limit', async () => {
    mockCheckDistributedRateLimit.mockResolvedValueOnce({ success: false, reset: 42 })
    const response = await POST(new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    }) as any)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockRedisGet).not.toHaveBeenCalled()
  })

  it('devuelve 503 si el rate limiter distribuido no está disponible', async () => {
    mockCheckDistributedRateLimit.mockRejectedValueOnce(new Error('Redis unavailable'))
    const response = await POST(new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    }) as any)

    expect(response.status).toBe(503)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('rechaza un body sin sala en lugar de usar una sala fallback', async () => {
    const response = await POST(new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({}),
    }) as any)

    expect(response.status).toBe(400)
    expect(mockCheckDistributedRateLimit).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('falla cerrado si Redis no está configurado', async () => {
    delete process.env.REDIS_URL
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'No se pudo verificar el estado de moderación.' })
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('falla cerrado si Redis rechaza la consulta de moderación', async () => {
    mockRedisGet.mockRejectedValueOnce(new Error('Redis unavailable'))
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'No se pudo verificar el estado de moderación.' })
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('rechaza nombres de sala invalidos sin usar fallback permisivo', async () => {
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'https://evil.test/room' }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Sala inválida' })
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('no emite secretos cuando faltan credenciales de LiveKit', async () => {
    delete process.env.LIVEKIT_API_SECRET
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Server misconfigured. LiveKit credentials are required.' })
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('traduce errores del proveedor a un mensaje seguro', async () => {
    toJwt.mockRejectedValueOnce(new Error('private signing failure'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1' }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to generate token' })
    expect(consoleSpy).toHaveBeenCalledWith('Error generating LiveKit token:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})
