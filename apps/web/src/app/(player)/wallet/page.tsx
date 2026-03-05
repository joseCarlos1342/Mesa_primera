import { getWalletData } from '@/app/actions/wallet'
import Link from 'next/link'

export default async function WalletPage() {
  const { wallet, transactions, error } = await getWalletData()

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mi Billetera</h1>
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>

        {/* Balance Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2rem] shadow-2xl shadow-indigo-600/20">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 blur-2xl rounded-full" />
          <div className="relative space-y-1">
            <p className="text-indigo-100/70 text-sm font-medium uppercase tracking-wider">Saldo Disponible</p>
            <h2 className="text-5xl font-black tabular-nums">
              ${wallet?.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          
          <div className="mt-8 flex gap-3">
            <Link 
              href="/wallet/deposit"
              className="flex-1 bg-white text-indigo-700 h-12 flex items-center justify-center rounded-2xl font-bold text-sm active:scale-[0.98] transition-all"
            >
              Cargar Fichas
            </Link>
            <Link 
              href="/wallet/withdraw"
              className="flex-1 bg-white/10 backdrop-blur-md text-white h-12 flex items-center justify-center rounded-2xl font-bold text-sm active:scale-[0.98] transition-all border border-white/20"
            >
              Retirar
            </Link>
          </div>
        </div>

        {/* Ledger / History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-slate-300">Historial (Ledger)</h3>
            <button className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Ver Todo</button>
          </div>

          <div className="space-y-3">
            {transactions?.length === 0 ? (
              <div className="text-center py-12 text-slate-600 italic text-sm">
                No hay movimientos registrados
              </div>
            ) : (
              transactions?.map((tx: any) => (
                <div key={tx.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {tx.type === 'deposit' ? '↓' : tx.type === 'win' ? '★' : '↑'}
                    </div>
                    <div>
                      <p className="font-bold text-sm capitalize">{tx.type} <span className="text-slate-500 font-normal">#{tx.id.slice(0,4)}</span></p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                        {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] px-1 rounded ${
                      tx.status === 'completed' ? 'text-emerald-500' : tx.status === 'pending' ? 'text-amber-500' : 'text-slate-500'
                    }`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
