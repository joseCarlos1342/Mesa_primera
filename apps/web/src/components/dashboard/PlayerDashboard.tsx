'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Play, Users, TrendingUp, ShoppingCart, ArrowUpWideNarrow } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getWalletData } from '@/app/actions/wallet'
import { TransactionModal } from '../wallet/TransactionModal'

export function PlayerDashboard() {
  const [data, setData] = useState<any>(null)
  const [selectedTx, setSelectedTx] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleTxClick = (tx: any) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }
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
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-4 w-full">
          <div className="flex flex-col items-center w-full px-2">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-text-secondary mb-1 opacity-60">Saldo Disponible</span>
            <div className="flex items-baseline justify-center gap-2 md:gap-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] w-full">
              <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black italic bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent tracking-tight whitespace-nowrap pr-4">
                ${(balance / 100).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 mt-4 w-full max-w-lg px-2">
            <Link href="/wallet" className="flex-1 min-w-0">
              <button className="group relative w-full h-20 bg-brand-gold text-black font-black uppercase tracking-widest text-[11px] sm:text-xs rounded-2xl transition-all duration-300 shadow-[0_4px_0_rgba(139,107,46,1),0_15px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_2px_0_rgba(139,107,46,1),0_10px_20px_rgba(0,0,0,0.4)] active:scale-95 active:shadow-none flex items-center justify-center gap-3 overflow-hidden">
                <Wallet className="w-5 h-5 shrink-0" />
                <span className="truncate">Cargar Saldo</span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
              </button>
            </Link>
            <Link href="/lobby" className="flex-1 min-w-0">
              <button className="group relative w-full h-20 bg-black/60 backdrop-blur-xl text-brand-gold border-2 border-brand-gold/40 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-[0.2em] shadow-[0_4px_0_rgba(202,171,114,0.1),0_15px_30px_rgba(0,0,0,0.4)] hover:bg-brand-gold/10 transition-all duration-500 flex items-center justify-center gap-3 overflow-hidden active:scale-95">
                <Play className="w-5 h-5 shrink-0 fill-current" />
                <span className="truncate">Ir al Lobby</span>
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
              <div 
                key={tx.id} 
                onClick={() => handleTxClick(tx)}
                className="group bg-black/30 border-2 border-white/5 hover:border-brand-gold/20 p-4 md:p-5 rounded-[2rem] flex items-center justify-between gap-4 transition-all duration-300 hover:bg-black/50 overflow-hidden cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-inner ${
                    tx.type === 'deposit' 
                      ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20' 
                      : 'bg-white/5 text-text-secondary border border-white/10'
                  }`}>
                    {tx.type === 'deposit' ? <ShoppingCart className="w-5 h-5" /> : <ArrowUpWideNarrow className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-black text-sm md:text-base italic uppercase tracking-tight text-text-premium truncate group-hover:text-brand-gold transition-all">
                      {tx.type === 'deposit' ? 'Depósito' : 'Retiro'}
                    </p>
                    <p className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] opacity-60 truncate">
                      {new Date(tx.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} • {new Date(tx.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                <div className="shrink-0 text-right space-y-1">
                  <span className={`block text-lg md:text-xl font-display font-black italic tracking-tighter ${tx.type === 'deposit' ? 'text-brand-gold' : 'text-text-premium'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}${(Math.abs(tx.amount_cents || 0) / 100).toLocaleString()}
                  </span>
                  <div className="flex justify-end">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-[0.2em] ${
                      tx.status === 'completed' ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/30' :
                      tx.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                      'bg-brand-red/10 text-brand-red border-brand-red/30'
                    }`}>
                      {tx.status === 'completed' ? 'Éxito' : tx.status === 'pending' ? 'Procesando' : 'Fallido'}
                    </span>
                  </div>
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

      <TransactionModal 
        transaction={selectedTx}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

function QuickActionCard({ icon: Icon, label, href, color }: any) {
  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
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
