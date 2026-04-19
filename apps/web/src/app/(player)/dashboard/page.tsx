import { PlayerDashboard } from "@/components/dashboard/PlayerDashboard";
import { getWalletData } from "@/app/actions/wallet";

export default async function PlayerPage() {
  const walletData = await getWalletData();

  return (
    <div className="min-h-full py-12 px-6 max-w-lg mx-auto">
      <PlayerDashboard initialData={'error' in walletData ? null : walletData} />
    </div>
  );
}
