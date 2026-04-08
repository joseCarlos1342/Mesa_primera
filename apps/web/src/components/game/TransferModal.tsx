'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, ArrowRightLeft, Check, AlertCircle, Loader2, User, ChevronLeft } from 'lucide-react'
import { lookupUserByPhone } from '@/app/actions/transfer'
import { getAvatarSvg } from '@/utils/avatars'
import type { Room } from '@colyseus/sdk'

interface GameTransferModalProps {
  isOpen: boolean
  onClose: () => void
  room: Room | null
  myChips: number
}

type Step = 'search' | 'confirm-recipient' | 'amount' | 'confirm-transfer' | 'result'

interface RecipientInfo {
  id: string
  username: string
  avatar_url: string | null
  level: number
}

export function GameTransferModal({ isOpen, onClose, room, myChips }: GameTransferModalProps) {
  const [step, setStep] = useState<Step>('search')
  const [phone, setPhone] = useState('')
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ success: boolean; recipientName?: string; amountCents?: number; newBalance?: number; error?: string } | null>(null)

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

  // Escuchar respuestas del servidor Colyseus
  useEffect(() => {
    if (!room || !isOpen) return

    const handleResult = (data: { success: boolean; recipientName?: string; amountCents?: number; newBalance?: number; error?: string }) => {
      setLoading(false)
      if (data.success) {
        setResult(data)
        setStep('result')
      } else {
        setError(data.error || 'Error en la transferencia')
      }
    }

    room.onMessage('transfer-result', handleResult)

    return () => {
      room.removeAllListeners()
    }
    // No removemos todos los listeners al desmontar para no afectar otros handlers.
    // Colyseus no tiene removeListener por message type individual, pero el componente
    // controla el state por flag isOpen.
  }, [room, isOpen])

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

  function handleTransfer() {
    if (!room || !recipient || amountCents < 10000) return
    setLoading(true)
    setError('')

    // Enviar mensaje de transferencia al servidor Colyseus
    room.send('transfer', {
      recipientUserId: recipient.id,
      amountCents,
    })
    // El resultado llega por room.onMessage('transfer-result')
  }

  function maskPhone(p: string) {
    if (p.length <= 4) return p
    return p.slice(0, 3) + '•'.repeat(p.length - 6) + p.slice(-3)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-sm overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative bg-gradient-to-br from-[#1a1a0a] via-[#12120a] to-[#0a0a0a] border-2 border-brand-gold/30 w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col"
        >
          {/* Decorative */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/textures/noise.png')] mix-blend-overlay" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-brand-gold/5 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />

          {/* Header */}
          <div className="p-5 pb-3 flex justify-between items-center relative z-10 border-b border-brand-gold/10">
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
              <div>
                <h2 className="text-xl font-display font-black italic text-brand-gold leading-none tracking-tight uppercase">
                  Transferir
                </h2>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">
                  {step === 'search' && 'Buscar jugador'}
                  {step === 'confirm-recipient' && 'Confirmar destinatario'}
                  {step === 'amount' && 'Ingresar monto'}
                  {step === 'confirm-transfer' && 'Revisar datos'}
                  {step === 'result' && 'Resultado'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-black/40 hover:bg-black/60 rounded-xl flex items-center justify-center transition-all border border-brand-gold/15 hover:border-brand-gold/30 active:scale-90 group"
            >
              <X className="w-5 h-5 text-white/50 group-hover:text-white group-hover:rotate-90 transition-all" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto custom-scrollbar flex-1 px-5 pb-8 pt-4 relative z-10 space-y-5">

            {/* ── Step 1: Search ── */}
            {step === 'search' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <p className="text-sm text-white/50 text-center">Ingresa el teléfono del jugador.</p>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/25" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="+57 300 123 4567"
                    className="w-full h-14 pl-12 pr-4 bg-white/5 border-2 border-white/10 focus:border-brand-gold/50 rounded-2xl text-white text-base font-medium placeholder:text-white/15 outline-none transition-all"
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
                  className="w-full h-14 bg-brand-gold/20 hover:bg-brand-gold/30 disabled:bg-white/5 disabled:text-white/20 text-brand-gold disabled:cursor-not-allowed rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all border-2 border-brand-gold/20 disabled:border-white/5 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{loading ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Confirm Recipient ── */}
            {step === 'confirm-recipient' && recipient && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <p className="text-sm text-white/50 text-center">¿Es este jugador?</p>

                <div className="p-5 bg-brand-gold/5 border-2 border-brand-gold/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 border-2 border-brand-gold/20 flex items-center justify-center overflow-hidden shrink-0">
                      {recipient.avatar_url && getAvatarSvg(recipient.avatar_url) ? (
                        <div className="w-full h-full p-1">{getAvatarSvg(recipient.avatar_url)}</div>
                      ) : (
                        <User className="w-7 h-7 text-brand-gold/60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-black text-lg text-white italic uppercase truncate">{recipient.username}</p>
                      <p className="text-xs text-white/40 font-bold">Nivel {recipient.level}</p>
                      <p className="text-xs text-brand-gold/60 font-mono mt-0.5">{maskPhone(phone)}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setRecipient(null); setStep('search'); }} className="flex-1 h-11 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl font-bold uppercase tracking-widest text-[10px] border border-white/10">
                      Buscar Otro
                    </button>
                    <button onClick={() => setStep('amount')} className="flex-1 h-11 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-xl font-black uppercase tracking-wider text-[10px] border-2 border-brand-gold/30 active:scale-[0.97]">
                      Confirmar ✓
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Amount ── */}
            {step === 'amount' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Fichas disponibles</p>
                  <p className="text-2xl font-display font-black text-brand-gold italic">${(myChips / 100).toLocaleString()}</p>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 font-black text-lg">$</span>
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => { setAmountInput(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && amountCents >= 10000 && amountCents <= myChips && setStep('confirm-transfer')}
                    placeholder="0"
                    min="100"
                    step="100"
                    className="w-full h-16 pl-10 pr-4 bg-white/5 border-2 border-white/10 focus:border-brand-gold/50 rounded-2xl text-white text-2xl font-display font-black italic placeholder:text-white/10 outline-none transition-all text-center"
                    autoFocus
                  />
                </div>

                {amountCents > 0 && amountCents < 10000 && (
                  <p className="text-[10px] text-amber-400 font-bold text-center">Monto mínimo: $100</p>
                )}
                {amountCents > myChips && (
                  <p className="text-[10px] text-red-400 font-bold text-center">Excede tus fichas disponibles</p>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400 font-medium">{error}</p>
                  </div>
                )}

                <button
                  onClick={() => setStep('confirm-transfer')}
                  disabled={amountCents < 10000 || amountCents > myChips}
                  className="w-full h-14 bg-brand-gold/20 hover:bg-brand-gold/30 disabled:bg-white/5 disabled:text-white/20 text-brand-gold disabled:cursor-not-allowed rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all border-2 border-brand-gold/20 disabled:border-white/5 active:scale-[0.98]"
                >
                  Continuar
                </button>
              </motion.div>
            )}

            {/* ── Step 4: Confirm ── */}
            {step === 'confirm-transfer' && recipient && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                  </div>
                  <h4 className="text-base font-display font-black uppercase tracking-tight italic text-white">¿Confirmar?</h4>
                  <p className="text-xs text-white/40">Esta acción es irreversible.</p>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Para</span>
                    <span className="font-display font-black text-white italic">{recipient.username}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Monto</span>
                    <span className="font-display font-black text-xl text-brand-gold italic">${(amountCents / 100).toLocaleString()}</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400 font-medium">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep('amount')} disabled={loading} className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-white/50 rounded-2xl font-bold uppercase tracking-widest text-[10px] border border-white/10">
                    Cancelar
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={loading}
                    className="flex-1 h-14 bg-brand-gold hover:brightness-110 text-black rounded-2xl font-black uppercase tracking-wider text-xs shadow-[inset_0_-6px_0_#8b6b2e,0_10px_20px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-[inset_0_-2px_0_#8b6b2e,0_4px_8px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                    <span>{loading ? 'Enviando...' : 'Confirmar'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 5: Result ── */}
            {step === 'result' && result && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center py-4">
                {result.success ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto"
                    >
                      <Check className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <h4 className="text-base font-display font-black uppercase italic text-emerald-400">Transferencia Exitosa</h4>
                    <p className="text-3xl font-display font-black italic text-white">${((result.amountCents || 0) / 100).toLocaleString()}</p>
                    <p className="text-xs text-white/40">enviados a <strong className="text-white">{result.recipientName}</strong></p>
                    {result.newBalance !== undefined && (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Fichas restantes</p>
                        <p className="text-xl font-display font-black italic text-brand-gold">${(result.newBalance / 100).toLocaleString()}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center mx-auto">
                      <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h4 className="text-base font-display font-black uppercase italic text-red-400">Error</h4>
                    <p className="text-xs text-white/40">{result.error}</p>
                  </>
                )}

                <button onClick={handleClose} className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 active:scale-[0.97]">
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
