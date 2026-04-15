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
});
