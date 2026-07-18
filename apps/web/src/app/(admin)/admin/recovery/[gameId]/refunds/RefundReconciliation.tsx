'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reconcileRecoveryRefund } from '@/app/actions/admin-recovery'

export function RefundReconciliation({ refundId }: { refundId: string }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const canSubmit = confirmed && reason.trim().length >= 10 && reason.trim().length <= 500

  const submit = () => {
    if (!canSubmit) return
    setMessage(null)
    startTransition(async () => {
      const result = await reconcileRecoveryRefund({ refundId, reason: reason.trim() })
      if ('error' in result) {
        setMessage(result.error)
        return
      }
      setMessage(result.data.alreadyReconciled ? 'El refund ya estaba conciliado.' : 'Refund conciliado correctamente.')
      router.refresh()
    })
  }

  return (
    <details className="rounded-xl border border-warning/20 bg-warning/5 p-3">
      <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-warning">Conciliar refund</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-text-secondary">La conciliación reutiliza la operación persistida y no permite modificar jugador ni monto.</p>
        <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted" htmlFor={`refund-reason-${refundId}`}>Motivo operativo</label>
        <textarea id={`refund-reason-${refundId}`} value={reason} onChange={(event) => setReason(event.currentTarget.value)} maxLength={500} className="min-h-20 w-full rounded-lg border border-white/10 bg-background p-2 text-sm text-text-primary outline-none focus:border-primary/60" />
        <label className="flex items-start gap-2 text-xs text-text-secondary"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} className="mt-0.5" />Confirmo que debo conciliar este refund pendiente.</label>
        <button type="button" disabled={!canSubmit || isPending} onClick={submit} className="rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-text-on-primary disabled:cursor-not-allowed disabled:opacity-50">{isPending ? 'Conciliando...' : 'Confirmar conciliación'}</button>
        {message && <p role="status" className="text-xs text-text-secondary">{message}</p>}
      </div>
    </details>
  )
}
