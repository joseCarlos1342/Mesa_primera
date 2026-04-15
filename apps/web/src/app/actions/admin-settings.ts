"use server";

import { createClient } from "@/utils/supabase/server";
import { logAdminAction } from "./admin-audit";

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

export async function getRulebook(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("id", "rulebook")
    .single();

  if (error || !data) return "Cargando reglas...";
  return data.value?.content || "";
}

export async function updateRulebook(newContent: string) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  // Fetch current before updating
  const { data: current } = await supabase
    .from("site_settings")
    .select("value")
    .eq("id", "rulebook")
    .single();

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: "rulebook", value: { content: newContent }, updated_by: adminId, updated_at: new Date().toISOString() });

  if (error) throw error;
  
  await logAdminAction(adminId, 'rulebook_updated', 'setting', 'rulebook', {
    length: newContent.length,
  }, {
    context: 'settings',
    before_state: { content: current?.value?.content?.slice(0, 500) || null },
    after_state: { content: newContent.slice(0, 500) },
  });

  return { success: true };
}
