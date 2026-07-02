import {
  completeAdminPasswordReset,
  getAdminSecuritySnapshot,
  requestAdminEmailChange,
  requestAdminPasswordReset,
  resetAdminTotpFactor,
  rotateAdminRecoveryCodes,
  revokeOtherAdminSessions,
  signOutAllAdminSessions,
} from '../admin-security'
import { createAdminClient, createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { logAdminAction } from '../admin-audit'

jest.mock('@/lib/admin-recovery-codes', () => ({
  RECOVERY_CODE_COUNT: 2,
  generateAdminRecoveryCodes: jest.fn(() => ['ABCD-EFGH-JKLM', 'NPQR-STUV-WXYZ']),
  hashAdminRecoveryCode: jest.fn((code: string) => `hash:${code}`),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}))

jest.mock('../admin-audit', () => ({
  logAdminAction: jest.fn(),
}))

function buildHeaders(host = 'localhost:3000', proto = 'http') {
  return {
    get: jest.fn((name: string) => {
      if (name === 'x-forwarded-host') return host
      if (name === 'host') return host
      if (name === 'x-forwarded-proto') return proto
      return null
    }),
  }
}

function buildEmptyHeaders() {
  return {
    get: jest.fn(() => null),
  }
}

function buildAdminSupabase(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'admin-123',
    email: 'admin@mesa.test',
    role: 'authenticated',
  }

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      mfa: {
        listFactors: jest.fn().mockResolvedValue({
          data: {
            all: [{ id: 'totp-1', factor_type: 'totp', status: 'verified' }],
            totp: [{ id: 'totp-1', factor_type: 'totp', status: 'verified' }],
            phone: [],
          },
          error: null,
        }),
        challenge: jest.fn().mockResolvedValue({
          data: { id: 'challenge-1' },
          error: null,
        }),
        verify: jest.fn().mockResolvedValue({ data: { verified: true }, error: null }),
        unenroll: jest.fn().mockResolvedValue({ error: null }),
        getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({
          data: { currentLevel: 'aal2', nextLevel: 'aal2' },
          error: null,
        }),
      },
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    }),
    ...overrides,
  }
}

function buildAdminServiceSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      admin: {
        updateUserById: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-123', email: 'admin@mesa.test' } },
          error: null,
        }),
      },
    },
    ...overrides,
  }
}

