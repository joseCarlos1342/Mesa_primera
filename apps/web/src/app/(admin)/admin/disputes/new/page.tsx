'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createDispute } from '@/app/actions/admin-disputes'
import type { DisputePriority, EvidenceLink } from '@/types/admin-search'

export default function NewDisputePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Pre-fill evidence from search results if available
  let initialEvidence: EvidenceLink[] = []
  try {
    const evidenceParam = searchParams.get('evidence')
    if (evidenceParam) initialEvidence = JSON.parse(evidenceParam)
  } catch {}

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState(
    searchParams.get('q') ? `Investigación originada desde consulta: ${searchParams.get('q')}` : ''
  )
  const [priority, setPriority] = useState<DisputePriority>('medium')
  const [supportTicketId, setSupportTicketId] = useState('')
  const [evidence] = useState<EvidenceLink[]>(initialEvidence)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createDispute({
        title: title.trim(),
        description: description.trim(),
        priority,
        evidence_snapshot: evidence,
        support_ticket_id: supportTicketId.trim() || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/admin/disputes/${result.data!.id}`)
    })
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Nueva Disputa</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Título *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-md bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: Sospecha de colusión mesa #3"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            placeholder="Detalle de la situación observada…"
          />
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-1">
            Prioridad
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as DisputePriority)}
            className="w-full rounded-md bg-gray-800 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>

        <div>
          <label htmlFor="ticketId" className="block text-sm font-medium text-gray-300 mb-1">
            Ticket de soporte vinculado (opcional)
          </label>
          <input
            id="ticketId"
            type="text"
            value={supportTicketId}
            onChange={(e) => setSupportTicketId(e.target.value)}
            className="w-full rounded-md bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="UUID del ticket"
          />
        </div>

        {evidence.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">
              Evidencia vinculada ({evidence.length})
            </p>
            <div className="space-y-1">
              {evidence.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-800/50 rounded px-3 py-1.5 text-sm">
                  <span className="text-xs text-indigo-300 font-medium">{ev.entity}</span>
                  <span className="text-gray-300 truncate">{ev.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Creando…' : 'Crear disputa'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
