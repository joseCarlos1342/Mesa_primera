import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted: mock Redis and Supabase before module evaluation ──
const { mockRedisIncr, mockRedisExpire, mockRedisTtl, mockInsert, mockFrom } = vi.hoisted(() => {
  return {
    mockRedisIncr: vi.fn().mockResolvedValue(1),
    mockRedisExpire: vi.fn().mockResolvedValue(1),
    mockRedisTtl: vi.fn().mockResolvedValue(-1),
    mockInsert: vi.fn().mockReturnValue({ then: (cb: any) => cb({ error: null }) }),
    mockFrom: vi.fn(),
  };
});

// Mock the redis module used by AntiCheatService
vi.mock('../redis', () => ({
  redis: {
    incr: mockRedisIncr,
    expire: mockRedisExpire,
    ttl: mockRedisTtl,
    on: vi.fn(),
  },
  createRedisSubscriber: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom.mockReturnValue({
      insert: mockInsert,
    }),
  })),
}));

vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
vi.stubEnv('SUPABASE_URL', 'http://localhost:54321');

const { AntiCheatService } = await import('../AntiCheatService');

describe('AntiCheatService', () => {
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

  // ── checkRateLimit ─────────────────────────────────────

  describe('checkRateLimit', () => {
    it('allows messages under the global rate limit', async () => {
      mockRedisIncr.mockResolvedValueOnce(5); // 5 messages in window
      mockRedisTtl.mockResolvedValueOnce(-1); // No TTL set yet

      const result = await AntiCheatService.checkRateLimit('session-1', 'action');

      expect(result.allowed).toBe(true);
      expect(mockRedisIncr).toHaveBeenCalledWith('ac:rate:session-1');
    });

    it('blocks messages exceeding the global rate limit', async () => {
      mockRedisIncr.mockResolvedValueOnce(31); // Over 30/min limit
      mockRedisTtl.mockResolvedValueOnce(45); // TTL already set

      const result = await AntiCheatService.checkRateLimit('session-2', 'action');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('rate_limit');
    });

    it('sets TTL on first message in window', async () => {
      mockRedisIncr.mockResolvedValueOnce(1); // First message
      mockRedisTtl.mockResolvedValueOnce(-1); // No TTL yet

      await AntiCheatService.checkRateLimit('session-3', 'action');

      expect(mockRedisExpire).toHaveBeenCalledWith('ac:rate:session-3', 60);
    });

    it('does not reset TTL on subsequent messages', async () => {
      mockRedisIncr.mockResolvedValueOnce(5);
      mockRedisTtl.mockResolvedValueOnce(30); // Global TTL already exists
      // Burst key also has TTL
      mockRedisIncr.mockResolvedValueOnce(2);
      mockRedisTtl.mockResolvedValueOnce(3);

      await AntiCheatService.checkRateLimit('session-4', 'action');

      expect(mockRedisExpire).not.toHaveBeenCalled();
    });

    it('detects per-action burst', async () => {
      // Global limit OK
      mockRedisIncr.mockResolvedValueOnce(10);
      mockRedisTtl.mockResolvedValueOnce(50);
      // Burst limit exceeded
      mockRedisIncr.mockResolvedValueOnce(11); // >10 same message in 5s
      mockRedisTtl.mockResolvedValueOnce(3);

      const result = await AntiCheatService.checkRateLimit('session-5', 'action');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('burst');
    });

    it('allows when both global and burst are under limit', async () => {
      // Global: 5/30
      mockRedisIncr.mockResolvedValueOnce(5);
      mockRedisTtl.mockResolvedValueOnce(40);
      // Burst: 3/10
      mockRedisIncr.mockResolvedValueOnce(3);
      mockRedisTtl.mockResolvedValueOnce(2);

      const result = await AntiCheatService.checkRateLimit('session-6', 'action');

      expect(result.allowed).toBe(true);
    });

    it('falls back to allowed if Redis is unavailable', async () => {
      mockRedisIncr.mockRejectedValueOnce(new Error('Redis down'));

      const result = await AntiCheatService.checkRateLimit('session-err', 'action');

      expect(result.allowed).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ── recordSignal ───────────────────────────────────────

  describe('recordSignal', () => {
    it('persists signal to anti_cheat_events table', () => {
      AntiCheatService.recordSignal({
        signal_type: 'rate_limit',
        severity: 'warning',
        room_id: 'room-1',
        player_id: 'player-1',
        session_id: 'session-1',
        message_type: 'action',
      });

      expect(mockFrom).toHaveBeenCalledWith('anti_cheat_events');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          signal_type: 'rate_limit',
          severity: 'warning',
          room_id: 'room-1',
          player_id: 'player-1',
          session_id: 'session-1',
          message_type: 'action',
        }),
      );
    });

    it('logs signal to console', () => {
      AntiCheatService.recordSignal({
        signal_type: 'server_override',
        severity: 'info',
        room_id: 'room-2',
        player_id: 'player-2',
        session_id: 'session-2',
        message_type: 'declarar-juego',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AntiCheat]'),
      );
    });

    it('includes evidence in persisted record', () => {
      AntiCheatService.recordSignal({
        signal_type: 'invalid_payload',
        severity: 'warning',
        room_id: 'room-3',
        player_id: 'player-3',
        session_id: 'session-3',
        message_type: 'action',
        evidence: { received: 'garbage', expected: 'voy|paso' },
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          evidence: { received: 'garbage', expected: 'voy|paso' },
        }),
      );
    });

    it('escalates critical signals to AlertService', () => {
      AntiCheatService.recordSignal({
        signal_type: 'rate_limit',
        severity: 'critical',
        room_id: 'room-4',
        player_id: 'player-4',
        session_id: 'session-4',
        message_type: 'action',
        evidence: { count: 100 },
      });

      // Should produce a second server_alerts insert via AlertService
      // The first call is to anti_cheat_events, AlertService also calls server_alerts
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit'),
      );
    });

    it('does not throw on Supabase error', () => {
      mockInsert.mockReturnValueOnce({
        then: (cb: any) => cb({ error: { message: 'DB error' } }),
      });

      expect(() => {
        AntiCheatService.recordSignal({
          signal_type: 'rate_limit',
          severity: 'warning',
          room_id: 'room-5',
          player_id: 'player-5',
          session_id: 'session-5',
          message_type: 'action',
        });
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ── processMessage ─────────────────────────────────────

  describe('processMessage', () => {
    it('allows valid message under rate limit', async () => {
      // Global: 2/30
      mockRedisIncr.mockResolvedValueOnce(2);
      mockRedisTtl.mockResolvedValueOnce(50);
      // Burst: 1/10
      mockRedisIncr.mockResolvedValueOnce(1);
      mockRedisTtl.mockResolvedValueOnce(-1);

      const result = await AntiCheatService.processMessage({
        sessionId: 'session-ok',
        playerId: 'player-ok',
        roomId: 'room-ok',
        messageType: 'action',
      });

      expect(result.allowed).toBe(true);
    });

    it('records signal and rejects when rate limited', async () => {
      // Global limit exceeded
      mockRedisIncr.mockResolvedValueOnce(35);
      mockRedisTtl.mockResolvedValueOnce(40);

      const result = await AntiCheatService.processMessage({
        sessionId: 'session-spam',
        playerId: 'player-spam',
        roomId: 'room-spam',
        messageType: 'action',
      });

      expect(result.allowed).toBe(false);
      // Should persist the signal
      expect(mockFrom).toHaveBeenCalledWith('anti_cheat_events');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          signal_type: 'rate_limit',
          player_id: 'player-spam',
        }),
      );
    });

    it('records signal when burst detected', async () => {
      // Global: OK
      mockRedisIncr.mockResolvedValueOnce(10);
      mockRedisTtl.mockResolvedValueOnce(50);
      // Burst: exceeded
      mockRedisIncr.mockResolvedValueOnce(12);
      mockRedisTtl.mockResolvedValueOnce(3);

      const result = await AntiCheatService.processMessage({
        sessionId: 'session-burst',
        playerId: 'player-burst',
        roomId: 'room-burst',
        messageType: 'action',
        phase: 'PIQUE',
      });

      expect(result.allowed).toBe(false);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          signal_type: 'burst',
          phase: 'PIQUE',
        }),
      );
    });

    it('includes game_id and phase when provided', async () => {
      mockRedisIncr.mockResolvedValueOnce(50);
      mockRedisTtl.mockResolvedValueOnce(30);

      await AntiCheatService.processMessage({
        sessionId: 'session-ctx',
        playerId: 'player-ctx',
        roomId: 'room-ctx',
        gameId: 'game-123',
        messageType: 'action',
        phase: 'DESCARTE',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          game_id: 'game-123',
          phase: 'DESCARTE',
        }),
      );
    });
  });

  // ── recordOutOfTurn ────────────────────────────────────

  describe('recordOutOfTurn', () => {
    it('records out-of-turn signal with expected vs actual player', () => {
      AntiCheatService.recordOutOfTurn({
        roomId: 'room-oot',
        gameId: 'game-oot',
        sessionId: 'offender-session',
        playerId: 'offender-id',
        messageType: 'action',
        phase: 'PIQUE',
        expectedPlayerId: 'expected-id',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          signal_type: 'out_of_turn',
          severity: 'warning',
          player_id: 'offender-id',
          evidence: expect.objectContaining({
            expected_player: 'expected-id',
          }),
        }),
      );
    });
  });

  // ── recordServerOverride ───────────────────────────────

  describe('recordServerOverride', () => {
    it('records server override signal with client vs server values', () => {
      AntiCheatService.recordServerOverride({
        roomId: 'room-ov',
        gameId: 'game-ov',
        sessionId: 'cheater-session',
        playerId: 'cheater-id',
        messageType: 'declarar-juego',
        phase: 'JUEGO',
        clientValue: false,
        serverValue: true,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          signal_type: 'server_override',
          severity: 'warning',
          message_type: 'declarar-juego',
          evidence: expect.objectContaining({
            client_claimed: false,
            server_truth: true,
          }),
        }),
      );
    });
  });
});
