import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const originalAnonKey = process.env.SUPABASE_ANON_KEY
const originalPublicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn().mockResolvedValue({ data: null, error: null }) }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: rpcMock,
  })),
}))

describe('SupabaseService.transferBetweenPlayers', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = ''
    process.env.SUPABASE_ANON_KEY = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''
    vi.resetModules()
  })

  afterEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey ?? ''
    process.env.SUPABASE_ANON_KEY = originalAnonKey ?? ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalPublicAnonKey ?? ''
  })

  it('returns early when no Supabase key is configured', async () => {
    const { SupabaseService } = await import('../../services/SupabaseService')
    const result = await SupabaseService.transferBetweenPlayers('sender-1', 'recipient-1', 50000)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Supabase no configurado')
  })

  it('validates minimum amount requirement', async () => {
    const { SupabaseService } = await import('../../services/SupabaseService')
    const result = await SupabaseService.transferBetweenPlayers('sender-1', 'recipient-1', 5000)
    expect(result.success).toBe(false)
  })

  it('prevents self-transfer at service level', async () => {
    const { SupabaseService } = await import('../../services/SupabaseService')
    const result = await SupabaseService.transferBetweenPlayers('user-1', 'user-1', 50000)
    expect(result.success).toBe(false)
  })
})
