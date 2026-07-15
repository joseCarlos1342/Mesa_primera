'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { appendIssueTicketMessage, closeIssueTicket } from '@/app/actions/admin-issues'
import { IssueAttachmentComposer } from '@/components/IssueAttachmentComposer'

export function IssueAdminActions({ issueId, status }: { issueId: string; status: 'open' | 'investigating' | 'resolved' | 'closed' }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  if (status === 'closed' || status === 'resolved') return <div className="rounded-xl border border-slate-500/30 bg-slate-500/10 p-4 text-xs font-black uppercase tracking-widest text-slate-300">Caso finalizado: no admite nuevas acciones.</div>
  return <form onSubmit={(event) => { event.preventDefault(); startTransition(async () => { const result = await appendIssueTicketMessage(issueId, message); if (result.error) setError(result.error); else { setMessage(''); router.refresh() } }) }} className="space-y-2 rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4">
    <label htmlFor="issue-response" className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Responder al jugador</label>
    <textarea id="issue-response" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} required className="w-full rounded-lg bg-slate-950 p-3 text-sm text-white" />
    {error ? <p className="text-xs text-red-300">{error}</p> : null}
    <div className="flex gap-2"><button disabled={pending || !message.trim()} className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{pending ? 'Enviando…' : 'Enviar respuesta'}</button><button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await closeIssueTicket(issueId); if (result.error) setError(result.error); else router.refresh() })} className="rounded-lg border border-red-400/30 px-4 py-2 text-xs font-black text-red-300">Cerrar caso</button></div><IssueAttachmentComposer ticketId={issueId} tone="admin" onUploaded={() => router.refresh()} />
  </form>
}
