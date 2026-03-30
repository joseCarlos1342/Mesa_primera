"use server";

import { createClient } from "@/utils/supabase/server";

export type PlayerReplay = {
  game_id: string;
  played_at: string;
  players: { userId: string; nickname: string; cards?: string; chips?: number }[];
  net_result: number;
  total_pot: number;
  is_winner: boolean;
};

export type AdminReplay = {
  game_id: string;
  played_at: string;
  players: { userId: string; nickname: string; cards?: string; chips?: number }[];
  total_pot: number;
  total_rake: number;
  winner_id: string | null;
};

export type ReplayDetail = {
  id: string;
  game_id: string;
  created_at: string;
  players: { userId: string; nickname: string; cards?: string; chips?: number }[];
  timeline: any[];
  admin_timeline: any[] | null;
  pot_breakdown: Record<string, any>;
  final_hands: Record<string, any>;
  rng_seed: string;
};

export type ReplayLedgerEntry = {
  id: string;
  user_id: string;
  type: string;
  direction: string;
  amount_cents: number;
  balance_after_cents: number;
  description: string | null;
  metadata: any;
  created_at: string;
};

// ─── Player Actions ─────────────────────────────────────────

export async function getPlayerReplays(limit = 50): Promise<PlayerReplay[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_player_replays", {
    p_user_id: user.id,
    p_limit: limit,
  });

  if (error) {
    console.error("[getPlayerReplays] Error:", error);
    return [];
  }

  return (data || []) as PlayerReplay[];
}

export async function getReplayDetail(gameId: string): Promise<ReplayDetail | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("game_replays")
    .select("id, game_id, created_at, players, timeline, admin_timeline, pot_breakdown, final_hands, rng_seed")
    .eq("game_id", gameId)
    .single();

  if (error) {
    console.error("[getReplayDetail] Error:", error);
    return null;
  }

  return data as ReplayDetail;
}

// ─── Admin Actions ──────────────────────────────────────────

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("No autorizado");
  return supabase;
}

export async function getAllReplays(limit = 50, offset = 0): Promise<AdminReplay[]> {
  const supabase = await verifyAdmin();

  const { data, error } = await supabase.rpc("get_admin_replays", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("[getAllReplays] Error:", error);
    return [];
  }

  return (data || []) as AdminReplay[];
}

export async function getAdminReplayDetail(gameId: string): Promise<{ replay: ReplayDetail | null; ledger: ReplayLedgerEntry[] }> {
  const supabase = await verifyAdmin();

  const [replayRes, ledgerRes] = await Promise.all([
    supabase
      .from("game_replays")
      .select("id, game_id, created_at, players, timeline, admin_timeline, pot_breakdown, final_hands, rng_seed")
      .eq("game_id", gameId)
      .single(),
    supabase.rpc("get_replay_ledger", { p_game_id: gameId }),
  ]);

  if (replayRes.error) {
    console.error("[getAdminReplayDetail] Replay error:", replayRes.error);
  }
  if (ledgerRes.error) {
    console.error("[getAdminReplayDetail] Ledger error:", ledgerRes.error);
  }

  return {
    replay: (replayRes.data as ReplayDetail) || null,
    ledger: (ledgerRes.data || []) as ReplayLedgerEntry[],
  };
}
