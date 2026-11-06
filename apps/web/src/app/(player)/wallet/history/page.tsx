import { getWalletHistory } from '@/app/actions/wallet'
import { AuthAlert } from '@/components/auth/AuthForm'
import { PageHeader } from '@/components/player/PlayerUI'
import { HistoryList } from './HistoryList'

export default async function WalletHistoryPage() {
  const { transactions, error } = await getWalletHistory()

  return (
    <div className="max-w-3xl">
      <PageHeader back={{ href: '/wallet', label: 'Billetera' }} title="Historial" lead="Toca un movimiento para ver el detalle." />
      {error ? (
        <AuthAlert>
          <p className="font-semibold">No pudimos cargar tu historial.</p>
          <p className="mt-1">{error}</p>
        </AuthAlert>
      ) : (
        <HistoryList transactions={transactions || []} />
      )}
    </div>
  )
}
