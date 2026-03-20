"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type PlayerStats = {
  user_id: string;
  games_played: number;
  games_won: number;
  total_won_cents: number;
  total_lost_cents: number;
  total_rake_paid_cents: number;
  current_streak: number;
  best_streak: number;
  primeras_count: number;
  chivos_count: number;
  segundas_count: number;
  last_game_at: string | null;
  username?: string;
  avatar_url?: string;
  level?: number;
};

export type LeaderboardEntry = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  score: number;
};

export async function getMyStats(): Promise<PlayerStats | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("player_stats")
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url,
        level
      )
    `)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error("Error fetching player stats:", error);
    return null;
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  return {
    ...data,
    username: profile?.username,
    avatar_url: profile?.avatar_url,
    level: profile?.level
  };
}

export async function getLeaderboard(category: 'top_ganadores' | 'mejor_racha' | 'maestro_primera' | 'total_ganadas' = 'total_ganadas'): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  // Mapping categories to RPC expected values if needed, but our migration already handles these names
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_period: 'all_time',
    p_category: category
  });

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return data as LeaderboardEntry[];
}
