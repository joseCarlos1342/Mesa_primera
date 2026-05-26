/**
 * @jest-environment node
 */
import { createClient } from '@/utils/supabase/server'
import { GET } from '../route'

const verifyOtp = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { verifyOtp },
  })),
}))

function makeRequest(url: string) {
  const nextUrl = new URL(url)
  return {
    nextUrl: Object.assign(nextUrl, {
      clone: () => new URL(nextUrl.toString()),
    }),
  } as any
}

describe('GET /api/auth/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyOtp.mockResolvedValue({ error: null })
  })

  it('verifica el token y redirige al path next sanitizado', async () => {
    const response = await GET(
      makeRequest('https://mesa.test/api/auth/confirm?token_hash=abc&type=recovery&next=/admin/security')
    )

    expect(createClient).toHaveBeenCalled()
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://mesa.test/admin/security')
  })

  it('evita open redirects cuando next no es relativo', async () => {
    const response = await GET(
      makeRequest('https://mesa.test/api/auth/confirm?token_hash=abc&type=recovery&next=https://evil.test')
    )

    expect(response.headers.get('location')).toBe('https://mesa.test/login/admin')
  })

  it('redirige a recovery con error si faltan parametros', async () => {
    const response = await GET(makeRequest('https://mesa.test/api/auth/confirm?token_hash=abc'))

    expect(createClient).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(
      'https://mesa.test/login/admin/recovery?token_hash=abc&error=invalid_or_expired_link'
    )
  })

  it('redirige a recovery con error si Supabase rechaza el token', async () => {
    verifyOtp.mockResolvedValueOnce({ error: { message: 'expired' } })

    const response = await GET(
      makeRequest('https://mesa.test/api/auth/confirm?token_hash=abc&type=recovery&next=/admin')
    )

    expect(response.headers.get('location')).toBe(
      'https://mesa.test/login/admin/recovery?token_hash=abc&type=recovery&next=%2Fadmin&error=invalid_or_expired_link'
    )
  })
})
