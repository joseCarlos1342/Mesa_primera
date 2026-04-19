import { loginWithPhone, redeemAdminRecoveryCode, registerPlayer } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
})
