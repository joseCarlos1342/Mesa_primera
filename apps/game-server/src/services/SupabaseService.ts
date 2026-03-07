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
        .select('id, balance')
        .eq('user_id', userId)
        .single();
      
      if (walletError || !wallet) throw new Error('Wallet not found for ' + userId);

      // 2. Add payout to winner's balance
      const newBalance = Number(wallet.balance) + payout;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
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
      
      await this.updatePlayerStats(userId, true);
    } catch (e) {
      console.error('[SupabaseService] Error awarding pot:', e);
    }
  }

  /**
   * Updates player statistics at the end of a match.
   */
  static async updatePlayerStats(userId: string, isWin: boolean) {
    if (!supabaseKey) return;
    try {
      // Si la tabla PLAYER_STATS no existe aún, esto puede fallar.
      // Suponemos una estructura base, si no, lo ignoramos o creamos en el futuro.
      const { data: stat } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (stat) {
        await supabase
          .from('player_stats')
          .update({
            total_matches: stat.total_matches + 1,
            wins: isWin ? stat.wins + 1 : stat.wins
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('player_stats')
          .insert({
            user_id: userId,
            total_matches: 1,
            wins: isWin ? 1 : 0
          });
      }
    } catch (e) {
      console.error('[SupabaseService] Error updating stats:', e);
    }
  }
}
