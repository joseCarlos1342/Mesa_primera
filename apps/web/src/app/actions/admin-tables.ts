"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "./admin-audit";

// ── Valid chip denominations (in centavos) ──
const VALID_CHIP_DENOMS = [100000, 200000, 500000, 1000000, 2000000, 5000000] as const;

// ── Types ───────────────────────────────────────────────────

export type TableCategory = "common" | "custom";

export type TableFinancials = {
  table_id: string;
  table_name: string;
  game_type: string;
  total_games: number;
  unique_players: number;
  total_winnings_cents: number;
  total_rake_cents: number;
  total_bets_cents: number;
  total_credits_cents: number;
  total_debits_cents: number;
  last_activity: string | null;
};

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

export type LobbyTable = {
  id: string;
  name: string;
  game_type: string;
  max_players: number;
  table_category: TableCategory;
  lobby_slot: number | null;
  min_entry_cents: number;
  min_pique_cents: number;
  disabled_chips: number[];
  sort_order: number;
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

export async function getTablesList(category?: TableCategory) {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  let query = supabase
    .from("tables")
    .select(`
      id, name, min_bet, max_players, game_type, created_at,
      table_category, lobby_slot, min_entry_cents, min_pique_cents,
      disabled_chips, is_active, sort_order,
      games:games(count) 
    `)
    .order("sort_order", { ascending: true });

  if (category) {
    query = query.eq("table_category", category);
  }

  const { data: tables, error } = await query;

  if (error) throw error;
  return (tables || []).map(t => ({
    ...t,
    active_games: Array.isArray(t.games) ? (t.games[0] as any)?.count || 0 : (t.games as any)?.count || 0
  }));
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
    .in("status", ["waiting", "in_progress"])
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
  
  await logAdminAction(adminId, 'game_status_changed', 'game', gameId, {
    new_status: status,
    reason: reason || null,
  }, { context: 'tables' });

  // NOTE: In a full architecture, we must notify the Colyseus game server to actually implement the pause/close.
  // For now, updating the DB is the first step.
  
  return { success: true };
}

export async function kickPlayer(gameId: string, playerId: string) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  const { error } = await supabase
    .from("players")
    .update({ status: "expelled" })
    .eq("id", playerId)
    .eq("game_id", gameId);

  if (error) throw error;

  await logAdminAction(adminId, 'player_kicked', 'player', playerId, {
    game_id: gameId,
  }, { context: 'tables' });

  // NOTE: We should also call Colyseus backend to forcefully close the player's socket connection and refund if necessary.
  
  return { success: true };
}

export async function createTable(data: { name: string, max_players?: number, game_type?: string, lobby_slot?: number }) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  const { error } = await supabase
    .from("tables")
    .insert({
      name: data.name,
      max_players: data.max_players || 7,
      game_type: data.game_type || 'primera_28',
      min_bet: 1,
      created_by: adminId,
      table_category: 'common',
      min_entry_cents: 5000000,
      min_pique_cents: 500000,
      disabled_chips: [],
      lobby_slot: data.lobby_slot || null,
    });

  if (error) throw error;

  await logAdminAction(adminId, 'table_created', 'table', data.name, {
    name: data.name,
    max_players: data.max_players || 7,
    game_type: data.game_type || 'primera_28',
    table_category: 'common',
  }, { context: 'tables' });
  
  revalidatePath('/admin/tables');
  return { success: true };
}

export async function createCustomTable(data: {
  name: string;
  max_players: number;
  min_entry_cents: number;
  min_pique_cents: number;
  disabled_chips: number[];
  game_type?: string;
}) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  // Validation
  if (!data.name || !data.name.trim()) {
    throw new Error("El nombre de la mesa es requerido.");
  }
  if (data.max_players < 3 || data.max_players > 7) {
    throw new Error("La capacidad debe estar entre 3 y 7 jugadores.");
  }
  if (data.min_entry_cents <= 0) {
    throw new Error("El saldo mínimo de ingreso debe ser mayor a 0.");
  }
  if (data.min_pique_cents <= 0) {
    throw new Error("El pique mínimo debe ser mayor a 0.");
  }
  // At least one chip denomination must remain enabled
  const enabledCount = VALID_CHIP_DENOMS.length - data.disabled_chips.filter(d => (VALID_CHIP_DENOMS as readonly number[]).includes(d)).length;
  if (enabledCount < 1) {
    throw new Error("Debe haber al menos 1 ficha habilitada.");
  }

  const { error } = await supabase
    .from("tables")
    .insert({
      name: data.name.trim(),
      max_players: data.max_players,
      game_type: data.game_type || 'primera_28',
      min_bet: 1,
      created_by: adminId,
      table_category: 'custom',
      min_entry_cents: data.min_entry_cents,
      min_pique_cents: data.min_pique_cents,
      disabled_chips: data.disabled_chips,
    });

  if (error) throw error;

  await logAdminAction(adminId, 'table_created', 'table', data.name, {
    name: data.name,
    max_players: data.max_players,
    table_category: 'custom',
    min_entry_cents: data.min_entry_cents,
  }, { context: 'tables' });

  revalidatePath('/admin/tables');
  return { success: true };
}

export async function updateTable(tableId: string, data: Partial<{
  name: string;
  max_players: number;
  min_entry_cents: number;
  min_pique_cents: number;
  disabled_chips: number[];
  sort_order: number;
  is_active: boolean;
}>) {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  // Fetch the table to check category
  const { data: table, error: fetchError } = await supabase
    .from("tables")
    .select("id, table_category, is_active")
    .eq("id", tableId)
    .single();

  if (fetchError || !table) throw new Error("Mesa no encontrada.");

  // Common tables cannot change entry/pique/chips
  if (table.table_category === 'common') {
    const forbiddenFields = ['min_entry_cents', 'min_pique_cents', 'disabled_chips'] as const;
    for (const field of forbiddenFields) {
      if (data[field] !== undefined) {
        throw new Error("No se pueden modificar los parámetros financieros de una mesa común.");
      }
    }
  }

  const { error } = await supabase
    .from("tables")
    .update(data)
    .eq("id", tableId);

  if (error) throw error;

  revalidatePath('/admin/tables');
  return { success: true };
}

export async function toggleTableActive(tableId: string, isActive: boolean) {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  const { error } = await supabase
    .from("tables")
    .update({ is_active: isActive })
    .eq("id", tableId);

  if (error) throw error;

  revalidatePath('/admin/tables');
  return { success: true };
}

export async function deleteTable(tableId: string) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  // Check if there are active games for this table
  const { data: activeGames } = await supabase
    .from("games")
    .select("id")
    .eq("table_id", tableId)
    .in("status", ["waiting", "in_progress"]);

  if (activeGames && activeGames.length > 0) {
    throw new Error("No se puede eliminar una mesa con juegos activos.");
  }

  const { error } = await supabase
    .from("tables")
    .delete()
    .eq("id", tableId);

  if (error) throw error;

  await logAdminAction(adminId, 'table_deleted', 'table', tableId, {}, { context: 'tables' });

  revalidatePath('/admin/tables');
  return { success: true };
}

export async function getTableFinancials(): Promise<TableFinancials[]> {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  const { data, error } = await supabase.rpc('get_table_financials');

  if (error) throw error;
  return (data || []) as TableFinancials[];
}

export async function getLobbyTables(): Promise<{ common: LobbyTable[]; custom: LobbyTable[] }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_lobby_tables');

  if (error) throw error;

  const tables = (data || []) as LobbyTable[];
  return {
    common: tables.filter(t => t.table_category === 'common'),
    custom: tables.filter(t => t.table_category === 'custom'),
  };
}
