import { getUsersList, toggleBanStatus } from '@/app/actions/admin-users';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
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
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      order: jest.fn().mockReturnThis(),
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
});
