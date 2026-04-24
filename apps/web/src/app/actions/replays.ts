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

export type MesaReplaySummary = {
  room_id: string;
  table_name: string;
  first_played_at: string;
  last_played_at: string;
  game_count: number;
  players: { userId: string; nickname: string }[];
  total_net_result: number;
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
  /** Versión del formato de replay (v2 incluye `frames`). */
  version?: 1 | 2;
  /** Snapshots por evento para reconstrucción visual de la mesa (solo v2). */
  frames?: any[];
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

export async function getPlayerMesaReplays(limit = 50): Promise<MesaReplaySummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_player_replays_by_mesa", {
    p_user_id: user.id,
    p_limit: limit,
  });

  if (error) {
    console.error("[getPlayerMesaReplays] Error:", error);
    return [];
  }

  return (data || []) as MesaReplaySummary[];
}

export async function getPlayerReplaysForRoom(roomId: string, limit = 100): Promise<PlayerReplay[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_player_replays_for_room", {
    p_user_id: user.id,
    p_room_id: roomId,
    p_limit: limit,
  });

  if (error) {
    console.error("[getPlayerReplaysForRoom] Error:", error);
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

  if (error || !data) {
    console.error("[getReplayDetail] Supabase error, trying game server fallback:", error?.message);
    return fetchReplayFromGameServer(gameId);
  }

  // Supabase no almacena frames/version: pedir al game server para hidratarlos cuando exista en VPS
  const fsDetail = await fetchReplayFromGameServer(gameId);
  if (fsDetail?.frames?.length) {
    return { ...(data as ReplayDetail), version: fsDetail.version, frames: fsDetail.frames };
  }
  return data as ReplayDetail;
}

/**
 * Fallback: obtener replay desde el API del game server (filesystem VPS)
 * cuando Supabase no tiene el registro.
 */
async function fetchReplayFromGameServer(gameId: string): Promise<ReplayDetail | null> {
  const gameServerUrl = process.env.GAME_SERVER_URL || process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  if (!gameServerUrl) return null;

  try {
    const res = await fetch(`${gameServerUrl}/api/replays/${gameId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.ok || !json.data) return null;
    const d = json.data;
    return {
      id: d.game_id,
      game_id: d.game_id,
      created_at: d.created_at,
      players: d.players,
      timeline: d.timeline,
      admin_timeline: d.admin_timeline,
      pot_breakdown: d.pot_breakdown,
      final_hands: d.final_hands,
      rng_seed: d.rng_seed,
      version: d.version,
      frames: d.frames,
    } as ReplayDetail;
  } catch (e) {
    console.error("[fetchReplayFromGameServer] Error:", e);
    return null;
  }
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

  // Hidratar frames/version desde el game server (filesystem VPS)
  let replay: ReplayDetail | null = (replayRes.data as ReplayDetail) || null;
  if (replay) {
    const fsDetail = await fetchReplayFromGameServer(gameId);
    if (fsDetail?.frames?.length) {
      replay = { ...replay, version: fsDetail.version, frames: fsDetail.frames };
    }
  }

  return {
    replay,
    ledger: (ledgerRes.data || []) as ReplayLedgerEntry[],
  };
}
