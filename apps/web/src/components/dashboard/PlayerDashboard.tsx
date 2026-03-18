'use client'

import { motion } from 'framer-motion'
import { Wallet, Play, History, Users, ArrowUpRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getWalletData } from '@/app/actions/wallet'

export function PlayerDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWalletData().then(res => {
      setData(res)
      setLoading(false)
    })
  }, [])

  const balance = data?.wallet?.balance_cents || 0

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Saldo Principal - Gigante para accesibilidad */}
      {/* Premium Balance Card */}
      <motion.section 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/20"
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', borderImage: 'none', backgroundSize: '32px 32px' }}></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100/80">Cuenta Verificada • Gold</span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-white/60 mb-1">Saldo Disponible</span>
            <div className="flex items-baseline gap-2 md:gap-3">
              <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)] tracking-tighter">
                ${(balance / 100).toLocaleString()}
              </span>
              <span className="text-base md:text-xl font-bold text-indigo-200 uppercase tracking-widest opacity-80">COP</span>
            </div>
          </div>

          <div className="flex gap-4 mt-8 w-full max-w-md">
            <Link href="/wallet" className="flex-1">
              <button className="w-full h-16 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                <Wallet className="w-5 h-5" />
                Cargar Saldo
              </button>
            </Link>
            <Link href="/lobby" className="flex-1">
              <button className="w-full h-16 bg-indigo-500/20 backdrop-blur-xl text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-white/20 shadow-xl hover:bg-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                <Play className="w-5 h-5 fill-current" />
                Ir al Lobby
              </button>
            </Link>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl opacity-50" />
      </motion.section>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-2 gap-4">
        <QuickActionCard 
          icon={TrendingUp} 
          label="Estadísticas" 
          href="/stats" 
          color="bg-slate-900 border-slate-800" 
          iconColor="text-blue-400"
        />
        <QuickActionCard 
          icon={Users} 
          label="Amigos" 
          href="/friends" 
          color="bg-slate-900 border-slate-800" 
          iconColor="text-emerald-400"
        />
      </div>

      {/* Historial Reciente */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Actividad Reciente</h3>
          <Link href="/wallet" className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Ver todo</Link>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-900/50 rounded-2xl animate-pulse" />)
          ) : data?.transactions?.length > 0 ? (
            data.transactions.slice(0, 3).map((tx: any) => (
              <div key={tx.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${tx.type === 'deposit' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    <ArrowUpRight className={`w-5 h-5 ${tx.type === 'deposit' ? 'text-emerald-400 rotate-0' : 'text-red-400 rotate-90'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white capitalize">{tx.type}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`font-mono font-black ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}${(Math.abs(tx.amount_cents || 0) / 100).toLocaleString()}
                  </span>
                  {tx.status !== 'completed' && (
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                      tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {tx.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
              <p className="text-slate-600 text-xs font-medium uppercase tracking-widest">Sin actividad reciente</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function QuickActionCard({ icon: Icon, label, href, color, iconColor }: any) {
  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.95 }}
        className={`${color} border p-6 rounded-3xl flex flex-col items-center gap-3 shadow-lg transition-all`}
      >
        <div className={`p-3 rounded-2xl ${iconColor} bg-white/5`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{label}</span>
      </motion.div>
    </Link>
  )
}
