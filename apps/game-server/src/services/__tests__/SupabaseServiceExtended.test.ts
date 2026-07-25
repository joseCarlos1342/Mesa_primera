import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted: set env vars + create mock refs BEFORE module evaluation ──
const { mockRpc, mockFrom, mockReplayFileSave, mockReplayGetMonthDir, mockRedis } = vi.hoisted(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.SUPABASE_URL = 'http://localhost:54321';

  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
    mockReplayFileSave: vi.fn().mockReturnValue(true),
    mockReplayGetMonthDir: vi.fn().mockReturnValue('2026-04'),
      mockRedis: {
        get: vi.fn(),
        getdel: vi.fn(),
        del: vi.fn(),
      },
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

vi.mock('../redis', () => ({
  redis: mockRedis,
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

  describe('ledger RPC helpers', () => {
    it('awardPot delegates payout and rake to the atomic award_pot RPC', async () => {
      mockRpc.mockResolvedValue({ data: { balance_after: 125000 }, error: null });

      await expect(SupabaseService.awardPot('winner-1', 95000, 5000, 'game-1', 'table-1', {
        roomId: 'room-1',
        tableName: 'Mesa Principal',
        playersPresent: [{ odisplayName: 'Ana' }],
      })).resolves.toEqual({ success: true, balance_after: 125000 });

      expect(mockRpc).toHaveBeenCalledWith('award_pot', {
        p_winner_id: 'winner-1',
        p_payout: 95000,
        p_rake: 5000,
        p_game_id: 'game-1',
        p_table_id: 'table-1',
        p_pot_details: {
          payout: 95000,
          rake: 5000,
          total: 100000,
          table_id: 'table-1',
          room_id: 'room-1',
          table_name: 'Mesa Principal',
          players_present: [{ odisplayName: 'Ana' }],
          commission_pct: 0.05,
        },
      });
    });

    it('awardPot returns a structured failure for logical RPC errors', async () => {
      mockRpc.mockResolvedValue({ data: { error: 'duplicate payout' }, error: null });

      await expect(SupabaseService.awardPot('winner-1', 95000, 5000, 'game-1')).resolves.toEqual({
        success: false,
        error: 'Error: duplicate payout',
      });
    });

    it('recordBet writes a debit ledger entry with phase metadata', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      mockRpc.mockResolvedValue({ data: { balance_after: 75000 }, error: null });

      await expect(SupabaseService.recordBet('user-1', 25000, 'game-1', 'table-ignored', {
        roomId: 'room-1',
        tableName: 'Mesa Principal',
        phase: 'GUERRA',
      })).resolves.toEqual({ success: true, balance_after: 75000 });

      expect(mockRpc).toHaveBeenCalledWith('process_ledger_entry', {
        p_user_id: 'user-1',
        p_amount_cents: 25000,
        p_type: 'bet',
        p_direction: 'debit',
        p_game_id: 'game-1',
        p_table_id: null,
        p_description: 'Apuesta en mesa (GUERRA)',
        p_reference_id: 'bet-game-1-1700000000000',
        p_metadata: { room_id: 'room-1', table_name: 'Mesa Principal', phase: 'GUERRA' },
      });
    });

    it('recordBet marks insufficient-balance RPC rejections', async () => {
      mockRpc.mockResolvedValue({ data: { error: 'saldo insuficiente' }, error: null });

      await expect(SupabaseService.recordBet('user-1', 25000, 'game-1')).resolves.toEqual({
        success: false,
        error: 'saldo insuficiente',
        isBalanceError: true,
      });
    });

    it('transferPiqueBanda sends all losers through the atomic banda RPC', async () => {
      mockRpc.mockResolvedValue({ data: { total_banda: 20000, payout: 19000, rake: 1000 }, error: null });

      await expect(SupabaseService.transferPiqueBanda('winner-1', [
        { userId: 'loser-1', amountCents: 10000 },
        { userId: 'loser-2', amountCents: 10000 },
      ], 'game-1', { roomId: 'room-1', tableName: 'Mesa Principal' })).resolves.toEqual({
        success: true,
        totalBanda: 20000,
        payout: 19000,
        rake: 1000,
      });

      expect(mockRpc).toHaveBeenCalledWith('transfer_pique_banda', {
        p_transfer_id: 'game-1',
        p_winner_id: 'winner-1',
        p_losers: [
          { user_id: 'loser-1', amount_cents: 10000 },
          { user_id: 'loser-2', amount_cents: 10000 },
        ],
        p_game_id: 'game-1',
        p_metadata: { room_id: 'room-1', table_name: 'Mesa Principal', reason: 'banda' },
      });
    });

    it('transferPiqueBanda falls back to individual ledger calls when atomic RPC fails', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: { error: 'rpc unavailable' }, error: null })
        .mockResolvedValueOnce({ data: { balance_after: 90000 }, error: null })
        .mockResolvedValueOnce({ data: { balance_after: 80000 }, error: null })
        .mockResolvedValueOnce({ data: { balance_after: 118900 }, error: null });

      await expect(SupabaseService.transferPiqueBanda('winner-1', [
        { userId: 'loser-1', amountCents: 10000 },
        { userId: 'loser-2', amountCents: 0 },
        { userId: 'loser-3', amountCents: 10000 },
      ], 'game-1', { roomId: 'room-1', tableName: 'Mesa Principal' })).resolves.toEqual({
        success: false,
        totalBanda: 20000,
        payout: 19000,
        rake: 1000,
        error: 'Error: rpc unavailable',
      });

      expect(mockRpc).toHaveBeenNthCalledWith(2, 'process_ledger_entry', expect.objectContaining({
        p_user_id: 'loser-1',
        p_amount_cents: 10000,
        p_direction: 'debit',
        p_metadata: expect.objectContaining({ phase: 'BANDA' }),
      }));
      expect(mockRpc).toHaveBeenNthCalledWith(3, 'process_ledger_entry', expect.objectContaining({
        p_user_id: 'loser-3',
        p_amount_cents: 10000,
        p_direction: 'debit',
      }));
      expect(mockRpc).toHaveBeenNthCalledWith(4, 'award_pot', expect.objectContaining({
        p_winner_id: 'winner-1',
        p_payout: 19000,
        p_rake: 1000,
      }));
    });
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
    it('saves to filesystem and inserts replay row on success', async () => {
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
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          game_id: 'game-1',
          rng_seed: 'seed-123',
        }),
      );
    });

    it('logs CRITICAL when filesystem save fails', async () => {
      mockReplayFileSave.mockReturnValue(false);

      const mockSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tables') {
          return { select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: mockSelectSingle };
        }
        return { upsert: vi.fn().mockResolvedValue({ error: null }), insert: vi.fn().mockResolvedValue({ error: null }) };
      });

      await SupabaseService.saveReplay('game-2', 'seed-2', [], []);

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
        data: { found: true, user_id: 'user-2', username: 'TestPlayer', avatar_url: 'avatar-ok' },
        error: null,
      });

      const result = await SupabaseService.lookupUserByPhone('+573001234567');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-2');
      expect(result.name).toBe('TestPlayer');
      expect(result.avatar_url).toBe('avatar-ok');
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

  describe('financial and access helpers', () => {
    it('creates a game session with in_progress status', async () => {
      const tableQuery = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null }),
      };
      const gameQuery = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
      mockFrom.mockImplementation((table: string) => {
        if (table === 'tables') return tableQuery;
        if (table === 'games') return gameQuery;
        throw new Error(`Unexpected table: ${table}`);
      });

      await SupabaseService.createGameSession('game-1', 'Mesa Principal');

      expect(mockFrom).toHaveBeenCalledWith('games');
      expect(gameQuery.upsert).toHaveBeenCalledWith({ id: 'game-1', table_id: expect.any(String), status: 'in_progress' });
    });

    it('refundPlayer returns success without RPC for non-positive amounts', async () => {
      await expect(SupabaseService.refundPlayer('user-1', 0, 'game-1')).resolves.toEqual({ success: true });
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('refundPlayer writes a credit ledger entry via process_ledger_entry', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      mockRpc.mockResolvedValue({ data: { balance_after: 250000 }, error: null });

      await expect(SupabaseService.refundPlayer('user-1', 50000, 'game-1', {
        roomId: 'room-1',
        tableName: 'Mesa Principal',
        reason: 'room_disposed',
      })).resolves.toEqual({ success: true, balance_after: 250000 });
      expect(mockRpc).toHaveBeenCalledWith('process_ledger_entry', expect.objectContaining({
        p_user_id: 'user-1',
        p_amount_cents: 50000,
        p_type: 'refund',
        p_direction: 'credit',
        p_game_id: 'game-1',
        p_reference_id: 'refund-game-1-1700000000000',
        p_metadata: { room_id: 'room-1', table_name: 'Mesa Principal', reason: 'room_disposed' },
      }));
      (Date.now as any).mockRestore();
    });

    it('refundPlayer surfaces logical RPC rejection without throwing', async () => {
      mockRpc.mockResolvedValue({ data: { error: 'duplicate refund' }, error: null });

      await expect(SupabaseService.refundPlayer('user-1', 1000, 'game-1')).resolves.toEqual({
        success: false,
        error: 'duplicate refund',
      });
    });

    it('transferBetweenPlayers returns balances and recipient name on success', async () => {
      mockRpc.mockResolvedValue({
        data: {
          sender_balance_after: 90000,
          recipient_balance_after: 110000,
          recipient_name: 'Ana',
        },
        error: null,
      });

      await expect(SupabaseService.transferBetweenPlayers('sender-1', 'recipient-1', 10000, {
        roomId: 'room-1',
      })).resolves.toEqual({
        success: true,
        senderBalanceAfter: 90000,
        recipientBalanceAfter: 110000,
        recipientName: 'Ana',
      });
      expect(mockRpc).toHaveBeenCalledWith('transfer_between_players', {
        p_recipient_id: 'recipient-1',
        p_amount_cents: 10000,
        p_description: 'Transferencia en mesa (sala: room-1)',
        p_sender_id: 'sender-1',
      });
    });

    it('transferBetweenPlayers surfaces RPC rejection', async () => {
      mockRpc.mockResolvedValue({ data: { error: 'saldo insuficiente' }, error: null });

      await expect(SupabaseService.transferBetweenPlayers('sender-1', 'recipient-1', 10000)).resolves.toEqual({
        success: false,
        error: 'saldo insuficiente',
      });
    });

    it('validateSupervisionToken consumes a matching token atomically', async () => {
      mockRedis.getdel.mockResolvedValue(JSON.stringify({ adminId: 'admin-1', roomId: 'room-1' }));

      await expect(SupabaseService.validateSupervisionToken('token-1', 'room-1')).resolves.toEqual({
        valid: true,
        adminId: 'admin-1',
      });
      expect(mockRedis.getdel).toHaveBeenCalledWith('supervision:room-1:token-1');
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('validateSupervisionToken rejects missing or room-mismatched tokens without consuming them', async () => {
      await expect(SupabaseService.validateSupervisionToken('', 'room-1')).resolves.toEqual({ valid: false });
      mockRedis.getdel.mockResolvedValue(JSON.stringify({ adminId: 'admin-1', roomId: 'other-room' }));

      await expect(SupabaseService.validateSupervisionToken('token-1', 'room-1')).resolves.toEqual({ valid: false });
      expect(mockRedis.getdel).toHaveBeenCalledWith('supervision:room-1:token-1');
    });

    it('checkTableAccess returns blocked sanction details', async () => {
      mockRpc.mockResolvedValue({
        data: {
          blocked: true,
          sanction_type: 'full_suspension',
          reason: 'fraude',
          expires_at: '2026-01-31',
        },
        error: null,
      });

      await expect(SupabaseService.checkTableAccess('user-1')).resolves.toEqual({
        blocked: true,
        sanctionType: 'full_suspension',
        reason: 'fraude',
        expiresAt: '2026-01-31',
      });
    });

    it('checkTableAccess fails closed on RPC errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'db down' } });

      await expect(SupabaseService.checkTableAccess('user-1')).resolves.toEqual({
        blocked: true,
        sanctionType: 'access_check_unavailable',
        reason: 'No se pudo verificar el acceso a la mesa',
      });
    });

    it('checkTableAccess fails closed when the user identity is missing', async () => {
      await expect(SupabaseService.checkTableAccess('')).resolves.toEqual({
        blocked: true,
        sanctionType: 'access_check_unavailable',
        reason: 'No se pudo verificar el acceso a la mesa',
      });
    });

    it('checkTableAccess fails closed on malformed RPC responses', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await expect(SupabaseService.checkTableAccess('user-1')).resolves.toEqual({
        blocked: true,
        sanctionType: 'access_check_unavailable',
        reason: 'No se pudo verificar el acceso a la mesa',
      });
    });
  });
});
