import { globalSearch } from '@/app/actions/admin-search'
import Link from 'next/link'

function BadgeEntity({ entity }: { entity: string }) {
  const colors: Record<string, string> = {
    ledger: 'bg-emerald-500/20 text-emerald-300',
    deposit: 'bg-blue-500/20 text-blue-300',
    withdrawal: 'bg-orange-500/20 text-orange-300',
    replay: 'bg-purple-500/20 text-purple-300',
    user: 'bg-cyan-500/20 text-cyan-300',
    ticket: 'bg-yellow-500/20 text-yellow-300',
    alert: 'bg-red-500/20 text-red-300',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[entity] || 'bg-gray-500/20 text-gray-300'}`}>
      {entity}
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

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() || ''

  if (!query) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Consultas Globales</h1>
        <p className="text-gray-400">
          Ingresa un ID de transacción, seed de juego, nombre de usuario o UUID en la barra de búsqueda arriba.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <BadgeEntity entity="ledger" />
            <span>UUID de transacción o referencia del ledger</span>
          </div>
          <div className="flex items-center gap-2">
            <BadgeEntity entity="replay" />
            <span>Seed hexadecimal (32-64 chars) de un juego</span>
          </div>
          <div className="flex items-center gap-2">
            <BadgeEntity entity="user" />
            <span>@usuario o nombre parcial de jugador</span>
          </div>
        </div>
      </div>
    )
  }

  const result = await globalSearch(query)

  if (result.error) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Consultas Globales</h1>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300">
          {result.error}
        </div>
      </div>
    )
  }

  const { detected, matches, searched_at } = result.data!

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Consultas Globales</h1>
        <Link
          href="/admin/disputes"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Ver disputas →
        </Link>
      </div>

      {/* Query info */}
      <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-gray-400">Consulta:</span>
          <code className="text-white bg-gray-700 px-2 py-0.5 rounded">{query}</code>
          <span className="text-gray-400">Tipo:</span>
          <span className="text-indigo-300 font-medium">{detected.type}</span>
          <span className="text-gray-400 ml-auto text-xs">
            {new Date(searched_at).toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      {/* Results */}
      {matches.length === 0 ? (
        <div className="bg-gray-800/30 border border-white/5 rounded-lg p-8 text-center text-gray-400">
          No se encontraron coincidencias para esta consulta.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 mb-3">
            {matches.length} coincidencia{matches.length !== 1 ? 's' : ''} encontrada{matches.length !== 1 ? 's' : ''}
          </p>
          {matches.map((match, i) => (
            <Link
              key={`${match.entity}-${match.id}-${i}`}
              href={entityLink(match.entity, match.id)}
              className="block bg-gray-800/50 border border-white/10 rounded-lg p-4 hover:border-indigo-500/30 hover:bg-gray-800/80 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <BadgeEntity entity={match.entity} />
                  <span className="text-white font-medium truncate group-hover:text-indigo-300 transition-colors">
                    {match.label}
                  </span>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {match.detail}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500 font-mono truncate">
                {match.id}
              </div>
            </Link>
          ))}

          {/* Quick action: open dispute from results */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <Link
              href={`/admin/disputes/new?q=${encodeURIComponent(query)}&evidence=${encodeURIComponent(JSON.stringify(matches.slice(0, 10).map(m => ({ entity: m.entity, entity_id: m.id, label: m.label }))))}`}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              Abrir disputa con esta evidencia
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
