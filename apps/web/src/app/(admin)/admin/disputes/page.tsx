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

export default async function DisputesListPage(props: {
  searchParams?: Promise<{ status?: string; priority?: string; type?: string }>
}) {
  const { searchParams } = props
  const params = (await searchParams) ?? {}
  const status = ['open', 'investigating', 'resolved', 'dismissed'].includes(params.status || '')
    ? params.status as 'open' | 'investigating' | 'resolved' | 'dismissed'
    : undefined
  const priority = ['low', 'medium', 'high', 'critical'].includes(params.priority || '')
    ? params.priority as 'low' | 'medium' | 'high' | 'critical'
    : undefined
  const investigationType = ['game_integrity', 'collusion', 'fraud', 'bonus_abuse', 'conduct'].includes(params.type || '')
    ? params.type as 'game_integrity' | 'collusion' | 'fraud' | 'bonus_abuse' | 'conduct'
    : undefined
  const filters = { status, priority, investigationType }
  const result = await listDisputes(Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)))

  if (result.error) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <h1 className="mb-4 text-2xl font-bold">Investigaciones internas</h1>
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
        <h1 className="text-2xl font-bold">Investigaciones internas</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/disputes/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            + Nueva investigación
          </Link>
        </div>
      </div>

      <form className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-surface p-4 sm:grid-cols-4">
        <div>
          <label htmlFor="investigation-status" className="mb-1 block text-xs font-medium text-text-secondary">Estado</label>
          <select id="investigation-status" name="status" defaultValue={status || ''} className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-text-primary">
            <option value="">Todos</option><option value="open">Abierta</option><option value="investigating">Investigando</option><option value="resolved">Resuelta</option><option value="dismissed">Descartada</option>
          </select>
        </div>
        <div>
          <label htmlFor="investigation-priority" className="mb-1 block text-xs font-medium text-text-secondary">Prioridad</label>
          <select id="investigation-priority" name="priority" defaultValue={priority || ''} className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-text-primary">
            <option value="">Todas</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option>
          </select>
        </div>
        <div>
          <label htmlFor="investigation-type" className="mb-1 block text-xs font-medium text-text-secondary">Tipo</label>
          <select id="investigation-type" name="type" defaultValue={investigationType || ''} className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-text-primary">
            <option value="">Todos</option><option value="game_integrity">Integridad</option><option value="collusion">Colusión</option><option value="fraud">Fraude</option><option value="bonus_abuse">Abuso de bonos</option><option value="conduct">Conducta</option>
          </select>
        </div>
        <button type="submit" className="self-end rounded-md bg-primary px-3 py-2 text-sm font-medium text-text-on-primary hover:bg-primary-light">Filtrar</button>
      </form>

      {disputes.length === 0 ? (
        <div className="bg-gray-800/30 border border-white/5 rounded-lg p-8 text-center text-gray-400">
          No hay investigaciones registradas.
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
                    {d.investigation_type && (
                      <span className="inline-block rounded-full bg-accent-red/15 px-2.5 py-0.5 text-xs font-medium text-accent-red">
                        {d.investigation_type}
                      </span>
                    )}
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
