'use client';

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpWideNarrow, Landmark, Plus, ArrowUpRight, TrendingUp, Gamepad2, Play } from 'lucide-react'
import { useState } from 'react'
import { TransactionModal } from './TransactionModal'

interface WalletContentProps {
  wallet: any;
  transactions: any[];
}

export function WalletContent({ wallet, transactions }: WalletContentProps) {
  const [selectedTx, setSelectedTx] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleTxClick = (tx: any) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }
  const CHIP_PACKS = [
    { amount: 50000, label: '50.000', price: '$50.000', popular: false },
    { amount: 100000, label: '100.000', price: '$100.000', popular: true },
    { amount: 200000, label: '200.000', price: '$200.000', popular: false },
    { amount: 500000, label: '500.000', price: '$500.000', popular: false },
  ]

  const balance = wallet?.balance_cents || 0

  return (
    <div className="space-y-10">
      {/* Premium Balance Card */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden bg-[#0a2a1f] p-8 md:p-12 rounded-[2.5rem] border-2 border-brand-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 hover:border-brand-gold/60"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_transparent_100%)] opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="flex flex-col items-center w-full">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-text-secondary mb-1 opacity-60">Saldo en Cartera</span>
            <h2 className="text-5xl md:text-7xl font-display font-black text-brand-gold italic tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] leading-none select-none pr-4">
              ${(balance / 100).toLocaleString()}
            </h2>
          </div>

          <div className="w-full pt-4">
            <Link href="/wallet/withdraw" className="block w-full">
              <button className="group relative w-full h-16 bg-brand-gold rounded-2xl transition-all duration-200 shadow-[inset_0_-8px_0_#8b6b2e,0_15px_30px_rgba(0,0,0,0.4)] hover:shadow-[inset_0_-6px_0_#8b6b2e,0_10px_20px_rgba(0,0,0,0.4)] active:translate-y-1 active:shadow-[inset_0_-2px_0_#8b6b2e,0_4px_8px_rgba(0,0,0,0.2)] overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-3 text-black font-black uppercase tracking-[0.2em] text-xs">
                  <ArrowUpWideNarrow className="w-5 h-5" />
                  <span>Retirar Saldo</span>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>
              </button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Chip Packs Grid */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-brand-gold/10 rounded-xl flex items-center justify-center border border-brand-gold/20 shadow-inner">
            <Plus className="w-5 h-5 text-brand-gold" />
          </div>
          <h3 className="text-xl font-display font-black text-text-premium uppercase tracking-tight italic">Carga Saldo</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {CHIP_PACKS.map((pack, idx) => (
            <motion.div
              key={pack.amount}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link 
                href={`/wallet/deposit?amount=${pack.amount}`}
                className={`group relative p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center gap-2 active:scale-95 overflow-hidden ${
                  pack.popular 
                    ? 'bg-[#0a2a1f] border-brand-gold/60 shadow-[0_10px_40px_rgba(0,0,0,0.5)]' 
                    : 'bg-black/40 border-brand-gold/10 hover:border-brand-gold/30 hover:bg-black/60 shadow-xl'
                }`}
              >
                {pack.popular && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--color-brand-gold)_0%,_transparent_70%)] opacity-10 pointer-events-none" />
                )}
                
                {pack.popular && (
                  <div className="absolute top-0 right-0 z-20">
                    <span className="bg-brand-gold text-black text-[9px] font-black uppercase py-1.5 px-4 rounded-bl-2xl tracking-[0.2em] shadow-xl border-b border-l border-white/20">
                      Popular
                    </span>
                  </div>
                )}

                <div className={`p-4 rounded-full transition-transform duration-500 group-hover:scale-110 shadow-inner ${pack.popular ? 'bg-brand-gold/20' : 'bg-brand-gold/5'}`}>
                  <Landmark className={`w-6 h-6 ${pack.popular ? 'text-brand-gold' : 'text-brand-gold/60'}`} />
                </div>
                
                <div className="space-y-0.5">
                  <span className="block text-lg font-display font-black text-white leading-tight">${pack.label}</span>
                  <span className="block text-[8px] font-black text-brand-gold opacity-60 uppercase tracking-widest leading-none">Pagas {pack.price}</span>
                </div>
                
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-brand-gold/10 rounded-full blur-xl group-hover:bg-brand-gold/20 transition-all opacity-0 group-hover:opacity-100" />
              </Link>
            </motion.div>
          ))}
        </div>
        
        <Link href="/wallet/deposit" className="group block text-center p-6 bg-black/30 border-2 border-dashed border-brand-gold/20 rounded-[2rem] transition-all hover:border-brand-gold/40 hover:bg-black/50">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary group-hover:text-brand-gold transition-colors">Otro Monto Manual</span>
        </Link>
      </section>

      {/* Activity History */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold/5 rounded-xl flex items-center justify-center border border-brand-gold/10 shadow-inner">
              <ArrowUpWideNarrow className="w-5 h-5 text-brand-gold/60" />
            </div>
            <h3 className="text-xl font-display font-black text-white uppercase tracking-tight italic">Actividad</h3>
          </div>
          <Link href="/wallet/history" className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold hover:text-brand-gold-light transition-colors flex items-center gap-2 group/btn">
            Ver Todo
            <ArrowUpRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
          </Link>
        </div>

        <div className="space-y-3">
          {transactions?.length === 0 ? (
            <div className="text-center py-16 bg-black/40 border-2 border-dashed border-brand-gold/10 rounded-[2.5rem]">
              <div className="w-12 h-12 bg-brand-gold/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-gold/10">
                <Landmark className="w-6 h-6 text-brand-gold/20" />
              </div>
              <p className="text-text-secondary text-[10px] font-black uppercase tracking-[.3em] opacity-40">Sin movimientos</p>
            </div>
          ) : (
            transactions?.map((tx: any, idx: number) => (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-black/40 backdrop-blur-xl border border-brand-gold/10 rounded-[2rem] overflow-hidden shadow-lg transition-all hover:bg-black/60 hover:border-brand-gold/30"
              >
                <div 
                  onClick={() => handleTxClick(tx)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer active:scale-[0.98]"
                >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-inner ${
                    tx.type === 'deposit' 
                      ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'
                      : tx.type === 'win'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : tx.type === 'rake'
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : tx.type === 'bet'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-white/5 text-text-secondary border border-brand-gold/10'
                  }`}>
                    {tx.type === 'deposit' ? <Plus className="w-5 h-5" /> :
                     tx.type === 'win' ? <TrendingUp className="w-5 h-5" /> :
                     tx.type === 'bet' || tx.type === 'rake' ? <Gamepad2 className="w-5 h-5" /> :
                     <ArrowUpWideNarrow className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-black text-sm md:text-base italic uppercase tracking-tight text-text-premium truncate group-hover:text-brand-gold transition-all [word-spacing:0.2em]">
                      {tx.type === 'deposit' ? 'Depósito' :
                       tx.type === 'withdrawal' ? 'Retiro' :
                       tx.type === 'win' ? 'Ganancia' :
                       tx.type === 'bet' ? 'Apuesta' :
                       tx.type === 'rake' ? 'Comisión' :
                       tx.type === 'refund' ? 'Reembolso' :
                       tx.type}
                    </p>
                    <p className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] opacity-60 truncate">
                      {new Date(tx.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} • {new Date(tx.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right space-y-1">
                  <p className={`font-display font-black text-lg md:text-xl italic tracking-tighter ${
                    tx.type === 'deposit' || tx.type === 'win' || tx.type === 'refund'
                      ? 'text-brand-gold' : 'text-text-premium'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'refund' ? '+' : '-'}${Math.abs((tx.amount_cents || 0) / 100).toLocaleString()}
                  </p>
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

                {/* Replay Link for game-related transactions */}
                {tx.game_id && (tx.type === 'win' || tx.type === 'bet' || tx.type === 'rake') && (
                  <Link
                    href={`/replays/${tx.game_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-2 px-5 py-3 border-t border-brand-gold/10 bg-brand-gold/5 hover:bg-brand-gold/10 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-brand-gold" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">
                      Ver Repetición
                    </span>
                  </Link>
                )}
              </motion.div>
            ))
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
