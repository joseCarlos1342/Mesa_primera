/**
 * @jest-environment node
 */
import { getWalletData, getWalletHistory, createDepositRequest } from '@/app/actions/wallet';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/validations', () => {
  return {
    __esModule: true,
    depositAmountSchema: {
      safeParse: (val: number) => {
        if (typeof val === 'number' && val >= 10000 && val <= 50000000 && val % 1000 === 0) {
          return { success: true, data: val };
        }
        return { success: false, error: { issues: [{ message: 'Monto inválido' }] } };
      },
    },
    observationsSchema: {
      safeParse: (val: string | undefined) => {
        if (val && val.length > 500) return { success: false };
        return { success: true, data: val?.trim() ?? '' };
      },
    },
  };
});

describe('Wallet Server Actions', () => {
  let mockSupabase: any;

  // Chainable query builder that tracks each `.from(table)` call
  function createQueryBuilder(overrides: Record<string, any> = {}) {
    const builder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnThis(),
      ...overrides,
    };
    return builder;
  }

  beforeEach(() => {
    jest.resetAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // ── getWalletData ─────────────────────────────────────────

  describe('getWalletData', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await getWalletData();
      expect(result).toEqual({ error: 'No authenticated' });
    });

    it('returns error when wallet query fails', async () => {
      const builder = createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await getWalletData();
      expect(result).toEqual({ error: 'DB down' });
    });

    it('creates a new wallet when none exists', async () => {
      const walletBuilder = createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        single: jest.fn().mockResolvedValue({ data: { id: 'w-new', user_id: 'user-1', balance_cents: 0 }, error: null }),
      });
      mockSupabase.from.mockReturnValue(walletBuilder);

      const result = await getWalletData();
      expect(result.wallet).toBeDefined();
      expect(result.transactions).toEqual([]);
    });

    it('returns wallet with merged and sorted activity on success', async () => {
      const now = new Date();
      const older = new Date(now.getTime() - 60000);

      // We need to track which table is being queried
      const fromCalls: Record<string, any> = {
        wallets: createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'w-1', user_id: 'user-1', balance_cents: 500000 },
            error: null,
          }),
        }),
        ledger: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({
            data: [{
              id: 'l-1', type: 'deposit', amount_cents: 100000, direction: 'credit',
              balance_after_cents: 500000, created_at: now.toISOString(), description: null,
            }],
            error: null,
          }),
        }),
        deposit_requests: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({
            data: [{
              id: 'dr-1', status: 'pending', amount_cents: 50000,
              created_at: older.toISOString(), proof_url: '/proof.jpg', observations: null,
            }],
            error: null,
          }),
        }),
        withdrawal_requests: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getWalletData();

      expect(result.wallet).toBeDefined();
      expect(result.wallet.balance_cents).toBe(500000);
      expect(result.transactions).toBeDefined();
      expect(result.transactions!.length).toBe(2);
      // Should be sorted newest first
      expect(result.transactions![0].id).toBe('l-1');
      expect(result.transactions![1].id).toBe('dr-1');
    });

    it('returns error when ledger query fails', async () => {
      const fromCalls: Record<string, any> = {
        wallets: createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'w-1', user_id: 'user-1', balance_cents: 500000 },
            error: null,
          }),
        }),
        ledger: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'ledger timeout' },
          }),
        }),
        deposit_requests: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        withdrawal_requests: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getWalletData();
      expect(result).toEqual({ error: 'ledger timeout' });
    });

    it('filters out completed deposit/withdrawal requests from activity', async () => {
      const fromCalls: Record<string, any> = {
        wallets: createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'w-1', user_id: 'user-1', balance_cents: 500000 },
            error: null,
          }),
        }),
        ledger: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        deposit_requests: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({
            data: [
              { id: 'dr-completed', status: 'completed', amount_cents: 50000, created_at: new Date().toISOString() },
              { id: 'dr-pending', status: 'pending', amount_cents: 30000, created_at: new Date().toISOString() },
            ],
            error: null,
          }),
        }),
        withdrawal_requests: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getWalletData();
      // Only the pending one should appear (completed are filtered out)
      expect(result.transactions!.length).toBe(1);
      expect(result.transactions![0].id).toBe('dr-pending');
    });
  });

  // ── getWalletHistory ──────────────────────────────────────

  describe('getWalletHistory', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await getWalletHistory();
      expect(result).toEqual({ error: 'No authenticated' });
    });

    it('returns merged transactions sorted by date', async () => {
      const fromCalls: Record<string, any> = {
        ledger: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: 'l-1', type: 'deposit', amount_cents: 100000, direction: 'credit', balance_after_cents: 100000, created_at: '2026-04-13T10:00:00Z', description: null }],
            error: null,
          }),
        }),
        deposit_requests: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: 'dr-1', status: 'pending', amount_cents: 50000, created_at: '2026-04-13T11:00:00Z' }],
            error: null,
          }),
        }),
        withdrawal_requests: createQueryBuilder({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getWalletHistory();
      expect(result.transactions).toBeDefined();
      expect(result.transactions!.length).toBe(2);
      // Newest first
      expect(result.transactions![0].id).toBe('dr-1');
    });
  });

  // ── createDepositRequest ──────────────────────────────────

  describe('createDepositRequest', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await createDepositRequest(10000, '/proof.jpg');
      expect(result).toEqual({ error: 'No authenticated' });
    });

    it('returns validation error for invalid amount', async () => {
      const result = await createDepositRequest(0, '/proof.jpg');
      expect(result.error).toBeDefined();
    });

    it('returns error when wallet is not found', async () => {
      const builder = createQueryBuilder({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await createDepositRequest(10000, '/proof.jpg');
      expect(result).toEqual({ error: 'Wallet not found' });
    });

    it('returns error when insert fails', async () => {
      const fromCalls: Record<string, any> = {
        wallets: createQueryBuilder({
          single: jest.fn().mockResolvedValue({ data: { id: 'w-1' }, error: null }),
        }),
        deposit_requests: createQueryBuilder({
          insert: jest.fn().mockResolvedValue({ error: { message: 'duplicate key' } }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await createDepositRequest(10000, '/proof.jpg');
      expect(result).toEqual({ error: 'duplicate key' });
    });

    it('returns success with proofUrl on valid deposit', async () => {
      const fromCalls: Record<string, any> = {
        wallets: createQueryBuilder({
          single: jest.fn().mockResolvedValue({ data: { id: 'w-1' }, error: null }),
        }),
        deposit_requests: createQueryBuilder({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await createDepositRequest(10000, '/proof.jpg', 'Test observation');
      expect(result).toEqual({ success: true, proofUrl: '/proof.jpg' });
    });
  });
});
