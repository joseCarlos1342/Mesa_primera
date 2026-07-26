'use server'

import { createClient } from '@/utils/supabase/server'
import { logAdminAction } from './admin-audit'
import { globalSearch } from './admin-search'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  AdminDisputeCase,
  DisputePriority,
  DisputeStatus,
  EvidenceLink,
  InvestigationSource,
  InvestigationType,
  ActionResult,
} from '@/types/admin-search'

const DISPUTE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
const DISPUTE_TITLE_MAX_LENGTH = 120
const DISPUTE_DESCRIPTION_MAX_LENGTH = 5000
const resolutionSchema = z.object({
  outcome: z.enum(['no_action', 'warning', 'sanction']),
  notes: z.string().trim().min(10, 'Las notas de resolución deben tener al menos 10 caracteres').max(5000),
})
const compensationSchema = z.object({
  userId: z.uuid('El jugador no es válido'),
  amountCents: z.number().int().positive().refine(
    (amount) => amount % 100000 === 0,
    'El monto debe ser múltiplo de $1.000 COP'
  ),
  reason: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
})
const investigationSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(DISPUTE_TITLE_MAX_LENGTH, 'El título es demasiado largo'),
  description: z.string().trim().max(DISPUTE_DESCRIPTION_MAX_LENGTH, 'La descripción es demasiado larga'),
  investigation_type: z.enum(['game_integrity', 'collusion', 'fraud', 'bonus_abuse', 'conduct']),
  priority: z.enum(DISPUTE_PRIORITIES),
  source: z.enum(['manual', 'global_search', 'server_alert', 'replay']),
  source_query: z.string().trim().min(2).max(64).optional(),
  subject_user_ids: z.array(z.uuid('Hay un jugador relacionado inválido')).max(20),
  game_id: z.uuid('La partida no es válida').optional(),
  room_id: z.string().trim().max(160).optional(),
})
const disputeListFiltersSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
  priority: z.enum(DISPUTE_PRIORITIES).optional(),
  investigationType: z.enum(['game_integrity', 'collusion', 'fraud', 'bonus_abuse', 'conduct']).optional(),
  limit: z.number().int().positive().max(100).optional(),
}).strict()

type RpcMutationResult = {
  success?: boolean
  error?: string
  id?: string
  status?: string
  assigned_to?: string
  resolution_outcome?: string
  compensation_status?: string
  ledger_id?: string
}

// ─── Auth ───────────────────────────────────────────────────

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return { supabase: null, adminId: null, error: 'No autenticado' } as const

  const { data: userRecord } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (userRecord?.role !== 'admin') return { supabase: null, adminId: null, error: 'Acceso denegado' } as const
  return { supabase, adminId: userData.user.id, error: null } as const
}

// ─── Create Dispute ─────────────────────────────────────────

