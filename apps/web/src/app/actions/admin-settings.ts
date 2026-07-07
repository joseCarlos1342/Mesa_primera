"use server";

import { createClient } from "@/utils/supabase/server";
import { logAdminAction } from "./admin-audit";

const RULEBOOK_MAX_LENGTH = 50_000;
const RAW_HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;
const MARKDOWN_LINK_PATTERN = /\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function validateRulebookContent(content: string) {
  if (!content) throw new Error("El reglamento no puede estar vacío");
  if (content.length > RULEBOOK_MAX_LENGTH) throw new Error("El reglamento es demasiado largo");
  if (RAW_HTML_PATTERN.test(content)) throw new Error("El reglamento no permite HTML crudo");

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const href = match[1]?.trim().toLowerCase() ?? "";
    const isAllowed = href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:") || href.startsWith("/");
    if (!isAllowed) throw new Error("El reglamento contiene enlaces no permitidos");
  }
}

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
  const content = newContent.trim();
  validateRulebookContent(content);

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
    .upsert({ id: "rulebook", value: { content }, updated_by: adminId, updated_at: new Date().toISOString() });

  if (error) throw error;
  
  await logAdminAction(adminId, 'rulebook_updated', 'setting', 'rulebook', {
    length: content.length,
  }, {
    context: 'settings',
    before_state: { content: current?.value?.content?.slice(0, 500) || null },
    after_state: { content: content.slice(0, 500) },
  });

  return { success: true };
}
