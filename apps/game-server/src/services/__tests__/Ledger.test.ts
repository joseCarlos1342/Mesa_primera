import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted: set env vars + create mock refs BEFORE module evaluation ──
const { mockRpc, mockFrom } = vi.hoisted(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.SUPABASE_URL = 'http://localhost:54321';

  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  })),
}));

import { SupabaseService } from '../SupabaseService';

describe('SupabaseService — Settlement & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── awardPot ──────────────────────────────────────────────
  describe('awardPot', () => {
    it('returns structured success with balance_after on RPC success', async () => {
      mockRpc.mockResolvedValue({
        data: { success: true, balance_after: 500000 },
        error: null,
      });

      const result = await SupabaseService.awardPot('user-1', 100000, 5000, 'game-123');

      expect(result).toEqual(expect.objectContaining({
        success: true,
        balance_after: 500000,
      }));
      expect(mockRpc).toHaveBeenCalledWith('award_pot', expect.objectContaining({
        p_winner_id: 'user-1',
        p_payout: 100000,
        p_rake: 5000,
        p_game_id: 'game-123',
      }));
    });

    it('returns error info on RPC failure instead of swallowing', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'connection timeout' },
      });

      const result = await SupabaseService.awardPot('user-1', 100000, 5000, 'game-456');

      // Must expose the failure — not return undefined/void
      expect(result).toEqual(expect.objectContaining({
        success: false,
      }));
      expect(result.error).toBeDefined();
    });

    it('returns error info when RPC returns data.error (insufficient balance)', async () => {
      mockRpc.mockResolvedValue({
        data: { error: 'Saldo insuficiente' },
        error: null,
      });

      const result = await SupabaseService.awardPot('user-1', 100000, 5000, 'game-789');

      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: expect.stringContaining('Saldo insuficiente'),
      }));
    });
  });

  // ── recordBet (already returns result, verify contract) ───
  describe('recordBet', () => {
    it('returns success with balance_after on successful bet', async () => {
      mockRpc.mockResolvedValue({
        data: { balance_after: 900000 },
        error: null,
      });

      const result = await SupabaseService.recordBet('user-1', 100000, 'game-123');

      expect(result).toEqual(expect.objectContaining({
        success: true,
        balance_after: 900000,
      }));
    });

    it('returns failure with isBalanceError on insufficient balance', async () => {
      mockRpc.mockResolvedValue({
        data: { error: 'Saldo insuficiente' },
        error: null,
      });

      const result = await SupabaseService.recordBet('user-1', 999999999, 'game-123');

      expect(result.success).toBe(false);
      expect(result.isBalanceError).toBe(true);
    });

    it('returns failure on network/RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'network error' },
      });

      const result = await SupabaseService.recordBet('user-1', 100000, 'game-123');

      expect(result.success).toBe(false);
    });
  });

  describe('saveRecoveryCheckpoint', () => {
    it('persiste estado privado con el roster original de la mano', async () => {
      mockRpc.mockResolvedValue({ data: { success: true, saved: true }, error: null });

      const result = await SupabaseService.saveRecoveryCheckpoint({
        gameId: 'game-123',
        roomId: 'room-123',
        checkpointVersion: 4,
        stateHash: 'sha256:checkpoint',
        privateState: { phase: 'GUERRA', privateCards: 'sealed' },
        rosterUserIds: ['player-a', 'player-b'],
      });

      expect(result).toEqual({ success: true });
      expect(mockRpc).toHaveBeenCalledWith('save_game_recovery_checkpoint', expect.objectContaining({
        p_game_id: 'game-123', p_room_id: 'room-123',
        p_checkpoint_version: 4, p_roster_user_ids: ['player-a', 'player-b'],
      }));
    });
  });

  describe('createRecoveryIncident', () => {
    it('delegates to the protected RPC so resolved incidents cannot be reopened', async () => {
      mockRpc.mockResolvedValue({ data: { success: true, status: 'recovery_pending' }, error: null });
      const detectedAt = new Date('2026-07-12T12:00:00.000Z');

      const result = await SupabaseService.createRecoveryIncident({
        gameId: 'game-123', roomId: 'room-123', detectedAt, causeCode: 'process_restart',
      });

      expect(result).toEqual({ success: true });
      expect(mockRpc).toHaveBeenCalledWith('open_game_recovery_incident', {
        p_game_id: 'game-123',
        p_room_id: 'room-123',
        p_detected_at: '2026-07-12T12:00:00.000Z',
        p_cause_code: 'process_restart',
      });
    });
  });

  describe('expireRecoveryIncidentAndRefund', () => {
    it('sends stable recovery operation IDs to the transactional refund RPC', async () => {
      mockRpc.mockResolvedValue({ data: { success: true, status: 'cancelled_crash' }, error: null });

      const result = await SupabaseService.expireRecoveryIncidentAndRefund({
        gameId: 'game-123',
        refunds: [{
          userId: '00000000-0000-0000-0000-000000000001',
          amountCents: 250000,
          operationId: '00000000-0000-0000-0000-000000000101',
        }],
      });

      expect(result).toEqual({ success: true, status: 'cancelled_crash' });
      expect(mockRpc).toHaveBeenCalledWith('expire_game_recovery_incident', {
        p_game_id: 'game-123',
        p_refunds: [{
          user_id: '00000000-0000-0000-0000-000000000001',
          amount_cents: 250000,
          operation_id: '00000000-0000-0000-0000-000000000101',
        }],
      });
    });

    it('returns the RPC error without treating the refund as successful', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'connection timeout' } });

      const result = await SupabaseService.expireRecoveryIncidentAndRefund({
        gameId: 'game-123',
        refunds: [],
      });

      expect(result).toEqual(expect.objectContaining({ success: false }));
    });
  });
});
