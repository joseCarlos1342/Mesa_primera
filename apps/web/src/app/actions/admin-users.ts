"use server";

import { createClient } from "@/utils/supabase/server";

export type AdminUserView = {
  id: string;
  username: string;
  display_name: string;
  phone: string;
  balance_cents: number;
  role: string;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  created_at: string;
  last_login: string;
  devices: {
    id: string;
    fingerprint: string;
    is_trusted: boolean;
  }[];
  stats?: {
    games_played: number;
    games_won: number;
  };
};

async function ensureAdmin(supabase: any) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("No autenticado");

  const { data: userRecord, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") throw new Error("Acceso denegado");
  return userData.user.id;
}

export async function getUsersList(): Promise<AdminUserView[]> {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  // Fetch profiles with their devices, wallets and basic stats
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(`
      id, full_name, username, phone, role, is_banned, ban_reason, banned_at, created_at,
      wallets!left(balance, currency),
      devices:user_devices(id, fingerprint, is_trusted),
      stats:player_stats(total_games, wins)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  if (profiles && profiles.length > 0) {
     console.log("==> DB RETURN ADMIN USERS:", JSON.stringify(profiles.slice(0, 1), null, 2));
  }

  return (profiles || []).map(p => ({
    ...p,
    username: p.username || '',
    display_name: p.full_name || p.username || 'Desconocido',
    phone: p.phone || p.id.split('-')[0], // Muestra el telefono real desde profiles si existe
    balance_cents: p.wallets ? (Array.isArray(p.wallets) ? (p.wallets.length > 0 ? Number(p.wallets[0].balance) : 0) : Number((p.wallets as any).balance || 0)) : 0,
    last_login: p.created_at, // Fallback since auth.users isn't directly exposed here
    stats: p.stats ? {
      games_played: Array.isArray(p.stats) ? p.stats[0]?.total_games || 0 : p.stats.total_games || 0,
      games_won: Array.isArray(p.stats) ? p.stats[0]?.wins || 0 : p.stats.wins || 0
    } : { games_played: 0, games_won: 0 }
  })) as AdminUserView[];
}

export async function toggleBanStatus(userId: string, is_banned: boolean, ban_reason?: string) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  const updateData: any = { is_banned };
  
  if (is_banned) {
    updateData.ban_reason = ban_reason || "Violación de términos del local.";
    updateData.banned_at = new Date().toISOString();
    updateData.banned_by = adminId;
  } else {
    updateData.ban_reason = null;
    updateData.banned_at = null;
    updateData.banned_by = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) throw error;
  
  // NOTE: In a full architecture, we should immediately force disconnect the user via Supabase Auth admin API 
  // or notify Colyseus if they are in a room. We'll leave the DB update for this phase.
  
  return { success: true };
}
