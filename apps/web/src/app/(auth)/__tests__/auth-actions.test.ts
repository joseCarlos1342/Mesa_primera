import { loginWithPhone, registerPlayer, verifyOtp } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
  createAdminClient: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Mock redis
jest.mock('@/utils/redis', () => ({
  redis: { publish: jest.fn().mockResolvedValue(null) }
}))

describe('Auth Actions', () => {
  let mockSignInWithOtp: ReturnType<typeof jest.fn>;
  let mockVerifyOtp: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'test'; // Ensure we don't hit the DEV bypass
    delete process.env.DEMO_OTP_BYPASS_ENABLED
    mockSignInWithOtp = jest.fn().mockResolvedValue({ error: null })
    mockVerifyOtp = jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const mockSupabase = {
      auth: {
        signInWithOtp: mockSignInWithOtp,
        verifyOtp: mockVerifyOtp,
      },
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      }),
    }
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  describe('registerPlayer', () => {
    it('debe llamar a signInWithOtp con la metadata correcta y redirigir', async () => {
      const formData = new FormData()
      formData.append('phone', '3205802918') // local 10-digit format; normalized to +57 prefix
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
      expect(redirect).toHaveBeenCalledWith('/login/player/verify?phone=%2B573205802918')
    })
  })

  describe('loginWithPhone', () => {
    it('debe llamar a signInWithOtp solo con el telefono y redirigir', async () => {
      const formData = new FormData()
      formData.append('phone', '3205802918') // local 10-digit format; normalized to +57 prefix

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
      expect(redirect).toHaveBeenCalledWith('/login/player/verify?phone=%2B573205802918')
    })

    it('debe devolver un error si signInWithOtp falla', async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ 
        error: { message: 'Error de prueba de SMS' } 
      })

      const formData = new FormData()
      formData.append('phone', '3205802918') // local 10-digit format

      const result = await loginWithPhone({}, formData)

      expect(result).toEqual({ error: 'Error de prueba de SMS' })
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe('verifyOtp', () => {
    it('debe llamar a verifyOtp de Supabase cuando NODE_ENV es "test" (sin bypass)', async () => {
      // NODE_ENV = 'test' and DEMO_OTP_BYPASS_ENABLED is not set → real flow
      const formData = new FormData()
      formData.append('phone', '+573205802918')
      formData.append('token', '123456')

      try {
        await verifyOtp({}, formData)
      } catch (e: any) {
        // redirect throws NEXT_REDIRECT on success
        expect(e.message).toBe('NEXT_REDIRECT')
      }

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        phone: '+573205802918',
        token: '123456',
        type: 'sms',
      })
    })

    it('debe ejecutar el bypass de demo cuando DEMO_OTP_BYPASS_ENABLED es "true"', async () => {
      process.env.DEMO_OTP_BYPASS_ENABLED = 'true'

      const mockGenerateLink = jest.fn().mockResolvedValue({
        data: { properties: { token_hash: 'test-hash' } },
        error: null,
      })
      const mockAdminSupabase = {
        auth: {
          admin: { generateLink: mockGenerateLink },
        },
      }
      const { createAdminClient } = require('@/utils/supabase/server')
      ;(createAdminClient as jest.Mock).mockResolvedValue(mockAdminSupabase)

      const mockVerifyWithHash = jest.fn().mockResolvedValue({
        data: { user: { id: 'user-bypass' } },
        error: null,
      })
      const mockSupabase = {
        auth: {
          signInWithOtp: mockSignInWithOtp,
          verifyOtp: mockVerifyWithHash,
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        }),
      }
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const formData = new FormData()
      formData.append('phone', '+573205802918')
      formData.append('token', '123456')

      try {
        await verifyOtp({}, formData)
      } catch (e: any) {
        expect(e.message).toBe('NEXT_REDIRECT')
      }

      expect(mockGenerateLink).toHaveBeenCalledWith({
        type: 'login_otp',
        phone: '+573205802918',
      })

      delete process.env.DEMO_OTP_BYPASS_ENABLED
    })

    it('debe devolver un error si el token OTP es inválido (no numérico)', async () => {
      const formData = new FormData()
      formData.append('phone', '+573205802918')
      formData.append('token', 'abc123') // invalid — not 6 digits

      const result = await verifyOtp({}, formData)

      expect(result).toHaveProperty('fieldErrors')
    })
  })
})
