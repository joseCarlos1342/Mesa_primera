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
  const border = isAdmin ? 'border-indigo-400/30 text-indigo-200' : 'border-brand-gold/30 text-brand-gold'
  const send = isAdmin ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-brand-gold text-black hover:bg-brand-gold-light'
  if (!file) return <label className={`inline-block cursor-pointer rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${border}`}>Adjuntar imagen<input aria-label="Seleccionar imagen" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (!selected) return; setFile(selected); setPreview(URL.createObjectURL(selected)); event.target.value = '' }} /></label>

  return <div className={`space-y-3 rounded-xl border bg-black/10 p-3 ${border}`}>
    <div className="flex items-center gap-3"><img src={preview || ''} alt={`Vista previa de ${file.name}`} className="h-16 w-16 rounded-lg object-cover" /><p className="min-w-0 truncate text-xs font-medium">{file.name}</p></div>
    <label className="block text-[10px] font-black uppercase tracking-widest">Describe qué muestra esta imagen<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} required className="mt-1 w-full rounded-lg border border-current/20 bg-black/20 p-2 text-xs" /></label>
    {error ? <p className="text-xs text-red-300">{error}</p> : null}
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setFile(null); setDescription(''); setError(null) }} className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${border}`}>Cancelar</button><button type="button" disabled={sending || !description.trim()} onClick={async () => { setSending(true); setError(null); const data = new FormData(); data.append('file', file); data.append('description', description.trim()); const result = await uploadIssueTicketImage(ticketId, data); setSending(false); if (result.error) { setError(result.error); return } setFile(null); setDescription(''); onUploaded() }} className={`min-w-32 rounded-lg px-3 py-2 text-[10px] font-black uppercase disabled:opacity-50 ${send}`}>{sending ? 'Subiendo…' : 'Enviar imagen'}</button></div>
  </div>
}
