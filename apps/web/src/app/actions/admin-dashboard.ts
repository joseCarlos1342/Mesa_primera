"use server";

import { createClient } from "@/utils/supabase/server";

export type AdminDashboardStats = {
  activeUsers: number;
  totalLedgerBalance: number;
  totalUsersBalance: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  activeGames: number;
  ledgerIntegrityStatus: "OPERATIVO" | "ALERTA" | "CRÍTICO";
  ledgerIntegrityDiff: number;
  volume24h: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createClient();

  // Validate admin role
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error("No autenticado");
  }

  const { data: userRecord } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") {
    throw new Error("Acceso denegado");
  }

  // Fetch pending deposits count
  const { count: pendingDepositsCount } = await supabase
    .from("deposit_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Fetch pending withdrawals count
  const { count: pendingWithdrawalsCount } = await supabase
    .from("withdrawal_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Fetch active users (just total for now, or users logged in last 24h)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { count: activeUsersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("last_sign_in_at", yesterday.toISOString());

  // Fetch active games
  const { count: activeGamesCount } = await supabase
    .from("games")
    .select("*", { count: "exact", head: true })
    .eq("status", "playing");

  // Financial Integrity Check
  // 1. Sum of all user balances
  const { data: usersData, error: usersSumError } = await supabase
    .rpc("get_total_users_balance"); 

  let totalUsersBalance = 0;
  if (!usersSumError && usersData != null) {
      totalUsersBalance = usersData;
  } else {
     // fallback if RPC doesn't exist yet
     const { data: allWallets } = await supabase.from("wallets").select("balance");
     totalUsersBalance = allWallets?.reduce((acc, w) => acc + (Number(w.balance) || 0), 0) || 0;
  }

  // 2. Sum of all ledger credits minus debits (or just relying on users total for now until we build the full ledger sync)
  // To verify integrity exactly, we need: SUM(amount) where direction = credit - SUM(amount) where direction = debit
  // Let's create an RPC for this or just do a simple aggregation if supported.
  
  const { data: ledgerSumData, error: ledgerSumError } = await supabase
    .rpc("get_ledger_net_balance");

  let totalLedgerBalance = 0;
  if (!ledgerSumError && ledgerSumData != null) {
    totalLedgerBalance = ledgerSumData;
  } else {
    // If RPC is missing, we will simulate it or fetch raw (not recommended for large tables, but okay for MVP)
    const { data: allLedger } = await supabase.from("ledger").select("amount_cents, direction").eq("status", "completed");
    if (allLedger) {
       totalLedgerBalance = allLedger.reduce((acc, entry) => {
         if (entry.direction === "credit") return acc + entry.amount_cents;
         if (entry.direction === "debit") return acc - entry.amount_cents;
         return acc;
       }, 0);
    }
  }

  const ledgerIntegrityDiff = totalLedgerBalance - totalUsersBalance;
  let ledgerIntegrityStatus: "OPERATIVO" | "ALERTA" | "CRÍTICO" = "OPERATIVO";
  if (Math.abs(ledgerIntegrityDiff) > 0 && Math.abs(ledgerIntegrityDiff) <= 100) {
      ledgerIntegrityStatus = "ALERTA";
  } else if (Math.abs(ledgerIntegrityDiff) > 100) {
      ledgerIntegrityStatus = "CRÍTICO";
  }

  // Volume 24h (total bits moved in deposits + bets)
  const { data: recentLedger } = await supabase
    .from("ledger")
    .select("amount_cents")
    .eq("status", "completed")
    .gte("created_at", yesterday.toISOString());
    
  const volume24h = recentLedger?.reduce((acc, entry) => acc + (entry.amount_cents || 0), 0) || 0;

  return {
    activeUsers: activeUsersCount || 0,
    totalLedgerBalance,
    totalUsersBalance,
    pendingDeposits: pendingDepositsCount || 0,
    pendingWithdrawals: pendingWithdrawalsCount || 0,
    activeGames: activeGamesCount || 0,
    ledgerIntegrityStatus,
    ledgerIntegrityDiff,
    volume24h
  };
}
