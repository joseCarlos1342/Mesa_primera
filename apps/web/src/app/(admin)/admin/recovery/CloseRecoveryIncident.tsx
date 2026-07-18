'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeRecoveryIncident } from '@/app/actions/admin-recovery'

export function CloseRecoveryIncident({ incidentId }: { incidentId: string }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const canClose = confirmed && reason.trim().length >= 10 && reason.trim().length <= 500

  const close = () => {
    if (!canClose) return
    setError(null)
    startTransition(async () => {
      const result = await closeRecoveryIncident({ incidentId, reason: reason.trim(), confirmed })
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <details className="mt-3 rounded-lg border border-warning/20 bg-warning/5 p-3">
      <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-warning">Cerrar incidente</summary>
      <div className="mt-3 space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted" htmlFor={`close-reason-${incidentId}`}>Motivo de cierre</label>
        <textarea id={`close-reason-${incidentId}`} value={reason} onChange={(event) => setReason(event.currentTarget.value)} maxLength={500} className="min-h-20 w-full rounded-lg border border-white/10 bg-background p-2 text-xs text-text-primary outline-none focus:border-primary/60" />
        <label className="flex gap-2 text-xs text-text-secondary"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} />Confirmo el cierre irreversible.</label>
        <button type="button" disabled={!canClose || isPending} onClick={close} className="rounded-lg bg-danger/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50">{isPending ? 'Cerrando...' : 'Cerrar incidente'}</button>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    </details>
  )
}
