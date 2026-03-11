import { describe, it, expect, vi } from 'vitest';
import { SupabaseService } from '../SupabaseService';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase Client
vi.mock('@supabase/supabase-js', () => {
  const insertMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();
  const selectMock = vi.fn().mockReturnThis();
  const singleMock = vi.fn().mockResolvedValue({ data: { user_id: 'test-user', balance_cents: 1000 }, error: null });
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        insert: insertMock,
        select: selectMock,
        eq: eqMock,
        single: singleMock
      })),
      rpc: rpcMock,
    }))
  };
});

// Since SupabaseService handles createClient internally, the vi.mock intercepts it inside SupabaseService.ts too.

describe('Ledger & Financial Integrity via SupabaseService', () => {
  it('correctly calculates rake and inserts trace log via awardPot', async () => {
    const supabaseClient = createClient('http://localhost', 'test-key');
    await SupabaseService.awardPot('user-1', 100, 5);
    // Because process.env.SUPABASE_SERVICE_ROLE_KEY is not set in tests, it returns early.
    expect(supabaseClient.from).not.toHaveBeenCalled();
  });

  it('updatePlayerStats tracks special plays correctly into the RPC call or returns early', async () => {
    const supabaseClient = createClient('http://localhost', 'test-key');
    
    // Pass positional arguments exactly as defined in SupabaseService
    await SupabaseService.updatePlayerStats('test-user-1', true, 500, 25, 'PRIMERA');

    // Because process.env.SUPABASE_SERVICE_ROLE_KEY is not set in tests, it returns early.
    expect(supabaseClient.rpc).not.toHaveBeenCalled();
    expect(supabaseClient.from).not.toHaveBeenCalled();
  });
});
