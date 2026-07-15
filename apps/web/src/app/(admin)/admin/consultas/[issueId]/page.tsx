import Link from 'next/link'
import { getAdminIssueMessages, getAdminIssueTicket } from '@/app/actions/admin-issues'
import { IssueAdminActions } from '@/components/admin/IssueAdminActions'
import { IssueAttachmentList } from '@/components/IssueAttachmentList'

export default async function IssueTicketPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const result = await getAdminIssueTicket(issueId)
  if (result.error) return <p className="p-6 text-red-300">{result.error}</p>
  const issue = result.data
  if (!issue) return <p className="p-6 text-red-300">Consulta no encontrada</p>
  const messages = await getAdminIssueMessages(issue.id)
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="rounded-2xl border border-teal-300/20 bg-surface p-6">
        <p className="text-xs font-black uppercase tracking-widest text-teal-300">{issue.category.replaceAll('_', ' ')}</p>
        <h1 className="mt-2 text-2xl font-black text-white">Consulta {issue.status}</h1>
        <p className="mt-4 whitespace-pre-wrap text-sm text-gray-300">{issue.description}</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-gray-500">Referencia</p><p className="mt-1 font-mono text-xs text-white">{issue.transaction_reference || '—'}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-gray-500">Mesa</p><p className="mt-1 font-mono text-xs text-white">{issue.table_reference || '—'}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-gray-500">Jugador</p><Link href={`/admin/ledger/${issue.user_id}`} className="mt-1 block font-mono text-xs text-indigo-300 hover:underline">Ver historial financiero</Link></div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-gray-500">Momento reportado</p><p className="mt-1 text-xs text-white">{new Date(issue.occurred_at).toLocaleString('es-CO')}</p></div>
      </section>
      <section className="space-y-2"><h2 className="text-xs font-black uppercase tracking-widest text-indigo-300">Historial del caso</h2>{messages.data?.map((message) => <div key={message.id} className={`rounded-xl p-3 text-sm ${message.from_admin ? 'bg-indigo-500/15 text-indigo-100' : 'bg-white/5 text-gray-200'}`}><p className="mb-1 text-[10px] font-black uppercase">{message.from_admin ? 'Administración' : 'Jugador'}</p>{message.message}</div>)}</section>
      <IssueAttachmentList ticketId={issue.id} />
      <IssueAdminActions issueId={issue.id} status={issue.status} />
    </div>
  )
}
