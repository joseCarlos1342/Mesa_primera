/**
 * @jest-environment node
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const cookieStore = {
  getAll: jest.fn(() => [{ name: 'sb', value: 'token' }]),
  set: jest.fn(),
}

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => cookieStore),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: 'server-client' })),
}))

jest.mock('../env', () => ({
  getPublicSupabaseEnv: jest.fn(() => ({
    url: 'https://project.supabase.co',
    anonKey: 'publishable-key',
  })),
  getAdminSupabaseEnv: jest.fn(() => ({
    url: 'https://project.supabase.co',
    serviceRoleKey: 'service-role-key',
  })),
}))

describe('supabase server clients', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cookieStore.getAll.mockReturnValue([{ name: 'sb', value: 'token' }])
  })

  it('crea el cliente publico con cookies de request/response', async () => {
    const { createClient } = await import('../server')

    const client = await createClient()
    const [, anonKey, options] = (createServerClient as jest.Mock).mock.calls[0]

    expect(client).toEqual({ auth: 'server-client' })
    expect(cookies).toHaveBeenCalled()
    expect(createServerClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'publishable-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
    expect(anonKey).toBe('publishable-key')
    expect(options.cookies.getAll()).toEqual([{ name: 'sb', value: 'token' }])

    options.cookies.setAll([
      { name: 'sb-refresh', value: 'new-token', options: { path: '/' } },
    ])

    expect(cookieStore.set).toHaveBeenCalledWith('sb-refresh', 'new-token', {
      path: '/',
      maxAge: 604800,
    })
  })

  it('crea el cliente admin con service role y conserva opciones de cookie', async () => {
    const { createAdminClient } = await import('../server')

    await createAdminClient()
    const [, serviceRoleKey, options] = (createServerClient as jest.Mock).mock.calls[0]

    expect(serviceRoleKey).toBe('service-role-key')

    options.cookies.setAll([
      { name: 'admin-cookie', value: 'secret', options: { httpOnly: true } },
    ])

    expect(cookieStore.set).toHaveBeenCalledWith('admin-cookie', 'secret', {
      httpOnly: true,
    })
  })

  it('ignora errores de escritura de cookies durante render server component', async () => {
    cookieStore.set.mockImplementationOnce(() => {
      throw new Error('readonly cookies')
    })
    const { createClient } = await import('../server')

    await createClient()
    const [, , options] = (createServerClient as jest.Mock).mock.calls[0]

    expect(() => {
      options.cookies.setAll([{ name: 'sb', value: 'token', options: {} }])
    }).not.toThrow()
  })
})
