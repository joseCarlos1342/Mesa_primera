import { createClient } from '@supabase/supabase-js';
import { redis } from './redis';
import { AlertService } from './AlertService';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: any = null;
if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Constants ────────────────────────────────────────────

/** Max WebSocket messages per session per 60-second window */
const MAX_MESSAGES_PER_MINUTE = 30;
/** Max identical message type per session per 5-second window */
const MAX_BURST_PER_5SEC = 10;

// ── Types ────────────────────────────────────────────────

export type SignalType =
  | 'rate_limit'
  | 'burst'
  | 'out_of_turn'
  | 'invalid_payload'
  | 'server_override'
  | 'resync_abuse';

export interface AntiCheatSignal {
  signal_type: SignalType;
  severity: 'info' | 'warning' | 'critical';
  room_id: string;
  game_id?: string;
  player_id: string;
  session_id: string;
  message_type: string;
  phase?: string;
  evidence?: Record<string, any>;
}

interface RateLimitResult {
  allowed: boolean;
  reason?: 'rate_limit' | 'burst';
}

interface ProcessMessageParams {
  sessionId: string;
  playerId: string;
  roomId: string;
  gameId?: string;
  messageType: string;
  phase?: string;
}

// ── Service ──────────────────────────────────────────────

export class AntiCheatService {
  /**
   * Check rate limits for a session+message combination.
   * Uses Redis sliding counters. Falls back to allowed if Redis is down.
   */
  static async checkRateLimit(sessionId: string, messageType: string): Promise<RateLimitResult> {
    try {
      // ── Global rate: MAX_MESSAGES_PER_MINUTE per 60s window ──
      const globalKey = `ac:rate:${sessionId}`;
      const globalCount = await redis.incr(globalKey);
      const globalTtl = await redis.ttl(globalKey);
      if (globalTtl === -1) {
        await redis.expire(globalKey, 60);
      }

      if (globalCount > MAX_MESSAGES_PER_MINUTE) {
        return { allowed: false, reason: 'rate_limit' };
      }

      // ── Burst rate: MAX_BURST_PER_5SEC same message in 5s ──
      const burstKey = `ac:burst:${sessionId}:${messageType}`;
      const burstCount = await redis.incr(burstKey);
      const burstTtl = await redis.ttl(burstKey);
      if (burstTtl === -1) {
        await redis.expire(burstKey, 5);
      }

      if (burstCount > MAX_BURST_PER_5SEC) {
        return { allowed: false, reason: 'burst' };
      }

      return { allowed: true };
    } catch (err) {
      console.error('[AntiCheat] Redis error in checkRateLimit:', err);
      return { allowed: true }; // Fail open — don't block gameplay
    }
  }

  /**
   * Record an anti-cheat signal. Fire-and-forget — never throws.
   * Persists to `anti_cheat_events` table and logs to console.
   * Critical signals are escalated to AlertService.
   */
  static recordSignal(signal: AntiCheatSignal): void {
    const prefix = signal.severity === 'critical' ? '🚨' : signal.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.warn(
      `${prefix} [AntiCheat] [${signal.signal_type}] player=${signal.player_id} msg=${signal.message_type}` +
      (signal.phase ? ` phase=${signal.phase}` : '') +
      (signal.evidence ? ` evidence=${JSON.stringify(signal.evidence)}` : ''),
    );

    if (supabase) {
      supabase
        .from('anti_cheat_events')
        .insert({
          signal_type: signal.signal_type,
          severity: signal.severity,
          room_id: signal.room_id,
          game_id: signal.game_id || null,
          player_id: signal.player_id,
          session_id: signal.session_id,
          message_type: signal.message_type,
          phase: signal.phase || null,
          evidence: signal.evidence || {},
        })
        .then(({ error }: { error: any }) => {
          if (error) console.error('[AntiCheat] Failed to persist signal:', error.message);
        });
    }

    // Escalate critical signals to the admin alert pipeline
    if (signal.severity === 'critical') {
      AlertService.emit({
        severity: 'critical',
        category: 'anti_cheat',
        title: `Anti-cheat: ${signal.signal_type}`,
        message: `player=${signal.player_id} msg=${signal.message_type}`,
        room_id: signal.room_id,
        game_id: signal.game_id,
        player_id: signal.player_id,
        metadata: { ...signal.evidence, signal_type: signal.signal_type, session_id: signal.session_id },
      });
    }
  }

  /**
   * Process an incoming WebSocket message through rate limiting.
   * Returns whether the message should be processed.
   * Automatically records signals when limits are exceeded.
   */
  static async processMessage(params: ProcessMessageParams): Promise<RateLimitResult> {
    const rateResult = await AntiCheatService.checkRateLimit(params.sessionId, params.messageType);

    if (!rateResult.allowed) {
      const signalType: SignalType = rateResult.reason === 'burst' ? 'burst' : 'rate_limit';
      AntiCheatService.recordSignal({
        signal_type: signalType,
        severity: 'warning',
        room_id: params.roomId,
        game_id: params.gameId,
        player_id: params.playerId,
        session_id: params.sessionId,
        message_type: params.messageType,
        phase: params.phase,
        evidence: { reason: rateResult.reason },
      });
    }

    return rateResult;
  }

  /**
   * Record an out-of-turn action attempt.
   */
  static recordOutOfTurn(params: {
    roomId: string;
    gameId?: string;
    sessionId: string;
    playerId: string;
    messageType: string;
    phase?: string;
    expectedPlayerId?: string;
  }): void {
    AntiCheatService.recordSignal({
      signal_type: 'out_of_turn',
      severity: 'warning',
      room_id: params.roomId,
      game_id: params.gameId,
      player_id: params.playerId,
      session_id: params.sessionId,
      message_type: params.messageType,
      phase: params.phase,
      evidence: {
        expected_player: params.expectedPlayerId,
        actual_player: params.playerId,
      },
    });
  }

  /**
   * Record a server-side override of a client claim.
   */
  static recordServerOverride(params: {
    roomId: string;
    gameId?: string;
    sessionId: string;
    playerId: string;
    messageType: string;
    phase?: string;
    clientValue: any;
    serverValue: any;
  }): void {
    AntiCheatService.recordSignal({
      signal_type: 'server_override',
      severity: 'warning',
      room_id: params.roomId,
      game_id: params.gameId,
      player_id: params.playerId,
      session_id: params.sessionId,
      message_type: params.messageType,
      phase: params.phase,
      evidence: {
        client_claimed: params.clientValue,
        server_truth: params.serverValue,
      },
    });
  }
}
