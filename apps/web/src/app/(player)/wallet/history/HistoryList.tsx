'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpWideNarrow, Plus, TrendingUp, Gamepad2, Play, Landmark } from 'lucide-react'
import { useState } from 'react'
import { TransactionModal } from '@/components/wallet/TransactionModal'

export function HistoryList({ transactions }: { transactions: any[] }) {
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleTxClick = (tx: any) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 bg-black/40 border-2 border-dashed border-brand-gold/10 rounded-[2.5rem]">
        <div className="w-12 h-12 bg-brand-gold/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-gold/10">
          <Landmark className="w-6 h-6 text-brand-gold/20" />
        </div>
        <p className="text-text-secondary text-[10px] font-black uppercase tracking-[.3em] opacity-40">Sin movimientos</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {transactions.map((tx: any, idx: number) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
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
                    {new Date(tx.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(tx.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
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
        ))}
      </div>

      <TransactionModal
        transaction={selectedTx}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
