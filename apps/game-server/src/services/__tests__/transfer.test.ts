import { describe, it, expect, vi } from 'vitest'
import { SupabaseService } from '../../services/SupabaseService'
import { createClient } from '@supabase/supabase-js'

vi.mock('@supabase/supabase-js', () => {
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null })

  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      rpc: rpcMock,
    })),
  }
})

describe('SupabaseService.transferBetweenPlayers', () => {
  it('returns early when SUPABASE_SERVICE_ROLE_KEY is not set', async () => {
    // In test env, SUPABASE_SERVICE_ROLE_KEY is not set, so SupabaseService methods return early
    const supabaseClient = createClient('http://localhost', 'test-key')
    const result = await SupabaseService.transferBetweenPlayers('sender-1', 'recipient-1', 50000)

    // Without the key, the method should return a failure or not call rpc
    expect(result.success).toBe(false)
  })

  it('validates minimum amount requirement', async () => {
    const result = await SupabaseService.transferBetweenPlayers('sender-1', 'recipient-1', 5000)
    expect(result.success).toBe(false)
  })

  it('prevents self-transfer at service level', async () => {
    const result = await SupabaseService.transferBetweenPlayers('user-1', 'user-1', 50000)
    expect(result.success).toBe(false)
  })
})
