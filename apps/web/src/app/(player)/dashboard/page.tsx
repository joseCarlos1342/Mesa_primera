import { PlayerDashboard } from "@/components/dashboard/PlayerDashboard";
import { getWalletData } from "@/app/actions/wallet";
import { getMyStats } from "@/app/actions/stats";

export default async function PlayerPage() {
  const [walletData, stats] = await Promise.all([getWalletData(), getMyStats().catch(() => null)]);

  return <PlayerDashboard initialData={'error' in walletData ? null : walletData} stats={stats} />;
}
