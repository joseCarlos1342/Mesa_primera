'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, Clock3, RotateCcw, Search } from 'lucide-react'
import type {
  RecoveryIncidentFilters,
  RecoveryIncidentPage,
} from '@/app/actions/admin-recovery'
import { acknowledgeRecoveryIncident } from '@/app/actions/admin-recovery'
import { CloseRecoveryIncident } from './CloseRecoveryIncident'

type RecoveryExplorerProps = {
  page: RecoveryIncidentPage
  filters: RecoveryIncidentFilters
}

const STATUS_LABEL: Record<string, string> = {
  cancelled_crash: 'Cancelado por caída',
  manual_review: 'Revisión manual',
  closed: 'Cerrado',
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return 'Sin resolución registrada'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(timestamp))
}

function buildRecoveryUrl(filters: RecoveryIncidentFilters, cursor?: RecoveryIncidentFilters['cursor']) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.cause) params.set('cause', filters.cause)
  if (filters.query) params.set('q', filters.query)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (cursor) {
    params.set('cursorDetectedAt', cursor.detectedAt)
    params.set('cursorGameId', cursor.gameId)
  }
  const query = params.toString()
  return query ? `/admin/recovery?${query}` : '/admin/recovery'
}

function buildRecoveryExportUrl(filters: RecoveryIncidentFilters) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.cause) params.set('cause', filters.cause)
  if (filters.query) params.set('q', filters.query)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const query = params.toString()
  return query ? `/api/admin/recovery/export?${query}` : '/api/admin/recovery/export'
}

