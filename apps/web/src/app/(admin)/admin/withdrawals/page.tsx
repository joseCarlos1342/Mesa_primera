import { getPendingWithdrawals } from '@/app/actions/withdrawals'
import { processTransaction } from '@/app/actions/admin-wallet'
import { formatCurrency } from '@/utils/format'
import { ArrowLeft, User, CheckCircle2, XCircle, Clock, Wallet, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function AdminWithdrawalsPage() {
  const result = await getPendingWithdrawals()

  if (result.error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-red-500 flex items-center gap-4 max-w-md">
          <AlertCircle className="w-8 h-8 shrink-0" />
          <p className="font-bold">Error al cargar retiros: {result.error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <header className="relative overflow-hidden bg-slate-900/40 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white drop-shadow-md">
              RETIROS <span className="text-indigo-400">PENDIENTES</span>
            </h1>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-slate-400 text-xs md:text-sm uppercase tracking-[0.3em] font-black">
                Validación y gestión de egresos
              </p>
            </div>
          </div>
          <Link 
            href="/admin" 
            className="group flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">Panel de Control</span>
          </Link>
        </div>
      </header>

      {/* Requests List */}
      <div className="space-y-6">
        {result.withdrawals?.length === 0 ? (
          <div className="bg-slate-900/20 border-2 border-dashed border-white/10 rounded-[3rem] p-20 md:p-32 text-center space-y-6 backdrop-blur-sm">
            <div className="w-20 h-20 bg-slate-900/80 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-slate-700" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 font-black italic text-2xl tracking-tight">Sin solicitudes pendientes</p>
              <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] max-w-xs mx-auto leading-loose">
                Todas las transacciones han sido procesadas exitosamente
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {result.withdrawals?.map((wit: any) => (
              <div 
                key={wit.id} 
                className="group relative overflow-hidden bg-slate-900/30 backdrop-blur-xl border border-white/5 p-6 md:p-10 rounded-[2.5rem] flex flex-col xl:flex-row xl:items-center justify-between gap-10 hover:border-white/20 hover:bg-slate-900/50 transition-all duration-500 shadow-2xl"
              >
                {/* User Info Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 flex-1">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-violet-500/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                      <User className="w-10 h-10 text-indigo-400" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-5 h-5 rounded-full border-4 border-[#0F172A] shadow-lg" />
                  </div>
                  
                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div>
                      <h3 className="font-black text-3xl text-white tracking-tighter">@{wit.userName}</h3>
                      <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                            {new Date(wit.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono bg-white/5 px-2 py-1 rounded-lg border border-white/5 hidden sm:block">
                          ID: {wit.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    {wit.bank_info && (
                      <div className="p-4 bg-black/40 rounded-2xl border border-white/5 group-hover:bg-black/60 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                          <p className="text-[9px] text-indigo-300 font-black uppercase tracking-[0.2em]">Destino de Transferencia</p>
                        </div>
                        <p className="text-sm text-slate-200 font-medium leading-relaxed font-mono break-all">{wit.bank_info}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amounts and Actions */}
                <div className="flex flex-col md:flex-row items-center gap-8 xl:gap-16 border-t xl:border-t-0 xl:border-l border-white/5 pt-8 xl:pt-0 xl:pl-16">
                  {/* Balance Verification */}
                  <div className="grid grid-cols-2 lg:flex lg:flex-row gap-8 lg:gap-12 w-full lg:w-auto">
                    <div className="space-y-2 text-center xl:text-left">
                      <div className="flex items-center justify-center xl:justify-start gap-2 text-slate-500 mb-1">
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase font-black tracking-widest">Saldo Actual</span>
                      </div>
                      <p className="text-2xl md:text-3xl font-black text-slate-300 tabular-nums tracking-tighter">
                        {formatCurrency(wit.userBalance)}
                      </p>
                    </div>

                    <div className="space-y-2 text-center xl:text-left">
                      <div className="flex items-center justify-center xl:justify-start gap-2 text-rose-500/60 mb-1">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase font-black tracking-widest">Monto Retiro</span>
                      </div>
                      <p className="text-3xl md:text-4xl font-black text-rose-500 tabular-nums italic tracking-tighter drop-shadow-lg scale-105 lg:scale-100">
                        {formatCurrency(wit.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <form className="w-full sm:w-auto" action={async () => {
                      'use server'
                      await processTransaction(wit.id, 'completed')
                    }}>
                      <button 
                        type="submit" 
                        className="w-full sm:w-48 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 group/btn"
                      >
                        <CheckCircle2 className="w-5 h-5 group-hover/btn:animate-bounce" />
                        <span className="drop-shadow-sm">Procesar</span>
                      </button>
                    </form>
                    
                    <form className="w-full sm:w-auto" action={async () => {
                      'use server'
                      await processTransaction(wit.id, 'failed')
                    }}>
                      <button 
                        type="submit" 
                        className="w-full sm:w-48 h-16 bg-slate-950 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 group/btn2"
                      >
                        <XCircle className="w-5 h-5 group-hover/btn2:animate-pulse" />
                        Anular
                      </button>
                    </form>
                  </div>
                </div>

                {/* Background Decor */}
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ArrowUpRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  )
}

function Landmark(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="6" y1="18" x2="6" y2="11" />
      <line x1="10" y1="18" x2="10" y2="11" />
      <line x1="14" y1="18" x2="14" y2="11" />
      <line x1="18" y1="18" x2="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </svg>
  )
}

