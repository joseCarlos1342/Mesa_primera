import { getDispute } from '@/app/actions/admin-disputes'
import { notFound } from 'next/navigation'
import { DisputeActions } from './dispute-actions'
import Link from 'next/link'

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-yellow-500/20 text-yellow-300',
    investigating: 'bg-blue-500/20 text-blue-300',
    resolved: 'bg-emerald-500/20 text-emerald-300',
    dismissed: 'bg-gray-500/20 text-gray-400',
  }
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300 border border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300',
    medium: 'bg-yellow-500/20 text-yellow-300',
    low: 'bg-gray-500/20 text-gray-400',
  }
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${colors[priority] || 'bg-gray-500/20 text-gray-300'}`}>
      {priority}
    </span>
  )
}

function entityLink(entity: string, id: string, targetId?: string): string {
  const query = encodeURIComponent(id)
  switch (entity) {
    case 'ledger': return `/admin/ledger?q=${query}`
    case 'deposit': return `/admin/deposits?q=${query}`
    case 'withdrawal': return `/admin/withdrawals?q=${query}`
    case 'replay': return `/admin/replays/${encodeURIComponent(targetId || id)}`
    case 'user': return `/admin/users?q=${query}`
    case 'ticket': return `/admin/support?ticket=${query}`
    case 'alert': return `/admin/server-log?q=${query}`
    default: return '#'
  }
}

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getDispute(id)

  if (result.error || !result.data) return notFound()

  const dispute = result.data

  const isClosed = dispute.status === 'resolved' || dispute.status === 'dismissed'

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link href="/admin/disputes" className="text-sm text-gray-400 hover:text-white transition-colors mb-4 inline-block">
        ← Volver a investigaciones
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{dispute.title}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={dispute.status} />
            <PriorityBadge priority={dispute.priority} />
          </div>
        </div>
        <div className="text-right text-sm text-gray-400">
          <div>Creada: {new Date(dispute.created_at).toLocaleString('es-CO')}</div>
          {dispute.resolved_at && (
            <div>Cerrada: {new Date(dispute.resolved_at).toLocaleString('es-CO')}</div>
          )}
        </div>
      </div>

      {(dispute.investigation_type || dispute.source || dispute.game_id || dispute.room_id) && (
        <section className="mb-6 grid gap-3 rounded-lg border border-white/10 bg-surface p-4 text-sm sm:grid-cols-2">
          {dispute.investigation_type && <div><span className="text-text-muted">Tipo</span><p className="font-medium text-accent-red">{dispute.investigation_type}</p></div>}
          {dispute.source && <div><span className="text-text-muted">Origen</span><p className="font-medium text-text-primary">{dispute.source}</p></div>}
          {dispute.game_id && <div><span className="text-text-muted">Partida terminada</span><p className="font-mono text-xs text-text-primary">{dispute.game_id}</p></div>}
          {dispute.room_id && <div><span className="text-text-muted">Sala</span><p className="font-mono text-xs text-text-primary">{dispute.room_id}</p></div>}
        </section>
      )}

      {/* Description */}
      <section className="bg-gray-800/50 border border-white/10 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-2">Descripción</h2>
        <p className="text-white whitespace-pre-wrap">{dispute.description || '—'}</p>
      </section>

      {/* Evidence */}
      {dispute.evidence_snapshot.length > 0 && (
        <section className="bg-gray-800/50 border border-white/10 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Evidencia vinculada ({dispute.evidence_snapshot.length})
          </h2>
          <div className="space-y-1.5">
            {dispute.evidence_snapshot.map((ev, i) => (
              <Link
                key={i}
                href={entityLink(ev.entity, ev.entity_id, ev.target_id)}
                className="flex items-center gap-2 bg-gray-700/50 rounded px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
              >
                <span className="text-xs text-indigo-300 font-medium w-16 shrink-0">{ev.entity}</span>
                <span className="text-white truncate">{ev.label}</span>
                <span className="text-gray-500 font-mono text-xs ml-auto truncate">{ev.entity_id}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Support ticket link */}
      {dispute.support_ticket_id && (
        <section className="bg-gray-800/50 border border-white/10 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-2">Ticket de soporte vinculado</h2>
          <Link
            href={`/admin/support?ticket=${encodeURIComponent(dispute.support_ticket_id)}`}
            className="text-indigo-400 hover:text-indigo-300 transition-colors font-mono text-sm"
          >
            {dispute.support_ticket_id}
          </Link>
        </section>
      )}

      {/* Resolution notes */}
      {dispute.resolution_notes && (
        <section className="bg-gray-800/50 border border-white/10 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-2">
            {dispute.status === 'dismissed' ? 'Razón de descarte' : 'Notas de resolución'}
          </h2>
          <p className="text-white whitespace-pre-wrap">{dispute.resolution_notes}</p>
        </section>
      )}

      {dispute.compensation_status && (
        <section className="mb-6 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <h2 className="mb-2 text-sm font-medium text-warning">Compensación {dispute.compensation_status}</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-text-muted">Beneficiario</dt><dd className="font-mono text-text-primary">{dispute.compensation_user_id}</dd></div>
            <div><dt className="text-text-muted">Monto</dt><dd className="text-text-primary">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format((dispute.compensation_amount_cents ?? 0) / 100)}</dd></div>
          </dl>
          {dispute.compensation_reason && <p className="mt-3 text-sm text-text-secondary">{dispute.compensation_reason}</p>}
          {dispute.compensation_ledger_id && <Link href={`/admin/ledger?q=${encodeURIComponent(dispute.compensation_ledger_id)}`} className="mt-3 inline-block text-sm text-primary-light hover:underline">Ver movimiento en ledger</Link>}
        </section>
      )}

      {/* Actions */}
      {!isClosed && <DisputeActions
        disputeId={dispute.id}
        status={dispute.status}
        compensationStatus={dispute.compensation_status}
        subjectUserIds={dispute.subject_user_ids}
        compensationUserId={dispute.compensation_user_id}
        compensationAmountCents={dispute.compensation_amount_cents}
        compensationReason={dispute.compensation_reason}
      />}
    </div>
  )
}
