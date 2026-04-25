/**
 * @jest-environment node
 */
import {
  getPublicSupabaseEnv,
  getAdminSupabaseEnv,
  getSupabaseEnvErrorMessage,
} from '../env'

const PUBLIC_ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const SECRET_ENV_NAMES = ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const

function clearEnv() {
  for (const name of [...PUBLIC_ENV_NAMES, ...SECRET_ENV_NAMES]) {
    delete process.env[name]
  }
}

describe('supabase env resolver', () => {
  beforeEach(() => {
    clearEnv()
  })

  afterAll(() => {
    clearEnv()
  })

  it('resuelve las claves nuevas (publishable/secret) cuando estan presentes', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_new'
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_new'

    expect(getPublicSupabaseEnv()).toEqual({
      url: 'https://proj.supabase.co',
      anonKey: 'sb_publishable_new',
    })

    expect(getAdminSupabaseEnv()).toEqual({
      url: 'https://proj.supabase.co',
      anonKey: 'sb_publishable_new',
      serviceRoleKey: 'sb_secret_new',
    })
  })

  it('cae a los nombres legacy si la clave nueva no existe', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy_anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy_service'

    expect(getPublicSupabaseEnv().anonKey).toBe('legacy_anon')
    expect(getAdminSupabaseEnv().serviceRoleKey).toBe('legacy_service')
  })

  it('prefiere la clave nueva cuando ambas conviven', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'new_key'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy_key'
    process.env.SUPABASE_SECRET_KEY = 'new_secret'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy_secret'

    expect(getPublicSupabaseEnv().anonKey).toBe('new_key')
    expect(getAdminSupabaseEnv().serviceRoleKey).toBe('new_secret')
  })

  it('reporta las variables faltantes con el nombre preferido nuevo', () => {
    const msg = getSupabaseEnvErrorMessage(true)
    expect(msg).toContain('NEXT_PUBLIC_SUPABASE_URL')
    expect(msg).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    expect(msg).toContain('SUPABASE_SECRET_KEY')
  })

  it('lanza si falta la URL o la clave publica', () => {
    expect(() => getPublicSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})
