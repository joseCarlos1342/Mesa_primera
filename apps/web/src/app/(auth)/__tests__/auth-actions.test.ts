import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginWithPhone, registerPlayer } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// Mock de enforceRateLimiting
vi.mock('@/app/actions/anti-fraud', () => ({
  enforceRateLimiting: vi.fn().mockResolvedValue({ success: true })
}))

// Mock de next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ set: vi.fn() })
}))

describe('Auth Actions', () => {
  let mockSignInWithOtp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'test'; // Ensure we don't hit the DEV bypass
    mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
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
      formData.append('phone', '+573205802918')
      formData.append('fullName', 'Jose Carlos')
      formData.append('nickname', 'Chepe')
      formData.append('avatarId', 'as-oros')

      await registerPlayer({}, formData)

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
      formData.append('phone', '+573205802918')

      await loginWithPhone({}, formData)

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: '+573205802918'
      })
      expect(redirect).toHaveBeenCalledWith('/login/player/verify?phone=%2B573205802918')
    })

    it('debe devolver un error si signInWithOtp falla', async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ 
        error: { message: 'Error de prueba de SMS' } 
      })

      const formData = new FormData()
      formData.append('phone', '+573205802918')

      const result = await loginWithPhone({}, formData)

      expect(result).toEqual({ error: 'Error de prueba de SMS' })
      expect(redirect).not.toHaveBeenCalled()
    })
  })
})
