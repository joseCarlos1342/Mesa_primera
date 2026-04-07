/**
 * @jest-environment node
 */
import { getUsersList, toggleBanStatus, adjustUserBalance } from '@/app/actions/admin-users';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Admin Users Server Actions', () => {
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
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      order: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockResolvedValue({
        data: { success: true, ledger_id: 'ledger-123', balance_before: 10000, balance_after: 15000 },
        error: null,
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('getUsersList', () => {
    it('should return mapped array of users', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [{
          id: 'user-1',
          full_name: 'Player One',
          wallets: [{ balance: 1000 }],
          is_banned: false,
          stats: [{ games_played: 5, games_won: 2 }],
          devices: [{ fingerprint: 'xyz' }]
        }],
        error: null,
      });

      const result = await getUsersList();
      expect(result).toHaveLength(1);
      expect(result[0].stats?.games_played).toBe(5);
      expect(result[0].display_name).toBe('Player One');
    });

    it('should default stats to 0 if not present', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [{
          id: 'user-2',
          full_name: 'Player Two',
          wallets: [],
          is_banned: false,
          stats: null,
          devices: []
        }],
        error: null,
      });

      const result = await getUsersList();
      expect(result[0].stats?.games_played).toBe(0);
    });
  });

  describe('toggleBanStatus', () => {
    it('should correctly update banning details when banning a user', async () => {
      await toggleBanStatus('user-1', true, 'Cheating detected');

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        is_banned: true,
        ban_reason: 'Cheating detected',
        banned_by: 'admin-id'
      }));
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-1');
    });

    it('should correctly clear ban details when unbanning a user', async () => {
      await toggleBanStatus('user-1', false);

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null
      }));
    });
  });

  describe('adjustUserBalance', () => {
    it('should call process_ledger_entry RPC with credit for positive delta', async () => {
      const result = await adjustUserBalance('user-1', 5000, 'Bonificación por evento');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_ledger_entry', {
        p_user_id: 'user-1',
        p_amount_cents: 5000,
        p_type: 'adjustment',
        p_direction: 'credit',
        p_description: 'Ajuste administrativo: Bonificación por evento',
        p_approved_by: 'admin-id',
        p_metadata: { reason: 'Bonificación por evento', admin_id: 'admin-id' },
      });
      expect(result.success).toBe(true);
    });

    it('should call process_ledger_entry RPC with debit for negative delta', async () => {
      await adjustUserBalance('user-1', -3000, 'Corrección por error');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_ledger_entry', expect.objectContaining({
        p_user_id: 'user-1',
        p_amount_cents: 3000,
        p_direction: 'debit',
        p_type: 'adjustment',
      }));
    });

    it('should create a notification for the user after adjustment', async () => {
      await adjustUserBalance('user-1', 5000, 'Premio');

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        type: 'balance_adjustment',
        title: 'Saldo Acreditado',
      }));
    });

    it('should create debit notification with correct title', async () => {
      await adjustUserBalance('user-1', -2000, 'Penalización');

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        type: 'balance_adjustment',
        title: 'Saldo Debitado',
      }));
    });

    it('should throw if delta is zero', async () => {
      await expect(adjustUserBalance('user-1', 0, 'No aplica'))
        .rejects.toThrow('El monto debe ser diferente de cero');
    });

    it('should throw if reason is empty', async () => {
      await expect(adjustUserBalance('user-1', 1000, '   '))
        .rejects.toThrow('El motivo del ajuste es obligatorio');
    });

    it('should throw when RPC returns an error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { error: 'Saldo insuficiente' },
        error: null,
      });

      await expect(adjustUserBalance('user-1', -99999, 'Test'))
        .rejects.toThrow('Saldo insuficiente');
    });

    it('should throw when RPC call fails with supabase error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection lost' },
      });

      await expect(adjustUserBalance('user-1', 1000, 'Test'))
        .rejects.toThrow('Database connection lost');
    });

    it('should reject non-admin users', async () => {
      mockSupabase.single.mockResolvedValue({ data: { role: 'player' }, error: null });

      await expect(adjustUserBalance('user-1', 1000, 'Test'))
        .rejects.toThrow('Acceso denegado');
    });
  });
});
