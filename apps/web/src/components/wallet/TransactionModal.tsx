'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Landmark, Hash, Info, ExternalLink, ShieldCheck, FileText, Banknote } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { formatAmount } from '@/utils/format'

interface TransactionModalProps {
  transaction: any | null
  isOpen: boolean
  onClose: () => void
}

const VAULT_TYPES = ['deposit', 'withdrawal', 'refund', 'adjustment', 'admin_adjustment', 'transfer']

function getTypeLabel(type: string) {
  switch (type) {
    case 'deposit': return 'Depósito de Fondos'
    case 'withdrawal': return 'Retiro de Saldo'
    case 'refund': return 'Reembolso'
    case 'transfer': return 'Transferencia entre Jugadores'
    case 'adjustment':
    case 'admin_adjustment': return 'Ajuste de Saldo'
    default: return type
  }
}

function getAmountPrefix(type: string, direction?: string) {
  if (direction === 'credit') return '+'
  if (direction === 'debit') return '-'
  if (type === 'deposit' || type === 'refund') return '+'
  return '-'
}

export function TransactionModal({ transaction, isOpen, onClose }: TransactionModalProps) {
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function resolveUrl() {
      if (transaction?.proof_url) {
        // Try signed URL first (works for private buckets)
        const { data, error } = await supabase.storage
          .from('deposits')
          .createSignedUrl(transaction.proof_url, 3600)
        if (!error && data?.signedUrl) {
          setPublicUrl(data.signedUrl)
        } else {
          // Fallback to public URL
          const { data: { publicUrl: url } } = supabase.storage
            .from('deposits')
            .getPublicUrl(transaction.proof_url)
          setPublicUrl(url)
        }
      } else {
        setPublicUrl(null)
      }
    }
    resolveUrl()
  }, [transaction, supabase.storage])

  if (!transaction) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#0a0a0a] border-2 border-brand-gold/30 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Header / Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none bg-brand-gold/5" />
            
            {/* Top Bar */}
            <div className="relative z-10 p-6 md:p-8 flex items-center justify-between border-b border-brand-gold/10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg bg-brand-gold/10 border-brand-gold/20">
                  <Banknote className="w-6 h-6 text-brand-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-black uppercase tracking-[0.2em] italic leading-none text-brand-gold">
                    Detalles de Operación
                  </h3>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60 mt-1">
                    Información de la Bóveda
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-white/10 group"
              >
                <X className="w-6 h-6 text-text-secondary group-hover:text-text-premium transition-colors" />
              </button>
            </div>

            {/* Content Body */}
            <div className="relative z-10 p-6 md:p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              
              {/* Type and Amount */}
              <div className="text-center space-y-2">
                <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] opacity-60">
                  Monto
                </h4>
                <div className="flex flex-col items-center">
                   <p className={`text-6xl md:text-7xl font-display font-black italic tracking-tighter leading-none ${
                     transaction.direction === 'credit' ? 'text-brand-gold' : 'text-red-400'
                   }`}>
                    {getAmountPrefix(transaction.type, transaction.direction)}${formatAmount(Math.abs(transaction.amount_cents || 0))}
                  </p>
                  <div className={`mt-4 px-4 py-1.5 rounded-full border-2 text-[10px] font-black uppercase tracking-widest ${
                    transaction.status === 'completed' ? 'bg-brand-gold text-black border-brand-gold' :
                    transaction.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                    'bg-brand-red/10 text-brand-red border-brand-red/30'
                  }`}>
                    {transaction.status === 'completed' ? 'Operación Exitosa' : transaction.status === 'pending' ? 'En Proceso' : 'Fallida'}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <DetailItem icon={Calendar} label="Fecha" value={new Date(transaction.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} />
                <DetailItem icon={Hash} label="ID de Transacción" value={transaction.id.slice(0, 16) + '...'} />
                <DetailItem icon={Landmark} label="Tipo" value={getTypeLabel(transaction.type)} />
                <DetailItem icon={Info} label="Canal" value={transaction.type === 'deposit' ? 'Transferencia Directa' : transaction.type === 'withdrawal' ? 'Retiro Bancario' : transaction.type === 'transfer' ? 'P2P' : 'Sistema'} />
              </div>

              {/* Description */}
              {transaction.description && (
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-3 shadow-inner">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-gold opacity-60" />
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">Descripción</span>
                  </div>
                  <p className="text-sm font-medium text-text-premium leading-relaxed italic">{transaction.description}</p>
                </div>
              )}

              {/* Observations */}
              {transaction.observations && (
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-3 shadow-inner">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-gold opacity-60" />
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">Notas del Jugador</span>
                  </div>
                  <p className="text-sm font-medium text-text-premium leading-relaxed italic">{transaction.observations}</p>
                </div>
              )}

              {/* Proof of Payment Image */}
              {transaction.type === 'deposit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-brand-gold" />
                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">Comprobante Respaldado</span>
                    </div>
                    {publicUrl && (
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-gold hover:underline text-[10px] font-black uppercase tracking-widest">
                        <span>Ver Full</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  
                  <div className="relative group rounded-[2rem] border-2 border-brand-gold/20 overflow-hidden bg-black/40 shadow-inner">
                    {publicUrl ? (
                      <img src={publicUrl} alt="Comprobante" className="w-full h-auto max-h-96 object-contain p-2 group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                          <FileText className="w-6 h-6 text-text-secondary opacity-40 animate-pulse" />
                        </div>
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-40">Procesando imagen...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="relative z-10 p-6 md:p-8 pt-0 shrink-0">
               <button
                onClick={onClose}
                className="w-full h-16 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all border border-brand-gold/10 hover:border-brand-gold/30 active:scale-95 flex items-center justify-center gap-3"
              >
                Listo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function DetailItem({ icon: Icon, label, value }: any) {
  return (
    <div className="p-3 md:p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1 group hover:border-brand-gold/20 transition-all duration-300">
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3 text-brand-gold opacity-60 group-hover:opacity-100 transition-opacity" />
        <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <p className="text-[10px] md:text-[11px] font-black text-text-premium truncate group-hover:text-brand-gold transition-colors">{value}</p>
    </div>
  )
}
