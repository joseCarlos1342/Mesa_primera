/**
 * @jest-environment node
 */
import { createClient } from '@/utils/supabase/server'
import { GET } from '../route'

const exchangeCodeForSession = jest.fn()
const getUser = jest.fn()
const maybeSingle = jest.fn()
const signOut = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { exchangeCodeForSession, getUser, signOut },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ maybeSingle })),
      })),
    })),
  })),
}))

function request(url: string, headers?: HeadersInit) {
  return new Request(url, { headers })
}

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    exchangeCodeForSession.mockResolvedValue({ error: null })
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    maybeSingle.mockResolvedValue({
      data: {
        role: 'player',
        username: 'chepe',
        full_name: 'Jose',
        avatar_url: 'avatar',
        phone: '+573001112233',
        has_pin: true,
      },
    })
  })

  it('rechaza callbacks sin code', async () => {
    const response = await GET(request('https://mesa.test/api/auth/callback'))

    expect(createClient).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('https://mesa.test/login/player?error=missing_code')
  })

  it('redirige con error seguro si falla el intercambio de code', async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: { message: 'bad code' } })

    const response = await GET(request('https://mesa.test/api/auth/callback?code=abc'))

    expect(response.headers.get('location')).toBe('https://mesa.test/login/player?error=bad%20code')
  })

  it('envia a completar registro cuando el perfil esta incompleto', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { role: 'player', username: null } })

    const response = await GET(request('https://mesa.test/api/auth/callback?code=abc'))

    expect(response.headers.get('location')).toBe('https://mesa.test/register/player/complete')
  })

  it('bloquea Google para admins y cierra sesion', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { role: 'admin' } })

    const response = await GET(request('https://mesa.test/api/auth/callback?code=abc'))

    expect(signOut).toHaveBeenCalled()
    expect(response.headers.get('location')).toContain('/login/player?error=')
    expect(response.headers.get('location')).toContain('Google%20solo')
  })

  it('redirige a crear PIN si el perfil completo aun no tiene PIN', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: {
        role: 'player',
        username: 'chepe',
        full_name: 'Jose',
        avatar_url: 'avatar',
        phone: '+573001112233',
        has_pin: false,
      },
    })

    const response = await GET(request('https://mesa.test/api/auth/callback?code=abc'))

    expect(response.headers.get('location')).toBe('https://mesa.test/register/player/pin')
  })

  it('redirige al next relativo usando forwarded host de Vercel', async () => {
    const response = await GET(
      request('https://internal.vercel.test/api/auth/callback?code=abc&next=/dashboard', {
        'x-forwarded-host': 'mesa.example.test',
      })
    )

    expect(response.headers.get('location')).toBe('https://mesa.example.test/dashboard')
  })

  it('normaliza next externo para evitar open redirect', async () => {
    const response = await GET(
      request('https://mesa.test/api/auth/callback?code=abc&next=https://evil.test')
    )

    expect(response.headers.get('location')).toBe('https://mesa.test/')
  })
})
