import { getWalletData } from '@/app/actions/wallet'
import Link from 'next/link'
import { ShoppingCart, ArrowUpWideNarrow, Landmark } from 'lucide-react'

export default async function WalletPage() {
  const { wallet, transactions, error } = await getWalletData()

  const CHIP_PACKS = [
    { amount: 50000, label: '50.000 Bits', price: '$50.000', popular: false },
    { amount: 100000, label: '100.000 Bits', price: '$100.000', popular: true },
    { amount: 200000, label: '200.000 Bits', price: '$200.000', popular: false },
    { amount: 500000, label: '500.000 Bits', price: '$500.000', popular: false },
  ]

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
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 pb-32">
      <div className="max-w-md mx-auto space-y-10">
        
        {/* Balance Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2rem] shadow-2xl border border-white/10">
          <div className="relative z-10 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">Saldo en Cartera</span>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black italic text-white leading-tight">
                ${((wallet?.balance_cents || 0) / 100).toLocaleString()}
              </span>
              <span className="text-xl font-bold text-indigo-300">BT</span>
            </div>
            <div className="flex gap-4 mt-8">
               <Link href="/wallet/withdraw" className="flex-1 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center gap-2 border border-white/20 font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all">
                <ArrowUpWideNarrow className="w-4 h-4" />
                Retirar
               </Link>
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* SHOP SECTION (EL CARRO) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Cargar Fichas (Carro)</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {CHIP_PACKS.map((pack) => (
              <Link 
                key={pack.amount}
                href={`/wallet/deposit?amount=${pack.amount}`}
                className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-2 group active:scale-95 ${
                  pack.popular ? 'bg-indigo-600/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-[8px] font-black uppercase py-1 px-3 rounded-full tracking-widest">Recomendado</span>
                )}
                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
                  <ShoppingCart className={`w-6 h-6 ${pack.popular ? 'text-indigo-400' : 'text-slate-500'}`} />
                </div>
                <span className="text-sm font-black text-white">{pack.label}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pagas {pack.price}</span>
              </Link>
            ))}
          </div>
          
          <Link href="/wallet/deposit" className="block text-center p-6 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300 transition-colors">
            O ingresar otro monto manualmente
          </Link>
        </div>

        {/* HISTORIAL */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-black uppercase tracking-tighter">Actividad</h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Ver Todo</button>
          </div>

          <div className="space-y-3">
            {transactions?.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Sin movimientos</p>
              </div>
            ) : (
              transactions?.map((tx: any) => (
                <div key={tx.id} className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-3xl flex items-center justify-between transition-all hover:bg-slate-900">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-tight text-slate-200">{tx.type}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-black text-lg ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-white'}`}>
                      {tx.type === 'deposit' ? '+' : '-'}${Math.abs(tx.amount || 0).toLocaleString()}
                    </p>
                    <span className="text-[8px] font-black uppercase bg-black/40 px-2 py-0.5 rounded text-slate-500">{tx.status}</span>
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
