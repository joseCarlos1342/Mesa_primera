'use server'

import { createClient } from '@/utils/supabase/server'

// ─── Types ───────────────────────────────────────────────────

export type SupportTicketStatus = 'pending' | 'attended' | 'finalized'

export interface SupportTicket {
  id: string
  user_id: string
  status: SupportTicketStatus
  closed_at: string | null
  closed_by: string | null
  closed_by_role: 'player' | 'admin' | null
  last_message_at: string
  last_message_from: 'player' | 'admin'
  last_message_preview: string | null
  message_count: number
  attachment_count: number
  created_at: string
  updated_at: string
}

export interface SupportMessage {
  id: string
  user_id: string
  ticket_id: string
  message: string
  from_admin: boolean
  is_resolved: boolean
  created_at: string
  read_at: string | null
}

export interface SupportAttachment {
  id: string
  ticket_id: string
  message_id: string | null
  uploaded_by: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  created_at: string
}

type ActionResult<T = void> = { data: T; error?: never } | { data?: never; error: string }

// ─── Helpers ─────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null, error: 'No autenticado' } as const
  return { supabase, user, error: null } as const
}

async function isCallerAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('is_admin' as never) as { data: boolean | null }
  return data === true
}

// ─── Create Ticket ──────────────────────────────────────────

export async function createSupportTicket(ticketId: string, message: string): Promise<ActionResult<{ ticket_id: string; message_id: string }>> {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase || !user) return { error: authError || 'No autenticado' }

  const trimmed = message.trim()
  if (!trimmed) return { error: 'El mensaje no puede estar vacío' }
  if (trimmed.length > 5000) return { error: 'El mensaje es demasiado largo' }

  // Create ticket
  const { error: tError } = await supabase
    .from('support_tickets')
    .insert({
      id: ticketId,
      user_id: user.id,
      status: 'pending',
      last_message_from: 'player',
      last_message_preview: trimmed.slice(0, 100),
      message_count: 1,
    })

  if (tError) return { error: tError.message }

  // Insert first message
  const { data: msg, error: mError } = await supabase
    .from('support_messages')
    .insert({
      user_id: user.id,
      message: trimmed,
      from_admin: false,
      ticket_id: ticketId,
      is_resolved: false,
    })
    .select('id')
    .single()

  if (mError) return { error: mError.message }

  return { data: { ticket_id: ticketId, message_id: msg.id } }
}

// ─── Append Message ─────────────────────────────────────────

export async function appendSupportMessage(
  ticketId: string,
  message: string
): Promise<ActionResult<{ message_id: string; from: 'player' | 'admin' }>> {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase || !user) return { error: authError || 'No autenticado' }

  const trimmed = message.trim()
  if (!trimmed) return { error: 'El mensaje no puede estar vacío' }
  if (trimmed.length > 5000) return { error: 'El mensaje es demasiado largo' }

  const admin = await isCallerAdmin(supabase)

  // Use RPC for atomic ticket validation + message insert
  const { data, error } = await supabase.rpc('append_support_message', {
    p_ticket_id: ticketId,
    p_message: trimmed,
    p_from_admin: admin,
  }) as { data: { success: boolean; error?: string; message_id?: string; from?: string } | null; error: any }

  if (error) return { error: error.message }
  if (!data?.success) return { error: data?.error || 'Error desconocido' }

  return {
    data: {
      message_id: data.message_id!,
      from: (data.from as 'player' | 'admin') || (admin ? 'admin' : 'player'),
    },
  }
}

// ─── Close Ticket ───────────────────────────────────────────

export async function closeSupportTicket(
  ticketId: string
): Promise<ActionResult<{ closed_by_role: 'player' | 'admin' }>> {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase || !user) return { error: authError || 'No autenticado' }

  const admin = await isCallerAdmin(supabase)

  const { data, error } = await supabase.rpc('close_support_ticket', {
    p_ticket_id: ticketId,
    p_role: admin ? 'admin' : 'player',
  }) as { data: { success: boolean; error?: string; closed_by_role?: string } | null; error: any }

  if (error) return { error: error.message }
  if (!data?.success) return { error: data?.error || 'Error desconocido' }

  return { data: { closed_by_role: (data.closed_by_role as 'player' | 'admin') || (admin ? 'admin' : 'player') } }
}

