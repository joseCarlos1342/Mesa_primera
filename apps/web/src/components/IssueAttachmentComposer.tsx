'use client'

import { useEffect, useState } from 'react'
import { uploadIssueTicketImage } from '@/app/actions/admin-issues'

export function IssueAttachmentComposer({ ticketId, onUploaded, tone = 'player' }: { ticketId: string; onUploaded: () => void; tone?: 'player' | 'admin' }) {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const isAdmin = tone === 'admin'
  const border = isAdmin ? 'border-indigo-400/30 text-indigo-200' : 'border-[#8b6b2e]/70 text-text-premium'
  const send = isAdmin ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-brand-gold text-[#0a0a0a] hover:bg-brand-gold-light'
  const text = isAdmin ? 'text-[10px] font-black uppercase tracking-widest' : 'text-base font-semibold'
  const control = isAdmin ? 'px-3 py-2' : 'inline-flex min-h-12 items-center px-4'
  if (!file) return <label className={`inline-flex cursor-pointer rounded-xl border focus-within:ring-2 focus-within:ring-brand-gold-light ${control} ${text} ${border}`}>Adjuntar imagen<input aria-label="Seleccionar imagen" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (!selected) return; setFile(selected); setPreview(URL.createObjectURL(selected)); event.target.value = '' }} /></label>

  return <div className={`space-y-3 rounded-xl border bg-black/10 p-3 ${border}`}>
    <div className="flex items-center gap-3"><img src={preview || ''} alt={`Vista previa de ${file.name}`} className="h-16 w-16 rounded-lg object-cover" /><p className="min-w-0 truncate text-xs font-medium">{file.name}</p></div>
    <label className={`block ${text}`}>Describe qué muestra esta imagen<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} required className={`mt-1 w-full rounded-lg border border-current/20 bg-black/20 p-2 ${isAdmin ? 'text-xs' : 'text-lg font-normal normal-case tracking-normal'}`} /></label>
    {error ? <p role="alert" className={isAdmin ? 'text-xs text-red-300' : 'text-base font-semibold text-[#f08a7e]'}>{error}</p> : null}
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setFile(null); setDescription(''); setError(null) }} className={`rounded-lg border ${control} ${text} ${border}`}>Cancelar</button><button type="button" disabled={sending || !description.trim()} onClick={async () => { setSending(true); setError(null); const data = new FormData(); data.append('file', file); data.append('description', description.trim()); const result = await uploadIssueTicketImage(ticketId, data); setSending(false); if (result.error) { setError(result.error); return } setFile(null); setDescription(''); onUploaded() }} className={`min-w-32 rounded-lg disabled:opacity-50 ${control} ${text} ${send}`}>{sending ? 'Subiendo…' : 'Enviar imagen'}</button></div>
  </div>
}