describe('Admin Security Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(headers as any).mockResolvedValue(buildHeaders())
    delete process.env.APP_URL
  })

  afterEach(() => {
    delete process.env.APP_URL
  })

  it('sends an admin recovery email to the password reset page', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'admin@mesa.test')

    const result = await requestAdminPasswordReset(null, formData)

    expect(result).toEqual({ success: 'Revisa tu correo para continuar el restablecimiento.' })
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('admin@mesa.test', {
      redirectTo: 'http://localhost:3000/login/admin/password',
    })
  })

  it('rejects invalid admin password reset emails before calling Supabase', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'correo-invalido')

    await expect(requestAdminPasswordReset(null, formData)).resolves.toHaveProperty('fieldErrors.email')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('rejects missing admin password reset emails before reading request headers', async () => {
    const formData = new FormData()

    await expect(requestAdminPasswordReset(null, formData)).resolves.toHaveProperty('fieldErrors.email')
    expect(createClient).not.toHaveBeenCalled()
    expect(headers).not.toHaveBeenCalled()
  })

  it('returns provider errors from admin password reset requests', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        resetPasswordForEmail: jest.fn().mockResolvedValue({ error: { message: 'SMTP offline' } }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'admin@mesa.test')

    await expect(requestAdminPasswordReset(null, formData)).resolves.toEqual({ error: 'SMTP offline' })
  })

  it('uses forwarded origin when APP_URL is not configured for non-local requests', async () => {
    ;(headers as any).mockResolvedValue(buildHeaders('admin.mesa.test', 'https'))
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'admin@mesa.test')

    await requestAdminPasswordReset(null, formData)

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('admin@mesa.test', {
      redirectTo: 'https://admin.mesa.test/login/admin/password',
    })
  })

  it('falls back to localhost when recovery headers do not expose a host', async () => {
    ;(headers as any).mockResolvedValue(buildEmptyHeaders())
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'admin@mesa.test')

    await requestAdminPasswordReset(null, formData)

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('admin@mesa.test', {
      redirectTo: 'http://localhost:3000/login/admin/password',
    })
  })

  it('prefers APP_URL over forwarded headers for admin recovery links', async () => {
    process.env.APP_URL = 'https://primerariveradalos4ases.com'
    ;(headers as any).mockResolvedValue(buildHeaders('staging.mesa.test', 'https'))

    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'admin@mesa.test')

    await requestAdminPasswordReset(null, formData)

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('admin@mesa.test', {
      redirectTo: 'https://primerariveradalos4ases.com/login/admin/password',
    })
  })

  it('keeps localhost as the recovery origin during local development even when APP_URL is configured', async () => {
    process.env.APP_URL = 'https://primerariveradalos4ases.com'
    ;(headers as any).mockResolvedValue(buildHeaders('localhost:3000', 'http'))

    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'admin@mesa.test')

    await requestAdminPasswordReset(null, formData)

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('admin@mesa.test', {
      redirectTo: 'http://localhost:3000/login/admin/password',
    })
  })

  it('updates the admin password from a recovery session and records the audit event', async () => {
    const supabase = buildAdminSupabase()
    const adminSupabase = buildAdminServiceSupabase()
    ;(createClient as any).mockResolvedValue(supabase)
    ;(createAdminClient as any).mockResolvedValue(adminSupabase)

    const formData = new FormData()
    formData.append('password', 'NuevaClave123')
    formData.append('passwordConfirm', 'NuevaClave123')

    const result = await completeAdminPasswordReset(null, formData)

    expect(result).toEqual({ success: 'Contraseña actualizada. Ya puedes volver al panel.' })
    expect(adminSupabase.auth.admin.updateUserById).toHaveBeenCalledWith('admin-123', {
      password: 'NuevaClave123',
    })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'admin_password_reset_completed',
      'admin_security',
      'admin-123',
      expect.objectContaining({ email: 'admin@mesa.test' }),
      expect.objectContaining({ context: 'security' })
    )
  })

  it('records completed password resets even when the admin email is absent', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-123', email: null } }, error: null }),
      },
    })
    const adminSupabase = buildAdminServiceSupabase()
    ;(createClient as any).mockResolvedValue(supabase)
    ;(createAdminClient as any).mockResolvedValue(adminSupabase)

    const formData = new FormData()
    formData.append('password', 'NuevaClave123')
    formData.append('passwordConfirm', 'NuevaClave123')

    await expect(completeAdminPasswordReset(null, formData)).resolves.toEqual({
      success: 'Contraseña actualizada. Ya puedes volver al panel.',
    })
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'admin_password_reset_completed',
      'admin_security',
      'admin-123',
      expect.objectContaining({ email: null }),
      expect.objectContaining({ context: 'security' })
    )
  })

  it('returns field errors when password confirmation does not match', async () => {
    const formData = new FormData()
    formData.append('password', 'NuevaClave123')
    formData.append('passwordConfirm', 'OtraClave123')

    await expect(completeAdminPasswordReset(null, formData)).resolves.toHaveProperty('fieldErrors')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns field errors when password reset fields are missing', async () => {
    const formData = new FormData()

    await expect(completeAdminPasswordReset(null, formData)).resolves.toHaveProperty('fieldErrors')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('propagates admin API errors when completing password reset', async () => {
    const supabase = buildAdminSupabase()
    const adminSupabase = buildAdminServiceSupabase({
      auth: {
        admin: {
          updateUserById: jest.fn().mockResolvedValue({ error: { message: 'No se pudo actualizar' } }),
        },
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)
    ;(createAdminClient as any).mockResolvedValue(adminSupabase)

    const formData = new FormData()
    formData.append('password', 'NuevaClave123')
    formData.append('passwordConfirm', 'NuevaClave123')

    await expect(completeAdminPasswordReset(null, formData)).resolves.toEqual({ error: 'No se pudo actualizar' })
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('does not complete password reset without an authenticated admin', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('password', 'NuevaClave123')
    formData.append('passwordConfirm', 'NuevaClave123')

    await expect(completeAdminPasswordReset(null, formData)).resolves.toEqual({ error: 'No autenticado' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('denies password reset when the authenticated user is not admin', async () => {
    const supabase = buildAdminSupabase({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'player' }, error: null }),
      }),
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('password', 'NuevaClave123')
    formData.append('passwordConfirm', 'NuevaClave123')

    await expect(completeAdminPasswordReset(null, formData)).resolves.toEqual({ error: 'Acceso denegado' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('changes the admin email only after verifying the current TOTP code', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    const result = await requestAdminEmailChange(null, formData)

    expect(result).toEqual({ success: 'Confirma el cambio desde el correo para completar la actualización.' })
    expect(supabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'totp-1' })
    expect(supabase.auth.mfa.verify).toHaveBeenCalledWith({
      factorId: 'totp-1',
      challengeId: 'challenge-1',
      code: '123456',
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith(
      { email: 'nuevo-admin@mesa.test' },
      { emailRedirectTo: 'http://localhost:3000/api/auth/confirm?next=/admin/security' }
    )
  })

  it('audits email change requests with null current email when auth metadata is incomplete', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-123', email: null } }, error: null }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await expect(requestAdminEmailChange(null, formData)).resolves.toEqual({
      success: 'Confirma el cambio desde el correo para completar la actualización.',
    })
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'admin_email_change_requested',
      'admin_security',
      'admin-123',
      expect.objectContaining({ current_email: null, requested_email: 'nuevo-admin@mesa.test' }),
      expect.objectContaining({ context: 'security' })
    )
  })

  it('returns field errors for invalid admin email change input', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'bad-email')
    formData.append('code', '12')

    await expect(requestAdminEmailChange(null, formData)).resolves.toHaveProperty('fieldErrors')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns field errors when the admin email change code is missing', async () => {
    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')

    await expect(requestAdminEmailChange(null, formData)).resolves.toHaveProperty('fieldErrors.code')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('blocks email change when no verified TOTP factor exists', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        mfa: {
          ...buildAdminSupabase().auth.mfa,
          listFactors: jest.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
        },
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await expect(requestAdminEmailChange(null, formData)).resolves.toEqual({
      error: 'No hay factor TOTP configurado para esta cuenta.',
    })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('returns MFA provider errors before challenging email change', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        mfa: {
          ...buildAdminSupabase().auth.mfa,
          listFactors: jest.fn().mockResolvedValue({ data: null, error: { message: 'MFA no disponible' } }),
        },
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await expect(requestAdminEmailChange(null, formData)).resolves.toEqual({ error: 'MFA no disponible' })
    expect(supabase.auth.mfa.challenge).not.toHaveBeenCalled()
  })

  it('returns challenge errors when verifying email change TOTP', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        mfa: {
          ...buildAdminSupabase().auth.mfa,
          challenge: jest.fn().mockResolvedValue({ data: null, error: { message: 'Challenge fallido' } }),
        },
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await expect(requestAdminEmailChange(null, formData)).resolves.toEqual({ error: 'Challenge fallido' })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('returns a safe error when the current TOTP code is invalid', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        mfa: {
          ...buildAdminSupabase().auth.mfa,
          verify: jest.fn().mockResolvedValue({ error: { message: 'Invalid code' } }),
        },
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await expect(requestAdminEmailChange(null, formData)).resolves.toEqual({
      error: 'Código TOTP inválido. Intenta de nuevo.',
    })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('propagates updateUser errors when requesting email change', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        updateUser: jest.fn().mockResolvedValue({ data: null, error: { message: 'Correo rechazado' } }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await expect(requestAdminEmailChange(null, formData)).resolves.toEqual({ error: 'Correo rechazado' })
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('does not request admin email changes without an authenticated admin', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await expect(requestAdminEmailChange(null, formData)).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.auth.mfa.challenge).not.toHaveBeenCalled()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('prefers APP_URL over forwarded headers for admin email change links', async () => {
    process.env.APP_URL = 'https://primerariveradalos4ases.com'
    ;(headers as any).mockResolvedValue(buildHeaders('staging.mesa.test', 'https'))

    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await requestAdminEmailChange(null, formData)

    expect(supabase.auth.updateUser).toHaveBeenCalledWith(
      { email: 'nuevo-admin@mesa.test' },
      { emailRedirectTo: 'https://primerariveradalos4ases.com/api/auth/confirm?next=/admin/security' }
    )
  })

  it('keeps localhost as the email confirmation origin during local development even when APP_URL is configured', async () => {
    process.env.APP_URL = 'https://primerariveradalos4ases.com'
    ;(headers as any).mockResolvedValue(buildHeaders('localhost:3000', 'http'))

    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('email', 'nuevo-admin@mesa.test')
    formData.append('code', '123456')

    await requestAdminEmailChange(null, formData)

    expect(supabase.auth.updateUser).toHaveBeenCalledWith(
      { email: 'nuevo-admin@mesa.test' },
      { emailRedirectTo: 'http://localhost:3000/api/auth/confirm?next=/admin/security' }
    )
  })

  it('resets the current TOTP factor only after verifying the code and sends the user to setup again', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '654321')

    const result = await resetAdminTotpFactor(null, formData)

    expect(result).toEqual({
      success: 'Factor TOTP eliminado. Configúralo de nuevo para continuar.',
      redirectTo: '/login/admin/mfa/setup?reset=1',
    })
    expect(supabase.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'totp-1' })
  })

  it('returns field errors when resetting TOTP with an invalid code', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '12')

    await expect(resetAdminTotpFactor(null, formData)).resolves.toHaveProperty('fieldErrors')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns field errors when resetting TOTP without a code', async () => {
    const formData = new FormData()

    await expect(resetAdminTotpFactor(null, formData)).resolves.toHaveProperty('fieldErrors.code')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('propagates unenroll errors when resetting the current TOTP factor', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        mfa: {
          ...buildAdminSupabase().auth.mfa,
          unenroll: jest.fn().mockResolvedValue({ error: { message: 'No se pudo remover' } }),
        },
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '654321')

    await expect(resetAdminTotpFactor(null, formData)).resolves.toEqual({ error: 'No se pudo remover' })
  })

  it('does not reset the TOTP factor when the current code is rejected', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        mfa: {
          ...buildAdminSupabase().auth.mfa,
          verify: jest.fn().mockResolvedValue({ error: { message: 'Invalid code' } }),
        },
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '654321')

    await expect(resetAdminTotpFactor(null, formData)).resolves.toEqual({
      error: 'Código TOTP inválido. Intenta de nuevo.',
    })
    expect(supabase.auth.mfa.unenroll).not.toHaveBeenCalled()
  })

  it('does not reset TOTP factor without an authenticated admin', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '654321')

    await expect(resetAdminTotpFactor(null, formData)).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.auth.mfa.unenroll).not.toHaveBeenCalled()
  })

  it('revokes every other admin session without closing the current one', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const result = await revokeOtherAdminSessions()

    expect(result).toEqual({ success: 'Las demás sesiones fueron cerradas.' })
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' })
  })

  it('propagates errors when revoking other admin sessions fails', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        signOut: jest.fn().mockResolvedValue({ error: { message: 'Auth offline' } }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(revokeOtherAdminSessions()).resolves.toEqual({ error: 'Auth offline' })
  })

  it('signs out all admin sessions and requests an admin login redirect', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(signOutAllAdminSessions()).resolves.toEqual({
      success: 'Todas las sesiones fueron cerradas.',
      redirectTo: '/login/admin?revoked=1',
    })
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'admin_all_sessions_revoked',
      'admin_security',
      'admin-123',
      { scope: 'global' },
      { context: 'security' },
    )
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
  })

  it('rotates admin recovery codes only after verifying the current TOTP code', async () => {
    const deleteEq = jest.fn().mockResolvedValue({ error: null })
    const insert = jest.fn().mockResolvedValue({ error: null })
    const supabase = buildAdminSupabase({
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }
        }

        if (table === 'admin_mfa_recovery_codes') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: deleteEq,
            }),
            insert,
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '111222')

    const result = await rotateAdminRecoveryCodes(null, formData)

    expect(result).toEqual({
      success: 'Códigos de recuperación regenerados. Guárdalos en un lugar seguro.',
      recoveryCodes: ['ABCD-EFGH-JKLM', 'NPQR-STUV-WXYZ'],
    })
    expect(supabase.auth.mfa.verify).toHaveBeenCalledWith({
      factorId: 'totp-1',
      challengeId: 'challenge-1',
      code: '111222',
    })
    expect(deleteEq).toHaveBeenCalledWith('admin_id', 'admin-123')
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({ admin_id: 'admin-123', code_hash: 'hash:ABCD-EFGH-JKLM' }),
      expect.objectContaining({ admin_id: 'admin-123', code_hash: 'hash:NPQR-STUV-WXYZ' }),
    ])
  })

  it('returns delete errors when rotating admin recovery codes fails before insert', async () => {
    const deleteEq = jest.fn().mockResolvedValue({ error: { message: 'No se pudo limpiar' } })
    const insert = jest.fn()
    const supabase = buildAdminSupabase({
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }
        }

        if (table === 'admin_mfa_recovery_codes') {
          return {
            delete: jest.fn().mockReturnValue({ eq: deleteEq }),
            insert,
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '111222')

    await expect(rotateAdminRecoveryCodes(null, formData)).resolves.toEqual({ error: 'No se pudo limpiar' })
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns field errors when rotating recovery codes with invalid TOTP code format', async () => {
    const formData = new FormData()
    formData.append('code', '12')

    await expect(rotateAdminRecoveryCodes(null, formData)).resolves.toHaveProperty('fieldErrors')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns field errors when rotating recovery codes without a TOTP code', async () => {
    const formData = new FormData()

    await expect(rotateAdminRecoveryCodes(null, formData)).resolves.toHaveProperty('fieldErrors.code')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns insert errors when rotating admin recovery codes cannot store new codes', async () => {
    const deleteEq = jest.fn().mockResolvedValue({ error: null })
    const insert = jest.fn().mockResolvedValue({ error: { message: 'No se pudo guardar' } })
    const supabase = buildAdminSupabase({
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }
        }

        if (table === 'admin_mfa_recovery_codes') {
          return {
            delete: jest.fn().mockReturnValue({ eq: deleteEq }),
            insert,
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '111222')

    await expect(rotateAdminRecoveryCodes(null, formData)).resolves.toEqual({ error: 'No se pudo guardar' })
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('does not rotate recovery codes without an authenticated admin', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '111222')

    await expect(rotateAdminRecoveryCodes(null, formData)).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.auth.mfa.challenge).not.toHaveBeenCalled()
  })

  it('does not delete recovery codes when the current TOTP code is rejected', async () => {
    const recoveryCodesTable = {
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        mfa: {
          ...buildAdminSupabase().auth.mfa,
          verify: jest.fn().mockResolvedValue({ error: { message: 'Invalid code' } }),
        },
      },
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }
        }

        if (table === 'admin_mfa_recovery_codes') {
          return recoveryCodesTable
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('code', '111222')

    await expect(rotateAdminRecoveryCodes(null, formData)).resolves.toEqual({
      error: 'Código TOTP inválido. Intenta de nuevo.',
    })
    expect(recoveryCodesTable.delete).not.toHaveBeenCalled()
    expect(recoveryCodesTable.insert).not.toHaveBeenCalled()
  })

  it('builds a security snapshot for authenticated admins', async () => {
    const selectResult = {
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({ count: 2, error: null }),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    }
    const supabase = buildAdminSupabase({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue(selectResult),
      })),
    })
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(getAdminSecuritySnapshot()).resolves.toEqual({
      email: 'admin@mesa.test',
      hasTotpFactor: true,
      currentAal: 'aal2',
      nextAal: 'aal2',
      activeRecoveryCodes: 2,
    })
  })

  it('throws when security snapshot is requested without authenticated admin', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(getAdminSecuritySnapshot()).rejects.toThrow('No autenticado')
  })

  it('builds snapshot with empty email, no verified TOTP and zero codes when count fails', async () => {
    const selectResult = {
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({ count: null, error: { message: 'count failed' } }),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    }
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-123', email: null } }, error: null }),
        mfa: {
          ...buildAdminSupabase().auth.mfa,
          listFactors: jest.fn().mockResolvedValue({ data: { totp: [{ id: 'totp-1', status: 'unverified' }] }, error: null }),
          getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({ data: null, error: null }),
        },
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue(selectResult),
      })),
    })
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(getAdminSecuritySnapshot()).resolves.toEqual({
      email: '',
      hasTotpFactor: false,
      currentAal: null,
      nextAal: null,
      activeRecoveryCodes: 0,
    })
  })

  it('builds snapshot with zero active recovery codes when Supabase returns a null count', async () => {
    const selectResult = {
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({ count: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    }
    const supabase = buildAdminSupabase({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue(selectResult),
      })),
    })
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(getAdminSecuritySnapshot()).resolves.toEqual({
      email: 'admin@mesa.test',
      hasTotpFactor: true,
      currentAal: 'aal2',
      nextAal: 'aal2',
      activeRecoveryCodes: 0,
    })
  })

  it('propagates errors when revoking all sessions fails after audit', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        signOut: jest.fn().mockResolvedValue({ error: { message: 'No se pudo cerrar todo' } }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(signOutAllAdminSessions()).resolves.toEqual({ error: 'No se pudo cerrar todo' })
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'admin_all_sessions_revoked',
      'admin_security',
      'admin-123',
      { scope: 'global' },
      { context: 'security' },
    )
  })

  it('does not revoke other sessions without an authenticated admin', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(revokeOtherAdminSessions()).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('does not revoke all sessions without an authenticated admin', async () => {
    const supabase = buildAdminSupabase({
      auth: {
        ...buildAdminSupabase().auth,
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })
    ;(createClient as any).mockResolvedValue(supabase)

    await expect(signOutAllAdminSessions()).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
    expect(logAdminAction).not.toHaveBeenCalled()
  })
})