// ─── Get Ticket ─────────────────────────────────────────────

export async function getSupportTicket(ticketId: string): Promise<ActionResult<SupportTicket>> {
  const { supabase, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (error) return { error: error.message }
  return { data: data as SupportTicket }
}

// ─── Get Ticket History (messages + attachments) ────────────

export async function getSupportTicketHistory(ticketId: string): Promise<ActionResult<{
  messages: SupportMessage[]
  attachments: SupportAttachment[]
}>> {
  const { supabase, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  const [msgResult, attResult] = await Promise.all([
    supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true }),
    supabase
      .from('support_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true }),
  ])

  if (msgResult.error) return { error: msgResult.error.message }

  return {
    data: {
      messages: (msgResult.data || []) as SupportMessage[],
      attachments: (attResult.data || []) as SupportAttachment[],
    },
  }
}

// ─── List User Tickets ──────────────────────────────────────

export async function listUserTickets(): Promise<ActionResult<SupportTicket[]>> {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase || !user) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: (data || []) as SupportTicket[] }
}

// ─── List All Tickets (admin) ───────────────────────────────

export async function listAllTickets(filter?: SupportTicketStatus): Promise<ActionResult<Array<SupportTicket & { user: { username: string; full_name: string; avatar_url: string | null } }>>> {
  const { supabase, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  let query = supabase
    .from('support_tickets')
    .select('*, user:profiles(username, full_name, avatar_url)')
    .order('updated_at', { ascending: false })

  if (filter) {
    query = query.eq('status', filter)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data: data as any }
}

// ─── Upload Attachment ──────────────────────────────────────

export async function uploadSupportAttachment(
  ticketId: string,
  formData: FormData
): Promise<ActionResult<SupportAttachment>> {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase || !user) return { error: authError || 'No autenticado' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No se proporcionó archivo' }

  // Validate file
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Tipo de archivo no permitido. Solo imágenes (JPG, PNG, WebP, GIF) y PDF.' }
  }
  if (file.size > MAX_SIZE) {
    return { error: 'El archivo no puede superar 10 MB' }
  }

  // Check ticket exists and is open
  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .select('id, status, user_id')
    .eq('id', ticketId)
    .single()

  if (tErr || !ticket) return { error: 'Ticket no encontrado' }
  if (ticket.status === 'finalized') return { error: 'El ticket está finalizado' }

  const admin = await isCallerAdmin(supabase)
  if (ticket.user_id !== user.id && !admin) {
    return { error: 'No autorizado' }
  }

  // Upload to storage
  const ext = file.name.split('.').pop() || 'bin'
  const storagePath = `${user.id}/${ticketId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('support-attachments')
    .upload(storagePath, file)

  if (uploadError) return { error: uploadError.message }

  // Record metadata
  const { data: attachment, error: insertError } = await supabase
    .from('support_attachments')
    .insert({
      ticket_id: ticketId,
      uploaded_by: user.id,
      storage_path: storagePath,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  // Update counter
  await supabase
    .from('support_tickets')
    .update({ attachment_count: (ticket as any).attachment_count + 1, updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  return { data: attachment as SupportAttachment }
}

// ─── Get Attachment URL (signed) ────────────────────────────

export async function getSupportAttachmentUrl(storagePath: string): Promise<ActionResult<string>> {
  const { supabase, error: authError } = await getAuthenticatedUser()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase.storage
    .from('support-attachments')
    .createSignedUrl(storagePath, 3600)

  if (error || !data?.signedUrl) return { error: error?.message || 'No se pudo generar URL' }
  return { data: data.signedUrl }
}
