"use server";

import { createClient } from "@/utils/supabase/server";

export type AdminGameView = {
  id: string;
  status: string;
  max_players: number;
  min_bet_cents: number;
  pique_pot_cents: number;
  main_pot_cents: number;
  started_at: string | null;
  created_by: string;
  name?: string;
  table_id?: string;
  players: AdminPlayerView[];
};

export type AdminPlayerView = {
  id: string;
  user_id: string;
  status: string;
  bet_current_cents: number;
  seat_number: number;
  display_name?: string;
};

// Ensure admin
async function ensureAdmin(supabase: any) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("No autenticado");

  const { data: userRecord } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") throw new Error("Acceso denegado");
  return userData.user.id;
}

export async function getActiveGames(): Promise<AdminGameView[]> {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  // Bring games that are not finished or closed
  const { data: games, error } = await supabase
    .from("games")
    .select(`
      id, status, started_at,
      tables(id, name, game_type, min_bet, max_players, created_by),
      players:game_participants(id, user_id, seat_number, joined_at, left_at)
    `)
    .in("status", ["waiting", "playing", "paused"])
    .order("started_at", { ascending: false });

  if (error) throw error;

  // Manually enrich player names if needed, or we can just fetch it joining users view
  // Let's do a fast map since it's an admin view
  
  if (!games || games.length === 0) return [];
  
  const userIds = games.flatMap((g) => g.players.map((p: any) => p.user_id));
  const uniqueUserIds = Array.from(new Set(userIds));
  
  const { data: usersInfo } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .in("id", uniqueUserIds);

  const userMap = new Map(usersInfo?.map(u => [u.id, u.full_name || u.username]));

  const enrichedGames = games.map((g: any) => ({
    id: g.id,
    table_id: g.tables?.id,
    name: g.tables?.name || 'Mesa Desconocida',
    status: g.status,
    max_players: g.tables?.max_players || 4,
    min_bet_cents: Number(g.tables?.min_bet || 0),
    pique_pot_cents: 0, // Not tracked on this level yet
    main_pot_cents: 0, // Not tracked on this level yet
    started_at: g.started_at,
    created_by: g.tables?.created_by || '',
    players: (g.players || []).map((p: any) => ({
      ...p,
      display_name: userMap.get(p.user_id) || "Desconocido",
      status: p.left_at ? 'left' : 'playing',
      bet_current_cents: 0 // Mock actual bet cents since memory state isn't in DB yet
    }))
  }));

  return enrichedGames as AdminGameView[];
}

export async function setGameStatus(gameId: string, status: "playing" | "paused" | "closed_by_admin", reason?: string) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  const updateData: any = { status };
  if (status === "paused") {
    updateData.paused_by = adminId;
    updateData.pause_reason = reason;
  } else if (status === "playing") {
    updateData.paused_by = null;
    updateData.pause_reason = null;
  }

  const { error } = await supabase
    .from("games")
    .update(updateData)
    .eq("id", gameId);

  if (error) throw error;
  
  // NOTE: In a full architecture, we must notify the Colyseus game server to actually implement the pause/close.
  // For now, updating the DB is the first step.
  
  return { success: true };
}

export async function kickPlayer(gameId: string, playerId: string) {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  const { error } = await supabase
    .from("players")
    .update({ status: "expelled" })
    .eq("id", playerId)
    .eq("game_id", gameId);

  if (error) throw error;

  // NOTE: We should also call Colyseus backend to forcefully close the player's socket connection and refund if necessary.
  
  return { success: true };
}
