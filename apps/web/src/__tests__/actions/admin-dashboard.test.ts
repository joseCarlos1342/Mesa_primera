/**
 * @jest-environment node
 */
import { getAdminDashboardStats } from '@/app/actions/admin-dashboard';
import { createClient } from '@/utils/supabase/server';

// Mocking Supabase server client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Admin Dashboard Server Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.resetAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-id' } } }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      count: jest.fn().mockResolvedValue({ count: 10, error: null }),
      neq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should deny access if user is not admin', async () => {
    mockSupabase.single.mockResolvedValue({ data: { role: 'player' }, error: null });
    
    await expect(getAdminDashboardStats()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('should deny access if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not logged in' } });
    
    await expect(getAdminDashboardStats()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('should return correct format array of stats for admin dashboard with proper values', async () => {
    // Mock specific counts
    mockSupabase.rpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_total_users_balance') return Promise.resolve({ data: 10000 });
      if (rpcName === 'get_ledger_net_balance') return Promise.resolve({ data: 10000 });
      if (rpcName === 'get_daily_volume') return Promise.resolve({ data: 50000 });
      return Promise.resolve({ data: 0 });
    });

    const result = await getAdminDashboardStats();

    expect(result).toHaveProperty('activeUsers');
    expect(result.ledgerIntegrityStatus).toBe('OPERATIVO'); 
    expect(result.totalLedgerBalance).toBe(10000); 
  });

  it('should reflect CRÍTICO status when ledger net balance is lower than total user balance', async () => {
    // Simulate money missing from backend operations
    mockSupabase.rpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_total_users_balance') return Promise.resolve({ data: 50000 }); // Users claim they have $500
      if (rpcName === 'get_ledger_net_balance') return Promise.resolve({ data: 49000 }); // System says there's only $490
      return Promise.resolve({ data: 0 });
    });

    const result = await getAdminDashboardStats();
    
    expect(result.ledgerIntegrityStatus).toBe('CRÍTICO');
  });

  it('should include fetchedAt ISO timestamp', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 0 });

    const result = await getAdminDashboardStats();

    expect(result.fetchedAt).toBeDefined();
    expect(() => new Date(result.fetchedAt)).not.toThrow();
  });

  it('should include empty warnings array when all RPCs succeed', async () => {
    mockSupabase.rpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_total_users_balance') return Promise.resolve({ data: 10000, error: null });
      if (rpcName === 'get_ledger_net_balance') return Promise.resolve({ data: 10000, error: null });
      if (rpcName === 'get_vault_status') return Promise.resolve({ data: { total_deposits: 10000, total_withdrawals: 0, vault_balance: 10000, coverage: 100 }, error: null });
      return Promise.resolve({ data: 0, error: null });
    });
    // Mock fetch to avoid matchmake fallback warning
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

    const result = await getAdminDashboardStats();

    expect(result.warnings).toEqual([]);
  });

  it('should add warning when get_total_users_balance RPC fails', async () => {
    mockSupabase.rpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_total_users_balance') return Promise.resolve({ data: null, error: { message: 'RPC not found' } });
      if (rpcName === 'get_ledger_net_balance') return Promise.resolve({ data: 10000, error: null });
      return Promise.resolve({ data: 0, error: null });
    });

    const result = await getAdminDashboardStats();

    expect(result.warnings).toContainEqual(expect.stringContaining('get_total_users_balance'));
  });

  it('should add warning when get_ledger_net_balance RPC fails', async () => {
    mockSupabase.rpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_total_users_balance') return Promise.resolve({ data: 10000, error: null });
      if (rpcName === 'get_ledger_net_balance') return Promise.resolve({ data: null, error: { message: 'RPC not found' } });
      return Promise.resolve({ data: 0, error: null });
    });

    const result = await getAdminDashboardStats();

    expect(result.warnings).toContainEqual(expect.stringContaining('get_ledger_net_balance'));
  });

  it('should show DESCONOCIDO vault status and warning when get_vault_status RPC fails', async () => {
    mockSupabase.rpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_vault_status') return Promise.resolve({ data: null, error: { message: 'not found' } });
      return Promise.resolve({ data: 0, error: null });
    });

    const result = await getAdminDashboardStats();

    expect(result.vaultStatus).toBe('DESCONOCIDO');
    expect(result.warnings).toContainEqual(expect.stringContaining('get_vault_status'));
  });

  it('should add warning when matchmake fetch fails', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 0, error: null });
    global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed'));

    const result = await getAdminDashboardStats();

    expect(result.warnings).toContainEqual(expect.stringContaining('matchmake'));
  });

  function setupDashboardClient({
    rpcResults = {},
    tables = {},
    rooms = [],
  }: {
    rpcResults?: Record<string, { data: any; error?: any }>;
    tables?: Record<string, any>;
    rooms?: Array<{ clients: number }>;
  }) {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => rooms });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null }),
      },
      rpc: jest.fn((name: string) => Promise.resolve(rpcResults[name] ?? { data: 0, error: null })),
      from: jest.fn((table: string) => {
        const filters: Array<{ method: string; field: string; value: any }> = [];
        let selectOptions: { head?: boolean; count?: string } | undefined;
        let selectedColumns = '';

        const resolve = () => {
          if (table === 'profiles') return { data: { role: 'admin' }, error: null };

          if (selectOptions?.head && selectOptions.count === 'exact') {
            const configuredCount = tables[`${table}:count`];
            return { count: configuredCount ?? 0, error: null };
          }

          if (table === 'ledger' && selectedColumns === 'amount_cents, direction') {
            return { data: tables.ledgerNetRows ?? [], error: null };
          }

          if (table === 'ledger' && filters.some(filter => filter.field === 'type' && filter.value === 'rake')) {
            return { data: tables.rakeRows ?? [], error: null };
          }

          if (table === 'ledger') return { data: tables.volumeRows ?? [], error: null };
          if (table === 'wallets') return { data: tables.walletRows ?? [], error: null };
          if (table === 'user_devices') return { data: tables.deviceRows ?? [], error: null };

          return { data: tables[table] ?? [], error: null };
        };

        const builder = {
          select: (columns?: string, options?: { head?: boolean; count?: string }) => {
            selectedColumns = columns ?? '';
            selectOptions = options;
            return builder;
          },
          eq: (field: string, value: any) => {
            filters.push({ method: 'eq', field, value });
            return builder;
          },
          in: (field: string, value: any) => {
            filters.push({ method: 'in', field, value });
            return builder;
          },
          gte: (field: string, value: any) => {
            filters.push({ method: 'gte', field, value });
            return builder;
          },
          single: async () => resolve(),
          then: (resolvePromise: (value: any) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve(resolve()).then(resolvePromise, reject),
        };

        return builder;
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(client);
    return client;
  }

  it('uses read-only wallet and ledger fallbacks when balance RPCs fail', async () => {
    setupDashboardClient({
      rpcResults: {
        get_active_users_count: { data: 7, error: null },
        get_total_users_balance: { data: null, error: { message: 'missing rpc' } },
        get_ledger_net_balance: { data: null, error: { message: 'missing rpc' } },
        get_vault_status: {
          data: { total_deposits: 120_000, total_withdrawals: 20_000, vault_balance: 100_000, coverage: 100 },
          error: null,
        },
      },
      tables: {
        walletRows: [{ balance_cents: 7000 }, { balance_cents: '3000' }, { balance_cents: null }],
        ledgerNetRows: [
          { amount_cents: 12_000, direction: 'credit' },
          { amount_cents: 2_000, direction: 'debit' },
          { amount_cents: 999, direction: 'ignored' },
        ],
        volumeRows: [{ amount_cents: 500 }, { amount_cents: null }],
      },
      rooms: [{ clients: 2 }, { clients: 0 }, { clients: 1 }],
    });

    const result = await getAdminDashboardStats();

    expect(result.activeUsers).toBe(7);
    expect(result.activeGames).toBe(2);
    expect(result.totalUsersBalance).toBe(10_000);
    expect(result.totalLedgerBalance).toBe(10_000);
    expect(result.volume24h).toBe(500);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('get_total_users_balance'),
        expect.stringContaining('get_ledger_net_balance'),
      ])
    );
  });

  it('marks small ledger differences as ALERTA and detects shared fingerprints', async () => {
    setupDashboardClient({
      rpcResults: {
        get_total_users_balance: { data: 10_000, error: null },
        get_ledger_net_balance: { data: 10_050, error: null },
        get_vault_status: {
          data: { total_deposits: 100_000, total_withdrawals: 25_000, vault_balance: 75_000, coverage: 90 },
          error: null,
        },
      },
      tables: {
        deviceRows: [
          { fingerprint: 'shared-device', user_id: 'user-a' },
          { fingerprint: 'shared-device', user_id: 'user-b' },
          { fingerprint: '', user_id: 'ignored' },
          { fingerprint: 'solo', user_id: 'user-c' },
        ],
        rakeRows: [{ amount_cents: 100 }, { amount_cents: 50 }],
      },
    });

    const result = await getAdminDashboardStats();

    expect(result.ledgerIntegrityStatus).toBe('ALERTA');
    expect(result.ledgerIntegrityDiff).toBe(50);
    expect(result.fraudAccountsCount).toBe(2);
    expect(result.totalRake).toBe(150);
    expect(result.vaultStatus).toBe('CRÍTICO');
    expect(result.vaultCoverage).toBe(90);
  });

  it('keeps vault status in ALERTA when coverage reaches 100 percent', async () => {
    setupDashboardClient({
      rpcResults: {
        get_total_users_balance: { data: 10_000, error: null },
        get_ledger_net_balance: { data: 10_000, error: null },
        get_vault_status: {
          data: { total_deposits: 50_000, total_withdrawals: 0, vault_balance: 50_000, coverage: 100 },
          error: null,
        },
      },
    });

    const result = await getAdminDashboardStats();

    expect(result.vaultStatus).toBe('ALERTA');
    expect(result.vaultTotalDeposits).toBe(50_000);
    expect(result.vaultTotalWithdrawals).toBe(0);
    expect(result.vaultBalance).toBe(50_000);
  });
});
