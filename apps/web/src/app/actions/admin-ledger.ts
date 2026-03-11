"use server";

import { createClient } from "@/utils/supabase/server";

export type AdminLedgerEntry = {
  id: string;
  game_id: string | null;
  user_id: string | null;
  amount_cents: number;
  direction: "credit" | "debit";
  balance_after_cents: number;
  type: string;
  status: string;
  reference_id: string | null;
  created_at: string;
  user?: {
    display_name: string;
  } | null;
};

export async function getLedgerEntries(limit = 100): Promise<AdminLedgerEntry[]> {
  const supabase = await createClient();
  
  // Verify admin
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("No autenticado");
  
  const { data: userRecord } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") throw new Error("Acceso denegado");

  // Fetch ledger entries
  const { data: entries, error } = await supabase
    .from("ledger")
    .select(`
      id, user_id, amount_cents, type, direction, balance_after_cents, reference_id, created_at,
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
