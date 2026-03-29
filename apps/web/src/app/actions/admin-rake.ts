"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export interface RakeEntry {
  id: string;
  user_id: string;
  game_id: string | null;
  table_id: string | null;
  amount_cents: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined fields
  winner_username?: string;
  win_amount?: number;
}

export interface RakeStats {
  totalRake: number;
  totalRake24h: number;
  totalRake7d: number;
  rakeCount: number;
}

export async function getAdminRakeData(page: number = 1, pageSize: number = 50) {
  const supabase = await createClient();

  // Validate admin role
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) redirect("/login");

  const { data: userRecord } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") redirect("/dashboard");

  // Fetch rake entries with pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: rakeEntries, count } = await supabase
    .from("ledger")
    .select("id, user_id, game_id, table_id, amount_cents, metadata, created_at", { count: "exact" })
    .eq("type", "rake")
    .eq("direction", "debit")
    .order("created_at", { ascending: false })
    .range(from, to);

  // Get corresponding win entries for each game_id to show payout amounts
  const gameIds = [...new Set((rakeEntries || []).map(e => e.game_id).filter(Boolean))];
  const winEntries: Record<string, number> = {};

  if (gameIds.length > 0) {
    const { data: wins } = await supabase
      .from("ledger")
      .select("game_id, amount_cents")
      .eq("type", "win")
      .eq("direction", "credit")
      .in("game_id", gameIds);

    if (wins) {
      wins.forEach(w => {
        if (w.game_id) winEntries[w.game_id] = w.amount_cents;
      });
    }
  }

  // Get usernames for all user_ids
  const userIds = [...new Set((rakeEntries || []).map(e => e.user_id))];
  const usernameMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    if (profiles) {
      profiles.forEach(p => { usernameMap[p.id] = p.username || "Desconocido"; });
    }
  }

  const entries: RakeEntry[] = (rakeEntries || []).map(e => ({
    ...e,
    winner_username: usernameMap[e.user_id] || "Desconocido",
    win_amount: e.game_id ? winEntries[e.game_id] || 0 : 0,
  }));

  // Aggregate stats
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: allRake } = await supabase
    .from("ledger")
    .select("amount_cents")
    .eq("type", "rake")
    .eq("status", "completed");

  const totalRake = allRake?.reduce((acc, e) => acc + e.amount_cents, 0) || 0;

  const { data: rake24h } = await supabase
    .from("ledger")
    .select("amount_cents")
    .eq("type", "rake")
    .gte("created_at", yesterday.toISOString());

  const totalRake24h = rake24h?.reduce((acc, e) => acc + e.amount_cents, 0) || 0;

  const { data: rake7d } = await supabase
    .from("ledger")
    .select("amount_cents")
    .eq("type", "rake")
    .gte("created_at", weekAgo.toISOString());

  const totalRake7d = rake7d?.reduce((acc, e) => acc + e.amount_cents, 0) || 0;

  return {
    entries,
    totalCount: count || 0,
    stats: {
      totalRake,
      totalRake24h,
      totalRake7d,
      rakeCount: count || 0,
    } as RakeStats,
  };
}