function StatusBadge({ status }: { status: string }) {
  const isCrash = status === 'cancelled_crash'
  const isClosed = status === 'closed'
  const classes = isCrash
    ? 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/20'
    : isClosed ? 'bg-success/10 text-success ring-1 ring-inset ring-success/20' : 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${classes}`}>
      <span className={`size-1.5 rounded-full ${isCrash ? 'bg-danger' : isClosed ? 'bg-success' : 'bg-warning'}`} aria-hidden="true" />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function RefundsBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.max(0, Math.round((completed / total) * 100)))
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-black tabular-nums text-text-primary">{completed}</span>
        <span className="font-mono text-sm text-text-tertiary tabular-nums">/ {total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5" role="progressbar" aria-label="Refunds completados" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Refunds completados</p>
    </div>
  )
}

export function RecoveryExplorer({ page, filters }: RecoveryExplorerProps) {
  const router = useRouter()
  const [query, setQuery] = useState(filters.query ?? '')
  const [status, setStatus] = useState(filters.status ?? '')
  const [cause, setCause] = useState(filters.cause ?? '')
  const [from, setFrom] = useState(filters.from ?? '')
  const [to, setTo] = useState(filters.to ?? '')
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [acknowledgementError, setAcknowledgementError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const causes = [...new Set(page.incidents.map((incident) => incident.cause))].sort()
  const hasFilters = Boolean(filters.status || filters.cause || filters.query || filters.from || filters.to)
  const completedRefunds = page.incidents.reduce((sum, incident) => sum + incident.completedRefunds, 0)
  const totalRefunds = page.incidents.reduce((sum, incident) => sum + incident.totalRefunds, 0)

  useEffect(() => {
    setQuery(filters.query ?? '')
    setStatus(filters.status ?? '')
    setCause(filters.cause ?? '')
    setFrom(filters.from ?? '')
    setTo(filters.to ?? '')
  }, [filters])

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    router.push(buildRecoveryUrl({
      status: status === '' ? undefined : status as RecoveryIncidentFilters['status'],
      cause: cause.trim() || undefined,
      query: query.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
    }))
  }

  const acknowledge = (incidentId: string) => {
    setAcknowledgementError(null)
    setAcknowledgingId(incidentId)
    startTransition(async () => {
      try {
        const result = await acknowledgeRecoveryIncident(incidentId)
        if ('error' in result) {
          setAcknowledgementError(result.error)
          return
        }
        router.refresh()
      } catch {
        setAcknowledgementError('No se pudo registrar la revisión. Inténtalo de nuevo.')
      } finally {
        setAcknowledgingId(null)
      }
    })
  }

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <header className="border-b border-white/5 pb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-500/10">
              <RotateCcw className="size-6 text-rose-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Incidentes de recuperación</h1>
              <p className="mt-1 text-sm text-text-tertiary">Historial terminal de recuperaciones tras caídas del motor.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={buildRecoveryExportUrl(filters)} className="self-end rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-primary-light transition-colors hover:bg-primary/20">Exportar CSV</a>
            <div className="rounded-xl border border-white/5 bg-surface px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Coincidencias</p>
              <p className="mt-1 font-mono text-2xl font-black tabular-nums text-text-primary">{page.total}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-surface px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Refunds en esta página</p>
              <p className="mt-1 font-mono text-2xl font-black tabular-nums text-text-primary">{completedRefunds} / {totalRefunds}</p>
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={applyFilters} className="grid gap-3 rounded-2xl border border-white/5 bg-surface p-4 md:grid-cols-2 xl:grid-cols-6" aria-label="Filtros de recovery">
        <div className="xl:col-span-2">
          <label className="sr-only" htmlFor="recovery-query">Buscar sala o juego</label>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-background px-3 focus-within:border-primary/60">
            <Search className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
            <input id="recovery-query" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Sala o game ID" className="w-full bg-transparent py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted" />
          </div>
        </div>
        <div>
          <label className="sr-only" htmlFor="recovery-status">Estado</label>
          <select id="recovery-status" value={status} onChange={(event) => setStatus(event.currentTarget.value)} className="w-full rounded-xl border border-white/10 bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary/60">
            <option value="">Todos los estados</option>
            <option value="cancelled_crash">Cancelado por caída</option>
            <option value="manual_review">Revisión manual</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="recovery-cause">Causa</label>
          <input id="recovery-cause" list="recovery-causes" value={cause} onChange={(event) => setCause(event.currentTarget.value)} placeholder="Causa" className="w-full rounded-xl border border-white/10 bg-background px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-primary/60" />
          <datalist id="recovery-causes">{causes.map((item) => <option key={item} value={item} />)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="recovery-from">Desde</label>
          <input id="recovery-from" type="date" value={from} onChange={(event) => setFrom(event.currentTarget.value)} className="min-w-0 rounded-xl border border-white/10 bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary/60" />
          <label className="sr-only" htmlFor="recovery-to">Hasta</label>
          <input id="recovery-to" type="date" value={to} onChange={(event) => setTo(event.currentTarget.value)} className="min-w-0 rounded-xl border border-white/10 bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary/60" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-xs font-black uppercase tracking-wider text-text-on-primary transition-colors hover:bg-primary-light">Aplicar filtros</button>
          {hasFilters && <Link href="/admin/recovery" className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-text-secondary transition-colors hover:bg-white/5">Limpiar</Link>}
        </div>
      </form>
      {acknowledgementError && <p role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{acknowledgementError}</p>}

      {page.incidents.length === 0 ? (
        <section className="rounded-2xl border border-white/5 bg-surface-card p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-success" />
          <h2 className="text-lg font-bold text-text-primary">{hasFilters ? 'No hay coincidencias' : 'No hay incidentes terminales visibles'}</h2>
          <p className="mt-2 text-sm text-text-tertiary">{hasFilters ? 'Prueba a ajustar los filtros de búsqueda.' : 'Los incidentes activos no se muestran para preservar la integridad de las partidas en curso.'}</p>
        </section>
      ) : (
        <>
          <ul className="space-y-3" data-testid="recovery-list">
            {page.incidents.map((incident) => (
              <li key={incident.gameId} className="overflow-hidden rounded-2xl border border-white/5 bg-surface-card transition-colors hover:border-white/10">
                <article className="grid grid-cols-1 gap-6 p-5 md:grid-cols-12 md:p-6">
                  <div className="min-w-0 space-y-2 md:col-span-4">
                    <div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Sala</span><span className="truncate font-mono text-sm font-bold text-text-primary">{incident.roomId}</span></div>
                    <p className="truncate font-mono text-[11px] text-text-tertiary" title={incident.gameId}>Juego {incident.gameId}</p>
                    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] text-text-secondary ring-1 ring-inset ring-white/10">{incident.cause}</span>
                  </div>
                  <div className="space-y-2 md:col-span-3"><span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Estado</span><div><StatusBadge status={incident.status} /></div><p className="text-xs leading-5 text-text-secondary">{incident.resolutionReason ?? 'Sin motivo registrado'}</p></div>
                  <div className="md:col-span-2"><RefundsBar completed={incident.completedRefunds} total={incident.totalRefunds} />{incident.completedRefunds < incident.totalRefunds && <Link href={`/admin/recovery/${incident.gameId}/refunds`} className="mt-3 inline-flex text-[10px] font-black uppercase tracking-wider text-primary-light hover:text-text-primary">Ver refunds afectados</Link>}</div>
                  <div className="space-y-2 md:col-span-3 md:border-l md:border-white/5 md:pl-6"><span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Resolución</span><div className="space-y-1.5 font-mono text-[11px] text-text-secondary"><div className="flex items-center gap-1.5"><Clock3 className="size-3 shrink-0 text-info" /><span><span className="text-text-muted">Detectado: </span>{formatTimestamp(incident.detectedAt)}</span></div><div className="flex items-center gap-1.5"><Clock3 className="size-3 shrink-0 text-emerald-400" /><span><span className="text-text-muted">Resuelto: </span>{formatTimestamp(incident.resolvedAt)}</span></div></div><div className="flex flex-wrap gap-2 pt-2">{incident.replayAvailable ? <Link href={`/admin/replays/${incident.gameId}`} className="inline-flex rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary-light transition-colors hover:bg-primary/20">Ver auditoría y replay</Link> : <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Replay no disponible</span>}{incident.status === 'manual_review' && incident.incidentId && !incident.acknowledgedAt && <button type="button" onClick={() => acknowledge(incident.incidentId!)} disabled={acknowledgingId === incident.incidentId} className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-text-secondary transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">{acknowledgingId === incident.incidentId ? 'Guardando…' : 'Marcar como revisado'}</button>}{incident.acknowledgedAt && <span className="inline-flex items-center rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-success">Revisado</span>}</div></div>
                </article>
                {incident.status === 'manual_review' && incident.incidentId && incident.acknowledgedAt && <CloseRecoveryIncident incidentId={incident.incidentId} />}
              </li>
            ))}
          </ul>
          {page.nextCursor && <div className="flex justify-center"><Link href={buildRecoveryUrl(filters, page.nextCursor)} className="rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-xs font-black uppercase tracking-wider text-text-secondary transition-colors hover:bg-surface-elevated">Siguiente página</Link></div>}
        </>
      )}
    </div>
  )
}
