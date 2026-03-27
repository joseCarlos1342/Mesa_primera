'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { processTransaction } from '@/app/actions/admin-wallet'

export function DepositActions({ depositId }: { depositId: string }) {
  const [isPending, setIsPending] = useState(false)

  const handleAction = async (status: 'completed' | 'failed') => {
    if (isPending) return
    setIsPending(true)
    try {
      const res = await processTransaction(depositId, status)
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
        className="w-full sm:w-48 h-16 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 group/btn"
      >
        <CheckCircle2 className="w-5 h-5 group-hover/btn:animate-bounce" />
        <span className="drop-shadow-sm">{isPending ? 'Procesando...' : 'Aprobar'}</span>
      </button>

      <button 
        onClick={() => handleAction('failed')}
        disabled={isPending}
        className="w-full sm:w-48 h-16 bg-slate-950 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 group/btn2"
      >
        <XCircle className="w-5 h-5 group-hover/btn2:animate-pulse" />
        {isPending ? 'Procesando...' : 'Rechazar'}
      </button>
    </div>
  )
}
