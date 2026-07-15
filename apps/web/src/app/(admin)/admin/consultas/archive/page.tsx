import Link from 'next/link'
import { listAdminArchivedIssueTickets } from '@/app/actions/admin-issues'

const STATUS_LABEL: Record<string, string> = {
  investigating: 'En investigación',
  resolved: 'Resuelta',
  closed: 'Cerrada',
}

export default async function ArchivePage() {
  const result = await listAdminArchivedIssueTickets()

  if (result.error) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <h1 className="text-2xl font-bold">Archivo de consultas</h1>
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {result.error}
        </div>
      </div>
    )
  }

  const tickets = result.data ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Archivo de consultas</h1>
        <p className="mt-1 text-sm text-gray-400">
          Tickets resueltos, cerrados o en investigación. Solo lectura.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
          No hay consultas archivadas.
        </div>
      ) : (
        <ul className="space-y-2" data-testid="archive-list">
          {tickets.map((ticket) => {
            const label = STATUS_LABEL[ticket.status] ?? ticket.status
            return (
              <li key={ticket.id}>
                <Link
                  href={`/admin/consultas/${ticket.id}`}
                  className="block rounded-xl border border-white/10 bg-surface p-4 transition-colors hover:border-teal-300/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-white">
                      {ticket.category.replaceAll('_', ' ')}
                    </span>
                    <span className="text-xs text-teal-300">{label}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-300">{ticket.description}</p>
                  <p className="mt-2 font-mono text-[10px] text-gray-500">
                    {ticket.transaction_reference || ticket.table_reference || ticket.id}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
