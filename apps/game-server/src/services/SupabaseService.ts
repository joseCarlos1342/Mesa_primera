import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: any = null;

if (!supabaseKey) {
  console.warn('[SupabaseService] SUPABASE_SERVICE_ROLE_KEY is missing. Database operations will silently fail.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('[SupabaseService] Failed to init Supabase client', err);
  }
}

export class SupabaseService {
  /**
   * Distributes the pot to the winner and records the rake.
   */
  static async awardPot(userId: string, payout: number, rake: number) {
    if (!supabaseKey) return;
    try {
      // 1. Get the user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance_cents')
        .eq('user_id', userId)
        .single();
      
      if (walletError || !wallet) throw new Error('Wallet not found for ' + userId);

      // 2. Add payout to winner's balance
      const newBalance = Number(wallet.balance_cents) + payout;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance_cents: newBalance })
        .eq('id', wallet.id);

      if (updateError) throw updateError;

      // 3. Record transactions in Ledger
      await supabase.from('transactions').insert([
        {
          wallet_id: wallet.id,
          amount: payout,
          type: 'win',
          status: 'completed',
          reference_id: `pot-win-${Date.now()}`
        },
        {
          wallet_id: wallet.id,
          amount: -rake, // Rake is usually deducted from the pot before giving the payout. We record the rake taken.
          // Or wait, if the pot was 100, rake 5, payout 95. The winner gets 95. Rake doesn't strictly need to be a transaction on the winner's wallet unless we want to log the gross win and then the rake deduction. We'll simply record the net payout as "win". For accounting, we record a global rake transaction or just keep the net. Let's record the net payout.
          // If we want to record the rake, we could do a separate system wallet.
        //   type: 'rake',
        //   status: 'completed',
        //   reference_id: `rake-${Date.now()}`
        }
      ]);
      
      // Player stats update is now handled separately per player
    } catch (e) {
      console.error('[SupabaseService] Error awarding pot:', e);
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
   */
  static async saveReplay(gameId: string, seed: string, timeline: any[], players: any[]) {
    if (!supabaseKey) return;
    try {
      // 1. Fetch or create a default table if missing (for foreign key constraint on games)
      let { data: table } = await supabase.from('tables').select('id').limit(1).single();
      if (!table) {
        const { data: newTable, error: tableErr } = await supabase.from('tables').insert({ name: 'Default Table', game_type: 'Mesa' }).select().single();
        if (tableErr || !newTable) throw new Error('Could not create default table for replay');
        table = newTable;
      }

      // 2. Insert dummy game record (since MesaRoom doesn't create full game sessions yet but Replays need a game_id)
      const { error: gameErr } = await supabase.from('games').upsert({ id: gameId, table_id: table.id, status: 'finished' });
      if (gameErr) throw gameErr;

      // 3. Save the replay
      const { error: replayErr } = await supabase.from('game_replays').insert({
        game_id: gameId,
        seed,
        timeline,
        players
      });

      if (replayErr) throw replayErr;
      console.log(`[SupabaseService] Replay saved successfully for game: ${gameId}`);
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
}

