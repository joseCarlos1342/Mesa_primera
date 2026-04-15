"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "./admin-audit";

export type BroadcastHistoryRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  audience_count: number;
  read_count: number;
  push_sent_count: number;
  push_failed_count: number;
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

export async function sendBroadcast(data: { title: string, body: string, type: string }) {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  // Fetch all player IDs (excluding admins if preferred, but usually broadcast is for everyone)
  const { data: users, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "player");

  if (fetchError) throw fetchError;
  if (!users || users.length === 0) return { success: true, count: 0 };

  const notifications = users.map(u => ({
    user_id: u.id,
    type: data.type || "system_announcement",
    title: data.title,
    body: data.body,
    created_at: new Date().toISOString()
  }));

  // Batch insert
  const { error: insertError } = await supabase
    .from("notifications")
    .insert(notifications);

  if (insertError) throw insertError;

  await logAdminAction(adminId, 'broadcast_sent', 'broadcast', data.type, {
    title: data.title,
    audience_count: users.length,
  }, { context: 'communications' });

  revalidatePath('/admin');
  return { success: true, count: users.length };
}

export async function getBroadcastHistory(limit = 50): Promise<BroadcastHistoryRow[]> {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  // Get broadcast_sent entries from audit log
  const { data: logs, error } = await supabase
    .from("admin_audit_log")
    .select("id, target_id, details, created_at")
    .eq("action", "broadcast_sent")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !logs) return [];

  // For each broadcast, count reads from notifications
  const rows: BroadcastHistoryRow[] = await Promise.all(
    logs.map(async (log) => {
      const details = (log.details ?? {}) as Record<string, unknown>;
      const title = (details.title as string) || "Sin título";
      const audienceCount = (details.audience_count as number) || 0;

      // Count how many of that batch were read
      const { count: readCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("type", log.target_id ?? "system_announcement")
        .eq("title", title)
        .not("read_at", "is", null);

      return {
        id: log.id,
        type: log.target_id ?? "system_announcement",
        title,
        body: (details.body as string) || "",
        created_at: log.created_at,
        audience_count: audienceCount,
        read_count: readCount ?? 0,
        push_sent_count: (details.push_sent_count as number) || 0,
        push_failed_count: (details.push_failed_count as number) || 0,
      };
    })
  );

  return rows;
}
