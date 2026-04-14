/**
 * @jest-environment node
 */
import { processTransaction, getPendingDeposits } from '@/app/actions/admin-wallet';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/actions/admin-audit', () => ({
  logAdminAction: jest.fn().mockResolvedValue(undefined),
}));

import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/app/actions/admin-audit';

describe('Admin Wallet Server Actions', () => {
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
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }),
      },
      from: jest.fn(),
      rpc: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // ── processTransaction ───────────────────────────────────

  describe('processTransaction', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await processTransaction('req-1', 'completed');
      expect(result).toEqual({ error: 'No autenticado' });
    });

    it('returns error when RPC fails with supabase error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC timeout' } });
      const result = await processTransaction('req-1', 'completed');
      expect(result).toEqual({ error: 'RPC timeout' });
    });

    it('returns error when RPC returns data.error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { error: 'Request already processed' }, error: null });
      const result = await processTransaction('req-1', 'completed');
      expect(result).toEqual({ error: 'Request already processed' });
    });

    it('calls RPC with correct parameters', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { success: true }, error: null });
      await processTransaction('req-1', 'completed');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_admin_transaction', {
        p_request_id: 'req-1',
        p_status: 'completed',
      });
    });

    it('logs admin action on successful transaction approval', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { success: true }, error: null });
      await processTransaction('req-1', 'completed');

      expect(logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'transaction_approved',
        'transaction_request',
        'req-1',
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('logs rejection action when status is failed', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { success: true }, error: null });
      await processTransaction('req-1', 'failed');

      expect(logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'transaction_rejected',
        'transaction_request',
        'req-1',
        expect.objectContaining({ status: 'failed' }),
      );
    });

    it('revalidates admin and wallet paths on success', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { success: true }, error: null });
      await processTransaction('req-1', 'completed');

      expect(revalidatePath).toHaveBeenCalledWith('/admin/deposits');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/withdrawals');
      expect(revalidatePath).toHaveBeenCalledWith('/wallet');
    });

    it('returns success on valid transaction', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { success: true }, error: null });
      const result = await processTransaction('req-1', 'completed');
      expect(result).toEqual({ success: true });
    });
  });

  // ── getPendingDeposits ────────────────────────────────────

  describe('getPendingDeposits', () => {
    it('returns error when query fails', async () => {
      const builder = createQueryBuilder({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await getPendingDeposits();
      expect(result).toEqual({ error: 'DB error' });
    });

    it('returns empty array when no pending deposits', async () => {
      const builder = createQueryBuilder({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await getPendingDeposits();
      expect(result).toEqual({ deposits: [] });
    });

    it('returns adapted deposit data with profile and balance lookups', async () => {
      const fromCalls: Record<string, any> = {
        deposit_requests: createQueryBuilder({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: 'dr-1', user_id: 'user-1', amount_cents: 200000, status: 'pending', created_at: '2026-04-13T00:00:00Z' },
            ],
            error: null,
          }),
        }),
        profiles: createQueryBuilder({
          in: jest.fn().mockResolvedValue({
            data: [{ id: 'user-1', username: '@DepositUser' }],
          }),
        }),
        wallets: createQueryBuilder({
          in: jest.fn().mockResolvedValue({
            data: [{ user_id: 'user-1', balance_cents: 300000 }],
          }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getPendingDeposits();
      expect(result.deposits).toHaveLength(1);
      expect(result.deposits![0].userName).toBe('DepositUser'); // @ stripped
      expect(result.deposits![0].amount).toBe(200000);
      expect(result.deposits![0].userBalance).toBe(300000);
    });

    it('defaults userName to "Jugador" when profile is missing', async () => {
      const fromCalls: Record<string, any> = {
        deposit_requests: createQueryBuilder({
          order: jest.fn().mockResolvedValue({
            data: [{ id: 'dr-1', user_id: 'orphan-user', amount_cents: 100000, status: 'pending', created_at: '2026-04-13T00:00:00Z' }],
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

      const result = await getPendingDeposits();
      expect(result.deposits![0].userName).toBe('Jugador');
      expect(result.deposits![0].userBalance).toBe(0);
    });

    it('does not strip @ from usernames that do not start with @', async () => {
      const fromCalls: Record<string, any> = {
        deposit_requests: createQueryBuilder({
          order: jest.fn().mockResolvedValue({
            data: [{ id: 'dr-1', user_id: 'user-1', amount_cents: 100000, status: 'pending', created_at: '2026-04-13T00:00:00Z' }],
            error: null,
          }),
        }),
        profiles: createQueryBuilder({
          in: jest.fn().mockResolvedValue({ data: [{ id: 'user-1', username: 'NoAtUser' }] }),
        }),
        wallets: createQueryBuilder({
          in: jest.fn().mockResolvedValue({ data: [{ user_id: 'user-1', balance_cents: 0 }] }),
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => fromCalls[table] ?? createQueryBuilder());

      const result = await getPendingDeposits();
      expect(result.deposits![0].userName).toBe('NoAtUser');
    });
  });
});
