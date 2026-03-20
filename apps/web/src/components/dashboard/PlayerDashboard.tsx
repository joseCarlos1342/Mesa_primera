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
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Premium Balance Card - Main Visual Hook */}
      <motion.section 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden bg-black/40 border-2 border-brand-gold/30 p-8 md:p-12 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.6)] group"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_transparent_100%)] opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="flex items-center gap-2 bg-brand-gold/10 backdrop-blur-md px-5 py-2 rounded-full border border-brand-gold/20 shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-gold">Membresía Elite • Gold</span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-text-secondary mb-2">Saldo Disponible</span>
            <div className="flex items-baseline gap-2 md:gap-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
              <span className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-black italic bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic tracking-tight">
                ${(balance / 100).toLocaleString()}
              </span>
              <span className="text-lg md:text-2xl font-black text-brand-gold/60 uppercase tracking-widest">COP</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 mt-10 w-full max-w-lg">
            <Link href="/wallet" className="flex-1">
              <button className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 shadow-[0_10px_0_#8b6b2e,0_20px_30px_rgba(0,0,0,0.5)] hover:translate-y-[2px] hover:shadow-[0_8px_0_#8b6b2e,0_15px_25px_rgba(0,0,0,0.5)] active:translate-y-[8px] active:shadow-none flex items-center justify-center gap-3 overflow-hidden">
                <Wallet className="w-5 h-5" />
                <span>Cargar Saldo</span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
              </button>
            </Link>
            <Link href="/lobby" className="flex-1">
              <button className="group relative w-full h-20 bg-black/60 backdrop-blur-xl text-text-premium border-2 border-brand-gold/40 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-brand-gold hover:text-black transition-all duration-500 flex items-center justify-center gap-3 overflow-hidden active:scale-95">
                <Play className="w-5 h-5 fill-current" />
                <span>Ir al Lobby</span>
                <div className="absolute inset-0 bg-brand-gold/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
              </button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-6">
        <QuickActionCard 
          icon={TrendingUp} 
          label="Estadísticas" 
          href="/stats" 
          color="bg-black/40 border-brand-gold/20" 
        />
        <QuickActionCard 
          icon={Users} 
          label="Amigos" 
          href="/friends" 
          color="bg-black/40 border-brand-gold/20" 
        />
      </div>

      {/* Recent Activity Section */}
      <section className="space-y-6 pt-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-gold">Historial de Bóveda</h3>
          <Link href="/wallet" className="text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-brand-gold transition-colors">Ver todo →</Link>
        </div>
        
        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-black/20 rounded-3xl animate-pulse border border-white/5" />)
          ) : data?.transactions?.length > 0 ? (
            data.transactions.slice(0, 3).map((tx: any) => (
              <div key={tx.id} className="group bg-black/30 border-2 border-white/5 hover:border-brand-gold/20 p-5 rounded-[2rem] flex items-center justify-between transition-all duration-300 hover:bg-black/50">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl ${tx.type === 'deposit' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-brand-red/10 text-brand-red'} border-2 border-current/20`}>
                    <ArrowUpRight className={`w-6 h-6 ${tx.type === 'deposit' ? 'rotate-0' : 'rotate-90'}`} />
                  </div>
                  <div>
                    <p className="text-base font-black uppercase italic tracking-wider text-text-premium group-hover:text-brand-gold transition-colors">{tx.type === 'deposit' ? 'Depósito' : 'Retiro'}</p>
                    <p className="text-[11px] text-text-secondary uppercase font-bold tracking-widest mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-lg font-mono font-black ${tx.type === 'deposit' ? 'text-brand-gold' : 'text-text-premium'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}${(Math.abs(tx.amount_cents || 0) / 100).toLocaleString()}
                  </span>
                  {tx.status !== 'completed' && (
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-2 ${
                      tx.status === 'pending' ? 'bg-brand-gold/5 text-brand-gold border-brand-gold/20' : 'bg-brand-red/5 text-brand-red border-brand-red/20'
                    }`}>
                      {tx.status === 'pending' ? 'Procesando' : 'Fallido'}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center bg-black/20 rounded-[2.5rem] border-2 border-dashed border-white/5">
              <p className="text-text-secondary text-xs font-black uppercase tracking-[0.3em]">Bóveda Vacía</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function QuickActionCard({ icon: Icon, label, href, color }: any) {
  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ y: -8, shadow: "0 20px 40px rgba(0,0,0,0.4)" }}
        whileTap={{ scale: 0.95 }}
        className={`${color} border-2 p-8 rounded-[2.5rem] flex flex-col items-center gap-5 shadow-2xl transition-all hover:bg-brand-gold/5 group`}
      >
        <div className="p-5 rounded-2xl bg-brand-gold/10 border-2 border-brand-gold/10 group-hover:border-brand-gold transition-all duration-500 shadow-inner">
          <Icon className="w-8 h-8 text-brand-gold drop-shadow-[0_0_8px_rgba(202,171,114,0.4)]" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-text-secondary group-hover:text-text-premium transition-colors">{label}</span>
      </motion.div>
    </Link>
  )
}
