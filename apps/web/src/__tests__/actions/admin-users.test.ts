/**
 * @jest-environment node
 */
import { getUsersList, toggleBanStatus, adjustUserBalance } from '@/app/actions/admin-users';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/app/actions/admin-audit';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/actions/admin-audit', () => ({
  logAdminAction: jest.fn().mockResolvedValue(undefined),
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

    it('normaliza datos parciales de perfil sin filtrar usuarios validos', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [{
          id: 'abc-def-ghi',
          full_name: null,
          username: null,
          phone: null,
          role: 'player',
          wallets: { balance_cents: '2500' },
          is_banned: false,
          stats: { games_played: 7, games_won: 3 },
          devices: [],
          created_at: '2026-06-20T10:00:00.000Z',
        }],
        error: null,
      });

      const [user] = await getUsersList();

      expect(user).toEqual(expect.objectContaining({
        username: '',
        display_name: 'Desconocido',
        phone: 'abc',
        balance_cents: 2500,
        last_login: '2026-06-20T10:00:00.000Z',
        stats: { games_played: 7, games_won: 3 },
      }));
    });

    it('propaga errores de consulta sin intentar mapear datos incompletos', async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: new Error('query failed') });

      await expect(getUsersList()).rejects.toThrow('query failed');
    });

    it('rechaza usuarios sin sesion antes de consultar el listado', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      await expect(getUsersList()).rejects.toThrow('No autenticado');
      expect(mockSupabase.order).not.toHaveBeenCalled();
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

    it('usa motivo por defecto al banear y registra auditoria accionable', async () => {
      await toggleBanStatus('user-2', true);

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        is_banned: true,
        ban_reason: 'Violación de términos del local.',
        banned_by: 'admin-id',
      }));
      expect(logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'user_banned',
        'user',
        'user-2',
        { is_banned: true, ban_reason: null }
      );
      expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
    });

    it('propaga errores de actualizacion y no audita cambios fallidos', async () => {
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ error: new Error('update failed') });

      await expect(toggleBanStatus('user-1', false)).rejects.toThrow('update failed');

      expect(logAdminAction).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('adjustUserBalance', () => {
    it('should call admin_adjust_user_balance RPC with positive delta', async () => {
      const result = await adjustUserBalance('user-1', 5000, 'Bonificación por evento');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('admin_adjust_user_balance', {
        p_user_id: 'user-1',
        p_delta_cents: 5000,
        p_reason: 'Bonificación por evento',
      });
      expect(result.success).toBe(true);
    });

    it('should call admin_adjust_user_balance RPC with negative delta', async () => {
      await adjustUserBalance('user-1', -3000, 'Corrección por error');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('admin_adjust_user_balance', expect.objectContaining({
        p_user_id: 'user-1',
        p_delta_cents: -3000,
        p_reason: 'Corrección por error',
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
      expect(logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'balance_adjusted',
        'user',
        'user-1',
        expect.objectContaining({ direction: 'credit', amount_cents: 5000, reason: 'Premio' })
      );
      expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
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
