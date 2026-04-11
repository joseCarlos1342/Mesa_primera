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
      user:profiles!ledger_user_id_fkey(full_name, username)
    `)
    .order("sequence", { ascending: false })
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

  const { data, error } = await supabase.rpc('get_admin_ledger_summary');

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    display_name: row.display_name || 'Desconocido',
    username: row.username || null,
    balance: row.balance || 0,
    total_credits: row.total_credits || 0,
    total_debits: row.total_debits || 0,
    last_activity: row.last_activity || null,
  }));
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
    .order("sequence", { ascending: false })
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
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    ...profile,
    balance: wallet?.balance_cents || 0
  };
}
