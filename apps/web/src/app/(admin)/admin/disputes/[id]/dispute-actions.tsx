'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignDispute, resolveDispute, dismissDispute } from '@/app/actions/admin-disputes'

export function DisputeActions({
  disputeId,
  status,
}: {
  disputeId: string
  status: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showResolve, setShowResolve] = useState(false)
  const [showDismiss, setShowDismiss] = useState(false)
  const [notes, setNotes] = useState('')
  const [assignTo, setAssignTo] = useState('')

  function handleAssign() {
    if (!assignTo.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await assignDispute(disputeId, assignTo.trim())
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleResolve() {
    if (!notes.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await resolveDispute(disputeId, notes)
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

  return (
    <section className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
      <h2 className="text-sm font-medium text-gray-400 mb-3">Acciones</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-sm text-red-300 mb-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Assign */}
        {status === 'open' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              placeholder="UUID del admin a asignar"
              className="flex-1 rounded-md bg-gray-700 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAssign}
              disabled={isPending || !assignTo.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Asignar
            </button>
          </div>
        )}

        {/* Resolve / Dismiss */}
        {!showResolve && !showDismiss && (
          <div className="flex gap-2">
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
          </div>
        )}

        {(showResolve || showDismiss) && (
          <div className="space-y-2">
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
