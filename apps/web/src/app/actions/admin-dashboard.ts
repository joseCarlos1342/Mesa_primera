"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export type AdminDashboardStats = {
  activeUsers: number;
  totalLedgerBalance: number;
  totalUsersBalance: number;
  totalRake: number;
  fraudAccountsCount: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  activeGames: number;
  ledgerIntegrityStatus: "OPERATIVO" | "ALERTA" | "CRÍTICO";
  ledgerIntegrityDiff: number;
  volume24h: number;
  pendingSupport: number;
  pendingAlerts: number;
  vaultStatus: "OPERATIVO" | "ALERTA" | "CRÍTICO";
  vaultCoverage: number;
  vaultBalance: number;
  vaultTotalDeposits: number;
  vaultTotalWithdrawals: number;
  vaultStatus: "OPERATIVO" | "ALERTA" | "CRÍTICO" | "DESCONOCIDO";
  vaultCoverage: number;
  vaultBalance: number;
  vaultTotalDeposits: number;
  vaultTotalWithdrawals: number;
  warnings: string[];
  fetchedAt: string;
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

  const warnings: string[] = [];

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
  const { data: activeUsersCount } = await supabase
    .rpc("get_active_users_count");

  // Fetch active rooms from Colyseus matchmaker API (real-time, not stale DB records)
  let activeGamesCount = 0;
  try {
    const gsUrl = process.env.GAME_SERVER_URL || process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'https://vps23830.cubepath.net';
    const res = await fetch(`${gsUrl}/matchmake/`, { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const rooms = await res.json() as any[];
      // Only count rooms with at least 1 client (real active games)
      activeGamesCount = rooms.filter((r: any) => r.clients > 0).length;
    }
  } catch {
    warnings.push('Game server /matchmake/ no responde — usando fallback DB');
    // Fallback: count recent in-progress games in DB (created within last 24h)
    const { count } = await supabase
      .from("games")
      .select("*", { count: "exact", head: true })
      .in("status", ["waiting", "in_progress"])
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    activeGamesCount = count || 0;
  }

  // Financial Integrity Check
  // 1. Sum of all user balances
  const { data: usersData, error: usersSumError } = await supabase
    .rpc("get_total_users_balance"); 

  let totalUsersBalance = 0;
  if (!usersSumError && usersData != null) {
      totalUsersBalance = usersData;
  } else {
     warnings.push('get_total_users_balance RPC falló — usando fallback');
     // fallback if RPC doesn't exist yet
     const { data: allWallets } = await supabase.from("wallets").select("balance_cents");
     totalUsersBalance = allWallets?.reduce((acc, w) => acc + (Number(w.balance_cents) || 0), 0) || 0;
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
    warnings.push('get_ledger_net_balance RPC falló — usando fallback');
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

  // Volume 24h (total amount moved in deposits + bets)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { data: recentLedger } = await supabase
    .from("ledger")
    .select("amount_cents")
    .gte("created_at", yesterday.toISOString());
  const volume24h = recentLedger?.reduce((acc, entry) => acc + (entry.amount_cents || 0), 0) || 0;

  // Pending Support Messages (Unique users with unresolved messages)
  const { data: supportData } = await supabase
    .from("support_messages")
    .select("user_id")
    .eq("is_resolved", false);

  const pendingSupportCount = new Set(supportData?.map(m => m.user_id)).size;

  // Pending table help requests ("Llamar al Admin")
  const { count: pendingAlertsCount } = await supabase
    .from('table_help_requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'attending']);

  // Total Rake (House earnings)
  const { data: rakeData } = await supabase
    .from("ledger")
    .select("amount_cents")
    .eq("type", "rake")
    .eq("status", "completed");
  
  const totalRake = rakeData?.reduce((acc, entry) => acc + (entry.amount_cents || 0), 0) || 0;

  // Fraud Detection Count (Users sharing fingerprints)
  const { data: allDevices } = await supabase
    .from("user_devices")
    .select("fingerprint, user_id");
  
  const fingerprintMap = new Map<string, Set<string>>();
  allDevices?.forEach(d => {
    if (d.fingerprint) {
      if (!fingerprintMap.has(d.fingerprint)) fingerprintMap.set(d.fingerprint, new Set());
      fingerprintMap.get(d.fingerprint)!.add(d.user_id);
    }
  });

  const fraudUserIds = new Set<string>();
  fingerprintMap.forEach(users => {
    if (users.size > 1) {
      users.forEach(uid => fraudUserIds.add(uid));
    }
  });

  // Vault Status (Bóveda: deposits vs withdrawals coverage)
  let vaultCoverage = 100;
  let vaultBalance = 0;
  let vaultTotalDeposits = 0;
  let vaultTotalWithdrawals = 0;
  let vaultStatus: "OPERATIVO" | "ALERTA" | "CRÍTICO" | "DESCONOCIDO" = "OPERATIVO";

  const { data: vaultData, error: vaultError } = await supabase.rpc("get_vault_status");
  if (!vaultError && vaultData) {
    vaultTotalDeposits = vaultData.total_deposits ?? 0;
    vaultTotalWithdrawals = vaultData.total_withdrawals ?? 0;
    vaultBalance = vaultData.vault_balance ?? 0;
    vaultCoverage = vaultData.coverage ?? 100;
  } else {
    warnings.push('get_vault_status RPC falló — estado desconocido');
  }

  if (vaultError) {
    vaultStatus = "DESCONOCIDO";
  } else if (vaultCoverage >= 100) {
    vaultStatus = "ALERTA";
  } else {
    vaultStatus = "CRÍTICO";
  }

  return {
    activeUsers: activeUsersCount || 0,
    totalLedgerBalance,
    totalUsersBalance,
    totalRake,
    fraudAccountsCount: fraudUserIds.size,
    pendingDeposits: pendingDepositsCount || 0,
    pendingWithdrawals: pendingWithdrawalsCount || 0,
    activeGames: activeGamesCount || 0,
    ledgerIntegrityStatus,
    ledgerIntegrityDiff,
    volume24h,
    pendingSupport: pendingSupportCount || 0,
    pendingAlerts: pendingAlertsCount || 0,
    vaultStatus,
    vaultCoverage,
    vaultBalance,
    vaultTotalDeposits,
    vaultTotalWithdrawals,
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}
