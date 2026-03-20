'use client';

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, ArrowUpWideNarrow, Landmark, Wallet, Plus, ArrowUpRight, TrendingUp } from 'lucide-react'
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
    <div className="space-y-8 max-w-lg mx-auto pb-20">
      {/* Premium Balance Card */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden bg-[#0a2a1f] p-8 md:p-10 rounded-[2.5rem] border-2 border-brand-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 hover:border-brand-gold/60"
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
              <button className="group relative w-full h-16 bg-black/60 backdrop-blur-xl text-text-premium border-2 border-brand-gold/40 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-brand-gold hover:text-black transition-all duration-500 flex items-center justify-center gap-3 overflow-hidden active:scale-95">
                <ArrowUpWideNarrow className="w-5 h-5" />
                <span>Retirar Fondos</span>
                <div className="absolute inset-0 bg-brand-gold/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
              </button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Chip Packs Grid */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-brand-gold/10 rounded-xl flex items-center justify-center border border-brand-gold/20">
            <ShoppingCart className="w-5 h-5 text-brand-gold" />
          </div>
          <h3 className="text-xl font-display font-black text-text-premium uppercase tracking-tight italic">Cargar Fichas</h3>
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
                className={`relative p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center gap-2 group active:scale-95 overflow-hidden ${
                  pack.popular 
                    ? 'bg-brand-gold/10 border-brand-gold/60 shadow-[0_10px_30px_rgba(202,171,114,0.1)]' 
                    : 'bg-black/40 border-white/5 hover:border-brand-gold/30 hover:bg-black/60 shadow-xl'
                }`}
              >
                {pack.popular && (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 to-transparent pointer-events-none" />
                )}
                
                {pack.popular && (
                  <span className="absolute top-0 right-0 bg-brand-gold text-black text-[8px] font-black uppercase py-1 px-3 rounded-bl-xl tracking-widest shadow-lg">Popular</span>
                )}

                <div className={`p-4 rounded-full transition-transform duration-500 group-hover:scale-110 shadow-inner ${pack.popular ? 'bg-brand-gold/20' : 'bg-white/5'}`}>
                  <Landmark className={`w-6 h-6 ${pack.popular ? 'text-brand-gold' : 'text-text-secondary'}`} />
                </div>
                
                <div className="space-y-0.5">
                  <span className="block text-lg font-display font-black text-text-premium leading-tight">${pack.label}</span>
                  <span className="block text-[8px] font-black text-brand-gold opacity-60 uppercase tracking-widest leading-none">Pagas {pack.price}</span>
                </div>
                
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-brand-gold/10 rounded-full blur-xl group-hover:bg-brand-gold/20 transition-all opacity-0 group-hover:opacity-100" />
              </Link>
            </motion.div>
          ))}
        </div>
        
        <Link href="/wallet/deposit" className="group block text-center p-6 bg-black/30 border-2 border-dashed border-white/10 rounded-[2rem] transition-all hover:border-brand-gold/30 hover:bg-black/50">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary group-hover:text-brand-gold transition-colors">O ingresar otro monto manualmente</span>
        </Link>
      </section>

      {/* Activity History */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
              <ArrowUpWideNarrow className="w-5 h-5 text-text-secondary" />
            </div>
            <h3 className="text-xl font-display font-black text-text-premium uppercase tracking-tight italic">Actividad</h3>
          </div>
          <button className="text-[10px] font-black uppercase tracking-widest text-brand-gold hover:underline">Ver Todo</button>
        </div>

        <div className="space-y-3">
          {transactions?.length === 0 ? (
            <div className="text-center py-16 bg-black/40 border-2 border-dashed border-white/10 rounded-[2.5rem]">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                <Landmark className="w-6 h-6 text-text-secondary opacity-40" />
              </div>
              <p className="text-text-secondary text-[10px] font-black uppercase tracking-[.3em] opacity-60">Sin movimientos</p>
            </div>
          ) : (
            transactions?.map((tx: any, idx: number) => (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleTxClick(tx)}
                className="group bg-black/40 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] flex items-center justify-between gap-4 transition-all hover:bg-black/60 hover:border-brand-gold/30 shadow-lg overflow-hidden cursor-pointer active:scale-[0.98]"
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
                  <p className={`font-display font-black text-lg md:text-xl italic tracking-tighter ${tx.type === 'deposit' ? 'text-brand-gold' : 'text-text-premium'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}${Math.abs((tx.amount_cents || 0) / 100).toLocaleString()}
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
