'use client'

import { useState } from 'react'
import { Coins, Plus, Minus, X } from 'lucide-react'
import { adjustUserBalance } from '@/app/actions/admin-users'

export function UserBalanceControl({ userId, userName, currentBalance }: { userId: string, userName: string, currentBalance: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAdjust = async (isAdd: boolean) => {
    if (amount <= 0) return alert('Ingresa un monto válido')
    if (!reason) return alert('Ingresa un motivo para el ajuste')

    setIsLoading(true)
    try {
      const delta = isAdd ? amount : -amount
      await adjustUserBalance(userId, delta, reason)
      setIsOpen(false)
      setAmount(0)
      setReason('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all border border-emerald-500/20"
        title="Ajustar Saldo"
      >
        <Coins className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 p-8 rounded-[2rem] w-full max-w-md shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
           <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Ajustar Saldo</h2>
          <p className="text-slate-500 text-sm font-medium">Usuario: <span className="text-white">{userName}</span></p>
          <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Saldo Actual: {currentBalance} Bits</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto (Bits)</label>
            <input 
              type="number" 
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-black text-xl focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Motivo del Ajuste</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Corrección por error en mesa #42"
              className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-none h-24"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button 
            disabled={isLoading}
            onClick={() => handleAdjust(false)}
            className="flex items-center justify-center gap-2 bg-rose-600/10 border border-rose-500/20 text-rose-500 hover:bg-rose-600 hover:text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50"
          >
            <Minus className="w-4 h-4" /> Restar
          </button>
          <button 
            disabled={isLoading}
            onClick={() => handleAdjust(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/5"
          >
            <Plus className="w-4 h-4" /> Sumar
          </button>
        </div>
      </div>
    </div>
  )
}
