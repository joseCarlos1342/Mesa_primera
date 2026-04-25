import { loginAdmin, loginWithPhone, redeemAdminRecoveryCode, registerPlayer, verifyAdminTotp, checkPhoneHasPin } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { enforceSessionPolicy } from '../auth-actions-helpers'

jest.mock('@/lib/admin-recovery-codes', () => ({
  hashAdminRecoveryCode: jest.fn((code: string) => `hash:${code}`),
}))

jest.mock('@/app/actions/admin-audit', () => ({
  logAdminAction: jest.fn(),
}))

// Mock de enforceRateLimiting
jest.mock('@/app/actions/anti-fraud', () => ({
  enforceRateLimiting: jest.fn().mockResolvedValue({ success: true })
}))

// Mock de next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ set: jest.fn() })
}))

// Mock supabase server 
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Mock enforceSessionPolicy
jest.mock('../auth-actions-helpers', () => ({
  enforceSessionPolicy: jest.fn().mockResolvedValue(undefined),
}))

describe('Auth Actions', () => {
  let mockSignInWithOtp: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    jest.clearAllMocks()
    // @ts-expect-error -- NODE_ENV is read-only but needs to be overridden for tests
    process.env.NODE_ENV = 'test'; // Ensure we don't hit the DEV bypass
    mockSignInWithOtp = jest.fn().mockResolvedValue({ error: null })
    const mockSupabase = {
      auth: {
        signInWithOtp: mockSignInWithOtp,
      },
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    }
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  describe('registerPlayer', () => {
    it('debe llamar a signInWithOtp con la metadata correcta y redirigir', async () => {
      const formData = new FormData()
      formData.append('phone', '3205802918')
      formData.append('fullName', 'Jose Carlos')
      formData.append('nickname', 'Chepe')
      formData.append('avatarId', 'as-oros')

      try {
        await registerPlayer({}, formData)
      } catch (e: any) {
        expect(e.message).toBe('NEXT_REDIRECT')
      }

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: '+573205802918',
        options: {
          shouldCreateUser: true,
          data: {
            full_name: 'Jose Carlos',
            username: 'Chepe',
            avatar_url: 'as-oros',
            role: 'player'
          },
        },
      })
      expect(redirect).toHaveBeenCalledWith('/register/player/verify?phone=%2B573205802918')
    })
  })

  describe('loginWithPhone', () => {
    it('debe llamar a signInWithOtp solo con el telefono y redirigir', async () => {
      const formData = new FormData()
      formData.append('phone', '3205802918')

      try {
        await loginWithPhone({}, formData)
      } catch (e: any) {
        expect(e.message).toBe('NEXT_REDIRECT')
      }

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: '+573205802918',
        options: {
          shouldCreateUser: false
        }
      })
      expect(redirect).toHaveBeenCalledWith('/login/player/verify?phone=%2B573205802918&flow=login-set-pin')
    })

    it('debe devolver un error si signInWithOtp falla', async () => {
      (mockSignInWithOtp as jest.Mock).mockResolvedValueOnce({ 
        error: { message: 'Error de prueba de SMS' } 
      })

      const formData = new FormData()
      formData.append('phone', '3205802918')

      const result = await loginWithPhone({}, formData)

      expect(result).toEqual({ error: 'Error de prueba de SMS' })
      expect(redirect).not.toHaveBeenCalled()
    })

    it('muestra un mensaje operativo cuando Supabase rechaza legacy API keys', async () => {
      ;(mockSignInWithOtp as jest.Mock).mockResolvedValueOnce({
        error: { message: 'Legacy API keys are disabled' },
      })

      const formData = new FormData()
      formData.append('phone', '3205802918')

      const result = await loginWithPhone({}, formData)

      expect(result).toEqual({
        error: expect.stringContaining('servidor de autenticación'),
      })
      // Nunca filtramos el mensaje crudo del proveedor al usuario final
      expect((result as { error: string }).error).not.toContain('Legacy API keys')
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe('checkPhoneHasPin', () => {
    it('devuelve true cuando la RPC responde con data=true', async () => {
      const mockSupabase = {
        auth: { signInWithOtp: jest.fn() },
        rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
      }
      ;(createClient as any).mockResolvedValue(mockSupabase)

      await expect(checkPhoneHasPin('3205802918')).resolves.toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('user_has_pin', { p_phone: '+573205802918' })
    })

    it('devuelve false cuando la RPC responde con data=false', async () => {
      const mockSupabase = {
        auth: { signInWithOtp: jest.fn() },
        rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
      }
      ;(createClient as any).mockResolvedValue(mockSupabase)

      await expect(checkPhoneHasPin('3205802918')).resolves.toBe(false)
    })

    it('devuelve null (desconocido) cuando la RPC retorna un error — no debe caer a false silenciosamente', async () => {
      const mockSupabase = {
        auth: { signInWithOtp: jest.fn() },
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Legacy API keys are disabled' },
        }),
      }
      ;(createClient as any).mockResolvedValue(mockSupabase)

      await expect(checkPhoneHasPin('3205802918')).resolves.toBeNull()
    })

    it('devuelve null cuando createClient falla (sin env Supabase)', async () => {
      ;(createClient as any).mockRejectedValueOnce(new Error('Missing required Supabase environment variables'))

      await expect(checkPhoneHasPin('3205802918')).resolves.toBeNull()
    })
  })

  describe('redeemAdminRecoveryCode', () => {
    it('consumes a valid recovery code and redirects the admin back to TOTP setup', async () => {
      const updateEq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
      const recoveryCodeQuery = {
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'recovery-1' }, error: null }),
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: { id: 'admin-123', email: 'admin@mesa.test' },
            },
            error: null,
          }),
          mfa: {
            listFactors: jest.fn().mockResolvedValue({
              data: {
                totp: [{ id: 'totp-1', factor_type: 'totp', status: 'verified' }],
                phone: [],
              },
              error: null,
            }),
            unenroll: jest.fn().mockResolvedValue({ error: null }),
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
            return {
              select: jest.fn().mockReturnValue(recoveryCodeQuery),
              update: jest.fn().mockReturnValue({
                eq: updateEq,
              }),
            }
          }

          throw new Error(`Unexpected table ${table}`)
        }),
      }
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const formData = new FormData()
      formData.append('code', 'ABCD-EFGH-JKLM')

      await redeemAdminRecoveryCode(null, formData)

      expect(mockSupabase.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'totp-1' })
      expect(updateEq).toHaveBeenCalledWith('id', 'recovery-1')
      expect(redirect).toHaveBeenCalledWith('/login/admin/mfa/setup?recovery=1')
    })
  })

  describe('loginAdmin', () => {
    function buildAdminSupabase(overrides: Record<string, unknown> = {}) {
      return {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: { id: 'admin-123' } },
            error: null,
          }),
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'admin-123' } },
            error: null,
          }),
          mfa: {
            listFactors: jest.fn().mockResolvedValue({
              data: {
                totp: [{ id: 'totp-1', factor_type: 'totp', status: 'verified' }],
                phone: [],
              },
              error: null,
            }),
          },
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
        from: jest.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }
          }
          throw new Error(`Unexpected table ${table}`)
        }),
        ...overrides,
      }
    }

    it('redirects to /login/admin/mfa when admin has a verified TOTP factor', async () => {
      const supabase = buildAdminSupabase()
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('email', 'admin@mesa.test')
      formData.append('password', 'SecureP4ss!')

      await loginAdmin(null, formData)

      expect(supabase.auth.signInWithPassword).toHaveBeenCalled()
      // Must check role BEFORE redirecting to MFA
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(redirect).toHaveBeenCalledWith('/login/admin/mfa')
    })

    it('does NOT call enforceSessionPolicy before MFA is completed (deferred to verifyAdminTotp)', async () => {
      const supabase = buildAdminSupabase()
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('email', 'admin@mesa.test')
      formData.append('password', 'SecureP4ss!')

      await loginAdmin(null, formData)

      expect(enforceSessionPolicy).not.toHaveBeenCalled()
    })

    it('redirects to /login/admin/mfa/setup when admin has no TOTP factor', async () => {
      const supabase = buildAdminSupabase()
      supabase.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: [], phone: [] },
        error: null,
      })
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('email', 'admin@mesa.test')
      formData.append('password', 'SecureP4ss!')

      await loginAdmin(null, formData)

      expect(redirect).toHaveBeenCalledWith('/login/admin/mfa/setup')
      // Should NOT enforceSessionPolicy before setup is complete
      expect(enforceSessionPolicy).not.toHaveBeenCalled()
    })

    it('rejects non-admin users even if they have a TOTP factor', async () => {
      const supabase = buildAdminSupabase()
      supabase.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'player' }, error: null }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('email', 'player@mesa.test')
      formData.append('password', 'SecureP4ss!')

      const result = await loginAdmin(null, formData)

      expect(result).toEqual({ error: 'Acceso denegado: Se requiere rol de administrador' })
      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(redirect).not.toHaveBeenCalled()
    })

    it('returns error on invalid credentials', async () => {
      const supabase = buildAdminSupabase()
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('email', 'admin@mesa.test')
      formData.append('password', 'WrongButLongEnough1')

      const result = await loginAdmin(null, formData)

      expect(result).toEqual({ error: 'Invalid login credentials' })
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe('verifyAdminTotp', () => {
    function buildMfaSupabase(overrides: Record<string, unknown> = {}) {
      return {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'admin-123' } },
            error: null,
          }),
          mfa: {
            listFactors: jest.fn().mockResolvedValue({
              data: {
                totp: [{ id: 'totp-1', factor_type: 'totp', status: 'verified' }],
                phone: [],
              },
              error: null,
            }),
            challenge: jest.fn().mockResolvedValue({
              data: { id: 'challenge-1' },
              error: null,
            }),
            verify: jest.fn().mockResolvedValue({ error: null }),
          },
        },
        ...overrides,
      }
    }

    it('verifies TOTP code and redirects to /admin on success', async () => {
      const supabase = buildMfaSupabase()
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('code', '123456')

      await verifyAdminTotp(null, formData)

      expect(supabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'totp-1' })
      expect(supabase.auth.mfa.verify).toHaveBeenCalledWith({
        factorId: 'totp-1',
        challengeId: 'challenge-1',
        code: '123456',
      })
      expect(enforceSessionPolicy).toHaveBeenCalledWith('admin-123')
      expect(redirect).toHaveBeenCalledWith('/admin')
    })

    it('returns distinct error when session is invalid (no user)', async () => {
      const supabase = buildMfaSupabase()
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' },
      })
      supabase.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: [], phone: [] },
        error: null,
      })
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('code', '123456')

      const result = await verifyAdminTotp(null, formData)

      // Should tell the user their session is invalid, not that TOTP is missing
      expect(result?.error).toBeDefined()
      expect(redirect).not.toHaveBeenCalled()
    })

    it('returns error when admin has no TOTP factor configured', async () => {
      const supabase = buildMfaSupabase()
      supabase.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: [], phone: [] },
        error: null,
      })
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('code', '123456')

      const result = await verifyAdminTotp(null, formData)

      expect(result).toEqual({ error: 'No hay factor TOTP configurado' })
      expect(redirect).not.toHaveBeenCalled()
    })

    it('returns error on wrong TOTP code', async () => {
      const supabase = buildMfaSupabase()
      supabase.auth.mfa.verify.mockResolvedValue({
        error: { message: 'Invalid TOTP code' },
      })
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('code', '999999')

      const result = await verifyAdminTotp(null, formData)

      expect(result).toEqual({ error: 'Invalid TOTP code' })
      expect(redirect).not.toHaveBeenCalled()
    })

    it('prefers verified TOTP factor over unverified one', async () => {
      const supabase = buildMfaSupabase()
      supabase.auth.mfa.listFactors.mockResolvedValue({
        data: {
          totp: [
            { id: 'totp-unverified', factor_type: 'totp', status: 'unverified' },
            { id: 'totp-verified', factor_type: 'totp', status: 'verified' },
          ],
          phone: [],
        },
        error: null,
      })
      ;(createClient as any).mockResolvedValue(supabase)

      const formData = new FormData()
      formData.append('code', '123456')

      await verifyAdminTotp(null, formData)

      expect(supabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'totp-verified' })
    })
  })
})
