"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "./admin-audit";

// ─── Types ──────────────────────────────────────────────

export type SanctionType = 'full_suspension' | 'game_suspension' | 'permanent_ban';

export type SanctionRecord = {
  id: string;
  user_id: string;
  sanction_type: SanctionType;
  reason: string;
  applied_by: string;
  source_room_id: string | null;
  starts_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SanctionInput = {
  userId: string;
  sanctionType: SanctionType;
  reason: string;
  expiresAt?: string;
  sourceRoomId?: string;
  metadata?: Record<string, unknown>;
};

// ─── Helpers ────────────────────────────────────────────

async function ensureAdmin(supabase: any): Promise<string> {
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

// ─── Actions ────────────────────────────────────────────

/**
 * Crea una nueva sanción para un usuario.
 */
export async function createSanction(
  input: SanctionInput
): Promise<{ success: boolean; sanction?: SanctionRecord }> {
  const { userId, sanctionType, reason, expiresAt, sourceRoomId, metadata } = input;

  if (!reason.trim()) throw new Error("El motivo es obligatorio");

  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  const { data, error } = await supabase
    .from("user_sanctions")
    .insert({
      user_id: userId,
      sanction_type: sanctionType,
      reason: reason.trim(),
      applied_by: adminId,
      source_room_id: sourceRoomId || null,
      expires_at: expiresAt || null,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAdminAction(adminId, "sanction_created", "user", userId, {
    sanction_id: data.id,
    sanction_type: sanctionType,
    reason: reason.trim(),
    expires_at: expiresAt || null,
    source_room_id: sourceRoomId || null,
  });

  revalidatePath("/admin/users");
  return { success: true, sanction: data as SanctionRecord };
}

/**
 * Revoca una sanción existente.
 */
export async function revokeSanction(
  sanctionId: string
): Promise<{ success: boolean; sanction?: SanctionRecord }> {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  const { data, error } = await supabase
    .from("user_sanctions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: adminId,
    })
    .eq("id", sanctionId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAdminAction(adminId, "sanction_revoked", "user", data.user_id, {
    sanction_id: sanctionId,
    sanction_type: data.sanction_type,
  });

  revalidatePath("/admin/users");
  return { success: true, sanction: data as SanctionRecord };
}

/**
 * Obtiene las sanciones activas de un usuario via RPC.
 */
export async function getActiveSanctions(userId: string): Promise<SanctionRecord[]> {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  const { data, error } = await supabase.rpc("get_active_sanctions", {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
  return (data || []) as SanctionRecord[];
}

/**
 * Verifica si una cuenta está bloqueada (para uso en auth flow).
 * No requiere rol admin — puede llamarse durante login.
 */
export async function checkAccountEligibility(userId: string): Promise<{
  blocked: boolean;
  sanctionType?: string;
  reason?: string;
  expiresAt?: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_account_eligibility", {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);

  if (!data) return { blocked: false };

  return {
    blocked: true,
    sanctionType: data.sanction_type,
    reason: data.reason,
    expiresAt: data.expires_at,
  };
}

/**
 * Verifica si un usuario puede unirse a mesas (para uso en game server).
 * No requiere rol admin.
 */
export async function checkTableAccess(userId: string): Promise<{
  blocked: boolean;
  sanctionType?: string;
  reason?: string;
  expiresAt?: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_table_access", {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);

  if (!data) return { blocked: false };

  return {
    blocked: true,
    sanctionType: data.sanction_type,
    reason: data.reason,
    expiresAt: data.expires_at,
  };
}
