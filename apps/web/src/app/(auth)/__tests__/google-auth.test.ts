import { signInWithGoogle } from '../google-auth'
import { createClient } from '@/utils/supabase/client'

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('signInWithGoogle', () => {
  const signInWithOAuth = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockReturnValue({ auth: { signInWithOAuth } } as unknown as ReturnType<typeof createClient>)
  })

  it('inicia OAuth de Google con callback PKCE canonico', async () => {
    signInWithOAuth.mockResolvedValue({ error: null })

    await expect(signInWithGoogle()).resolves.toEqual({ error: null })
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost/api/auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
  })

  it('devuelve error accionable si Supabase rechaza OAuth', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    signInWithOAuth.mockResolvedValue({ error: { message: 'provider disabled' } })

    await expect(signInWithGoogle()).resolves.toEqual({ error: 'provider disabled' })
    expect(consoleError).toHaveBeenCalledWith('[GOOGLE_AUTH] signInWithOAuth failed:', 'provider disabled')
    consoleError.mockRestore()
  })
})
