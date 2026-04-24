import {
  completeAdminPasswordReset,
  requestAdminEmailChange,
  requestAdminPasswordReset,
  resetAdminTotpFactor,
  rotateAdminRecoveryCodes,
  revokeOtherAdminSessions,
} from '../admin-security'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { logAdminAction } from '../admin-audit'

jest.mock('@/lib/admin-recovery-codes', () => ({
  RECOVERY_CODE_COUNT: 2,
  generateAdminRecoveryCodes: jest.fn(() => ['ABCD-EFGH-JKLM', 'NPQR-STUV-WXYZ']),
  hashAdminRecoveryCode: jest.fn((code: string) => `hash:${code}`),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
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
    ;(createClient as any).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('password', 'NuevaClave123')
    formData.append('passwordConfirm', 'NuevaClave123')

    const result = await completeAdminPasswordReset(null, formData)

    expect(result).toEqual({ success: 'Contraseña actualizada. Ya puedes volver al panel.' })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NuevaClave123' })
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'admin_password_reset_completed',
      'admin_security',
      'admin-123',
      expect.objectContaining({ email: 'admin@mesa.test' }),
      expect.objectContaining({ context: 'security' })
    )
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

  it('revokes every other admin session without closing the current one', async () => {
    const supabase = buildAdminSupabase()
    ;(createClient as any).mockResolvedValue(supabase)

    const result = await revokeOtherAdminSessions()

    expect(result).toEqual({ success: 'Las demás sesiones fueron cerradas.' })
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' })
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
})