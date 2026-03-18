"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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

  const { data: userRecord } = await supabase
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

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(`
      id, full_name, username, phone, role, is_banned, ban_reason, banned_at, created_at,
      wallets!left(balance_cents, currency),
      devices:user_devices(id, fingerprint, is_trusted),
      stats:player_stats(total_games, wins)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (profiles || []).map(p => ({
    ...p,
    username: p.username || '',
    display_name: p.full_name || p.username || 'Desconocido',
    phone: p.phone || p.id.split('-')[0],
    balance_cents: p.wallets ? (Array.isArray(p.wallets) ? (p.wallets.length > 0 ? Number(p.wallets[0].balance_cents) : 0) : Number((p.wallets as any).balance_cents || 0)) : 0,
    last_login: p.created_at,
    stats: p.stats ? {
      games_played: Array.isArray(p.stats) ? (p.stats[0] as any)?.total_games || 0 : (p.stats as any).total_games || 0,
      games_won: Array.isArray(p.stats) ? (p.stats[0] as any)?.wins || 0 : (p.stats as any).wins || 0
    } : { games_played: 0, games_won: 0 }
  })) as AdminUserView[];
}

export async function adjustUserBalance(userId: string, deltaCents: number, reason: string) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (walletError || !wallet) throw new Error("Wallet no encontrada");

  const newBalance = Number(wallet.balance_cents) + deltaCents;
  if (newBalance < 0) throw new Error("Saldo resultante no puede ser negativo");

  const { error: updateError } = await supabase
    .from('wallets')
    .update({ balance_cents: newBalance })
    .eq('id', wallet.id)

  if (updateError) throw updateError;

  await supabase.from('ledger').insert({
    user_id: userId,
    amount_cents: Math.abs(deltaCents),
    type: 'admin_adjustment',
    direction: deltaCents >= 0 ? 'credit' : 'debit',
    balance_after_cents: newBalance,
    metadata: { reason, admin_id: adminId }
  });

  revalidatePath('/admin/users');
  return { success: true };
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
  
  revalidatePath('/admin/users');
  return { success: true };
}
