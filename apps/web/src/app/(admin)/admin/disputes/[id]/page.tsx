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

function entityLink(entity: string, id: string): string {
  switch (entity) {
    case 'ledger': return `/admin/ledger`
    case 'deposit': return `/admin/deposits`
    case 'withdrawal': return `/admin/withdrawals`
    case 'replay': return `/admin/replays/${id}`
    case 'user': return `/admin/users/${id}`
    case 'ticket': return `/admin/soporte/${id}`
    case 'alert': return `/admin/server-log`
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
        ← Volver a disputas
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
                href={entityLink(ev.entity, ev.entity_id)}
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
            href={`/admin/soporte/${dispute.support_ticket_id}`}
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

      {/* Actions */}
      {!isClosed && <DisputeActions disputeId={dispute.id} status={dispute.status} />}
    </div>
  )
}
