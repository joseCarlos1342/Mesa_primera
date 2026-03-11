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
    
    await expect(getAdminDashboardStats()).rejects.toThrow('Acceso denegado');
  });

  it('should deny access if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not logged in' } });
    
    await expect(getAdminDashboardStats()).rejects.toThrow('No autenticado');
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
});
