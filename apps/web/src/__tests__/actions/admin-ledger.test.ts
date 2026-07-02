/**
 * @jest-environment node
 */
import { getUsersWithBalances, getLedgerEntries, getUserLedger, getUserProfile } from '@/app/actions/admin-ledger';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

function buildMockSupabase(overrides: Record<string, unknown> = {}) {
  const base = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-id' } } }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  };
  return base;
}

describe('Admin Ledger Server Actions', () => {
  let mockSupabase: ReturnType<typeof buildMockSupabase>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockSupabase = buildMockSupabase();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // ── Auth guard ────────────────────────────────────────────
  describe('verifyAdmin guard', () => {
    it('throws when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(getUsersWithBalances()).rejects.toThrow('No autenticado');
    });

    it('throws when user is not admin', async () => {
      mockSupabase.single.mockResolvedValue({ data: { role: 'player' }, error: null });
      await expect(getUsersWithBalances()).rejects.toThrow('Acceso denegado');
    });
  });

  // ── getUsersWithBalances ──────────────────────────────────
  describe('getUsersWithBalances', () => {
    it('calls the get_admin_ledger_summary RPC exactly once (no N+1)', async () => {
      const summaryData = [
        {
          id: 'user-1',
          display_name: 'Mauro',
          username: 'mauro',
          balance: 1438500,
          total_credits: 3278250,
          total_debits: 1839750,
          last_activity: '2026-04-11T03:16:56Z',
        },
        {
          id: 'user-2',
          display_name: 'Dario Cadena',
          username: 'dario',
          balance: 1128500,
          total_credits: 2225500,
          total_debits: 1107000,
          last_activity: '2026-04-11T03:16:56Z',
        },
        {
          id: 'user-3',
          display_name: 'Ximena Rodriguez',
          username: 'ximena',
          balance: 468863,
          total_credits: 2593751,
          total_debits: 2124888,
          last_activity: '2026-04-09T18:05:10Z',
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: summaryData, error: null });

      const result = await getUsersWithBalances();

      // Must call the RPC exactly once — the old N+1 pattern must be gone
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_admin_ledger_summary');

      // Must NOT call .from('ledger') at all — aggregation is server-side
      const fromCalls = mockSupabase.from.mock.calls
        .filter((c: string[]) => c[0] === 'ledger');
      expect(fromCalls).toHaveLength(0);

      // Verify shape and mapping
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'user-1',
        display_name: 'Mauro',
        username: 'mauro',
        balance: 1438500,
        total_credits: 3278250,
        total_debits: 1839750,
        last_activity: '2026-04-11T03:16:56Z',
      });
    });

    it('returns empty array when RPC returns no data', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      const result = await getUsersWithBalances();
      expect(result).toEqual([]);
    });

    it('throws on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
      await expect(getUsersWithBalances()).rejects.toEqual({ message: 'DB error' });
    });

    it('handles users with no ledger entries (null aggregates)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'user-new',
          display_name: null,
          username: null,
          balance: 0,
          total_credits: null,
          total_debits: null,
          last_activity: null,
        }],
        error: null,
      });

      const result = await getUsersWithBalances();
      expect(result[0]).toEqual({
        id: 'user-new',
        display_name: 'Desconocido',
        username: null,
        balance: 0,
        total_credits: 0,
        total_debits: 0,
        last_activity: null,
      });
    });
  });

  describe('getLedgerEntries', () => {
    it('throws query errors before mapping entries', async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: { message: 'ledger unavailable' } });

      await expect(getLedgerEntries(5)).rejects.toEqual({ message: 'ledger unavailable' });
      expect(mockSupabase.from).toHaveBeenCalledWith('ledger');
      expect(mockSupabase.limit).toHaveBeenCalledWith(5);
    });

    it('maps missing profile names to Desconocido and empty references to null game_id', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: 'entry-1', reference_id: '', user: [{ full_name: '', username: '' }] },
          { id: 'entry-2', reference_id: 'game-2', user: [] },
        ],
        error: null,
      });

      const result = await getLedgerEntries();

      expect(result[0]).toEqual(expect.objectContaining({
        id: 'entry-1',
        game_id: null,
        user: { display_name: 'Desconocido' },
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        id: 'entry-2',
        game_id: 'game-2',
        user: null,
      }));
    });
  });

  describe('getUserLedger', () => {
    it('throws query errors for a specific user ledger', async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: { message: 'user ledger failed' } });

      await expect(getUserLedger('user-1', 3)).rejects.toEqual({ message: 'user ledger failed' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockSupabase.limit).toHaveBeenCalledWith(3);
    });

    it('returns an empty list when the user ledger query returns null data', async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: null });

      await expect(getUserLedger('user-empty')).resolves.toEqual([]);
    });

    it('normalizes empty reference ids to null game_id', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [{ id: 'entry-1', reference_id: '' }], error: null });

      await expect(getUserLedger('user-1')).resolves.toEqual([
        expect.objectContaining({ id: 'entry-1', game_id: null, user: null }),
      ]);
    });
  });

  describe('getUserProfile', () => {
    it('returns zero balance when wallet is missing and keeps nullable profile fields', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-1', full_name: null, username: null }, error: null });
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(getUserProfile('user-1')).resolves.toEqual({
        id: 'user-1',
        full_name: null,
        username: null,
        balance: 0,
      });
    });
  });
});
