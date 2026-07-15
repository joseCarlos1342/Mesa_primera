'use server'

import { createClient } from '@/utils/supabase/server'

export type IssueTicketStatus = 'open' | 'investigating' | 'resolved' | 'closed'

export type AdminIssueTicket = {
  id: string
  user_id: string
  category: string
  description: string
  transaction_reference: string | null
  table_reference: string | null
  occurred_at: string
  status: IssueTicketStatus
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

type Result<T> = { data: T; error?: never } | { data?: never; error: string }

export type IssueTicketMessage = { id: string; ticket_id: string; message: string; from_admin: boolean; created_at: string }
export type IssueTicketAttachment = { id: string; ticket_id: string; uploaded_by: string; file_name: string; description: string; mime_type: string; size_bytes: number; created_at: string }

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'No autenticado' } as const
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase: null, error: 'Acceso denegado' } as const
  return { supabase, error: null } as const
}

export async function listAdminIssueTickets(): Promise<Result<AdminIssueTicket[]>> {
  const { supabase, error: authError } = await getAdminClient()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('issue_tickets')
    .select('id, user_id, category, description, transaction_reference, table_reference, occurred_at, status, resolution_notes, created_at, updated_at')
    .eq('status', 'open')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return { error: 'No fue posible cargar las consultas' }
  return { data: (data || []) as AdminIssueTicket[] }
}

export async function listAdminArchivedIssueTickets(): Promise<Result<AdminIssueTicket[]>> {
  const { supabase, error: authError } = await getAdminClient()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('issue_tickets')
    .select('id, user_id, category, description, transaction_reference, table_reference, occurred_at, status, resolution_notes, created_at, updated_at')
    .in('status', ['investigating', 'resolved', 'closed'])
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) return { error: 'No fue posible cargar el archivo' }
  return { data: (data || []) as AdminIssueTicket[] }
}

export async function countAdminArchivedIssueTickets(): Promise<Result<number>> {
  const { supabase, error: authError } = await getAdminClient()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  const { count, error } = await supabase
    .from('issue_tickets')
    .select('id', { count: 'exact', head: true })
    .in('status', ['investigating', 'resolved', 'closed'])

  if (error) return { error: 'No fue posible contar el archivo' }
  return { data: count ?? 0 }
}

export async function getAdminIssueTicket(issueId: string): Promise<Result<AdminIssueTicket>> {
  const { supabase, error: authError } = await getAdminClient()
  if (authError || !supabase) return { error: authError || 'No autenticado' }
  const { data, error } = await supabase.from('issue_tickets')
    .select('id, user_id, category, description, transaction_reference, table_reference, occurred_at, status, resolution_notes, created_at, updated_at')
    .eq('id', issueId).single()
  if (error || !data) return { error: 'Consulta no encontrada' }
  return { data: data as AdminIssueTicket }
}

export async function listPlayerIssueTickets(): Promise<Result<AdminIssueTicket[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { data, error } = await supabase.from('issue_tickets')
    .select('id, user_id, category, description, transaction_reference, table_reference, occurred_at, status, resolution_notes, created_at, updated_at')
    .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100)
  if (error) return { error: 'No fue posible cargar tus reclamos' }
  return { data: (data || []) as AdminIssueTicket[] }
}

export async function appendIssueTicketMessage(ticketId: string, message: string): Promise<Result<{ message_id: string }>> {
  const trimmed = message.trim()
  if (!trimmed || trimmed.length > 5000) return { error: 'El mensaje es inválido' }
  const { supabase, error: authError } = await getAdminClient()
  if (authError || !supabase) return { error: authError || 'No autenticado' }
  const { data, error } = await supabase.rpc('append_issue_ticket_message', { p_ticket_id: ticketId, p_message: trimmed, p_from_admin: true }) as { data: { success: boolean; message_id?: string; error?: string } | null; error: { message: string } | null }
  if (error || !data?.success || !data.message_id) return { error: data?.error || 'No fue posible enviar la respuesta' }
  return { data: { message_id: data.message_id } }
}

