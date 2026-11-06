import { getWalletData } from '@/app/actions/wallet'
import { WalletContent } from '@/components/wallet/WalletContent'
import { AuthAlert } from '@/components/auth/AuthForm'
import { PageHeader } from '@/components/player/PlayerUI'

export default async function WalletPage() {
  const { wallet, transactions, error } = await getWalletData()

  if (error) {
    return (
      <div className="max-w-xl">
        <PageHeader title="Billetera" />
        <AuthAlert>
          <p className="font-semibold">No pudimos cargar tu billetera.</p>
          <p className="mt-1">{error}</p>
          <p className="mt-1">Revisa tu conexión y vuelve a abrir esta pantalla.</p>
        </AuthAlert>
      </div>
    )
  }

  return <WalletContent wallet={wallet} transactions={transactions || []} />
}
