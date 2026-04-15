import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted: mock supabase and capture insert calls ──
const { mockInsert, mockFrom } = vi.hoisted(() => {
  return {
    mockInsert: vi.fn().mockReturnValue({ then: (cb: any) => cb({ error: null }) }),
    mockFrom: vi.fn(),
  };
});

// Also provide an async-friendly mock for emitAsync tests
const mockInsertAsync = vi.fn().mockResolvedValue({ error: null });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom.mockReturnValue({
      insert: mockInsert,
    }),
  })),
}));

// Ensure the service-role key is set so the AlertService initializes its client
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
vi.stubEnv('SUPABASE_URL', 'http://localhost:54321');

// Need to import AFTER mocks are set up
const { AlertService } = await import('../AlertService');

describe('AlertService', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ── emit() ──────────────────────────────────────────────

  describe('emit', () => {
    it('logs a warning with the alert prefix and title', () => {
      AlertService.emit({
        severity: 'critical',
        category: 'settlement',
        title: 'Test alert',
        message: 'Details here',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ServerAlert]'),
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test alert'),
      );
    });

    it('uses 🚨 prefix for critical severity', () => {
      AlertService.emit({
        severity: 'critical',
        category: 'test',
        title: 'Critical!',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨'),
      );
    });

    it('uses ⚠️ prefix for warning severity', () => {
      AlertService.emit({
        severity: 'warning',
        category: 'test',
        title: 'Warning!',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️'),
      );
    });

    it('uses ℹ️ prefix for info severity', () => {
      AlertService.emit({
        severity: 'info',
        category: 'test',
        title: 'Info!',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️'),
      );
    });

    it('persists alert to server_alerts table', () => {
      AlertService.emit({
        severity: 'critical',
        category: 'settlement',
        title: 'Persist test',
        message: 'msg',
        metadata: { key: 'val' },
        room_id: 'room-1',
        game_id: 'game-1',
        player_id: 'player-1',
      });

      expect(mockFrom).toHaveBeenCalledWith('server_alerts');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          category: 'settlement',
          title: 'Persist test',
          message: 'msg',
          metadata: { key: 'val' },
          room_id: 'room-1',
          game_id: 'game-1',
          player_id: 'player-1',
        }),
      );
    });

    it('defaults nullable fields to null', () => {
      AlertService.emit({
        severity: 'info',
        category: 'test',
        title: 'Defaults',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: null,
          metadata: {},
          room_id: null,
          game_id: null,
          player_id: null,
        }),
      );
    });

    it('logs error when insert fails but does not throw', () => {
      mockInsert.mockReturnValueOnce({
        then: (cb: any) => cb({ error: { message: 'insert failed' } }),
      });

      // Should not throw
      AlertService.emit({
        severity: 'critical',
        category: 'test',
        title: 'Fail test',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AlertService]'),
        expect.stringContaining('insert failed'),
      );
    });
  });

  // ── Convenience helpers ─────────────────────────────────

  describe('identity', () => {
    it('emits a warning alert for playerless identity', () => {
      AlertService.identity('Player1', 'sess-123', 'room-abc');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warning',
          category: 'identity',
          room_id: 'room-abc',
        }),
      );
    });
  });

  describe('settlementFailed', () => {
    it('emits a critical alert with game and player identifiers', () => {
      AlertService.settlementFailed('Nick', 'user-1', 'game-1', 'timeout', 'room-1');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          category: 'settlement',
          game_id: 'game-1',
          player_id: 'user-1',
          room_id: 'room-1',
        }),
      );
    });
  });

  describe('refundFailed', () => {
    it('emits a critical alert with amount and error metadata', () => {
      AlertService.refundFailed('user-1', 50000, 'game-1', 'ledger locked', 'room-1');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          category: 'refund',
          player_id: 'user-1',
          metadata: expect.objectContaining({ amount: 50000, error: 'ledger locked' }),
        }),
      );
    });
  });

  describe('discrepancy', () => {
    it('emits a critical alert with wallet vs ledger balances', () => {
      AlertService.discrepancy('user-1', 100000, 90000);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          category: 'discrepancy',
          player_id: 'user-1',
          metadata: expect.objectContaining({
            walletBalance: 100000,
            ledgerBalance: 90000,
            diff: 10000,
          }),
        }),
      );
    });
  });

  describe('collusion', () => {
    it('emits a warning alert listing suspicious pairs', () => {
      const pairs = [
        { player_1: 'A', player_2: 'B', count: 15 },
        { player_1: 'C', player_2: 'D', count: 12 },
      ];
      AlertService.collusion(pairs);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warning',
          category: 'collusion',
          metadata: expect.objectContaining({ pairs }),
        }),
      );
    });

    it('includes pair count in title', () => {
      AlertService.collusion([{ player_1: 'A', player_2: 'B', count: 10 }]);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('1 pares'),
        }),
      );
    });
  });

  // ── emitAsync ───────────────────────────────────────────

  describe('emitAsync', () => {
    beforeEach(() => {
      mockInsertAsync.mockResolvedValue({ error: null });
      // Switch mockFrom to return the async insert for emitAsync tests
      mockFrom.mockReturnValue({ insert: mockInsertAsync });
    });

    afterEach(() => {
      // Restore the sync insert mock
      mockFrom.mockReturnValue({ insert: mockInsert });
    });

    it('succeeds on first try without retries', async () => {
      await AlertService.emitAsync({
        severity: 'critical',
        category: 'test',
        title: 'First try OK',
      });

      expect(mockInsertAsync).toHaveBeenCalledTimes(1);
    });

    it('retries critical alerts up to 2 times on failure', async () => {
      mockInsertAsync
        .mockResolvedValueOnce({ error: { message: 'fail 1' } })
        .mockResolvedValueOnce({ error: { message: 'fail 2' } })
        .mockResolvedValueOnce({ error: null });

      await AlertService.emitAsync({
        severity: 'critical',
        category: 'test',
        title: 'Retry test',
      });

      expect(mockInsertAsync).toHaveBeenCalledTimes(3);
    });

    it('does NOT retry non-critical alerts', async () => {
      mockInsertAsync.mockResolvedValueOnce({ error: { message: 'fail' } });

      await AlertService.emitAsync({
        severity: 'warning',
        category: 'test',
        title: 'No retry',
      });

      expect(mockInsertAsync).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist alert after retries'),
        expect.any(String),
      );
    });

    it('logs error after all retries exhausted', async () => {
      mockInsertAsync.mockResolvedValue({ error: { message: 'persistent failure' } });

      await AlertService.emitAsync({
        severity: 'critical',
        category: 'test',
        title: 'Exhaust retries',
      });

      expect(mockInsertAsync).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist alert after retries'),
        'persistent failure',
      );
    });
  });
});
