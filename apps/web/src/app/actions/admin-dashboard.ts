"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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
  pendingSupport: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createClient();

  // Validate admin role
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    redirect("/login");
  }

  const { data: userRecord } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") {
    redirect("/dashboard");
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

  // Fetch active users (via RPC from auth.users)
  const { data: activeUsersCount, error: activeUsersError } = await supabase
    .rpc("get_active_users_count");

  // Fetch active games
  const { count: activeGamesCount } = await supabase
    .from("games")
    .select("*", { count: "exact", head: true })
    .eq("status", "in_progress");

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
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { data: recentLedger } = await supabase
  const volume24h = recentLedger?.reduce((acc, entry) => acc + (entry.amount_cents || 0), 0) || 0;

  // Pending Support Messages
  const { count: pendingSupportCount } = await supabase
    .from("support_messages")
    .select("*", { count: "exact", head: true })
    .eq("from_admin", false)
    .is("read_at", null);

  return {
    activeUsers: activeUsersCount || 0,
    totalLedgerBalance,
    totalUsersBalance,
    pendingDeposits: pendingDepositsCount || 0,
    pendingWithdrawals: pendingWithdrawalsCount || 0,
    activeGames: activeGamesCount || 0,
    ledgerIntegrityStatus,
    ledgerIntegrityDiff,
    volume24h,
    pendingSupport: pendingSupportCount || 0
  };
}
