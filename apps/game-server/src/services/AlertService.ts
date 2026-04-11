import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertPayload {
  severity: AlertSeverity;
  category: string;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
  room_id?: string;
  game_id?: string;
  player_id?: string;
}

/**
 * Emits server alerts to the `server_alerts` Supabase table so admins
 * can view them in the dashboard. Also keeps the console log for Docker.
 */
export class AlertService {
  /**
   * Emit a server alert. Fire-and-forget — never throws.
   */
  static emit(payload: AlertPayload): void {
    const prefix = payload.severity === 'critical' ? '🚨' : payload.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.warn(`${prefix} [ServerAlert] [${payload.category}] ${payload.title}${payload.message ? ': ' + payload.message : ''}`);

    if (!supabase) return;

    supabase
      .from('server_alerts')
      .insert({
        severity: payload.severity,
        category: payload.category,
        title: payload.title,
        message: payload.message || null,
        metadata: payload.metadata || {},
        room_id: payload.room_id || null,
        game_id: payload.game_id || null,
        player_id: payload.player_id || null,
      })
      .then(({ error }) => {
        if (error) console.error('[AlertService] Failed to persist alert:', error.message);
      });
  }

  // ── Convenience helpers ──

  static identity(nickname: string, sessionId: string, roomId?: string) {
    AlertService.emit({
      severity: 'warning',
      category: 'identity',
      title: 'Jugador sin identidad',
      message: `${nickname} (${sessionId}) se unió sin supabaseUserId — operaciones financieras omitidas`,
      room_id: roomId,
      metadata: { nickname, sessionId },
    });
  }

  static settlementFailed(nickname: string, userId: string, gameId: string, error: string, roomId?: string) {
    AlertService.emit({
      severity: 'critical',
      category: 'settlement',
      title: 'Fallo en settlement',
      message: `No se pudo persistir pago para ${nickname} (${userId}): ${error}`,
      game_id: gameId,
      player_id: userId,
      room_id: roomId,
      metadata: { nickname, error },
    });
  }

  static refundFailed(userId: string, amount: number, gameId: string | undefined, error: string, roomId?: string) {
    AlertService.emit({
      severity: 'critical',
      category: 'refund',
      title: 'Fallo en reembolso',
      message: `Refund de ${amount} falló para ${userId}: ${error}`,
      game_id: gameId,
      player_id: userId,
      room_id: roomId,
      metadata: { amount, error },
    });
  }

  static discrepancy(userId: string, walletBalance: number, ledgerBalance: number) {
    AlertService.emit({
      severity: 'critical',
      category: 'discrepancy',
      title: 'Discrepancia ledger-wallet',
      message: `user=${userId} wallet=${walletBalance} ledger=${ledgerBalance}`,
      player_id: userId,
      metadata: { walletBalance, ledgerBalance, diff: walletBalance - ledgerBalance },
    });
  }

  static collusion(pairs: { player_1: string; player_2: string; count: number }[]) {
    AlertService.emit({
      severity: 'warning',
      category: 'collusion',
      title: `Sospecha de colusión (${pairs.length} pares)`,
      message: pairs.map(p => `${p.player_1} ↔ ${p.player_2} (${p.count}x)`).join(', '),
      metadata: { pairs },
    });
  }
}
