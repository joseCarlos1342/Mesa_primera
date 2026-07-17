'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  approveDisputeCompensation,
  cancelDisputeCompensation,
  dismissDispute,
  proposeDisputeCompensation,
  resolveDispute,
  startDispute,
} from '@/app/actions/admin-disputes'

export function DisputeActions({
  disputeId,
  status,
  compensationStatus,
  subjectUserIds = [],
  compensationUserId,
  compensationAmountCents,
  compensationReason: savedCompensationReason,
}: {
  disputeId: string
  status: string
  compensationStatus?: 'proposed' | 'approved' | null
  subjectUserIds?: string[]
  compensationUserId?: string | null
  compensationAmountCents?: number | null
  compensationReason?: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showResolve, setShowResolve] = useState(false)
  const [showDismiss, setShowDismiss] = useState(false)
  const [showCompensation, setShowCompensation] = useState(false)
  const [showApproval, setShowApproval] = useState(false)
  const [showCancellation, setShowCancellation] = useState(false)
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState<'no_action' | 'warning' | 'sanction'>('no_action')
  const [beneficiaryUserId, setBeneficiaryUserId] = useState('')
  const [amountCop, setAmountCop] = useState('')
  const [compensationReason, setCompensationReason] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')

  function handleStart() {
    setError(null)
    startTransition(async () => {
      const result = await startDispute(disputeId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleResolve() {
    if (!notes.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await resolveDispute(disputeId, { outcome, notes })
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleDismiss() {
    if (!notes.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await dismissDispute(disputeId, notes)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleProposeCompensation() {
    const parsedAmount = Number(amountCop)
    if (!beneficiaryUserId.trim() || !Number.isInteger(parsedAmount) || parsedAmount <= 0 || !compensationReason.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await proposeDisputeCompensation(disputeId, {
        userId: beneficiaryUserId.trim(),
        amountCents: parsedAmount * 100,
        reason: compensationReason.trim(),
      })
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleApproveCompensation() {
    setError(null)
    startTransition(async () => {
      const result = await approveDisputeCompensation(disputeId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleCancelCompensation() {
    if (!cancellationReason.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await cancelDisputeCompensation(disputeId, cancellationReason.trim())
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <section className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
      <h2 className="text-sm font-medium text-gray-400 mb-3">Acciones</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-sm text-red-300 mb-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Un único operador inicia el caso; no se solicita un UUID manual. */}
        {status === 'open' && (
          <button
            onClick={handleStart}
            disabled={isPending}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-text-on-primary transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Iniciando…' : 'Iniciar investigación'}
          </button>
        )}

        {/* Resolve / Dismiss */}
        {status === 'investigating' && compensationStatus !== 'proposed' && !showResolve && !showDismiss && !showCompensation && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowResolve(true)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Resolver
            </button>
            <button
              onClick={() => setShowDismiss(true)}
              className="rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-500 transition-colors"
            >
              Descartar
            </button>
            {subjectUserIds.length > 0 && (
              <button
                onClick={() => setShowCompensation(true)}
                className="rounded-md bg-warning/15 px-3 py-1.5 text-sm font-medium text-warning transition-colors hover:bg-warning/25"
              >
                Proponer compensación
              </button>
            )}
          </div>
        )}

        {status === 'investigating' && compensationStatus === 'proposed' && !showApproval && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowApproval(true)}
              className="rounded-md bg-warning px-3 py-1.5 text-sm font-medium text-background transition-colors hover:brightness-110"
            >
              Aprobar y acreditar
            </button>
            <button onClick={() => setShowCancellation(true)} className="rounded-md bg-danger/15 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/25">
              Cancelar propuesta
            </button>
          </div>
        )}

        {showCancellation && (
          <div className="space-y-3 rounded-md border border-danger/30 bg-danger/10 p-3">
            <label htmlFor="compensation-cancellation" className="block text-xs font-medium text-text-secondary">Motivo de cancelación</label>
            <textarea id="compensation-cancellation" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows={3} className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-sm text-text-primary" />
            <div className="flex gap-2">
              <button onClick={handleCancelCompensation} disabled={isPending || cancellationReason.trim().length < 10} className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">Confirmar cancelación</button>
              <button onClick={() => setShowCancellation(false)} className="rounded-md bg-surface-elevated px-3 py-1.5 text-sm text-text-secondary">Volver</button>
            </div>
          </div>
        )}

        {showApproval && (
          <div className="space-y-3 rounded-md border border-warning/30 bg-warning/10 p-3">
            <p className="text-sm text-text-secondary">
              Esta operación crea un movimiento inmutable en el ledger y no puede repetirse para este expediente.
            </p>
            <dl className="space-y-1 rounded-md bg-background/50 p-3 text-xs">
              <div><dt className="text-text-muted">Beneficiario</dt><dd className="font-mono text-text-primary">{compensationUserId || '—'}</dd></div>
              <div><dt className="text-text-muted">Monto</dt><dd className="font-semibold text-text-primary">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format((compensationAmountCents ?? 0) / 100)}</dd></div>
              <div><dt className="text-text-muted">Motivo</dt><dd className="text-text-secondary">{savedCompensationReason || '—'}</dd></div>
            </dl>
            <div className="flex gap-2">
              <button onClick={handleApproveCompensation} disabled={isPending} className="rounded-md bg-warning px-3 py-1.5 text-sm font-medium text-background disabled:opacity-40">
                {isPending ? 'Acreditando…' : 'Confirmar acreditación'}
              </button>
              <button onClick={() => setShowApproval(false)} className="rounded-md bg-surface-elevated px-3 py-1.5 text-sm text-text-secondary">Cancelar</button>
            </div>
          </div>
        )}

        {showCompensation && (
          <div className="space-y-3 rounded-md border border-warning/30 bg-warning/5 p-3">
            <div>
              <label htmlFor="compensation-user" className="mb-1 block text-xs font-medium text-text-secondary">Jugador beneficiario</label>
              <select id="compensation-user" value={beneficiaryUserId} onChange={(event) => setBeneficiaryUserId(event.target.value)} className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-sm text-text-primary">
                <option value="">Selecciona un jugador vinculado</option>
                {subjectUserIds.map((userId) => <option key={userId} value={userId}>{userId}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="compensation-amount" className="mb-1 block text-xs font-medium text-text-secondary">Monto en COP</label>
              <input id="compensation-amount" type="number" min="1000" step="1000" value={amountCop} onChange={(event) => setAmountCop(event.target.value)} className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-sm text-text-primary" />
            </div>
            <div>
              <label htmlFor="compensation-reason" className="mb-1 block text-xs font-medium text-text-secondary">Motivo de compensación</label>
              <textarea id="compensation-reason" value={compensationReason} onChange={(event) => setCompensationReason(event.target.value)} rows={3} className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleProposeCompensation} disabled={isPending} className="rounded-md bg-warning px-3 py-1.5 text-sm font-medium text-background disabled:opacity-40">Guardar propuesta</button>
              <button onClick={() => setShowCompensation(false)} className="rounded-md bg-surface-elevated px-3 py-1.5 text-sm text-text-secondary">Cancelar</button>
            </div>
          </div>
        )}

        {(showResolve || showDismiss) && (
          <div className="space-y-2">
            {showResolve && (
              <div>
                <label htmlFor="resolution-outcome" className="mb-1 block text-xs font-medium text-text-secondary">
                  Resultado
                </label>
                <select
                  id="resolution-outcome"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value as typeof outcome)}
                  className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="no_action">Sin acción</option>
                  <option value="warning">Advertencia</option>
                  <option value="sanction">Sanción</option>
                </select>
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={showResolve ? 'Notas de resolución…' : 'Razón del descarte…'}
              className="w-full rounded-md bg-gray-700 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={showResolve ? handleResolve : handleDismiss}
                disabled={isPending || !notes.trim()}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                  showResolve ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                {isPending ? 'Procesando…' : showResolve ? 'Confirmar resolución' : 'Confirmar descarte'}
              </button>
              <button
                onClick={() => { setShowResolve(false); setShowDismiss(false); setNotes('') }}
                className="rounded-md bg-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
