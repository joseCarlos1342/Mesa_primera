/**
 * @jest-environment node
 */
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({ auth: Symbol('client') })),
}))

jest.mock('../env', () => ({
  getPublicSupabaseEnv: jest.fn(() => ({
    url: 'https://project.supabase.co',
    anonKey: 'publishable-key',
  })),
}))

describe('supabase client SSR', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('crea un cliente nuevo en SSR porque no hay window ni singleton browser', async () => {
    const { createClient } = await import('../client')
    const { createBrowserClient } = await import('@supabase/ssr')

    const first = createClient()
    const second = createClient()

    expect(first).not.toBe(second)
    expect(createBrowserClient).toHaveBeenCalledTimes(2)
    expect(createBrowserClient).toHaveBeenNthCalledWith(1, 'https://project.supabase.co', 'publishable-key')
    expect(createBrowserClient).toHaveBeenNthCalledWith(2, 'https://project.supabase.co', 'publishable-key')
  })
})
