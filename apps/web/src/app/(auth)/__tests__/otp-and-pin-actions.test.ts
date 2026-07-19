import crypto from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { enforceSessionPolicy } from '../auth-actions-helpers'
import { enforceRateLimiting } from '@/app/actions/anti-fraud'
import { verifyTurnstile } from '@/lib/security/turnstile'
import {
  enrollAdminTotp,
  loginWithPhone,
  loginWithPin,
  registerPlayer,
  setPlayerPin,
  signOut,
  startPinRecovery,
  verifyAdminTotpSetup,
  verifyOtp,
} from '../auth-actions'

const TEST_PHONE_LOCAL = '3000000000'
const TEST_PHONE_E164 = '+573000000000'
const TEST_PHONE_QUERY = '%2B573000000000'

const cookieGet = jest.fn()
const cookieSet = jest.fn()

jest.mock('@/lib/security/turnstile', () => ({
  verifyTurnstile: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('@/app/actions/anti-fraud', () => ({
  enforceRateLimiting: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

jest.mock('../auth-actions-helpers', () => ({
  enforceSessionPolicy: jest.fn().mockResolvedValue(undefined),
}))

function formData(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value)
  }
  data.set('cf-turnstile-response', 'test-token')
  return data
}

function buildSupabase(overrides: Record<string, unknown> = {}) {
  const firstEq = jest.fn().mockReturnThis()
  const secondEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn().mockReturnValue({ eq: firstEq })
  firstEq.mockReturnValue({ eq: secondEq })

  const supabase = {
    auth: {
      verifyOtp: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      updateUser: jest.fn().mockResolvedValue({ error: null }),
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      mfa: {
        enroll: jest.fn().mockResolvedValue({
          data: { id: 'factor-1', totp: { qr_code: 'qr-svg', secret: 'secret-123' } },
          error: null,
        }),
        challenge: jest.fn().mockResolvedValue({ data: { id: 'challenge-1' }, error: null }),
        verify: jest.fn().mockResolvedValue({ error: null }),
      },
    },
    rpc: jest.fn().mockImplementation((name: string) => {
      if (name === 'check_account_eligibility') {
        return Promise.resolve({ data: { blocked: false }, error: null })
      }
      if (name === 'check_phone_exists') {
        return Promise.resolve({ data: true, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    }),
    from: jest.fn().mockReturnValue({ update }),
    update,
    firstEq,
    secondEq,
    ...overrides,
  }

  return supabase
}

describe('OTP y PIN auth actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(cookies as jest.Mock).mockResolvedValue({ get: cookieGet, set: cookieSet })
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('trusted-device-123' as `${string}-${string}-${string}-${string}-${string}`)
    ;(createAdminClient as jest.Mock).mockResolvedValue({
      auth: {
        admin: {
          updateUserById: jest.fn().mockResolvedValue({ error: null }),
        },
      },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('verifyOtp en registro guarda el teléfono, confirma auth.users y redirige a PIN', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'register',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      phone: TEST_PHONE_E164,
      token: '123456',
      type: 'sms',
    })
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(supabase.update).toHaveBeenCalledWith({ phone: TEST_PHONE_E164 })
    expect(createAdminClient).toHaveBeenCalled()
    const admin = await (createAdminClient as jest.Mock).mock.results[0].value
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', { phone_confirm: true })
    expect(redirect).toHaveBeenCalledWith('/register/player/pin')
  })

  it('registerPlayer devuelve fieldErrors para datos inválidos sin tocar Supabase', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(registerPlayer(null, formData({
      phone: '123',
      fullName: '',
      nickname: '',
      avatarId: 'as-oros',
    }))).resolves.toHaveProperty('fieldErrors')

    expect(createClient).not.toHaveBeenCalled()
  })

  it('registerPlayer rechaza un teléfono ya registrado antes de enviar OTP', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(registerPlayer(null, formData({
      phone: TEST_PHONE_LOCAL,
      fullName: 'Jose Carlos',
      nickname: 'ChepeNuevo',
      avatarId: 'as-oros',
    }))).resolves.toEqual({
      fieldErrors: { phone: ['Este número ya está registrado. Por favor, inicia sesión.'] },
    })
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('registerPlayer devuelve mensaje seguro cuando el proveedor OTP está deshabilitado', async () => {
    const supabase = buildSupabase({
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
      auth: {
        ...buildSupabase().auth,
        signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'otp_disabled' } }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(registerPlayer(null, formData({
      phone: TEST_PHONE_LOCAL,
      fullName: 'Jose Carlos',
      nickname: 'ChepeNuevo',
      avatarId: 'as-oros',
    }))).resolves.toEqual({
      error: 'El servicio de SMS no está disponible en este momento. Por favor, inténtalo más tarde.',
    })
  })

  it('registerPlayer devuelve mensajes seguros para claves Supabase legacy y errores de perfil', async () => {
    const supabase = buildSupabase({
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
      auth: {
        ...buildSupabase().auth,
        signInWithOtp: jest.fn()
          .mockResolvedValueOnce({ error: { message: 'Invalid API key' } })
          .mockResolvedValueOnce({ error: { message: 'saving new user failed' } })
          .mockResolvedValueOnce({ error: { message: 'SMS provider down' } }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    const data = () => formData({ phone: TEST_PHONE_LOCAL, fullName: 'Jose Carlos', nickname: 'ChepeNuevo', avatarId: 'as-oros' })

    await expect(registerPlayer(null, data())).resolves.toEqual({ error: expect.stringContaining('servidor de autenticación') })
    await expect(registerPlayer(null, data())).resolves.toEqual({ error: expect.stringContaining('Error al crear el perfil') })
    await expect(registerPlayer(null, data())).resolves.toEqual({ error: 'SMS provider down' })
  })

  it('verifyOtp en device-verify registra dispositivo confiable y completa sesión', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '654321',
      flow: 'device-verify',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.rpc).toHaveBeenCalledWith('check_account_eligibility', { p_user_id: 'user-123' })
    expect(cookieSet).toHaveBeenCalledWith('device_trusted_id', 'trusted-device-123', expect.objectContaining({
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
    }))
    expect(supabase.rpc).toHaveBeenCalledWith('register_trusted_device', {
      p_device_id: 'trusted-device-123',
      p_trust_days: 30,
    })
    expect(enforceSessionPolicy).toHaveBeenCalledWith('user-123')
    expect(cookieSet).toHaveBeenCalledWith('mesa_primera_auth_bypass', '1', expect.objectContaining({
      httpOnly: false,
      maxAge: 60,
    }))
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('verifyOtp rechaza tokens inválidos antes de llamar Supabase', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '12',
      flow: 'register',
    }))).resolves.toEqual({ fieldErrors: { token: 'El código debe tener exactamente 6 dígitos' } })

    expect(createClient).not.toHaveBeenCalled()
  })

  it('verifyOtp bloquea antes de Supabase cuando el rate limit está agotado', async () => {
    ;(enforceRateLimiting as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Demasiados códigos enviados.',
    })

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'login',
    }))).resolves.toEqual({ error: 'Demasiados códigos enviados.' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('verifyOtp devuelve error cuando Supabase verifica OTP sin usuario', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        verifyOtp: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'login',
    }))).resolves.toEqual({ error: 'Error de verificación. Intenta de nuevo.' })
  })

  it('verifyOtp en registro sigue redirigiendo a PIN cuando falla el update de profiles', async () => {
    const firstEq = jest.fn().mockResolvedValue({
      error: { code: '42501', message: 'rls denied updating phone' },
    })
    const update = jest.fn().mockReturnValue({ eq: firstEq })
    const supabase = buildSupabase({ from: jest.fn().mockReturnValue({ update }), update })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'register',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(consoleErrSpy).toHaveBeenCalledWith(
      expect.stringContaining('[VERIFY_OTP] Error saving phone to profile'),
      'user-123',
      '42501',
      'rls denied updating phone',
    )
    expect(redirect).toHaveBeenCalledWith('/register/player/pin')
  })

  it('verifyOtp redirige a /register/player/pin para usuarios legacy con flow=login-set-pin', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'login-set-pin',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/register/player/pin')
    expect(supabase.rpc).not.toHaveBeenCalledWith('check_account_eligibility', expect.anything())
  })

  it('verifyOtp devuelve el mensaje crudo cuando Supabase rechaza el token verificado', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        verifyOtp: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Token has expired or is invalid' },
        }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'login',
    }))).resolves.toEqual({ error: 'Token has expired or is invalid' })
  })

  it('verifyOtp en flujo legacy/default valida sanción, aplica sesión y redirige al inicio', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'login',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.rpc).toHaveBeenCalledWith('check_account_eligibility', { p_user_id: 'user-123' })
    expect(enforceSessionPolicy).toHaveBeenCalledWith('user-123')
    expect(cookieSet).toHaveBeenCalledWith('mesa_primera_auth_bypass', '1', expect.any(Object))
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('verifyOtp bloquea login cuando la sanción no tiene fecha de expiración (permanente)', async () => {
    const supabase = buildSupabase({
      rpc: jest.fn().mockImplementation((name: string) => {
        if (name === 'check_account_eligibility') {
          return Promise.resolve({
            data: { blocked: true, reason: 'fraude confirmado' },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      }),
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await verifyOtp(null, formData({ phone: TEST_PHONE_E164, token: '123456', flow: 'login' }))

    expect(result).toEqual({ error: 'Tu cuenta ha sido suspendida permanentemente. Motivo: fraude confirmado' })
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(enforceSessionPolicy).not.toHaveBeenCalled()
  })

  it('verifyOtp continua con el login cuando la RPC check_account_eligibility lanza excepción (fail-open)', async () => {
    const supabase = buildSupabase({
      rpc: jest.fn().mockImplementation((name: string) => {
        if (name === 'check_account_eligibility') {
          return Promise.reject(new Error('network down'))
        }
        return Promise.resolve({ data: null, error: null })
      }),
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'login',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/')
    expect(enforceSessionPolicy).toHaveBeenCalledWith('user-123')
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('verifyOtp bloquea login cuando la cuenta tiene sanción activa', async () => {
    const supabase = buildSupabase({
      rpc: jest.fn().mockImplementation((name: string) => {
        if (name === 'check_account_eligibility') {
          return Promise.resolve({
            data: { blocked: true, reason: 'fraude', expires_at: '2026-07-01T00:00:00.000Z' },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      }),
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await verifyOtp(null, formData({ phone: TEST_PHONE_E164, token: '123456', flow: 'login' }))

    expect(result).toEqual({ error: expect.stringContaining('Tu cuenta está suspendida hasta') })
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(enforceSessionPolicy).not.toHaveBeenCalled()
  })

  it('verifyOtp en recovery redirige a cambio de PIN', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyOtp(null, formData({
      phone: TEST_PHONE_E164,
      token: '123456',
      flow: 'recovery',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/recovery/pin')
  })

  it('loginWithPin bloquea antes de Supabase cuando el rate limit está agotado', async () => {
    ;(enforceRateLimiting as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Demasiados intentos. Espera 60 segundos antes de volver a intentar.',
    })

    await expect(loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '123456' }))).resolves.toEqual({
      error: 'Demasiados intentos. Espera 60 segundos antes de volver a intentar.',
    })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('startPinRecovery bloquea antes de Supabase cuando Turnstile falla', async () => {
    ;(verifyTurnstile as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Verificación de seguridad fallida. Intenta de nuevo.',
    })
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(startPinRecovery(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'Verificación de seguridad fallida. Intenta de nuevo.',
    })
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('loginWithPhone bloquea antes de Supabase cuando Turnstile falla', async () => {
    ;(verifyTurnstile as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Verificación de seguridad fallida. Intenta de nuevo.',
    })
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'Verificación de seguridad fallida. Intenta de nuevo.',
    })
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('loginWithPin devuelve fieldErrors para phone o pin mal formateados', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const phoneInvalid = await loginWithPin(null, formData({ phone: '123', pin: '123456' }))
    expect(phoneInvalid).toHaveProperty('fieldErrors')
    expect(phoneInvalid.fieldErrors).toEqual(
      expect.objectContaining({ phone: expect.any(String) }),
    )
    expect(createClient).not.toHaveBeenCalled()

    const pinInvalid = await loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '12a' }))
    expect(pinInvalid).toHaveProperty('fieldErrors')
    expect(pinInvalid.fieldErrors).toEqual(
      expect.objectContaining({ pin: expect.any(String) }),
    )
    expect(createClient).not.toHaveBeenCalled()
  })

  it('setPlayerPin devuelve fieldErrors cuando pin y pinConfirm no coinciden', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await setPlayerPin(null, formData({
      pin: '123456',
      pinConfirm: '654321',
      flow: 'register',
    }))

    expect(result).toEqual({
      fieldErrors: { pinConfirm: 'Las claves no coinciden' },
    })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('setPlayerPin bloquea antes de Supabase cuando el rate limit está agotado', async () => {
    ;(enforceRateLimiting as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Demasiados cambios de PIN.',
    })

    await expect(setPlayerPin(null, formData({
      pin: '123456',
      pinConfirm: '123456',
      flow: 'register',
    }))).resolves.toEqual({ error: 'Demasiados cambios de PIN.' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('startPinRecovery devuelve fieldErrors para teléfono inválido sin tocar Supabase', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await startPinRecovery(null, formData({ phone: 'no-es-colombiano' }))

    expect(result).toHaveProperty('fieldErrors')
    expect(result.fieldErrors).toEqual(
      expect.objectContaining({ phone: expect.any(String) }),
    )
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('startPinRecovery bloquea antes de Supabase cuando el rate limit está agotado', async () => {
    ;(enforceRateLimiting as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Demasiadas recuperaciones.',
    })

    await expect(startPinRecovery(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'Demasiadas recuperaciones.',
    })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('loginWithPin devuelve error cuando la contraseña no entrega usuario', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPin(null, formData({
      phone: TEST_PHONE_LOCAL,
      pin: '123456',
    }))).resolves.toEqual({ error: 'Error al iniciar sesión. Intenta de nuevo.' })
  })

  it('loginWithPin en dispositivo desconocido reporta outage de claves legacy cuando el OTP falla con ese motivo', async () => {
    cookieGet.mockReturnValue(undefined)
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
        signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'Legacy API keys are disabled' } }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '123456' }))

    expect(result).toHaveProperty('error')
    expect(result.error).toEqual(expect.stringContaining('servidor de autenticación'))
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('loginWithPin devuelve mensaje seguro cuando falla el OTP de dispositivo desconocido', async () => {
    cookieGet.mockReturnValue(undefined)
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
        signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'otp_disabled' } }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPin(null, formData({
      phone: TEST_PHONE_LOCAL,
      pin: '123456',
    }))).resolves.toEqual({ error: 'El servicio de SMS no está disponible. Inténtalo más tarde.' })
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('loginWithPin completa sesión en dispositivo confiable', async () => {
    cookieGet.mockReturnValue({ value: 'device-1' })
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
      rpc: jest.fn().mockImplementation((name: string) => {
        if (name === 'is_device_trusted') return Promise.resolve({ data: true, error: null })
        if (name === 'check_account_eligibility') return Promise.resolve({ data: { blocked: false }, error: null })
        return Promise.resolve({ data: null, error: null })
      }),
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '123456' }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.rpc).toHaveBeenCalledWith('is_device_trusted', { p_phone: TEST_PHONE_E164, p_device_id: 'device-1' })
    expect(supabase.update).toHaveBeenCalledWith(expect.objectContaining({ last_login_at: expect.any(String) }))
    expect(enforceSessionPolicy).toHaveBeenCalledWith('user-123')
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('loginWithPin normaliza errores de PIN y de OTP de dispositivo desconocido', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithPassword: jest.fn()
          .mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid login credentials' } })
          .mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid API key' } })
          .mockResolvedValueOnce({ data: { user: null }, error: { message: 'otro error' } })
          .mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null }),
        signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'network fail' } }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '123456' }))).resolves.toEqual({ error: 'Número o clave incorrectos. Verifica tus datos.' })
    await expect(loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '123456' }))).resolves.toEqual({ error: expect.stringContaining('servidor de autenticación') })
    await expect(loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '123456' }))).resolves.toEqual({ error: 'otro error' })
    await expect(loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '123456' }))).resolves.toEqual({ error: 'No pudimos enviar el código de verificación. Inténtalo de nuevo.' })
  })

  it('loginWithPin redirige a verificacion de dispositivo cuando el OTP se envia correctamente en dispositivo desconocido', async () => {
    cookieGet.mockReturnValue(undefined)
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPin(null, formData({ phone: TEST_PHONE_LOCAL, pin: '123456' }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ phone: TEST_PHONE_E164, options: { shouldCreateUser: false } })
    expect(redirect).toHaveBeenCalledWith(`/login/player/device-verify?phone=${TEST_PHONE_QUERY}`)
  })

  it('loginWithPhone devuelve fieldErrors para teléfonos inválidos', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPhone(null, formData({ phone: '123' }))).resolves.toHaveProperty('fieldErrors')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('loginWithPhone devuelve mensaje seguro cuando OTP está deshabilitado', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'otp_disabled' } }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'El servicio de SMS no está disponible en este momento. Por favor, inténtalo más tarde.',
    })
  })

  it('loginWithPhone devuelve mensaje genérico cuando el error de Supabase incluye "saving new user"', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'saving new user to database failed' } }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'Error interno del servidor de base de datos. Por favor contacta soporte.',
    })
  })

  it('loginWithPhone registra un error de consola cuando la consulta admin a profiles falla durante la recuperación', async () => {
    const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const signInWithOtp = jest.fn().mockResolvedValue({ error: { message: 'User not found' } })
    const supabase = buildSupabase({ auth: { ...buildSupabase().auth, signInWithOtp } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(createAdminClient as jest.Mock).mockResolvedValueOnce({
      auth: { admin: { createUser: jest.fn() } },
    }).mockResolvedValueOnce({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'rls select denied' },
        }),
      })),
    })

    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'Si el número está registrado, recibirás un SMS. De lo contrario, regístrate primero.',
    })
    expect(consoleErrSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AUTH_RECOVERY] No fue posible consultar perfil por teléfono'),
      TEST_PHONE_E164,
      'rls select denied',
    )
  })

  it('loginWithPhone considera la recuperación ya aplicada cuando Supabase indica already registered', async () => {
    jest.spyOn(console, 'info').mockImplementation(() => undefined)
    const signInWithOtp = jest.fn()
      .mockResolvedValueOnce({ error: { message: 'User not found' } })
      .mockResolvedValueOnce({ error: null })
    const supabase = buildSupabase({ auth: { ...buildSupabase().auth, signInWithOtp } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(createAdminClient as jest.Mock).mockResolvedValueOnce({
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'User already registered' },
          }),
        },
      },
    }).mockResolvedValueOnce({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'user-123', username: 'chepe', role: 'player' },
          error: null,
        }),
      })),
    })

    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).rejects.toThrow('NEXT_REDIRECT')
    expect(signInWithOtp).toHaveBeenCalledTimes(2)
  })

  it('loginWithPhone retorna profile_not_found si el perfil admin no existe para el teléfono', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: { message: 'User not found' } })
    const supabase = buildSupabase({ auth: { ...buildSupabase().auth, signInWithOtp } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(createAdminClient as jest.Mock).mockResolvedValueOnce({
      auth: { admin: { createUser: jest.fn() } },
    }).mockResolvedValueOnce({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })

    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'Si el número está registrado, recibirás un SMS. De lo contrario, regístrate primero.',
    })
  })

  it('loginWithPhone recupera auth.user faltante desde perfil y reintenta OTP', async () => {
    jest.spyOn(console, 'info').mockImplementation(() => undefined)
    const signInWithOtp = jest.fn()
      .mockResolvedValueOnce({ error: { message: 'User not found' } })
      .mockResolvedValueOnce({ error: null })
    const supabase = buildSupabase({ auth: { ...buildSupabase().auth, signInWithOtp } })
    const createUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(createAdminClient as jest.Mock).mockResolvedValueOnce({
      auth: { admin: { createUser } },
    }).mockResolvedValueOnce({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'user-123', username: 'chepe', full_name: 'Jose Carlos', avatar_url: 'as-oros', role: 'player', phone: TEST_PHONE_E164 },
          error: null,
        }),
      })),
    })

    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).rejects.toThrow('NEXT_REDIRECT')

    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-123', phone: TEST_PHONE_E164, phone_confirm: true }))
    expect(signInWithOtp).toHaveBeenCalledTimes(2)
    expect(redirect).toHaveBeenCalledWith(`/login/player/verify?phone=${TEST_PHONE_QUERY}&flow=login-set-pin`)
  })

  it('loginWithPhone devuelve error de recuperación si el perfil está baneado o sigue faltando auth.user', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: { message: 'User not found' } })
    const supabase = buildSupabase({ auth: { ...buildSupabase().auth, signInWithOtp } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(createAdminClient as jest.Mock).mockResolvedValueOnce({
      auth: { admin: { createUser: jest.fn() } },
    }).mockResolvedValueOnce({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'user-123', is_banned: true }, error: null }),
      })),
    })

    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({ error: 'Tu cuenta se encuentra bloqueada. Contacta soporte.' })

    ;(createAdminClient as jest.Mock).mockResolvedValueOnce({
      auth: { admin: { createUser: jest.fn().mockResolvedValue({ data: null, error: { message: 'create failed' } }) } },
    }).mockResolvedValueOnce({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'user-123', username: 'chepe' }, error: null }),
      })),
    })
    await expect(loginWithPhone(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({ error: 'Si el número está registrado, recibirás un SMS. De lo contrario, regístrate primero.' })
  })

  it('setPlayerPin actualiza password, perfil, trusted device y redirige a biometría en registro', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(setPlayerPin(null, formData({
      pin: '123456',
      pinConfirm: '123456',
      flow: 'register',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: '123456' })
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(supabase.update).toHaveBeenCalledWith({ has_pin: true })
    expect(supabase.rpc).toHaveBeenCalledWith('register_trusted_device', {
      p_device_id: 'trusted-device-123',
      p_trust_days: 30,
    })
    expect(enforceSessionPolicy).toHaveBeenCalledWith('user-123')
    expect(redirect).toHaveBeenCalledWith('/register/player/biometric')
  })

  it('setPlayerPin redirige a login cuando no hay usuario autenticado', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(setPlayerPin(null, formData({
      pin: '123456',
      pinConfirm: '123456',
      flow: 'register',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/login/player')
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('setPlayerPin en recovery actualiza sesión y vuelve al inicio', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(setPlayerPin(null, formData({
      pin: '654321',
      pinConfirm: '654321',
      flow: 'recovery',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: '654321' })
    expect(enforceSessionPolicy).toHaveBeenCalledWith('user-123')
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('setPlayerPin informa error de updateUser y no bloquea si falla marcar has_pin', async () => {
    const supabaseWithUpdateError = buildSupabase({
      auth: { ...buildSupabase().auth, updateUser: jest.fn().mockResolvedValue({ error: { message: 'weak password' } }) },
    })
    ;(createClient as jest.Mock).mockResolvedValueOnce(supabaseWithUpdateError)

    await expect(setPlayerPin(null, formData({ pin: '123456', pinConfirm: '123456', flow: 'register' }))).resolves.toEqual({ error: 'No se pudo configurar la clave. Intenta de nuevo.' })

    const firstEq = jest.fn().mockResolvedValue({ error: { code: '42501', message: 'rls denied' } })
    const update = jest.fn().mockReturnValue({ eq: firstEq })
    const supabaseWithProfileError = buildSupabase({ from: jest.fn().mockReturnValue({ update }), update })
    ;(createClient as jest.Mock).mockResolvedValue(supabaseWithProfileError)

    await expect(setPlayerPin(null, formData({ pin: '654321', pinConfirm: '654321', flow: 'recovery' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('startPinRecovery no envía OTP cuando el teléfono no existe', async () => {
    const supabase = buildSupabase({
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(startPinRecovery(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'No encontramos una cuenta con este número. ¿Deseas registrarte?',
    })
    expect(supabase.rpc).toHaveBeenCalledWith('check_phone_exists', { p_phone: TEST_PHONE_E164 })
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('startPinRecovery envía OTP y redirige cuando el teléfono existe', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(startPinRecovery(null, formData({ phone: TEST_PHONE_LOCAL }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      phone: TEST_PHONE_E164,
      options: { shouldCreateUser: false },
    })
    expect(redirect).toHaveBeenCalledWith(`/recovery/verify?phone=${TEST_PHONE_QUERY}`)
  })

  it('startPinRecovery devuelve mensaje seguro cuando SMS está deshabilitado', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'otp_disabled' } }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(startPinRecovery(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({
      error: 'El servicio de SMS no está disponible. Inténtalo más tarde.',
    })
  })

  it('startPinRecovery recupera auth.user faltante y normaliza errores restantes', async () => {
    jest.spyOn(console, 'info').mockImplementation(() => undefined)
    const signInWithOtp = jest.fn()
      .mockResolvedValueOnce({ error: { message: 'User not found' } })
      .mockResolvedValueOnce({ error: null })
    const supabase = buildSupabase({ auth: { ...buildSupabase().auth, signInWithOtp } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(createAdminClient as jest.Mock).mockResolvedValueOnce({
      auth: { admin: { createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) } },
    }).mockResolvedValueOnce({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'user-123', username: 'chepe' }, error: null }),
      })),
    })

    await expect(startPinRecovery(null, formData({ phone: TEST_PHONE_LOCAL }))).rejects.toThrow('NEXT_REDIRECT')
    expect(signInWithOtp).toHaveBeenCalledTimes(2)

    const errorSupabase = buildSupabase({
      auth: { ...buildSupabase().auth, signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'Invalid API key' } }) },
    })
    ;(createClient as jest.Mock).mockResolvedValueOnce(errorSupabase)
    await expect(startPinRecovery(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({ error: expect.stringContaining('servidor de autenticación') })

    const rawErrorSupabase = buildSupabase({
      auth: { ...buildSupabase().auth, signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'sms fail' } }) },
    })
    ;(createClient as jest.Mock).mockResolvedValueOnce(rawErrorSupabase)
    await expect(startPinRecovery(null, formData({ phone: TEST_PHONE_LOCAL }))).resolves.toEqual({ error: 'sms fail' })
  })

  it('enrollAdminTotp devuelve QR y secreto para una sesión admin válida', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(enrollAdminTotp()).resolves.toEqual({
      factorId: 'factor-1',
      qrCode: 'qr-svg',
      secret: 'secret-123',
    })
    expect(supabase.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      issuer: 'Mesa Primera',
      friendlyName: 'Mesa Primera Admin',
    })
  })

  it('enrollAdminTotp devuelve el error crudo de mfa.enroll', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        mfa: {
          ...buildSupabase().auth.mfa,
          enroll: jest.fn().mockResolvedValue({ data: null, error: { message: 'factor limit reached' } }),
        },
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(enrollAdminTotp()).resolves.toEqual({ error: 'factor limit reached' })
  })

  it('enrollAdminTotp marca sesión expirada cuando no hay usuario', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(enrollAdminTotp()).resolves.toEqual({
      error: 'Sesión expirada. Inicia sesión de nuevo.',
      sessionExpired: true,
    })
  })

  it('verifyAdminTotpSetup exige factor y código', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyAdminTotpSetup(null, formData({ factorId: '', code: '' }))).resolves.toEqual({
      error: 'Factor ID y código son requeridos.',
    })
    expect(supabase.auth.mfa.challenge).not.toHaveBeenCalled()
  })

  it('verifyAdminTotpSetup retorna error cuando la sesión admin ya no es válida', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'expired' } }),
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await verifyAdminTotpSetup(null, formData({ factorId: 'factor-1', code: '123456' }))

    expect(result).toEqual({ error: 'Sesión expirada. Inicia sesión de nuevo.' })
    expect(supabase.auth.mfa.challenge).not.toHaveBeenCalled()
  })

  it('verifyAdminTotpSetup devuelve el mensaje crudo cuando challenge falla', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        mfa: {
          ...buildSupabase().auth.mfa,
          challenge: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'factor not found' },
          }),
        },
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await verifyAdminTotpSetup(null, formData({ factorId: 'factor-1', code: '123456' }))

    expect(result).toEqual({ error: 'factor not found' })
    expect(supabase.auth.mfa.verify).not.toHaveBeenCalled()
  })

  it('verifyAdminTotpSetup devuelve error amigable cuando verify rechaza el código', async () => {
    const supabase = buildSupabase({
      auth: {
        ...buildSupabase().auth,
        mfa: {
          ...buildSupabase().auth.mfa,
          verify: jest.fn().mockResolvedValue({ error: { message: 'Invalid TOTP code' } }),
        },
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await verifyAdminTotpSetup(null, formData({ factorId: 'factor-1', code: '000000' }))

    expect(result).toEqual({ error: 'Código inválido. Asegúrate de ingresar el código actual de tu app.' })
    expect(enforceSessionPolicy).not.toHaveBeenCalled()
  })

  it('verifyAdminTotpSetup verifica challenge, aplica sesión única y redirige al admin', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(verifyAdminTotpSetup(null, formData({
      factorId: 'factor-1',
      code: '123456',
    }))).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'factor-1' })
    expect(supabase.auth.mfa.verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      code: '123456',
    })
    expect(enforceSessionPolicy).toHaveBeenCalledWith('user-123')
    expect(redirect).toHaveBeenCalledWith('/admin')
  })

  it('signOut cierra sesión y redirige al destino solicitado', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(signOut('/login/admin')).rejects.toThrow('NEXT_REDIRECT')

    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/login/admin')
  })
})
