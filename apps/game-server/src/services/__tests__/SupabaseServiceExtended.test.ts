import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted: set env vars + create mock refs BEFORE module evaluation ──
const { mockRpc, mockFrom, mockReplayFileSave, mockReplayGetMonthDir, mockRenderQueueEnqueue } = vi.hoisted(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.SUPABASE_URL = 'http://localhost:54321';

  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
    mockReplayFileSave: vi.fn().mockReturnValue(true),
    mockReplayGetMonthDir: vi.fn().mockReturnValue('2026-04'),
    mockRenderQueueEnqueue: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  })),
}));

vi.mock('../ReplayFileService', () => ({
  ReplayFileService: {
    save: mockReplayFileSave,
    getMonthDirFor: mockReplayGetMonthDir,
  },
}));

vi.mock('../RenderQueue', () => ({
  RenderQueue: {
    enqueue: mockRenderQueueEnqueue,
  },
}));

import { SupabaseService } from '../SupabaseService';

describe('SupabaseService — Extended Coverage', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ── updatePlayerStats ─────────────────────────────────────

  describe('updatePlayerStats', () => {
    it('inserts a new stats row when player has no existing stats', async () => {
      // .single() → no existing stat
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await SupabaseService.updatePlayerStats('user-1', true, 50000, 5000, 'primera');

      expect(mockFrom).toHaveBeenCalledWith('player_stats');
      const insertCall = mockFrom.mock.results[0].value.insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          games_played: 1,
          games_won: 1,
          total_won_cents: 50000,
          total_rake_paid_cents: 5000,
          current_streak: 1,
          best_streak: 1,
          primeras_count: 1,
          chivos_count: 0,
          segundas_count: 0,
        }),
      );
    });

    it('updates existing stats incrementally on win', async () => {
      const existingStat = {
        games_played: 10,
        games_won: 5,
        total_won_cents: 300000,
        total_lost_cents: 100000,
        total_rake_paid_cents: 30000,
        current_streak: 2,
        best_streak: 3,
        primeras_count: 1,
        chivos_count: 0,
        segundas_count: 0,
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingStat, error: null }),
        update: mockUpdate,
      });
      // The chained .eq after .update
      mockUpdate.mockReturnValue({ eq: mockEq });

      await SupabaseService.updatePlayerStats('user-1', true, 50000, 5000, null);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          games_played: 11,
          games_won: 6,
          total_won_cents: 350000,
          total_rake_paid_cents: 35000,
          current_streak: 3,
          best_streak: 3, // 3 is still >= new streak (3)
        }),
      );
    });

    it('resets current streak to 0 on loss', async () => {
      const existingStat = {
        games_played: 5,
        games_won: 3,
        total_won_cents: 200000,
        total_lost_cents: 50000,
        total_rake_paid_cents: 15000,
        current_streak: 2,
        best_streak: 4,
        primeras_count: 0,
        chivos_count: 0,
        segundas_count: 0,
      };

      const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingStat, error: null }),
        update: mockUpdate,
      });

      await SupabaseService.updatePlayerStats('user-1', false, 0, 5000, null);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_streak: 0,
          best_streak: 4, // unchanged since 0 < 4
          games_won: 3, // unchanged on loss
        }),
      );
    });

    it('updates best_streak when new streak exceeds previous best', async () => {
      const existingStat = {
        games_played: 5,
        games_won: 4,
        total_won_cents: 200000,
        total_lost_cents: 0,
        total_rake_paid_cents: 15000,
        current_streak: 4,
        best_streak: 4,
        primeras_count: 0,
        chivos_count: 0,
        segundas_count: 0,
      };

      const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingStat, error: null }),
        update: mockUpdate,
      });

      await SupabaseService.updatePlayerStats('user-1', true, 50000, 5000, null);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_streak: 5,
          best_streak: 5,
        }),
      );
    });

    it('increments special play counters correctly', async () => {
      const existingStat = {
        games_played: 1, games_won: 0,
        total_won_cents: 0, total_lost_cents: 0,
        total_rake_paid_cents: 0,
        current_streak: 0, best_streak: 0,
        primeras_count: 2, chivos_count: 1, segundas_count: 3,
      };

      const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingStat, error: null }),
        update: mockUpdate,
      });

      await SupabaseService.updatePlayerStats('user-1', true, 0, 0, 'chivo');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          primeras_count: 2, // unchanged
          chivos_count: 2,   // incremented
          segundas_count: 3, // unchanged
        }),
      );
    });

    it('handles DB error gracefully without throwing', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('DB down')),
      });

      // Should not throw
      await SupabaseService.updatePlayerStats('user-1', true, 0, 0, null);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating stats'),
        expect.any(Error),
      );
    });
  });

  // ── refundPlayer ──────────────────────────────────────────

  describe('refundPlayer', () => {
    it('returns success immediately for zero amount (no-op)', async () => {
      const result = await SupabaseService.refundPlayer('user-1', 0, 'game-1');
      expect(result).toEqual({ success: true });
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('returns success immediately for negative amount', async () => {
      const result = await SupabaseService.refundPlayer('user-1', -100, 'game-1');
      expect(result).toEqual({ success: true });
    });

    it('calls process_ledger_entry RPC with credit direction', async () => {
      mockRpc.mockResolvedValue({ data: { balance_after: 500000 }, error: null });

      const result = await SupabaseService.refundPlayer('user-1', 50000, 'game-1', {
        roomId: 'room-1',
        reason: 'Room closed',
      });

      expect(mockRpc).toHaveBeenCalledWith('process_ledger_entry', expect.objectContaining({
        p_user_id: 'user-1',
        p_amount_cents: 50000,
        p_type: 'refund',
        p_direction: 'credit',
      }));
      expect(result.success).toBe(true);
      expect(result.balance_after).toBe(500000);
    });

    it('returns failure when RPC returns data.error', async () => {
      mockRpc.mockResolvedValue({ data: { error: 'User frozen' }, error: null });

      const result = await SupabaseService.refundPlayer('user-1', 50000, 'game-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('User frozen');
    });

    it('returns failure on RPC exception', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'timeout' } });

      const result = await SupabaseService.refundPlayer('user-1', 50000, 'game-1');
      expect(result.success).toBe(false);
    });
  });

  // ── saveReplay ────────────────────────────────────────────

  describe('saveReplay', () => {
    it('saves to filesystem and enqueues render on success', async () => {
      mockReplayFileSave.mockReturnValue(true);
      mockReplayGetMonthDir.mockReturnValue('2026-04');

      // Mock supabase for games upsert + game_replays insert
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'tables') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: mockSelectSingle,
          };
        }
        if (table === 'games') {
          return { upsert: mockUpsert };
        }
        if (table === 'game_replays') {
          return { insert: mockInsert };
        }
        return {};
      });

      await SupabaseService.saveReplay(
        'game-1', 'seed-123', [{ action: 'deal' }], [{ id: 'p1' }],
        undefined, undefined, undefined, 'room-1', 'Test Table',
      );

      expect(mockReplayFileSave).toHaveBeenCalled();
      expect(mockRenderQueueEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: 'game-1' }),
      );
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          game_id: 'game-1',
          rng_seed: 'seed-123',
        }),
      );
    });

    it('does not enqueue render when filesystem save fails', async () => {
      mockReplayFileSave.mockReturnValue(false);

      // Still need from() calls
      const mockSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tables') {
          return { select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: mockSelectSingle };
        }
        return { upsert: vi.fn().mockResolvedValue({ error: null }), insert: vi.fn().mockResolvedValue({ error: null }) };
      });

      await SupabaseService.saveReplay('game-2', 'seed-2', [], []);

      expect(mockRenderQueueEnqueue).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL'),
      );
    });

    it('handles game_replays insert failure without throwing', async () => {
      mockReplayFileSave.mockReturnValue(true);
      mockReplayGetMonthDir.mockReturnValue('2026-04');

      const mockSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tables') {
          return { select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: mockSelectSingle };
        }
        if (table === 'games') {
          return { upsert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === 'game_replays') {
          return { insert: vi.fn().mockResolvedValue({ error: { message: 'duplicate replay' } }) };
        }
        return {};
      });

      // Should not throw
      await SupabaseService.saveReplay('game-dup', 'seed', [], []);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('replay save failed'),
        expect.stringContaining('duplicate replay'),
      );
    });
  });

  // ── createGameSession ─────────────────────────────────────

  describe('createGameSession', () => {
    it('upserts a game row with in_progress status', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'tables') {
          return { select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: mockSelectSingle };
        }
        if (table === 'games') {
          return { upsert: mockUpsert };
        }
        return {};
      });

      await SupabaseService.createGameSession('game-new', 'Table Alpha');

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'game-new',
          status: 'in_progress',
        }),
      );
    });

    it('handles error without throwing', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tables') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null }),
          };
        }
        if (table === 'games') {
          return { upsert: vi.fn().mockResolvedValue({ error: { message: 'constraint violation' } }) };
        }
        return {};
      });

      await SupabaseService.createGameSession('game-err', 'Table');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error creating game session'),
        expect.anything(),
      );
    });
  });

  // ── lookupUserByPhone ─────────────────────────────────────

  describe('lookupUserByPhone', () => {
    it('returns user on successful lookup', async () => {
      mockRpc.mockResolvedValue({
        data: { found: true, user_id: 'user-2', username: 'TestPlayer' },
        error: null,
      });

      const result = await SupabaseService.lookupUserByPhone('+573001234567');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-2');
      expect(result.name).toBe('TestPlayer');
    });

    it('normalizes a 10-digit Colombian number', async () => {
      mockRpc.mockResolvedValue({
        data: { found: true, user_id: 'user-3', username: 'Player3' },
        error: null,
      });

      await SupabaseService.lookupUserByPhone('3001234567');

      expect(mockRpc).toHaveBeenCalledWith('lookup_user_by_phone', {
        p_phone: '+573001234567',
      });
    });

    it('normalizes a number starting with 57', async () => {
      mockRpc.mockResolvedValue({
        data: { found: true, user_id: 'user-4', username: 'Player4' },
        error: null,
      });

      await SupabaseService.lookupUserByPhone('573001234567');

      expect(mockRpc).toHaveBeenCalledWith('lookup_user_by_phone', {
        p_phone: '+573001234567',
      });
    });

    it('returns error when user is not found', async () => {
      mockRpc.mockResolvedValue({
        data: { found: false, error: 'No encontrado' },
        error: null,
      });

      const result = await SupabaseService.lookupUserByPhone('3009999999');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No encontrado');
    });

    it('returns error when RPC throws', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'function not found' },
      });

      const result = await SupabaseService.lookupUserByPhone('3001234567');

      expect(result.success).toBe(false);
    });

    it('returns error when RPC data is null (unexpected)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await SupabaseService.lookupUserByPhone('3001234567');

      expect(result.success).toBe(false);
    });
  });
});
