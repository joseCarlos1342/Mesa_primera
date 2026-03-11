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
          <h1 className="text-4xl md:text-5xl font-black">Mi Billetera</h1>
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>

        {/* Balance Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-8 md:p-12 rounded-[2rem] shadow-2xl shadow-indigo-600/20">
          <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 blur-3xl rounded-full" />
          <div className="relative space-y-2">
            <p className="text-indigo-100/80 text-lg md:text-xl font-bold uppercase tracking-widest">Saldo Disponible</p>
            <h2 className="text-6xl md:text-7xl font-black tabular-nums tracking-tighter">
              ${wallet?.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          
          <div className="mt-10 flex flex-col md:flex-row gap-4">
            <Link 
              href="/wallet/deposit"
              className="flex-1 bg-white text-indigo-700 h-16 flex items-center justify-center rounded-2xl font-black text-lg md:text-xl active:scale-[0.98] transition-all shadow-lg hover:bg-slate-100"
            >
              Cargar Fichas
            </Link>
            <Link 
              href="/wallet/withdraw"
              className="flex-1 bg-white/10 backdrop-blur-md text-white h-16 flex items-center justify-center rounded-2xl font-black text-lg md:text-xl active:scale-[0.98] transition-all border-2 border-white/20 hover:bg-white/20"
            >
              Retirar
            </Link>
          </div>
        </div>

        {/* Ledger / History */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-2xl text-slate-200">Historial (Ledger)</h3>
            <button className="text-sm md:text-base text-indigo-400 font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors">Ver Todo</button>
          </div>

          <div className="space-y-4">
            {transactions?.length === 0 ? (
              <div className="text-center py-16 text-slate-500 italic text-xl">
                No hay movimientos registrados
              </div>
            ) : (
              transactions?.map((tx: any) => (
                <div key={tx.id} className="bg-slate-900/50 border-2 border-slate-800/50 p-6 rounded-3xl flex items-center justify-between group hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-5 md:gap-6">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl md:text-4xl shadow-md ${
                      tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {tx.type === 'deposit' ? '↓' : tx.type === 'win' ? '★' : '↑'}
                    </div>
                    <div>
                      <p className="font-black text-lg md:text-xl capitalize text-slate-200">{tx.type} <span className="text-slate-500 font-bold text-base">#{tx.id.slice(0,4)}</span></p>
                      <p className="text-sm md:text-base font-medium text-slate-400 uppercase tracking-wide mt-1">
                        {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-2xl md:text-3xl tracking-tighter ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <p className={`text-xs md:text-sm font-bold uppercase tracking-[0.2em] px-2 py-1 rounded bg-black/20 mt-1 inline-block ${
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
