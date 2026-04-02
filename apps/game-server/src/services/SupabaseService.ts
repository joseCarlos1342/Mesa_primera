import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: any = null;

if (!supabaseKey) {
  console.warn('[SupabaseService] No Supabase key found (SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY). Database operations will silently fail.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`[SupabaseService] Initialized with ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'} key → ${supabaseUrl}`);
  } catch (err) {
    console.error('[SupabaseService] Failed to init Supabase client', err);
  }
}

export class SupabaseService {
  /**
   * Distributes the pot to the winner and records the rake atomically
   * via the `award_pot` database RPC. This guarantees that the ledger
   * entries (win credit + rake debit) are created in a single transaction.
   */
  static async awardPot(
    userId: string,
    payout: number,
    rake: number,
    gameId?: string,
    tableId?: string,
    meta?: { roomId?: string; tableName?: string; playersPresent?: { odisplayName: string; odisplayAvatar?: string }[] }
  ) {
    if (!supabaseKey) return;
    try {
      const potDetails = {
        payout,
        rake,
        total: payout + rake,
        table_id: tableId || null,
        room_id: meta?.roomId || null,
        table_name: meta?.tableName || null,
        players_present: meta?.playersPresent || [],
        commission_pct: 0.05
      };

      const { data, error } = await supabase.rpc('award_pot', {
        p_winner_id: userId,
        p_payout: payout,
        p_rake: rake,
        p_game_id: gameId || null,
        p_table_id: tableId || null,
        p_pot_details: potDetails
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.log(`[SupabaseService] Pot awarded via RPC: winner=${userId}, payout=${payout}, rake=${rake}, balance_after=${data?.balance_after}`);
    } catch (e) {
      console.error('[SupabaseService] Error awarding pot:', e);
    }
  }

  /**
   * Records a bet deduction from a player's balance through the immutable ledger.
   */
  static async recordBet(
    userId: string,
    amount: number,
    gameId?: string,
    tableId?: string,
    meta?: { roomId?: string; tableName?: string; phase?: string }
  ) {
    if (!supabaseKey) return { success: true, balance_after: null };
    try {
      const { data, error } = await supabase.rpc('process_ledger_entry', {
        p_user_id: userId,
        p_amount_cents: amount,
        p_type: 'bet',
        p_direction: 'debit',
        p_game_id: gameId || null,
        p_table_id: null,
        p_description: meta?.phase ? `Apuesta en mesa (${meta.phase})` : 'Apuesta en mesa',
        p_reference_id: `bet-${gameId}-${Date.now()}`,
        p_metadata: {
          room_id: meta?.roomId || null,
          table_name: meta?.tableName || null,
          phase: meta?.phase || null
        }
      });

      if (error) throw error;
      if (data?.error) {
        console.warn(`[SupabaseService] Bet rejected: ${data.error}`);
        return { success: false, error: data.error, isBalanceError: String(data.error).includes('insuficiente') };
      }

      return { success: true, balance_after: data?.balance_after };
    } catch (e) {
      console.error('[SupabaseService] Error recording bet:', e);
      return { success: false, error: String(e), isBalanceError: false };
    }
  }

  /**
   * Updates player statistics at the end of a match.
   */
  static async updatePlayerStats(userId: string, isWin: boolean, payout: number = 0, rakePaid: number = 0, specialPlay: string | null = null) {
    if (!supabaseKey) return;
    try {
      const { data: stat } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      const incrementSpecial = (current: number, type: string, targetType: string) =>
        type === targetType ? (current || 0) + 1 : (current || 0);

      const now = new Date().toISOString();

      if (stat) {
        const newCurrentStreak = isWin ? (stat.current_streak || 0) + 1 : 0;
        const newBestStreak = Math.max(stat.best_streak || 0, newCurrentStreak);

        await supabase
          .from('player_stats')
          .update({
            games_played: (stat.games_played || 0) + 1,
            games_won: isWin ? (stat.games_won || 0) + 1 : (stat.games_won || 0),
            total_won_cents: (stat.total_won_cents || 0) + payout,
            total_lost_cents: isWin ? stat.total_lost_cents : (stat.total_lost_cents || 0) + Math.abs(payout),
            total_rake_paid_cents: (stat.total_rake_paid_cents || 0) + rakePaid,
            current_streak: newCurrentStreak,
            best_streak: newBestStreak,
            primeras_count: incrementSpecial(stat.primeras_count, specialPlay || '', 'primera'),
            chivos_count: incrementSpecial(stat.chivos_count, specialPlay || '', 'chivo'),
            segundas_count: incrementSpecial(stat.segundas_count, specialPlay || '', 'segunda'),
            last_game_at: now
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('player_stats')
          .insert({
            user_id: userId,
            games_played: 1,
            games_won: isWin ? 1 : 0,
            total_won_cents: payout > 0 ? payout : 0,
            total_lost_cents: payout < 0 ? Math.abs(payout) : 0,
            total_rake_paid_cents: rakePaid,
            current_streak: isWin ? 1 : 0,
            best_streak: isWin ? 1 : 0,
            primeras_count: specialPlay === 'primera' ? 1 : 0,
            chivos_count: specialPlay === 'chivo' ? 1 : 0,
            segundas_count: specialPlay === 'segunda' ? 1 : 0,
            last_game_at: now
          });
      }
    } catch (e) {
      console.error('[SupabaseService] Error updating stats:', e);
    }
  }

  /**
   * Saves a replay of the game hand timeline and RNG seed.
   * The `timeline` field contains the player-visible events (no per-step RNG).
   * The `admin_timeline` field contains per-action RNG seeds for admin auditing.
   */
  static async saveReplay(
    gameId: string,
    seed: string,
    timeline: any[],
    players: any[],
    adminTimeline?: any[],
    potBreakdown?: Record<string, any>,
    finalHands?: Record<string, any>,
    roomId?: string,
    tableName?: string
  ) {
    if (!supabaseKey) {
      console.warn('[SupabaseService] saveReplay skipped — no Supabase key configured');
      return;
    }
    try {
      // 1. Fetch or create a default table if missing (for foreign key constraint on games)
      let { data: table } = await supabase.from('tables').select('id').limit(1).single();
      if (!table) {
        const { data: newTable, error: tableErr } = await supabase.from('tables').insert({ name: tableName || 'Default Table', game_type: 'Mesa' }).select().single();
        if (tableErr || !newTable) throw new Error('Could not create default table for replay');
        table = newTable;
      }

      // 2. Insert dummy game record (since MesaRoom doesn't create full game sessions yet but Replays need a game_id)
      const { error: gameErr } = await supabase.from('games').upsert({ id: gameId, table_id: table.id, status: 'finished' });
      if (gameErr) throw gameErr;

      // 3. Build player-safe timeline (strip rng_state from each event)
      const playerTimeline = timeline.map(({ rng_state, ...event }: any) => event);

      // 4. Save the replay with both timelines + room metadata
      const { error: replayErr } = await supabase.from('game_replays').insert({
        game_id: gameId,
        round_number: 1,
        rng_seed: seed,
        timeline: playerTimeline,
        admin_timeline: adminTimeline || timeline,
        players,
        pot_breakdown: potBreakdown || {},
        final_hands: finalHands || {},
        room_id: roomId || null,
        table_name: tableName || null
      });

      if (replayErr) throw replayErr;
      console.log(`[SupabaseService] Replay saved successfully for game: ${gameId} (room: ${roomId || 'unknown'})`);
    } catch (e) {
      console.error('[SupabaseService] Error saving replay:', e);
    }
  }

  /**
   * Initializes a game session with 'in_progress' status in the database.
   */
  static async createGameSession(gameId: string, tableName: string) {
    if (!supabaseKey) return;
    try {
      let { data: table } = await supabase.from('tables').select('id').limit(1).single();
      if (!table) {
        const { data: newTable, error: tableErr } = await supabase.from('tables').insert({ name: tableName, game_type: 'Mesa' }).select().single();
        if (tableErr || !newTable) throw new Error('Could not create default table for game session');
        table = newTable;
      }

      const { error: gameErr } = await supabase.from('games').upsert({ id: gameId, table_id: table.id, status: 'in_progress' });
      if (gameErr) throw gameErr;
    } catch (e) {
      console.error('[SupabaseService] Error creating game session:', e);
    }
  }

  /**
   * Refunds a player's unsettled bets when a room closes mid-game.
   * Records a 'refund' credit in the immutable ledger.
   */
  static async refundPlayer(
    userId: string,
    amount: number,
    gameId?: string,
    meta?: { roomId?: string; tableName?: string; reason?: string }
  ) {
    if (!supabaseKey) return { success: true };
    if (amount <= 0) return { success: true };
    try {
      const { data, error } = await supabase.rpc('process_ledger_entry', {
        p_user_id: userId,
        p_amount_cents: amount,
        p_type: 'refund',
        p_direction: 'credit',
        p_game_id: gameId || null,
        p_table_id: null,
        p_description: meta?.reason || 'Reembolso por cierre de sala',
        p_reference_id: `refund-${gameId}-${Date.now()}`,
        p_metadata: {
          room_id: meta?.roomId || null,
          table_name: meta?.tableName || null,
          reason: meta?.reason || 'room_disposed'
        }
      });

      if (error) throw error;
      if (data?.error) {
        console.warn(`[SupabaseService] Refund failed: ${data.error}`);
        return { success: false, error: data.error };
      }

      console.log(`[SupabaseService] Refund issued: user=${userId}, amount=${amount}, balance_after=${data?.balance_after}`);
      return { success: true, balance_after: data?.balance_after };
    } catch (e) {
      console.error('[SupabaseService] Error refunding player:', e);
      return { success: false, error: String(e) };
    }
  }
}

