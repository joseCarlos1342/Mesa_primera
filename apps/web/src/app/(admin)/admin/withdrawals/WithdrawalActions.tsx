'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { processTransaction } from '@/app/actions/admin-wallet'

export function WithdrawalActions({ withdrawalId }: { withdrawalId: string }) {
  const [isPending, setIsPending] = useState(false)

  const handleAction = async (status: 'completed' | 'failed') => {
    if (isPending) return
    setIsPending(true)
    try {
      const res = await processTransaction(withdrawalId, status)
      if (res?.error) {
        alert('Error: ' + res.error)
      }
    } catch (e: any) {
      alert('Error inesperado: ' + e.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
      <button 
        onClick={() => handleAction('completed')}
        disabled={isPending}
        className="w-full sm:w-48 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 group/btn"
      >
        <CheckCircle2 className="w-5 h-5 group-hover/btn:animate-bounce" />
        <span className="drop-shadow-sm">{isPending ? 'Procesando...' : 'Procesar'}</span>
      </button>

      <button 
        onClick={() => handleAction('failed')}
        disabled={isPending}
        className="w-full sm:w-48 h-16 bg-slate-950 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 group/btn2"
      >
        <XCircle className="w-5 h-5 group-hover/btn2:animate-pulse" />
        {isPending ? 'Procesando...' : 'Anular'}
      </button>
    </div>
  )
}
