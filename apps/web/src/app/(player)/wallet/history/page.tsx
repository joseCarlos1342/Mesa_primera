import Link from 'next/link'
import { getWalletHistory } from '@/app/actions/wallet'
import { HistoryList } from './HistoryList'
import { ArrowLeft } from 'lucide-react'

export default async function WalletHistoryPage() {
  const { transactions, error } = await getWalletHistory()

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
    <div className="min-h-full py-12 px-6 max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/wallet"
          className="w-10 h-10 bg-black/40 border border-brand-gold/10 rounded-xl flex items-center justify-center hover:bg-brand-gold/10 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-brand-gold" />
        </Link>
        <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight italic">
          Historial Completo
        </h1>
      </div>

      <HistoryList transactions={transactions || []} />
    </div>
  )
}
