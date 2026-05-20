import { AuthError } from '@supabase/supabase-js'
import { loginWithPin } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { enforceSessionPolicy } from '../auth-actions-helpers'

jest.mock('@/lib/security/turnstile', () => ({
  verifyTurnstile: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('@/app/actions/anti-fraud', () => ({
  enforceRateLimiting: jest.fn().mockResolvedValue({ success: true }),
}))

const mockCookieGet = jest.fn()
const mockCookieSet = jest.fn()

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: mockCookieGet,
    set: mockCookieSet,
  })),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('../auth-actions-helpers', () => ({
  enforceSessionPolicy: jest.fn().mockResolvedValue(undefined),
}))

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }
  formData.set('cf-turnstile-response', 'test-token')
  return formData
}

function buildSupabase() {
  const eq = jest.fn().mockReturnThis()

  return {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'player-1' } },
        error: null,
      }),
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    rpc: jest.fn().mockImplementation((name: string) => {
      if (name === 'is_device_trusted') {
        return Promise.resolve({ data: true, error: null })
      }

      if (name === 'check_account_eligibility') {
        return Promise.resolve({ data: { blocked: false }, error: null })
      }

      return Promise.resolve({ data: null, error: null })
    }),
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq,
      }),
    }),
  }
}

describe('loginWithPin coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookieGet.mockReturnValue({ value: 'trusted-device-1' })
  })

  it('autentica, valida trusted device y redirige al inicio', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await loginWithPin(null, buildFormData({ phone: '3205802918', pin: '123456' }))

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      phone: '+573205802918',
      password: '123456',
    })
    expect(supabase.rpc).toHaveBeenCalledWith('is_device_trusted', {
      p_phone: '+573205802918',
      p_device_id: 'trusted-device-1',
    })
    expect(enforceSessionPolicy).toHaveBeenCalledWith('player-1')
    expect(mockCookieSet).toHaveBeenCalledWith(
      'mesa_primera_auth_bypass',
      '1',
      expect.objectContaining({
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60,
      }),
    )
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('devuelve mensaje seguro cuando las credenciales son inválidas', async () => {
    const supabase = buildSupabase()
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthError('Invalid login credentials', 400),
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await loginWithPin(null, buildFormData({ phone: '3205802918', pin: '000000' }))

    expect(result).toEqual({
      error: 'Número o clave incorrectos. Verifica tus datos.',
    })
    expect(redirect).not.toHaveBeenCalled()
    expect(enforceSessionPolicy).not.toHaveBeenCalled()
  })

  it('devuelve mensaje operativo cuando Supabase falla por outage de auth', async () => {
    const supabase = buildSupabase()
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthError('Legacy API keys are disabled', 403),
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await loginWithPin(null, buildFormData({ phone: '3205802918', pin: '123456' }))

    expect(result).toEqual({
      error: expect.stringContaining('servidor de autenticación'),
    })
  })

  it('para dispositivo no confiable cierra sesión parcial y envía OTP', async () => {
    const supabase = buildSupabase()
    mockCookieGet.mockReturnValue(undefined)
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await loginWithPin(null, buildFormData({ phone: '3205802918', pin: '123456' }))

    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      phone: '+573205802918',
      options: { shouldCreateUser: false },
    })
    expect(redirect).toHaveBeenCalledWith('/login/player/device-verify?phone=%2B573205802918')
  })
})
