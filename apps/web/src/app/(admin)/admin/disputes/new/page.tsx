'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createDispute } from '@/app/actions/admin-disputes'
import type { DisputePriority, InvestigationType } from '@/types/admin-search'

export default function NewDisputePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState(
    searchParams.get('q') ? `Investigación originada desde consulta: ${searchParams.get('q')}` : ''
  )
  const [investigationType, setInvestigationType] = useState<InvestigationType>('game_integrity')
  const [priority, setPriority] = useState<DisputePriority>('medium')
  const [subjectUserIds, setSubjectUserIds] = useState('')
  const [gameId, setGameId] = useState('')
  const [roomId, setRoomId] = useState('')
  const sourceQuery = searchParams.get('q')?.trim() || undefined

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createDispute({
        title: title.trim(),
        description: description.trim(),
        investigation_type: investigationType,
        priority,
        source: sourceQuery ? 'global_search' : 'manual',
        source_query: sourceQuery,
        subject_user_ids: subjectUserIds.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean),
        game_id: gameId.trim() || undefined,
        room_id: roomId.trim() || undefined,
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
      <h1 className="mb-6 text-2xl font-bold">Nueva investigación</h1>

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
          <label htmlFor="investigationType" className="mb-1 block text-sm font-medium text-text-secondary">
            Tipo de investigación
          </label>
          <select
            id="investigationType"
            value={investigationType}
            onChange={(event) => setInvestigationType(event.target.value as InvestigationType)}
            className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="game_integrity">Integridad del juego</option>
            <option value="collusion">Colusión</option>
            <option value="fraud">Fraude</option>
            <option value="bonus_abuse">Abuso de bonos</option>
            <option value="conduct">Conducta</option>
          </select>
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
          <label htmlFor="subjectUserIds" className="mb-1 block text-sm font-medium text-text-secondary">
            Jugadores relacionados (UUID separados por coma)
          </label>
          <input
            id="subjectUserIds"
            type="text"
            value={subjectUserIds}
            onChange={(event) => setSubjectUserIds(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="UUID del sospechoso o afectado"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gameId" className="mb-1 block text-sm font-medium text-text-secondary">
              ID de partida terminada (opcional)
            </label>
            <input id="gameId" value={gameId} onChange={(event) => setGameId(event.target.value)} className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="roomId" className="mb-1 block text-sm font-medium text-text-secondary">
              Sala (opcional)
            </label>
            <input id="roomId" value={roomId} onChange={(event) => setRoomId(event.target.value)} className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {sourceQuery && (
          <p className="rounded-md border border-info/20 bg-info/10 p-3 text-sm text-text-secondary">
            La evidencia se resolverá de nuevo en el servidor desde la consulta <code>{sourceQuery}</code>; no se confiará en datos serializados por URL.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Creando…' : 'Crear investigación'}
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
