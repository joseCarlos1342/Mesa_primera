'use client'

import { useState, useRef, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, X, Loader2, CheckCircle2 } from 'lucide-react'
import { adjustUserBalance } from '@/app/actions/admin-users'
import { formatCurrency } from '@/utils/format'

type AdjustResult = { type: 'success' | 'error'; message: string }

export function UserBalanceControl({ userId, userName, currentBalance }: { userId: string, userName: string, currentBalance: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AdjustResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const parsedAmount = Math.round(Number(amount) * 100)

  const handleAdjust = async (isAdd: boolean) => {
    if (parsedAmount <= 0) return setResult({ type: 'error', message: 'Ingresa un monto válido mayor a $0' })
    if (!reason.trim()) return setResult({ type: 'error', message: 'El motivo del ajuste es obligatorio' })

    setIsLoading(true)
    setResult(null)
    try {
      const delta = isAdd ? parsedAmount : -parsedAmount
      await adjustUserBalance(userId, delta, reason.trim())
      setResult({ type: 'success', message: `Ajuste de ${isAdd ? '+' : '-'}${formatCurrency(parsedAmount)} aplicado correctamente` })
      setTimeout(() => {
        setIsOpen(false)
        setAmount('')
        setReason('')
        setResult(null)
      }, 1500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setResult({ type: 'error', message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setIsOpen(false)
    setAmount('')
    setReason('')
    setResult(null)
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all duration-200 border border-emerald-500/20 hover:border-emerald-500/60 hover:scale-110 active:scale-95"
        title="Ajustar Saldo"
      >
        <DollarSign className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 p-6 sm:p-8 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/50 relative">
        {/* Close button */}
        <button 
          onClick={handleClose} 
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-black text-white tracking-tight">Ajustar Saldo</h2>
          <p className="text-slate-500 text-sm mt-1">
            {userName}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Saldo actual</span>
            <span className="text-sm font-bold text-emerald-400">{formatCurrency(currentBalance)}</span>
          </div>
        </div>

        {/* Amount input */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Monto ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">$</span>
              <input 
                ref={inputRef}
                type="number"
                min="0"
                step="100"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setResult(null) }}
                placeholder="0"
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white font-bold text-lg tabular-nums focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700"
              />
            </div>
            {parsedAmount > 0 && (
              <p className="text-xs text-slate-600 mt-1.5 ml-1">
                = {formatCurrency(parsedAmount)} COP
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Motivo del ajuste
            </label>
            <textarea 
              value={reason}
              onChange={(e) => { setReason(e.target.value); setResult(null) }}
              placeholder="Ej: Corrección por error en mesa #42"
              rows={3}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none placeholder:text-slate-700"
            />
          </div>
        </div>

        {/* Result message */}
        {result && (
          <div className={`mt-4 flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${
            result.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {result.type === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            disabled={isLoading}
            onClick={() => handleAdjust(false)}
            className="group flex items-center justify-center gap-2 bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500/60 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
            Restar
          </button>
          <button 
            disabled={isLoading}
            onClick={() => handleAdjust(true)}
            className="group flex items-center justify-center gap-2 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-500/60 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Sumar
          </button>
        </div>
      </div>
    </div>
  )
}
