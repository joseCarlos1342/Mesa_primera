'use client'

import { useEffect, useState } from 'react'
import { getIssueTicketAttachmentUrl, listIssueTicketAttachments, type IssueTicketAttachment } from '@/app/actions/admin-issues'

type AttachmentWithUrl = IssueTicketAttachment & { url: string | null }

export function IssueAttachmentList({ ticketId }: { ticketId: string }) {
  const [attachments, setAttachments] = useState<AttachmentWithUrl[]>([])
  useEffect(() => { listIssueTicketAttachments(ticketId).then(async (result) => { if (!result.data) return; setAttachments(await Promise.all(result.data.map(async (attachment) => ({ ...attachment, url: (await getIssueTicketAttachmentUrl(attachment.id)).data || null })))) }) }, [ticketId])
  if (!attachments.length) return null
  return <section className="space-y-2"><h3 className="text-[10px] font-black uppercase tracking-widest">Imágenes adjuntas</h3><div className="grid grid-cols-2 gap-2">{attachments.map((attachment) => <article key={attachment.id} className="rounded-xl border border-current/20 p-2"><a href={attachment.url || undefined} target="_blank" rel="noreferrer" aria-label={`Abrir imagen ${attachment.file_name} ampliada`} className="block">{attachment.url ? <img src={attachment.url} alt={attachment.description} className="h-24 w-full rounded-lg object-cover" /> : <div className="h-24 rounded-lg bg-black/20" />}</a><p className="mt-1 truncate text-[10px] font-black">{attachment.file_name}</p><p className="text-[10px] opacity-70">{attachment.description}</p><p className="mt-1 text-[9px] opacity-50">{new Date(attachment.created_at).toLocaleString()}</p></article>)}</div></section>
}
