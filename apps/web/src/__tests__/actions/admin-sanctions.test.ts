/**
 * @jest-environment node
 */
import {
  createSanction,
  revokeSanction,
  getActiveSanctions,
  type SanctionInput,
} from '@/app/actions/admin-sanctions';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/actions/admin-audit', () => ({
  logAdminAction: jest.fn(),
}));

describe('Admin Sanctions Server Actions', () => {
  let mockSupabase: any;
  const ADMIN_ID = 'admin-uuid-001';
  const USER_ID = 'user-uuid-001';

  function buildMockChain(resolveValue: any) {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(resolveValue),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
    };
    return chain;
  }

  beforeEach(() => {
    jest.resetAllMocks();

    const profileChain = buildMockChain({ data: { role: 'admin' }, error: null });

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID } } }),
      },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return profileChain;
        // Default chain for user_sanctions
        return buildMockChain({ data: null, error: null });
      }),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // ─────────────────────────────────────────────────────
  // createSanction
  // ─────────────────────────────────────────────────────

  describe('createSanction', () => {
    it('should insert a full_suspension with expiration', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const sanctionChain = buildMockChain({ data: null, error: null });
      sanctionChain.select.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sanction-1',
            user_id: USER_ID,
            sanction_type: 'full_suspension',
            reason: 'Comportamiento abusivo',
            applied_by: ADMIN_ID,
            starts_at: new Date().toISOString(),
            expires_at: expiresAt,
          },
          error: null,
        }),
      });

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'profiles') return buildMockChain({ data: { role: 'admin' }, error: null });
        if (table === 'user_sanctions') return sanctionChain;
        return buildMockChain({ data: null, error: null });
      });

      const input: SanctionInput = {
        userId: USER_ID,
        sanctionType: 'full_suspension',
        reason: 'Comportamiento abusivo',
        expiresAt,
      };

      const result = await createSanction(input);

      expect(result.success).toBe(true);
      expect(result.sanction).toBeDefined();
      expect(result.sanction!.sanction_type).toBe('full_suspension');
    });

    it('should insert a permanent_ban with no expiration', async () => {
      const sanctionChain = buildMockChain({ data: null, error: null });
      sanctionChain.select.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sanction-2',
            user_id: USER_ID,
            sanction_type: 'permanent_ban',
            reason: 'Fraude confirmado',
            applied_by: ADMIN_ID,
            expires_at: null,
          },
          error: null,
        }),
      });

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'profiles') return buildMockChain({ data: { role: 'admin' }, error: null });
        if (table === 'user_sanctions') return sanctionChain;
        return buildMockChain({ data: null, error: null });
      });

      const input: SanctionInput = {
        userId: USER_ID,
        sanctionType: 'permanent_ban',
        reason: 'Fraude confirmado',
      };

      const result = await createSanction(input);

      expect(result.success).toBe(true);
      expect(result.sanction!.expires_at).toBeNull();
      expect(result.sanction!.sanction_type).toBe('permanent_ban');
    });

    it('should insert a game_suspension with room source', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const sanctionChain = buildMockChain({ data: null, error: null });
      sanctionChain.select.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sanction-3',
            user_id: USER_ID,
            sanction_type: 'game_suspension',
            reason: 'Colusión detectada',
            applied_by: ADMIN_ID,
            source_room_id: 'room-abc',
            expires_at: expiresAt,
          },
          error: null,
        }),
      });

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'profiles') return buildMockChain({ data: { role: 'admin' }, error: null });
        if (table === 'user_sanctions') return sanctionChain;
        return buildMockChain({ data: null, error: null });
      });

      const input: SanctionInput = {
        userId: USER_ID,
        sanctionType: 'game_suspension',
        reason: 'Colusión detectada',
        sourceRoomId: 'room-abc',
        expiresAt,
      };

      const result = await createSanction(input);

      expect(result.success).toBe(true);
      expect(result.sanction!.sanction_type).toBe('game_suspension');
      expect(result.sanction!.source_room_id).toBe('room-abc');
    });

    it('should reject empty reason', async () => {
      const input: SanctionInput = {
        userId: USER_ID,
        sanctionType: 'full_suspension',
        reason: '   ',
      };

      await expect(createSanction(input)).rejects.toThrow('El motivo es obligatorio');
    });

    it('should reject non-admin users', async () => {
      mockSupabase.from = jest.fn(() =>
        buildMockChain({ data: { role: 'player' }, error: null })
      );

      const input: SanctionInput = {
        userId: USER_ID,
        sanctionType: 'full_suspension',
        reason: 'Test',
      };

      await expect(createSanction(input)).rejects.toThrow('Acceso denegado');
    });

    it('should propagate database errors', async () => {
      const sanctionChain = buildMockChain({ data: null, error: null });
      sanctionChain.select.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Foreign key violation' },
        }),
      });

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'profiles') return buildMockChain({ data: { role: 'admin' }, error: null });
        if (table === 'user_sanctions') return sanctionChain;
        return buildMockChain({ data: null, error: null });
      });

      const input: SanctionInput = {
        userId: USER_ID,
        sanctionType: 'full_suspension',
        reason: 'Test',
      };

      await expect(createSanction(input)).rejects.toThrow('Foreign key violation');
    });
  });

  // ─────────────────────────────────────────────────────
  // revokeSanction
  // ─────────────────────────────────────────────────────

  describe('revokeSanction', () => {
    it('should update sanction with revoked_at and revoked_by', async () => {
      const sanctionChain = buildMockChain({ data: null, error: null });
      const selectAfterUpdate = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sanction-1',
            user_id: USER_ID,
            sanction_type: 'full_suspension',
            revoked_at: new Date().toISOString(),
            revoked_by: ADMIN_ID,
          },
          error: null,
        }),
      });
      sanctionChain.select = selectAfterUpdate;

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'profiles') return buildMockChain({ data: { role: 'admin' }, error: null });
        if (table === 'user_sanctions') return sanctionChain;
        return buildMockChain({ data: null, error: null });
      });

      const result = await revokeSanction('sanction-1');

      expect(result.success).toBe(true);
      expect(result.sanction!.revoked_at).toBeDefined();
      expect(result.sanction!.revoked_by).toBe(ADMIN_ID);
    });

    it('should reject non-admin users', async () => {
      mockSupabase.from = jest.fn(() =>
        buildMockChain({ data: { role: 'player' }, error: null })
      );

      await expect(revokeSanction('sanction-1')).rejects.toThrow('Acceso denegado');
    });
  });

  // ─────────────────────────────────────────────────────
  // getActiveSanctions
  // ─────────────────────────────────────────────────────

  describe('getActiveSanctions', () => {
    it('should call get_active_sanctions RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sanction-1',
            user_id: USER_ID,
            sanction_type: 'full_suspension',
            reason: 'Test',
            expires_at: null,
          },
        ],
        error: null,
      });

      const result = await getActiveSanctions(USER_ID);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_active_sanctions', {
        p_user_id: USER_ID,
      });
      expect(result).toHaveLength(1);
      expect(result[0].sanction_type).toBe('full_suspension');
    });

    it('should return empty array for users without sanctions', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await getActiveSanctions(USER_ID);

      expect(result).toHaveLength(0);
    });

    it('should reject non-admin users', async () => {
      mockSupabase.from = jest.fn(() =>
        buildMockChain({ data: { role: 'player' }, error: null })
      );

      await expect(getActiveSanctions(USER_ID)).rejects.toThrow('Acceso denegado');
    });
  });
});
