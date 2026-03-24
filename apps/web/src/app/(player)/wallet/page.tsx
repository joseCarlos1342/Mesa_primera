import { getWalletData } from '@/app/actions/wallet'
import { WalletContent } from '@/components/wallet/WalletContent'

export default async function WalletPage() {
  const { wallet, transactions, error } = await getWalletData()

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-brand-red/10 border border-brand-red/20 p-8 rounded-[2rem] text-brand-red shadow-xl">
          <p className="font-black uppercase tracking-widest text-xs">Error de Conexión</p>
          <p className="mt-2 opacity-80">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full py-12 px-6 max-w-lg mx-auto">
      <WalletContent wallet={wallet} transactions={transactions || []} />
    </div>
  )
}
