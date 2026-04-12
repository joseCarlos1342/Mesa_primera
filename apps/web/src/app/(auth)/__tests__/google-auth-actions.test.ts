import { completeGoogleRegistration, getGoogleUserData } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

jest.mock('@/app/actions/anti-fraud', () => ({
  enforceRateLimiting: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ set: jest.fn() }),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

describe('Google Auth Actions', () => {
  let mockSupabase: any
  let mockAdminSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    // @ts-expect-error -- override NODE_ENV for tests
    process.env.NODE_ENV = 'test'

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'google-user-123',
              email: 'test@gmail.com',
              user_metadata: {
                full_name: 'Google User',
                avatar_url: 'https://lh3.google.com/photo',
                name: 'Google User',
                picture: 'https://lh3.google.com/photo',
              },
            },
          },
        }),
        signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
      },
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    }
    ;(createClient as any).mockResolvedValue(mockSupabase)

    mockAdminSupabase = {
      auth: {
        admin: {
          updateUserById: jest.fn().mockResolvedValue({ error: null }),
        },
      },
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

    const { createAdminClient } = require('@/utils/supabase/server')
    ;(createAdminClient as any).mockResolvedValue(mockAdminSupabase)
  })

  describe('getGoogleUserData', () => {
    it('debe retornar datos del usuario de Google', async () => {
      const result = await getGoogleUserData()

      expect(result).toEqual({
        fullName: 'Google User',
        email: 'test@gmail.com',
        avatarUrl: 'https://lh3.google.com/photo',
      })
    })

    it('debe retornar null si no hay usuario autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await getGoogleUserData()

      expect(result).toBeNull()
    })

    it('debe usar fallback name/picture si full_name/avatar_url no existen', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'u1',
            email: 'alt@gmail.com',
            user_metadata: {
              name: 'Alt Name',
              picture: 'https://example.com/pic.jpg',
            },
          },
        },
      })

      const result = await getGoogleUserData()

      expect(result).toEqual({
        fullName: 'Alt Name',
        email: 'alt@gmail.com',
        avatarUrl: 'https://example.com/pic.jpg',
      })
    })
  })

  describe('completeGoogleRegistration', () => {
    function buildFormData(overrides: Record<string, string> = {}) {
      const fd = new FormData()
      fd.append('fullName', overrides.fullName ?? 'Jose Carlos')
      fd.append('nickname', overrides.nickname ?? 'ChepeGoogle')
      fd.append('phone', overrides.phone ?? '3205802918')
      fd.append('avatarId', overrides.avatarId ?? 'as-oros')
      return fd
    }

    it('debe actualizar perfil, enviar OTP y redirigir a verify', async () => {
      try {
        await completeGoogleRegistration({}, buildFormData())
      } catch (e: any) {
        expect(e.message).toBe('NEXT_REDIRECT')
      }

      // Admin API updates the user metadata
      expect(mockAdminSupabase.auth.admin.updateUserById).toHaveBeenCalledWith(
        'google-user-123',
        expect.objectContaining({
          phone: '+573205802918',
          phone_confirm: false,
          user_metadata: expect.objectContaining({
            full_name: 'Jose Carlos',
            username: 'ChepeGoogle',
            avatar_url: 'as-oros',
            role: 'player',
          }),
        }),
      )

      // Profile table is updated
      expect(mockAdminSupabase.from).toHaveBeenCalledWith('profiles')

      // OTP sent
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+573205802918',
        options: { shouldCreateUser: false },
      })

      // Redirect to verify page
      expect(redirect).toHaveBeenCalledWith(
        '/register/player/verify?phone=%2B573205802918&flow=register',
      )
    })

    it('debe rechazar si el teléfono ya existe en otra cuenta', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await completeGoogleRegistration({}, buildFormData())

      expect(result).toEqual({
        fieldErrors: {
          phone: [expect.stringContaining('ya está registrado')],
        },
      })
      expect(redirect).not.toHaveBeenCalled()
    })

    it('debe rechazar si no hay usuario autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

      try {
        await completeGoogleRegistration({}, buildFormData())
      } catch (e: any) {
        expect(e.message).toBe('NEXT_REDIRECT')
      }

      expect(redirect).toHaveBeenCalledWith('/login/player')
    })

    it('debe retornar errores de validación para campos inválidos', async () => {
      const result = await completeGoogleRegistration(
        {},
        buildFormData({ nickname: '', phone: '123', fullName: '' }),
      )

      expect(result).toHaveProperty('fieldErrors')
      expect(redirect).not.toHaveBeenCalled()
    })

    it('debe manejar error de duplicado en actualización de usuario', async () => {
      mockAdminSupabase.auth.admin.updateUserById.mockResolvedValueOnce({
        error: { message: 'duplicate key value violates unique constraint' },
      })

      const result = await completeGoogleRegistration({}, buildFormData())

      expect(result).toEqual({
        error: expect.stringContaining('ya están en uso'),
      })
    })
  })
})
