"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "./admin-audit";

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
      stats:player_stats(games_played, games_won)
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
      games_played: Array.isArray(p.stats) ? (p.stats[0] as any)?.games_played || 0 : (p.stats as any).games_played || 0,
      games_won: Array.isArray(p.stats) ? (p.stats[0] as any)?.games_won || 0 : (p.stats as any).games_won || 0
    } : { games_played: 0, games_won: 0 }
  })) as AdminUserView[];
}

export async function adjustUserBalance(userId: string, deltaCents: number, reason: string) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  if (deltaCents === 0) throw new Error("El monto debe ser diferente de cero");
  if (!reason.trim()) throw new Error("El motivo del ajuste es obligatorio");

  const direction = deltaCents > 0 ? 'credit' : 'debit';
  const amountCents = Math.abs(deltaCents);

  const { data, error } = await supabase.rpc('process_ledger_entry', {
    p_user_id: userId,
    p_amount_cents: amountCents,
    p_type: 'adjustment',
    p_direction: direction,
    p_description: `Ajuste administrativo: ${reason.trim()}`,
    p_approved_by: adminId,
    p_metadata: { reason: reason.trim(), admin_id: adminId },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  // Notify the user about the balance adjustment
  const formattedAmount = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amountCents / 100);

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'balance_adjustment',
    title: direction === 'credit' ? 'Saldo Acreditado' : 'Saldo Debitado',
    body: direction === 'credit'
      ? `Se acreditaron ${formattedAmount} a tu cuenta. Motivo: ${reason.trim()}`
      : `Se debitaron ${formattedAmount} de tu cuenta. Motivo: ${reason.trim()}`,
    data: {
      amount_cents: amountCents,
      direction,
      balance_after: data?.balance_after,
    },
  });

  // Registrar en audit log
  await logAdminAction(adminId, 'balance_adjusted', 'user', userId, {
    delta_cents: deltaCents,
    direction,
    amount_cents: amountCents,
    balance_after: data?.balance_after,
    reason: reason.trim(),
  })

  revalidatePath('/admin/users');
  return { success: true, balance_after: data?.balance_after };
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

  // Registrar en audit log
  await logAdminAction(
    adminId,
    is_banned ? 'user_banned' : 'user_unbanned',
    'user',
    userId,
    {
      is_banned,
      ban_reason: ban_reason || null,
    }
  )
  
  revalidatePath('/admin/users');
  return { success: true };
}
