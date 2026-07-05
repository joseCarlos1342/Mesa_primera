/**
 * @jest-environment node
 */
import { AccessToken } from 'livekit-server-sdk'
import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'

const addGrant = jest.fn()
const toJwt = jest.fn(async () => 'livekit-jwt')

jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn(() => ({ addGrant, toJwt })),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = createClient as jest.Mock

describe('POST /api/livekit', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
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
      ttl: '2h',
    })
    expect(addGrant).toHaveBeenCalledWith({ roomJoin: true, room: 'mesa-1' })
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
