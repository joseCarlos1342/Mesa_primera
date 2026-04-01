import { loginWithPhone, registerPlayer } from '../auth-actions'
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
      expect(redirect).toHaveBeenCalledWith('/login/player/verify?phone=%2B573205802918')
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
      expect(redirect).toHaveBeenCalledWith('/login/player/verify?phone=%2B573205802918')
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
})
