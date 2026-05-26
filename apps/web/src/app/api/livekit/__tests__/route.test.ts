/**
 * @jest-environment node
 */
import { AccessToken } from 'livekit-server-sdk'
import { POST } from '../route'

const addGrant = jest.fn()
const toJwt = jest.fn(async () => 'livekit-jwt')

jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn(() => ({ addGrant, toJwt })),
}))

describe('POST /api/livekit', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
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

  it('retorna token y url para un request valido', async () => {
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: JSON.stringify({ room: 'mesa-1', username: 'Jose', userId: 'user-1' }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ token: 'livekit-jwt', url: 'wss://voice.example.test' })
    expect(AccessToken).toHaveBeenCalledWith('api-key', 'api-secret', {
      identity: 'user-1',
      name: 'Jose',
      ttl: '2h',
    })
    expect(addGrant).toHaveBeenCalledWith({ roomJoin: true, room: 'mesa-1' })
  })

  it('usa valores seguros por defecto si el body viene vacio o invalido', async () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.1234)
    const request = new Request('https://mesa.test/api/livekit', {
      method: 'POST',
      body: 'no-json',
    })

    const response = await POST(request as any)

    expect(response.status).toBe(200)
    expect(AccessToken).toHaveBeenCalledWith('api-key', 'api-secret', {
      identity: 'User-1234',
      name: 'User-1234',
      ttl: '2h',
    })
    expect(addGrant).toHaveBeenCalledWith({ roomJoin: true, room: 'general-lobby' })
  })

  it('no emite secretos cuando faltan credenciales de LiveKit', async () => {
    delete process.env.LIVEKIT_API_SECRET
    const request = new Request('https://mesa.test/api/livekit', { method: 'POST' })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Server misconfigured. LiveKit credentials are required.' })
    expect(AccessToken).not.toHaveBeenCalled()
  })

  it('traduce errores del proveedor a un mensaje seguro', async () => {
    toJwt.mockRejectedValueOnce(new Error('private signing failure'))
    const request = new Request('https://mesa.test/api/livekit', { method: 'POST' })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to generate token' })
  })
})
