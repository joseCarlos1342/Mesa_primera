import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginWithPhone } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

describe('loginWithPhone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe llamar a signInWithOtp con la metadata correcta y redirigir', async () => {
    const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
    const mockSupabase = {
      auth: {
        signInWithOtp: mockSignInWithOtp,
      },
    }
    ;(createClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('phone', '+573205802918')
    formData.append('fullName', 'Jose Carlos')
    formData.append('nickname', 'Chepe')
    formData.append('avatarId', 'as-oros')

    await loginWithPhone({}, formData)

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      phone: '+573205802918',
      options: {
        shouldCreateUser: true,
        data: {
          full_name: 'Jose Carlos',
          nickname: 'Chepe',
          avatar_url: 'as-oros',
        },
      },
    })

    expect(redirect).toHaveBeenCalledWith('/login/player/verify?phone=%2B573205802918')
  })

  it('debe devolver un error si signInWithOtp falla', async () => {
    const mockSignInWithOtp = vi.fn().mockResolvedValue({ 
      error: { message: 'Error de prueba de SMS' } 
    })
    const mockSupabase = {
      auth: {
        signInWithOtp: mockSignInWithOtp,
      },
    }
    ;(createClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('phone', '+573205802918')

    const result = await loginWithPhone({}, formData)

    expect(result).toEqual({ error: 'Error de prueba de SMS' })
    expect(redirect).not.toHaveBeenCalled()
  })
})
