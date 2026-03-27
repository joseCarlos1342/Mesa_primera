import { getPendingDeposits, processTransaction } from '@/app/actions/admin-wallet'
import { formatCurrency } from '@/utils/format'
import { ArrowLeft, User, ExternalLink, CheckCircle2, XCircle, MessageSquare, Image as ImageIcon, Wallet, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { DepositActions } from './DepositActions'
export default async function AdminDepositsPage() {
  const result = await getPendingDeposits()
  const supabase = await createClient()

  if (result.error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-red-500 flex items-center gap-4 max-w-md">
          <AlertCircle className="w-8 h-8 shrink-0" />
          <p className="font-bold">Error al cargar depósitos: {result.error}</p>
        </div>
      </div>
    )
  }
  const depositsWithUrls = result.deposits ? await Promise.all(result.deposits.map(async (dep: any) => {
    if (!dep.proof_url) return { ...dep, displayUrl: '' };
    const { data: signedData } = await supabase.storage
      .from('deposits')
      .createSignedUrl(dep.proof_url, 3600);
    return { ...dep, displayUrl: signedData?.signedUrl || '' };
  })) : [];

  return (
    <div className="min-h-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <header className="relative overflow-hidden bg-slate-900/40 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white drop-shadow-md">
              DEPÓSITOS <span className="text-emerald-400">PENDIENTES</span>
            </h1>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-slate-400 text-xs md:text-sm uppercase tracking-[0.3em] font-black">
                Gestión y aprobación de boveda
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
      <div className="space-y-8">
        {!depositsWithUrls || depositsWithUrls.length === 0 ? (
          <div className="bg-slate-900/20 border-2 border-dashed border-white/10 rounded-[3rem] p-20 md:p-32 text-center space-y-6 backdrop-blur-sm">
            <div className="w-20 h-20 bg-slate-900/80 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-slate-700" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 font-black italic text-2xl tracking-tight">Bandeja de entrada limpia</p>
              <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] max-w-xs mx-auto leading-loose">
                No hay solicitudes de depósito pendientes en este momento
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-8">
            {depositsWithUrls.map((dep: any) => (
              <div 
                key={dep.id} 
                className="group relative overflow-hidden bg-slate-900/30 backdrop-blur-xl border border-white/5 p-6 md:p-10 rounded-[2.5rem] flex flex-col gap-10 hover:border-white/20 hover:bg-slate-900/40 transition-all duration-500 shadow-2xl"
              >
                {/* Top Level Info */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                  {/* User Info Section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 flex-1">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                        <User className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-indigo-500 w-5 h-5 rounded-full border-4 border-[#0F172A] shadow-lg" />
                    </div>
                    
                    <div className="flex-1 space-y-4 text-center sm:text-left">
                      <div>
                        <h3 className="font-black text-3xl text-white tracking-tighter">@{dep.userName}</h3>
                        <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                              {new Date(dep.created_at).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono bg-white/5 px-2 py-1 rounded-lg border border-white/5 hidden sm:block">
                            ID: {dep.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
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
                          {formatCurrency(dep.userBalance)}
                        </p>
                      </div>

                      <div className="space-y-2 text-center xl:text-left">
                        <div className="flex items-center justify-center xl:justify-start gap-2 text-emerald-500/60 mb-1">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span className="text-[10px] uppercase font-black tracking-widest">Monto Depósito</span>
                        </div>
                        <p className="text-3xl md:text-4xl font-black text-emerald-500 tabular-nums italic tracking-tighter drop-shadow-lg scale-105 lg:scale-100">
                          {formatCurrency(dep.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <DepositActions depositId={dep.id} />
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid md:grid-cols-2 gap-10 pt-10 border-t border-white/5">
                  {/* Proof Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Comprobante de Pago</span>
                      </div>
                      {dep.proof_url && (
                        <a 
                          href={dep.displayUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver original
                        </a>
                      )}
                    </div>
                    
                    <div className="relative group/image overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 aspect-video md:aspect-auto md:h-64 shadow-inner">
                      {dep.proof_url ? (
                        <>
                          <img 
                            src={dep.displayUrl} 
                            alt="Comprobante" 
                            className="w-full h-full object-cover transition-all duration-700 group-hover/image:scale-110 group-hover/image:rotate-1"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity flex items-end p-6">
                            <p className="text-[10px] text-white font-black uppercase tracking-widest">Click en 'Ver original' para ampliar</p>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-600 grayscale opacity-50">
                          <ImageIcon className="w-12 h-12" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sin comprobante</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Observations Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Observaciones del Jugador</span>
                    </div>
                    <div className="relative h-full min-h-[120px] md:min-h-0 bg-black/40 border border-white/5 p-6 rounded-[2rem] group-hover:bg-black/60 transition-colors shadow-inner overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
                      <div className="relative z-10">
                        {dep.observations ? (
                          <p className="text-slate-200 text-sm font-medium leading-relaxed italic">"{dep.observations}"</p>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sin comentarios adicionales</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowDownLeft(props: any) {
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
      <path d="M17 7 7 17" />
      <path d="M17 17H7V7" />
    </svg>
  )
}

