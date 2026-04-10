'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, ArrowRightLeft, Check, AlertCircle, Loader2, User, ChevronLeft } from 'lucide-react'
import { lookupUserByPhone, transferToPlayer } from '@/app/actions/transfer'
import { getAvatarSvg } from '@/utils/avatars'
import { formatAmount } from '@/utils/format'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
}

type Step = 'search' | 'confirm-recipient' | 'amount' | 'confirm-transfer' | 'result'

interface RecipientInfo {
  id: string
  username: string
  avatar_url: string | null
  level: number
}

export function TransferModal({ isOpen, onClose, currentBalance }: TransferModalProps) {
  const [step, setStep] = useState<Step>('search')
  const [phone, setPhone] = useState('')
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ success: boolean; referenceId?: string; newBalance?: number } | null>(null)

  const amountCents = Math.round(parseFloat(amountInput || '0') * 100)

  function reset() {
    setStep('search')
    setPhone('')
    setRecipient(null)
    setAmountInput('')
    setLoading(false)
    setError('')
    setResult(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSearch() {
    if (!phone.trim()) return
    setLoading(true)
    setError('')

    const res = await lookupUserByPhone(phone.trim())

    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }

    if (res.user) {
      setRecipient(res.user)
      setStep('confirm-recipient')
    }
    setLoading(false)
  }

  async function handleTransfer() {
    if (!recipient || amountCents < 10000) return
    setLoading(true)
    setError('')

    const res = await transferToPlayer(recipient.id, amountCents)

    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }

    setResult({
      success: true,
      referenceId: res.referenceId,
      newBalance: res.senderBalanceAfter,
    })
    setStep('result')
    setLoading(false)
  }

  function maskPhone(p: string) {
    if (p.length <= 4) return p
    return p.slice(0, 3) + '•'.repeat(p.length - 6) + p.slice(-3)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-[#0a0a0a] border-2 border-brand-gold/30 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Header Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none bg-brand-gold/5" />

          {/* Top Bar */}
          <div className="relative z-10 p-6 md:p-8 flex items-center justify-between border-b border-brand-gold/10 shrink-0">
            <div className="flex items-center gap-3">
              {step !== 'search' && step !== 'result' && (
                <button
                  onClick={() => {
                    if (step === 'confirm-recipient') setStep('search')
                    else if (step === 'amount') setStep('confirm-recipient')
                    else if (step === 'confirm-transfer') setStep('amount')
                  }}
                  className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all border border-white/10"
                >
                  <ChevronLeft className="w-5 h-5 text-white/60" />
                </button>
              )}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg bg-brand-gold/10 border-brand-gold/20">
                <ArrowRightLeft className="w-6 h-6 text-brand-gold" />
              </div>
              <div>
                <h3 className="text-sm font-display font-black uppercase tracking-[0.2em] italic leading-none text-brand-gold">
                  Transferir Saldo
                </h3>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60 mt-1">
                  {step === 'search' && 'Buscar destinatario'}
                  {step === 'confirm-recipient' && 'Confirmar destinatario'}
                  {step === 'amount' && 'Ingresar monto'}
                  {step === 'confirm-transfer' && 'Revisar y confirmar'}
                  {step === 'result' && 'Resultado'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-white/10 group"
            >
              <X className="w-6 h-6 text-text-secondary group-hover:text-text-premium transition-colors" />
            </button>
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 md:p-10 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">

            {/* ── Step 1: Search by phone ── */}
            {step === 'search' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="text-center space-y-2">
                  <p className="text-sm text-white/60">Ingresa el número de celular del jugador (10 dígitos, sin +57).</p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold/40" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="3001234567"
                      className="w-full h-14 pl-12 pr-4 bg-white/5 border-2 border-white/10 focus:border-brand-gold/50 rounded-2xl text-white text-base font-medium placeholder:text-white/20 outline-none transition-all"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-400 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleSearch}
                    disabled={loading || !phone.trim()}
                    className="w-full h-14 bg-brand-gold/20 hover:bg-brand-gold/30 disabled:bg-white/5 disabled:text-white/20 text-brand-gold disabled:cursor-not-allowed rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all border-2 border-brand-gold/20 hover:border-brand-gold/40 disabled:border-white/5 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>{loading ? 'Buscando...' : 'Buscar Jugador'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Confirm Recipient ── */}
            {step === 'confirm-recipient' && recipient && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="text-center space-y-2">
                  <p className="text-sm text-white/60">Verifica que este sea el jugador correcto antes de continuar.</p>
                </div>

                <div className="p-6 bg-brand-gold/5 border-2 border-brand-gold/20 rounded-[1.5rem] space-y-4">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 border-2 border-brand-gold/20 flex items-center justify-center overflow-hidden shrink-0">
                      {recipient.avatar_url && getAvatarSvg(recipient.avatar_url) ? (
                        <div className="w-full h-full p-1">{getAvatarSvg(recipient.avatar_url)}</div>
                      ) : (
                        <User className="w-8 h-8 text-brand-gold/60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-black text-lg text-white italic uppercase tracking-tight truncate">{recipient.username}</p>
                      <p className="text-xs text-white/40 font-bold">Nivel {recipient.level}</p>
                      <p className="text-xs text-brand-gold/70 font-mono mt-0.5">{maskPhone(phone)}</p>
                    </div>
                  </div>

                  <div className="h-px bg-brand-gold/10" />

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setRecipient(null); setStep('search'); }}
                      className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all border border-white/10"
                    >
                      Buscar Otro
                    </button>
                    <button
                      onClick={() => setStep('amount')}
                      className="flex-1 h-12 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all border-2 border-brand-gold/30 active:scale-[0.97]"
                    >
                      Confirmar ✓
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Enter Amount ── */}
            {step === 'amount' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Saldo disponible</p>
                  <p className="text-2xl font-display font-black text-brand-gold italic">${formatAmount(currentBalance)}</p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-black text-lg">$</span>
                    <input
                      type="number"
                      value={amountInput}
                      onChange={(e) => { setAmountInput(e.target.value); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && amountCents >= 100000 && amountCents <= currentBalance && setStep('confirm-transfer')}
                      placeholder="0"
                      min="1000"
                      step="1000"
                      className="w-full h-16 pl-10 pr-4 bg-white/5 border-2 border-white/10 focus:border-brand-gold/50 rounded-2xl text-white text-2xl font-display font-black italic placeholder:text-white/10 outline-none transition-all text-center"
                      autoFocus
                    />
                  </div>

                  {amountCents > 0 && amountCents < 100000 && (
                    <p className="text-[10px] text-amber-400 font-bold text-center">Monto mínimo: $1.000</p>
                  )}
                  {amountCents > currentBalance && (
                    <p className="text-[10px] text-red-400 font-bold text-center">Excede tu saldo disponible</p>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-400 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setStep('confirm-transfer')}
                    disabled={amountCents < 10000 || amountCents > currentBalance}
                    className="w-full h-14 bg-brand-gold/20 hover:bg-brand-gold/30 disabled:bg-white/5 disabled:text-white/20 text-brand-gold disabled:cursor-not-allowed rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all border-2 border-brand-gold/20 hover:border-brand-gold/40 disabled:border-white/5 active:scale-[0.98]"
                  >
                    Continuar
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Final Confirmation ── */}
            {step === 'confirm-transfer' && recipient && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-7 h-7 text-amber-400" />
                  </div>
                  <h4 className="text-base font-display font-black uppercase tracking-tight italic text-white">¿Confirmar Transferencia?</h4>
                  <p className="text-xs text-white/50">Revisa los datos antes de confirmar. Esta acción es irreversible.</p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Destinatario</span>
                    <span className="font-display font-black text-sm text-white italic">{recipient.username}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Teléfono</span>
                    <span className="text-sm text-white/60 font-mono">{maskPhone(phone)}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Monto</span>
                    <span className="font-display font-black text-xl text-brand-gold italic">${formatAmount(amountCents)}</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400 font-medium">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('amount')}
                    disabled={loading}
                    className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all border border-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={loading}
                    className="flex-1 h-14 bg-brand-gold hover:brightness-110 text-black rounded-2xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-[inset_0_-6px_0_#8b6b2e,0_10px_20px_rgba(0,0,0,0.4)] hover:shadow-[inset_0_-4px_0_#8b6b2e,0_8px_16px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-[inset_0_-2px_0_#8b6b2e,0_4px_8px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                    <span>{loading ? 'Procesando...' : 'Confirmar'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 5: Result ── */}
            {step === 'result' && result && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center py-4">
                {result.success ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto"
                    >
                      <Check className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-display font-black uppercase tracking-tight italic text-emerald-400">Transferencia Exitosa</h4>
                      <p className="text-4xl font-display font-black italic text-white tracking-tighter">${formatAmount(amountCents)}</p>
                      <p className="text-xs text-white/50 mt-1">enviados a <strong className="text-white">{recipient?.username}</strong></p>
                    </div>
                    {result.newBalance !== undefined && (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nuevo Saldo</p>
                        <p className="text-2xl font-display font-black italic text-brand-gold">${formatAmount(result.newBalance)}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center mx-auto">
                      <X className="w-10 h-10 text-red-400" />
                    </div>
                    <h4 className="text-lg font-display font-black uppercase tracking-tight italic text-red-400">Error en la Transferencia</h4>
                  </>
                )}

                <button
                  onClick={handleClose}
                  className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all border border-white/10 hover:border-white/20 active:scale-[0.97]"
                >
                  Cerrar
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
