'use server'

import { createClient } from '@/utils/supabase/server'
import { logAdminAction } from './admin-audit'
import { revalidatePath } from 'next/cache'
import type {
  AdminDisputeCase,
  DisputePriority,
  EvidenceLink,
  ActionResult,
} from '@/types/admin-search'

const DISPUTE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
const DISPUTE_TITLE_MAX_LENGTH = 120
const DISPUTE_DESCRIPTION_MAX_LENGTH = 5000

function isDisputePriority(priority: string): priority is DisputePriority {
  return DISPUTE_PRIORITIES.includes(priority as DisputePriority)
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
  evidence_snapshot: EvidenceLink[]
  support_ticket_id?: string
}): Promise<ActionResult<{ id: string }>> {
  const title = input.title.trim()
  const description = input.description.trim()

  if (!title) return { error: 'El título es obligatorio' }
  if (title.length > DISPUTE_TITLE_MAX_LENGTH) return { error: 'El título es demasiado largo' }
  if (description.length > DISPUTE_DESCRIPTION_MAX_LENGTH) return { error: 'La descripción es demasiado larga' }
  if (!isDisputePriority(input.priority)) return { error: 'Prioridad inválida' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('admin_dispute_cases')
    .insert({
      title,
      description,
      priority: input.priority,
      opened_by: adminId,
      evidence_snapshot: input.evidence_snapshot,
      support_ticket_id: input.support_ticket_id || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logAdminAction(adminId, 'dispute_created', 'dispute', data.id, {
    title,
    priority: input.priority,
    evidence_count: input.evidence_snapshot.length,
    support_ticket_id: input.support_ticket_id || null,
  })

  revalidatePath('/admin/disputes')
  return { data: { id: data.id } }
}

// ─── Assign Dispute ─────────────────────────────────────────

export async function assignDispute(
  disputeId: string,
  assignToAdminId: string
): Promise<ActionResult<{ id: string; status: string; assigned_to: string }>> {
  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('admin_dispute_cases')
    .update({
      assigned_to: assignToAdminId,
      status: 'investigating',
    })
    .eq('id', disputeId)
    .select('id, status, assigned_to')
    .single()

  if (error) return { error: error.message }

  await logAdminAction(adminId, 'dispute_assigned', 'dispute', disputeId, {
    assigned_to: assignToAdminId,
  })

  revalidatePath('/admin/disputes')
  return { data }
}

// ─── Resolve Dispute ────────────────────────────────────────

export async function resolveDispute(
  disputeId: string,
  resolutionNotes: string
): Promise<ActionResult<{ id: string; status: string; resolution_notes: string; resolved_by: string }>> {
  if (!resolutionNotes.trim()) return { error: 'Las notas de resolución son obligatorias' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('admin_dispute_cases')
    .update({
      status: 'resolved',
      resolution_notes: resolutionNotes.trim(),
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
    .select('id, status, resolution_notes, resolved_by')
    .single()

  if (error) return { error: error.message }

  await logAdminAction(adminId, 'dispute_resolved', 'dispute', disputeId, {
    resolution_notes: resolutionNotes,
  })

  revalidatePath('/admin/disputes')
  return { data }
}

// ─── Dismiss Dispute ────────────────────────────────────────

export async function dismissDispute(
  disputeId: string,
  reason: string
): Promise<ActionResult<{ id: string; status: string }>> {
  if (!reason.trim()) return { error: 'La razón de descarte es obligatoria' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('admin_dispute_cases')
    .update({
      status: 'dismissed',
      resolution_notes: reason.trim(),
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
    .select('id, status')
    .single()

  if (error) return { error: error.message }

  await logAdminAction(adminId, 'dispute_dismissed', 'dispute', disputeId, {
    reason,
  })

  revalidatePath('/admin/disputes')
  return { data }
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

  if (error) return { error: error.message }
  return { data: data as AdminDisputeCase }
}

// ─── List Disputes ──────────────────────────────────────────

export async function listDisputes(
  limit = 50
): Promise<ActionResult<AdminDisputeCase[]>> {
  const { supabase, error: authError } = await verifyAdmin()
  if (authError || !supabase) return { error: authError || 'No autenticado' }

  const { data, error } = await supabase
    .from('admin_dispute_cases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { error: error.message }
  return { data: (data || []) as AdminDisputeCase[] }
}