export async function createDispute(input: {
  title: string
  description: string
  priority: DisputePriority
  evidence_snapshot?: EvidenceLink[]
  support_ticket_id?: string
  investigation_type?: InvestigationType
  source?: InvestigationSource
  source_query?: string
  subject_user_ids?: string[]
  game_id?: string
  room_id?: string
}): Promise<ActionResult<{ id: string }>> {
  if (!DISPUTE_PRIORITIES.includes(input.priority)) return { error: 'Prioridad inválida' }
  const parsed = investigationSchema.safeParse({
    ...input,
    investigation_type: input.investigation_type ?? 'game_integrity',
    source: input.source ?? 'manual',
    subject_user_ids: input.subject_user_ids ?? [],
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Investigación inválida' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  let evidence: EvidenceLink[] = input.evidence_snapshot ?? []
  if (parsed.data.source_query) {
    const searchResult = await globalSearch(parsed.data.source_query)
    if (searchResult.error || !searchResult.data) return { error: searchResult.error || 'No fue posible resolver la evidencia' }
    evidence = searchResult.data.matches.slice(0, 50).map((match) => ({
      entity: match.entity,
      entity_id: match.id,
      label: match.label.slice(0, 240),
      ...(match.target_id ? { target_id: match.target_id } : {}),
    }))
  }

  const { data, error } = await supabase.rpc('create_admin_investigation', {
    p_description: parsed.data.description,
    p_evidence: evidence,
    p_game_id: parsed.data.game_id ?? null,
    p_investigation_type: parsed.data.investigation_type,
    p_priority: parsed.data.priority,
    p_room_id: parsed.data.room_id ?? null,
    p_source: parsed.data.source,
    p_subject_user_ids: parsed.data.subject_user_ids,
    p_title: parsed.data.title,
  }) as { data: RpcMutationResult | null; error: { message: string } | null }
  if (error) return { error: 'No fue posible crear la investigación' }
  if (!data?.success || !data.id) return { error: data?.error || 'No fue posible crear la investigación' }

  await logAdminAction(adminId, 'dispute_created', 'dispute', data.id, {
    evidence_count: evidence.length,
    investigation_type: parsed.data.investigation_type,
    source: parsed.data.source,
  })
  revalidatePath('/admin/disputes')
  return { data: { id: data.id } }
}

// ─── Assign Dispute ─────────────────────────────────────────

export async function assignDispute(
  disputeId: string,
  _assignToAdminId: string
): Promise<ActionResult<{ id: string; status: string; assigned_to: string }>> {
  return startDispute(disputeId)
}

export async function startDispute(
  disputeId: string
): Promise<ActionResult<{ id: string; status: string; assigned_to: string }>> {
  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase.rpc('start_admin_investigation', {
    p_case_id: disputeId,
  }) as { data: RpcMutationResult | null; error: { message: string } | null }

  if (error) return { error: 'No fue posible iniciar la investigación' }
  if (!data?.success || !data.id || !data.status || !data.assigned_to) {
    return { error: data?.error || 'No fue posible iniciar la investigación' }
  }

  await logAdminAction(adminId, 'dispute_started', 'dispute', disputeId)
  revalidatePath('/admin/disputes')
  revalidatePath(`/admin/disputes/${disputeId}`)
  return { data: { id: data.id, status: data.status, assigned_to: data.assigned_to } }
}

// ─── Resolve Dispute ────────────────────────────────────────

export async function resolveDispute(
  disputeId: string,
  resolution: string | { outcome: 'no_action' | 'warning' | 'sanction'; notes: string }
): Promise<ActionResult<{ id: string; status: string; resolution_notes?: string; resolved_by?: string; resolution_outcome?: string }>> {
  if (typeof resolution === 'string' && !resolution.trim()) return { error: 'Las notas de resolución son obligatorias' }
  const parsed = resolutionSchema.safeParse(typeof resolution === 'string'
    ? { outcome: 'no_action', notes: resolution }
    : resolution)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Resolución inválida' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }
  const { data, error } = await supabase.rpc('resolve_admin_investigation', {
    p_case_id: disputeId,
    p_outcome: parsed.data.outcome,
    p_notes: parsed.data.notes,
  }) as { data: RpcMutationResult | null; error: { message: string } | null }
  if (error) return { error: 'No fue posible resolver la investigación' }
  if (!data?.success || !data.id || !data.status || !data.resolution_outcome) {
    return { error: data?.error || 'No fue posible resolver la investigación' }
  }
  await logAdminAction(adminId, 'dispute_resolved', 'dispute', disputeId, {
    outcome: parsed.data.outcome,
  })
  revalidatePath('/admin/disputes')
  revalidatePath(`/admin/disputes/${disputeId}`)
  return { data: { id: data.id, status: data.status, resolution_outcome: data.resolution_outcome } }
}

export async function proposeDisputeCompensation(
  disputeId: string,
  input: { userId: string; amountCents: number; reason: string }
): Promise<ActionResult<{ id: string; compensation_status: string }>> {
  const parsed = compensationSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Compensación inválida' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }
  const { data, error } = await supabase.rpc('propose_admin_investigation_compensation', {
    p_case_id: disputeId,
    p_user_id: parsed.data.userId,
    p_amount_cents: parsed.data.amountCents,
    p_reason: parsed.data.reason,
  }) as { data: RpcMutationResult | null; error: { message: string } | null }
  if (error) return { error: 'No fue posible proponer la compensación' }
  if (!data?.success || !data.id || !data.compensation_status) {
    return { error: data?.error || 'No fue posible proponer la compensación' }
  }
  await logAdminAction(adminId, 'dispute_compensation_proposed', 'dispute', disputeId, {
    amount_cents: parsed.data.amountCents,
    user_id: parsed.data.userId,
  })
  revalidatePath(`/admin/disputes/${disputeId}`)
  return { data: { id: data.id, compensation_status: data.compensation_status } }
}

export async function approveDisputeCompensation(
  disputeId: string
): Promise<ActionResult<{ id: string; status: string; ledger_id: string }>> {
  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }
  const { data, error } = await supabase.rpc('approve_admin_investigation_compensation', {
    p_case_id: disputeId,
  }) as { data: RpcMutationResult | null; error: { message: string } | null }
  if (error) return { error: 'No fue posible aprobar la compensación' }
  if (!data?.success || !data.id || !data.status || !data.ledger_id) {
    return { error: data?.error || 'No fue posible aprobar la compensación' }
  }
  await logAdminAction(adminId, 'dispute_compensation_approved', 'dispute', disputeId, {
    ledger_id: data.ledger_id,
  })
  revalidatePath('/admin/disputes')
  revalidatePath(`/admin/disputes/${disputeId}`)
  return { data: { id: data.id, status: data.status, ledger_id: data.ledger_id } }
}

export async function cancelDisputeCompensation(
  disputeId: string,
  reason: string
): Promise<ActionResult<{ id: string; status: string }>> {
  if (typeof reason !== 'string') {
    return { error: 'El motivo de cancelación debe tener entre 10 y 500 caracteres' }
  }
  const trimmedReason = reason.trim()
  if (trimmedReason.length < 10 || trimmedReason.length > 500) {
    return { error: 'El motivo de cancelación debe tener entre 10 y 500 caracteres' }
  }
  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }
  const { data, error } = await supabase.rpc('cancel_admin_investigation_compensation', {
    p_case_id: disputeId,
    p_reason: trimmedReason,
  }) as { data: RpcMutationResult | null; error: { message: string } | null }
  if (error) return { error: 'No fue posible cancelar la compensación' }
  if (!data?.success || !data.id || !data.status) return { error: data?.error || 'No fue posible cancelar la compensación' }
  await logAdminAction(adminId, 'dispute_compensation_cancelled', 'dispute', disputeId)
  revalidatePath(`/admin/disputes/${disputeId}`)
  return { data: { id: data.id, status: data.status } }
}

