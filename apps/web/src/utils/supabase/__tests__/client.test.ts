/**
 * @jest-environment jsdom
 */
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({ auth: 'client' })),
}))

jest.mock('../env', () => ({
  getPublicSupabaseEnv: jest.fn(() => ({
    url: 'https://project.supabase.co',
    anonKey: 'publishable-key',
  })),
}))

describe('supabase browser client', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('crea un cliente browser con las credenciales publicas', async () => {
    const { createClient } = await import('../client')
    const { createBrowserClient } = await import('@supabase/ssr')

    const client = createClient()

    expect(client).toEqual({ auth: 'client' })
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'publishable-key'
    )
  })

  it('reutiliza el cliente en navegador para no duplicar sesiones', async () => {
    const { createClient } = await import('../client')
    const { createBrowserClient } = await import('@supabase/ssr')

    const first = createClient()
    const second = createClient()

    expect(second).toBe(first)
    expect(createBrowserClient).toHaveBeenCalledTimes(1)
  })
})
