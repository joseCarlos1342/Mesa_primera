"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "./admin-audit";
import { BROADCAST_TYPES, type BroadcastInput, type BroadcastResult } from "@/lib/broadcast";

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

type BroadcastHistorySourceRow = Omit<BroadcastHistoryRow, "read_count" | "push_sent_count" | "push_failed_count">;

const BROADCAST_COOLDOWN_MS = 30_000;

let lastBroadcastAt = 0;

function isBroadcastType(type: string): type is BroadcastInput["type"] {
  return BROADCAST_TYPES.includes(type as BroadcastInput["type"]);
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

export async function sendBroadcast(data: BroadcastInput): Promise<BroadcastResult> {
  if (!isBroadcastType(data.type)) {
    throw new Error("Tipo inválido");
  }

  if (lastBroadcastAt > 0 && Date.now() - lastBroadcastAt < BROADCAST_COOLDOWN_MS) {
    throw new Error("Debes esperar antes de enviar otro broadcast");
  }

  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  // Fetch all player IDs (excluding admins if preferred, but usually broadcast is for everyone)
  const { data: users, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "player");

  if (fetchError) throw fetchError;
  if (!users || users.length === 0) {
    return { success: true, broadcastId: "", audienceCount: 0 };
  }

  const createdAt = new Date().toISOString();

  const { data: broadcastRow, error: broadcastError } = await supabase
    .from("broadcast_messages")
    .insert({
      admin_id: adminId,
      type: data.type,
      title: data.title,
      body: data.body,
      audience_count: users.length,
      created_at: createdAt,
    })
    .select("id")
    .single();

  if (broadcastError) throw broadcastError;

  const broadcastId = broadcastRow?.id ?? "";

  const notifications = users.map(u => ({
    user_id: u.id,
    type: data.type,
    title: data.title,
    body: data.body,
    broadcast_id: broadcastId,
    created_at: createdAt,
  }));

  const { data: insertedNotifications, error: insertError } = await supabase
    .from("notifications")
    .insert(notifications)
    .select("id, user_id");

  if (insertError) throw insertError;

  const notificationIdByUserId = new Map(
    (insertedNotifications ?? []).map((notification: { id: string; user_id: string }) => [
      notification.user_id,
      notification.id,
    ])
  );

  const deliveries = users.map((user: { id: string }) => ({
    broadcast_id: broadcastId,
    user_id: user.id,
    notification_id: notificationIdByUserId.get(user.id) ?? null,
    in_app_sent_at: createdAt,
    push_queued_at: null,
    push_sent_at: null,
    push_failed_at: null,
    push_error: null,
  }));

  const { error: deliveriesError } = await supabase
    .from("broadcast_deliveries")
    .insert(deliveries);

  if (deliveriesError) throw deliveriesError;

  await logAdminAction(adminId, 'broadcast_sent', 'broadcast', data.type, {
    body: data.body,
    title: data.title,
    audience_count: users.length,
    broadcast_id: broadcastId,
  }, { context: 'communications' });

  // Emit via game server Socket.IO (best-effort, don't block on failure)
  try {
    const gameServerUrl = process.env.GAME_SERVER_URL || "http://localhost:2567";
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret) {
      await fetch(`${gameServerUrl}/api/internal/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({
          broadcastId,
          type: data.type,
          title: data.title,
          body: data.body,
          createdAt,
        }),
      });
    }
  } catch (err) {
    console.error("[sendBroadcast] Failed to notify game server:", err);
  }

  lastBroadcastAt = Date.now();
  revalidatePath('/admin');
  revalidatePath('/admin/broadcast');

  return { success: true, broadcastId, audienceCount: users.length };
}

export async function getBroadcastHistory(limit = 50): Promise<BroadcastHistoryRow[]> {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  const { data: broadcasts, error } = await supabase
    .from("broadcast_messages")
    .select("id, admin_id, type, title, body, audience_count, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !broadcasts) return [];

  const broadcastIds = broadcasts.map((broadcast: { id: string }) => broadcast.id);

  if (broadcastIds.length === 0) return [];

  const { data: deliveries } = await supabase
    .from("broadcast_deliveries")
    .select("broadcast_id, push_sent_at, push_failed_at")
    .in("broadcast_id", broadcastIds);

  const { data: readNotifications } = await supabase
    .from("notifications")
    .select("broadcast_id, read_at")
    .in("broadcast_id", broadcastIds)
    .not("read_at", "is", null);

  const deliveryStats = new Map<string, { pushSentCount: number; pushFailedCount: number }>();

  for (const delivery of deliveries ?? []) {
    const current = deliveryStats.get(delivery.broadcast_id) ?? { pushSentCount: 0, pushFailedCount: 0 };
    if (delivery.push_sent_at) current.pushSentCount += 1;
    if (delivery.push_failed_at) current.pushFailedCount += 1;
    deliveryStats.set(delivery.broadcast_id, current);
  }

  const readCounts = new Map<string, number>();

  for (const notification of readNotifications ?? []) {
    if (!notification.broadcast_id) continue;
    readCounts.set(notification.broadcast_id, (readCounts.get(notification.broadcast_id) ?? 0) + 1);
  }

  const rows: BroadcastHistoryRow[] = broadcasts.map((broadcast: BroadcastHistorySourceRow) => {
    const stats = deliveryStats.get(broadcast.id);

    return {
      id: broadcast.id,
      type: broadcast.type,
      title: broadcast.title,
      body: broadcast.body,
      created_at: broadcast.created_at,
      audience_count: broadcast.audience_count,
      read_count: readCounts.get(broadcast.id) ?? 0,
      push_sent_count: stats?.pushSentCount ?? 0,
      push_failed_count: stats?.pushFailedCount ?? 0,
    };
  });

  return rows;
}