export async function getPlayerIssueMessages(ticketId: string): Promise<Result<IssueTicketMessage[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { data, error } = await supabase.from('issue_ticket_messages')
    .select('id, ticket_id, message, from_admin, created_at').eq('ticket_id', ticketId).order('created_at', { ascending: true })
  if (error) return { error: 'No fue posible cargar el historial' }
  return { data: (data || []) as IssueTicketMessage[] }
}

export async function getAdminIssueMessages(ticketId: string): Promise<Result<IssueTicketMessage[]>> {
  const { supabase, error: authError } = await getAdminClient()
  if (authError || !supabase) return { error: authError || 'No autenticado' }
  const { data, error } = await supabase.from('issue_ticket_messages').select('id, ticket_id, message, from_admin, created_at').eq('ticket_id', ticketId).order('created_at', { ascending: true })
  if (error) return { error: 'No fue posible cargar el historial' }
  return { data: (data || []) as IssueTicketMessage[] }
}

export async function closeIssueTicket(ticketId: string): Promise<Result<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { data, error } = await supabase.rpc('close_issue_ticket', { p_ticket_id: ticketId }) as { data: { success: boolean; error?: string } | null; error: { message: string } | null }
  if (error || !data?.success) return { error: data?.error || 'No fue posible cerrar la consulta' }
  return { data: undefined }
}

export async function uploadIssueTicketImage(ticketId: string, formData: FormData): Promise<Result<{ id: string; file_name: string }>> {
  const file = formData.get('file')
  const description = String(formData.get('description') || '').trim()
  if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) return { error: 'La imagen debe ser JPG, PNG o WebP y pesar máximo 10 MB' }
  if (!description) return { error: 'Describe qué muestra esta imagen' }
  if (description.length > 1000) return { error: 'La descripción es demasiado larga' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { data: ticket } = await supabase.from('issue_tickets').select('user_id, status').eq('id', ticketId).single()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!ticket || (ticket.user_id !== user.id && profile?.role !== 'admin')) return { error: 'Acceso denegado' }
  if (ticket.status === 'closed' || ticket.status === 'resolved') return { error: 'La consulta está cerrada' }
  const extension = file.type.split('/')[1]
  const storagePath = `${user.id}/${ticketId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('issue-attachments').upload(storagePath, file)
  if (uploadError) return { error: 'No fue posible subir la imagen' }
  const { data, error } = await supabase.from('issue_ticket_attachments').insert({ ticket_id: ticketId, uploaded_by: user.id, storage_path: storagePath, file_name: file.name.slice(0, 255), description, mime_type: file.type, size_bytes: file.size }).select('id, file_name').single()
  if (error || !data) {
    await supabase.storage.from('issue-attachments').remove([storagePath])
    return { error: 'No fue posible registrar la imagen' }
  }
  await supabase.rpc('append_issue_ticket_message', { p_ticket_id: ticketId, p_message: `Imagen adjunta: ${data.file_name}. ${description}`, p_from_admin: profile?.role === 'admin' })
  return { data: data as { id: string; file_name: string } }
}

export async function getIssueTicketAttachmentUrl(attachmentId: string): Promise<Result<string>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { data: attachment, error } = await supabase.from('issue_ticket_attachments').select('id, ticket_id, storage_path').eq('id', attachmentId).single()
  if (error || !attachment) return { error: 'Adjunto no encontrado' }
  const { data: ticket } = await supabase.from('issue_tickets').select('user_id').eq('id', attachment.ticket_id).single()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!ticket || (ticket.user_id !== user.id && profile?.role !== 'admin')) return { error: 'Acceso denegado' }
  const { data, error: signedError } = await supabase.storage.from('issue-attachments').createSignedUrl(attachment.storage_path, 3600)
  if (signedError || !data?.signedUrl) return { error: 'No fue posible abrir la imagen' }
  return { data: data.signedUrl }
}

export async function listIssueTicketAttachments(ticketId: string): Promise<Result<IssueTicketAttachment[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { data, error } = await supabase.from('issue_ticket_attachments').select('id, ticket_id, uploaded_by, file_name, description, mime_type, size_bytes, created_at').eq('ticket_id', ticketId).order('created_at', { ascending: true })
  if (error) return { error: 'No fue posible cargar los adjuntos' }
  return { data: (data || []) as IssueTicketAttachment[] }
}
