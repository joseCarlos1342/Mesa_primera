import { listDisputes } from '@/app/actions/admin-disputes'
import Link from 'next/link'

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-yellow-500/20 text-yellow-300',
    investigating: 'bg-blue-500/20 text-blue-300',
    resolved: 'bg-emerald-500/20 text-emerald-300',
    dismissed: 'bg-gray-500/20 text-gray-400',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
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
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[priority] || 'bg-gray-500/20 text-gray-300'}`}>
      {priority}
    </span>
  )
}

export default async function DisputesListPage() {
  const result = await listDisputes()

  if (result.error) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Disputas</h1>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300">
          {result.error}
        </div>
      </div>
    )
  }

  const disputes = result.data!

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Disputas</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/consultas"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Consultas
          </Link>
          <Link
            href="/admin/disputes/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            + Nueva disputa
          </Link>
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-gray-800/30 border border-white/5 rounded-lg p-8 text-center text-gray-400">
          No hay disputas registradas.
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.map((d) => (
            <Link
              key={d.id}
              href={`/admin/disputes/${d.id}`}
              className="block bg-gray-800/50 border border-white/10 rounded-lg p-4 hover:border-indigo-500/30 hover:bg-gray-800/80 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={d.status} />
                    <PriorityBadge priority={d.priority} />
                    {d.support_ticket_id && (
                      <span className="text-xs text-gray-500">🎫 vinculado</span>
                    )}
                  </div>
                  <h3 className="text-white font-medium truncate">{d.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-1">{d.description}</p>
                </div>
                <div className="text-right text-xs text-gray-500 shrink-0">
                  <div>{new Date(d.created_at).toLocaleDateString('es-CO')}</div>
                  {d.assigned_to && <div className="mt-1">Asignado</div>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
