"use server";

import { createClient } from "@/utils/supabase/server";
import { sanitizeReplayFrames } from "@/lib/replay-sanitizer";
import { z } from "zod";

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

export type AdminReplaysSummary = {
  totalGamesWithReplay: number;
  totalReplayRakeCents: number;
  totalUniqueReplayPlayers: number;
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

export type PlayerReplayDetail = Omit<ReplayDetail, "admin_timeline" | "rng_seed" | "final_hands"> & {
  final_hands: Record<string, { cards?: string; nickname?: string; handType?: string }>;
};

const replayFiltersSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "all"]).default("7d"),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).refine(({ from, to }) => !from || !to || from <= to, {
  message: "El rango de fechas es inválido",
});

export type ReplayFilters = z.infer<typeof replayFiltersSchema>;

function replayDates(filters: ReplayFilters): { from: string | null; to: string | null } {
  if (filters.from || filters.to) {
    return {
      from: filters.from ? `${filters.from}T00:00:00.000Z` : null,
      to: filters.to ? `${filters.to}T23:59:59.999Z` : null,
    };
  }
  if (filters.period === "all") return { from: null, to: null };

  const days = Number.parseInt(filters.period, 10);
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString(), to: null };
}

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

export async function getPlayerReplays(filtersInput: ReplayFilters = { period: "7d" }): Promise<PlayerReplay[]> {
  const parsedFilters = replayFiltersSchema.safeParse(filtersInput);
  if (!parsedFilters.success) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const dates = replayDates(parsedFilters.data);
  const { data, error } = await supabase.rpc("get_player_replays", {
    p_user_id: user.id,
    p_limit: 100,
    p_from: dates.from,
    p_to: dates.to,
  });

  if (error) {
    console.error("[getPlayerReplays] Error:", error);
    return [];
  }

  return (data || []) as PlayerReplay[];
}

export async function getPlayerMesaReplays(filtersInput: ReplayFilters = { period: "7d" }): Promise<MesaReplaySummary[]> {
  const parsedFilters = replayFiltersSchema.safeParse(filtersInput);
  if (!parsedFilters.success) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const dates = replayDates(parsedFilters.data);
  const { data, error } = await supabase.rpc("get_player_replays_by_mesa", {
    p_user_id: user.id,
    p_limit: 100,
    p_from: dates.from,
    p_to: dates.to,
  });

  if (error) {
    console.error("[getPlayerMesaReplays] Error:", error);
    return [];
  }

  return (data || []) as MesaReplaySummary[];
}

export async function getPlayerReplaysForRoom(roomId: string, filtersInput: ReplayFilters = { period: "7d" }): Promise<PlayerReplay[]> {
  const parsedFilters = replayFiltersSchema.safeParse(filtersInput);
  if (!parsedFilters.success) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const dates = replayDates(parsedFilters.data);
  const { data, error } = await supabase.rpc("get_player_replays_for_room", {
    p_user_id: user.id,
    p_room_id: roomId,
    p_limit: 100,
    p_from: dates.from,
    p_to: dates.to,
  });

  if (error) {
    console.error("[getPlayerReplaysForRoom] Error:", error);
    return [];
  }

  return (data || []) as PlayerReplay[];
}

export async function getPlayerReplayDetail(gameId: string): Promise<PlayerReplayDetail | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("get_player_replay_detail", { p_game_id: gameId });
  const detail = Array.isArray(data) ? data[0] : null;

  if (error || !detail) {
    console.error("[getPlayerReplayDetail] Error:", error);
    return null;
  }

  const fsDetail = await fetchReplayFromGameServer(gameId, user.id);
  if (fsDetail?.frames?.length) {
    return { ...(detail as PlayerReplayDetail), version: fsDetail.version, frames: fsDetail.frames };
  }
  return detail as PlayerReplayDetail;
}

export const getReplayDetail = getPlayerReplayDetail;

/**
 * Fallback: obtener replay desde el API del game server (filesystem VPS)
 * cuando Supabase no tiene el registro.
 */
async function fetchReplayFromGameServer(gameId: string, userId?: string): Promise<ReplayDetail | null> {
  const gameServerUrl = process.env.GAME_SERVER_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!gameServerUrl || !secret) return null;

  try {
    const res = await fetch(`${gameServerUrl}/api/replays/${gameId}`, {
      next: { revalidate: 60 },
      headers: { "x-internal-secret": secret },
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
      frames: userId ? sanitizeReplayFrames(d.frames, userId) : d.frames,
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

export async function getAdminReplaysSummary(): Promise<AdminReplaysSummary | null> {
  const supabase = await verifyAdmin();
  const { data, error } = await supabase.rpc("get_admin_replays_summary");
  if (error || !Array.isArray(data) || !data[0]) return null;

  const summary = data[0] as {
    total_games_with_replay?: string | number;
    total_replay_rake_cents?: string | number;
    total_unique_replay_players?: string | number;
  };

  return {
    totalGamesWithReplay: Number(summary.total_games_with_replay ?? 0),
    totalReplayRakeCents: Number(summary.total_replay_rake_cents ?? 0),
    totalUniqueReplayPlayers: Number(summary.total_unique_replay_players ?? 0),
  };
}

export async function getAdminReplayDetail(gameId: string): Promise<{ replay: ReplayDetail | null; ledger: ReplayLedgerEntry[] }> {
  const supabase = await verifyAdmin();

  const [replayRes, ledgerRes] = await Promise.all([
    supabase.rpc("get_admin_replay_detail", { p_game_id: gameId }),
    supabase.rpc("get_replay_ledger", { p_game_id: gameId }),
  ]);

  if (replayRes.error) {
    console.error("[getAdminReplayDetail] Replay error:", replayRes.error);
  }
  if (ledgerRes.error) {
    console.error("[getAdminReplayDetail] Ledger error:", ledgerRes.error);
  }

  // Hidratar frames/version desde el game server (filesystem VPS)
  let replay: ReplayDetail | null = (Array.isArray(replayRes.data) ? replayRes.data[0] : null) as ReplayDetail | null;
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
