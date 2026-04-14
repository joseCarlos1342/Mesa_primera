/**
 * @jest-environment node
 */
import { requestWithdrawal, getPendingWithdrawals } from '@/app/actions/withdrawals';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Withdrawals Server Actions', () => {
  let mockSupabase: any;

  function createQueryBuilder(overrides: Record<string, any> = {}) {
    const builder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
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

  // ── requestWithdrawal ──────────────────────────────────

  describe('requestWithdrawal', () => {
    it('returns error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await requestWithdrawal(1000, 'Bancolombia 12345');
      expect(result).toEqual({ error: 'No authenticated' });
    });

    it('returns error when wallet is not found', async () => {
      const builder = createQueryBuilder({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await requestWithdrawal(1000, 'Bancolombia 12345');
      expect(result).toEqual({ error: 'Wallet not found' });
    });

    it('returns error for non-positive amount', async () => {
      const builder = createQueryBuilder({
        single: jest.fn().mockResolvedValue({
          data: { id: 'w-1', balance_cents: 500000 },
          error: null,
        }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await requestWithdrawal(0, 'Bancolombia 12345');
      expect(result.error).toBeDefined();
    });

    it('returns error when amount is not a multiple of $1.000 COP', async () => {
      const builder = createQueryBuilder({
        single: jest.fn().mockResolvedValue({
          data: { id: 'w-1', balance_cents: 500000 },
          error: null,
        }),
      });
      mockSupabase.from.mockReturnValue(builder);

      // 1500 COP → 150000 cents → 150000 % 100000 = 50000 ≠ 0
      const result = await requestWithdrawal(1500, 'Bancolombia 12345');
      expect(result).toEqual({ error: 'El monto debe ser múltiplo de $1.000 COP' });
    });

    it('returns error when balance is insufficient', async () => {
      const builder = createQueryBuilder({
        single: jest.fn().mockResolvedValue({
          data: { id: 'w-1', balance_cents: 50000 },
          error: null,
        }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await requestWithdrawal(1000, 'Bancolombia 12345');
      expect(result).toEqual({ error: 'Saldo insuficiente' });
    });

    it('returns error when insert fails', async () => {
      const fromCalls: Record<string, any> = {
        wallets: createQueryBuilder({
          single: jest.fn().mockResolvedValue({
            data: { id: 'w-1', balance_cents: 500000 },
            error: null,
          }),
        }),
        withdrawal_requests: createQueryBuilder({
          insert: jest.fn().mockResolvedValue({ error: { message: 'insert failed' } }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await requestWithdrawal(1000, 'Bancolombia 12345');
      expect(result).toEqual({ error: 'insert failed' });
    });

    it('returns success on valid withdrawal request', async () => {
      const fromCalls: Record<string, any> = {
        wallets: createQueryBuilder({
          single: jest.fn().mockResolvedValue({
            data: { id: 'w-1', balance_cents: 500000 },
            error: null,
          }),
        }),
        withdrawal_requests: createQueryBuilder({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await requestWithdrawal(1000, 'Bancolombia 12345');
      expect(result).toEqual({ success: true });
    });
  });

  // ── getPendingWithdrawals ──────────────────────────────

  describe('getPendingWithdrawals', () => {
    it('returns error when query fails', async () => {
      const builder = createQueryBuilder({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await getPendingWithdrawals();
      expect(result).toEqual({ error: 'DB error' });
    });

    it('returns empty array when no pending withdrawals', async () => {
      const builder = createQueryBuilder({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await getPendingWithdrawals();
      expect(result).toEqual({ withdrawals: [] });
    });

    it('returns adapted withdrawal data with profile and balance info', async () => {
      const fromCalls: Record<string, any> = {
        withdrawal_requests: createQueryBuilder({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: 'wr-1', user_id: 'user-1', amount_cents: 100000, status: 'pending', created_at: '2026-04-13T00:00:00Z' },
            ],
            error: null,
          }),
        }),
        profiles: createQueryBuilder({
          in: jest.fn().mockResolvedValue({
            data: [{ id: 'user-1', username: '@PlayerOne' }],
          }),
        }),
        wallets: createQueryBuilder({
          in: jest.fn().mockResolvedValue({
            data: [{ user_id: 'user-1', balance_cents: 500000 }],
          }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getPendingWithdrawals();
      expect(result.withdrawals).toHaveLength(1);
      expect(result.withdrawals![0].userName).toBe('PlayerOne'); // stripped @
      expect(result.withdrawals![0].amount).toBe(100000);
      expect(result.withdrawals![0].userBalance).toBe(500000);
    });

    it('strips leading @ from username', async () => {
      const fromCalls: Record<string, any> = {
        withdrawal_requests: createQueryBuilder({
          order: jest.fn().mockResolvedValue({
            data: [{ id: 'wr-1', user_id: 'user-1', amount_cents: 100000, status: 'pending', created_at: '2026-04-13T00:00:00Z' }],
            error: null,
          }),
        }),
        profiles: createQueryBuilder({
          in: jest.fn().mockResolvedValue({ data: [{ id: 'user-1', username: '@TestUser' }] }),
        }),
        wallets: createQueryBuilder({
          in: jest.fn().mockResolvedValue({ data: [{ user_id: 'user-1', balance_cents: 0 }] }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getPendingWithdrawals();
      expect(result.withdrawals![0].userName).toBe('TestUser');
    });

    it('defaults to "Jugador" when profile is missing', async () => {
      const fromCalls: Record<string, any> = {
        withdrawal_requests: createQueryBuilder({
          order: jest.fn().mockResolvedValue({
            data: [{ id: 'wr-1', user_id: 'user-orphan', amount_cents: 100000, status: 'pending', created_at: '2026-04-13T00:00:00Z' }],
            error: null,
          }),
        }),
        profiles: createQueryBuilder({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
        wallets: createQueryBuilder({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getPendingWithdrawals();
      expect(result.withdrawals![0].userName).toBe('Jugador');
      expect(result.withdrawals![0].userBalance).toBe(0);
    });
  });
});
