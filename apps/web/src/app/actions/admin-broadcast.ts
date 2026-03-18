"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
  await ensureAdmin(supabase);

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

  revalidatePath('/admin');
  return { success: true, count: users.length };
}
