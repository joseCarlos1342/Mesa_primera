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
      <motion.section 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 rounded-[2rem] shadow-2xl border border-white/20"
      >
        <div className="relative z-10 flex flex-col items-center text-center space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 opacity-80">Saldo Disponible</span>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl md:text-8xl font-black italic text-white drop-shadow-xl">
              ${(balance / 100).toLocaleString()}
            </span>
            <span className="text-xl font-bold text-indigo-300 uppercase">Bits</span>
          </div>
          <div className="flex gap-4 mt-6 w-full max-w-sm">
            <Link href="/wallet" className="flex-1">
              <button className="w-full h-16 bg-white text-indigo-700 font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                <Wallet className="w-5 h-5" />
                Cargar
              </button>
            </Link>
            <Link href="/lobby" className="flex-1">
              <button className="w-full h-16 bg-emerald-500 text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 border-b-4 border-emerald-700">
                <Play className="w-5 h-5 fill-current" />
                Jugar
              </button>
            </Link>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl" />
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
                    <p className="text-[10px] text-slate-500 uppercase font-medium">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-mono font-black ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {tx.type === 'deposit' ? '+' : '-'}${tx.amount}
                </span>
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
