"use server";

import { createClient } from "@/utils/supabase/server";

export type ServerAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  message: string | null;
  metadata: Record<string, any>;
  room_id: string | null;
  game_id: string | null;
  player_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("No autenticado");

  const { data: userRecord } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") throw new Error("Acceso denegado");
  return { supabase, userId: userData.user.id };
}

export async function getServerAlerts(limit = 100): Promise<ServerAlert[]> {
  const { supabase } = await verifyAdmin();

  const { data, error } = await supabase
    .from("server_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ServerAlert[];
}

export async function resolveAlert(alertId: string): Promise<void> {
  const { supabase, userId } = await verifyAdmin();

  const { error } = await supabase
    .from("server_alerts")
    .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("id", alertId);

  if (error) throw error;
}

export async function getUnresolvedAlertCount(): Promise<number> {
  const { supabase } = await verifyAdmin();

  const { count, error } = await supabase
    .from("server_alerts")
    .select("*", { count: "exact", head: true })
    .eq("resolved", false);

  if (error) throw error;
  return count || 0;
}