// ─── Dismiss Dispute ────────────────────────────────────────

export async function dismissDispute(
  disputeId: string,
  reason: string
): Promise<ActionResult<{ id: string; status: string }>> {
  if (typeof reason !== 'string') return { error: 'La razón de descarte es obligatoria' }
  if (!reason.trim()) return { error: 'La razón de descarte es obligatoria' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase.rpc('dismiss_admin_investigation', {
    p_case_id: disputeId,
    p_reason: reason.trim(),
  }) as { data: RpcMutationResult | null; error: { message: string } | null }
  if (error) return { error: 'No fue posible descartar la investigación' }
  if (!data?.success || !data.id || !data.status) {
    return { error: data?.error || 'No fue posible descartar la investigación' }
  }

  await logAdminAction(adminId, 'dispute_dismissed', 'dispute', disputeId, {
    reason,
  })

  revalidatePath('/admin/disputes')
  return { data: { id: data.id, status: data.status } }
}

// ─── Get Dispute ────────────────────────────────────────────

export async function getDispute(
  disputeId: string
): Promise<ActionResult<AdminDisputeCase>> {
  const { supabase, error: authError } = await verifyAdmin()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('admin_dispute_cases')
    .select('*')
    .eq('id', disputeId)
    .single()

  if (error) return { error: 'Investigación no encontrada' }
  return { data: data as AdminDisputeCase }
}

// ─── List Disputes ──────────────────────────────────────────

export async function listDisputes(
  filters: number | {
    status?: DisputeStatus
    priority?: DisputePriority
    investigationType?: InvestigationType
    limit?: number
  } = 50
): Promise<ActionResult<AdminDisputeCase[]>> {
  if (typeof filters !== 'number') {
    const parsedFilters = disputeListFiltersSchema.safeParse(filters)
    if (!parsedFilters.success) return { error: 'Filtros de investigaciones inválidos' }
    filters = parsedFilters.data
  }

  const { supabase, error: authError } = await verifyAdmin()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  let query = supabase
    .from('admin_dispute_cases')
    .select('*')

  if (typeof filters !== 'number') {
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.investigationType) query = query.eq('investigation_type', filters.investigationType)
  }

  const limit = typeof filters === 'number' ? filters : filters.limit ?? 50
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100))

  if (error) return { error: 'No fue posible cargar las investigaciones' }
  return { data: (data || []) as AdminDisputeCase[] }
}
