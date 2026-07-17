import { globalSearch } from '@/app/actions/admin-search'
import {
  listAdminIssueTickets,
  countAdminArchivedIssueTickets,
} from '@/app/actions/admin-issues'
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
    dispute: 'bg-pink-500/20 text-pink-300',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[entity] || 'bg-gray-500/20 text-gray-300'}`}>
      {entity}
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
    case 'dispute': return `/admin/disputes/${query}`
    default: return '#'
  }
}

function GlobalSearchForm({ query }: { query: string }) {
  return (
    <form action="/admin/consultas" className="flex items-stretch gap-2 sm:gap-3">
      <label className="sr-only" htmlFor="global-query">Buscar en consultas globales</label>
      <input
        id="global-query"
        name="q"
        type="search"
        defaultValue={query}
        required
        minLength={2}
        maxLength={64}
        placeholder="UUID, seed o usuario"
        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="submit"
        aria-label="Buscar"
        title="Buscar"
        className="inline-flex shrink-0 items-center justify-center gap-2 self-stretch rounded-xl bg-primary px-4 text-xs font-bold uppercase tracking-widest text-text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-[0.98] sm:px-5"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <span className="hidden sm:inline">Buscar</span>
      </button>
    </form>
  )
}

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() || ''

  if (!query) {
    const [issues, archivedCount] = await Promise.all([
      listAdminIssueTickets(),
      countAdminArchivedIssueTickets(),
    ])
    const archivedTotal = archivedCount.data ?? 0
    // Defensivo: la página solo debe mostrar tickets abiertos aunque la query devuelva otros.
    const openIssues = (issues.data ?? []).filter((i) => i.status === 'open')
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <h1 className="text-2xl font-bold mb-4">Consultas e Incidencias</h1>
        <GlobalSearchForm query="" />
        <section className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-teal-300">Bandeja de reclamos</h2>
              <p className="mt-1 text-sm text-gray-400">Tickets formales reportados desde el Centro de Ayuda.</p>
            </div>
            {/* Chip en cabecera: solo visible en >=sm (escritorio). */}
            {archivedTotal > 0 && (
              <Link
                href="/admin/consultas/archive"
                className="hidden shrink-0 items-center gap-1.5 self-start rounded-lg border border-teal-300/30 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-200 transition-colors hover:border-teal-300/50 hover:bg-teal-500/15 hover:text-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-300/30 sm:inline-flex sm:self-auto"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                  />
                </svg>
                Archivo ({archivedTotal})
              </Link>
            )}
          </div>
          {issues.error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{issues.error}</p> : openIssues.length === 0 ? <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-gray-400">No hay reclamos formales pendientes.</p> : (
            <div className="space-y-2">
              {openIssues.map((issue) => (
                <Link key={issue.id} href={`/admin/consultas/${issue.id}`} className="block rounded-xl border border-white/10 bg-surface p-4 transition-colors hover:border-teal-300/40">
                  <div className="flex items-center justify-between gap-3"><span className="font-bold text-white">{issue.category.replaceAll('_', ' ')}</span><span className="text-xs text-teal-300">{issue.status}</span></div>
                  <p className="mt-1 truncate text-sm text-gray-300">{issue.description}</p>
                  <p className="mt-2 font-mono text-[10px] text-gray-500">{issue.transaction_reference || issue.table_reference || issue.id}</p>
                </Link>
              ))}
            </div>
          )}
          {/* Chip al pie: solo visible en <sm (móvil), después de la lista de tickets abiertos. */}
          {archivedTotal > 0 && (
            <Link
              href="/admin/consultas/archive"
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-teal-300/30 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-200 transition-colors hover:border-teal-300/50 hover:bg-teal-500/15 hover:text-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-300/30 sm:hidden"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                />
              </svg>
              Archivo ({archivedTotal})
            </Link>
          )}
        </section>
        <p className="text-gray-400">Ingresa un ID de transacción, seed de juego, nombre de usuario o UUID para investigar una entidad.</p>
        <div className="mt-6 grid gap-3 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <BadgeEntity entity="ledger" />
            <span>UUID de transacción o referencia del libro mayor</span>
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
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <h1 className="text-2xl font-bold mb-4">Consultas Globales</h1>
        <GlobalSearchForm query={query} />
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
          Ver investigaciones →
        </Link>
      </div>
      <div className="mb-6">
        <GlobalSearchForm query={query} />
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
              href={entityLink(match.entity, match.id, match.target_id)}
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

          {/* La disputa se abre desde la consulta para evitar serializar evidencia en la URL. */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <Link
              href={`/admin/disputes/new?q=${encodeURIComponent(query)}`}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              Abrir investigación con esta evidencia
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
