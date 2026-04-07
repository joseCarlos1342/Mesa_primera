"use server";

import { createClient } from "@/utils/supabase/server";

export type AdminLedgerEntry = {
  id: string;
  game_id: string | null;
  user_id: string | null;
  amount_cents: number;
  direction: "credit" | "debit";
  balance_after_cents: number;
  balance_before_cents?: number;
  type: string;
  status: string;
  reference_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
  user?: {
    display_name: string;
  } | null;
};

export type UserWithBalance = {
  id: string;
  display_name: string;
  username: string | null;
  balance: number;
  total_credits: number;
  total_debits: number;
  last_activity: string | null;
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
  return supabase;
}

export async function getLedgerEntries(limit = 100): Promise<AdminLedgerEntry[]> {
  const supabase = await verifyAdmin();

  const { data: entries, error } = await supabase
    .from("ledger")
    .select(`
      id, user_id, amount_cents, type, direction, balance_before_cents, balance_after_cents,
      reference_id, description, metadata, status, created_at,
      user:profiles(full_name, username)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return entries.map((en: any) => {
    const pInfo = en.user ? (Array.isArray(en.user) ? en.user[0] : en.user) : null;
    return {
      ...en,
      game_id: en.reference_id || null, 
      user: pInfo ? { display_name: pInfo.full_name || pInfo.username || 'Desconocido' } : null
    };
  }) as AdminLedgerEntry[];
}

export async function getUsersWithBalances(): Promise<UserWithBalance[]> {
  const supabase = await verifyAdmin();

  // Get all wallets joined with profiles
  const { data: wallets, error } = await supabase
    .from("wallets")
    .select(`
      user_id, balance_cents,
      profile:profiles(full_name, username)
    `)
    .order("balance_cents", { ascending: false });

  if (error) throw error;

  const users: UserWithBalance[] = [];

  for (const w of (wallets || [])) {
    const profile = w.profile ? (Array.isArray(w.profile) ? w.profile[0] : w.profile) : null;

    // Get aggregate stats from ledger for this user
    const { data: credits } = await supabase
      .from("ledger")
      .select("amount_cents")
      .eq("user_id", w.user_id)
      .eq("direction", "credit");

    const { data: debits } = await supabase
      .from("ledger")
      .select("amount_cents")
      .eq("user_id", w.user_id)
      .eq("direction", "debit");

    const { data: lastEntry } = await supabase
      .from("ledger")
      .select("created_at")
      .eq("user_id", w.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const totalCredits = (credits || []).reduce((sum: number, c: any) => sum + (c.amount_cents || 0), 0);
    const totalDebits = (debits || []).reduce((sum: number, d: any) => sum + (d.amount_cents || 0), 0);

    users.push({
      id: w.user_id,
      display_name: (profile as any)?.full_name || (profile as any)?.username || 'Desconocido',
      username: (profile as any)?.username || null,
      balance: w.balance_cents || 0,
      total_credits: totalCredits,
      total_debits: totalDebits,
      last_activity: lastEntry?.created_at || null,
    });
  }

  return users;
}

export async function getUserLedger(userId: string, limit = 200): Promise<AdminLedgerEntry[]> {
  const supabase = await verifyAdmin();

  const { data: entries, error } = await supabase
    .from("ledger")
    .select(`
      id, user_id, amount_cents, type, direction, balance_before_cents, balance_after_cents,
      reference_id, description, metadata, status, created_at
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (entries || []).map((en: any) => ({
    ...en,
    game_id: en.reference_id || null,
    user: null
  })) as AdminLedgerEntry[];
}

export async function getUserProfile(userId: string) {
  const supabase = await verifyAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, role, created_at")
    .eq("id", userId)
    .single();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    ...profile,
    balance: wallet?.balance || 0
  };
}
