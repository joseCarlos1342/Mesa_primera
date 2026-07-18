'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const RECOVERY_PAGE_SIZE = 25
const RECOVERY_EXPORT_MAX_ROWS = 5000

type RecoveryIncidentRow = {
  game_id: string
  room_id: string
  cause_code: string
  detected_at: string
  resolved_at: string | null
  status: 'cancelled_crash' | 'manual_review' | 'closed'
  resolution_reason: string | null
  refunds_completed_count: number
  refunds_total_count: number
}

type RecoveryIncidentPageRow = RecoveryIncidentRow & {
  replay_available: boolean
  total_count: number
}

export type AdminRecoveryIncident = {
  incidentId?: string
  gameId: string
  roomId: string
  cause: string
  detectedAt: string
  resolvedAt: string | null
  status: 'cancelled_crash' | 'manual_review' | 'closed'
  resolutionReason: string | null
  completedRefunds: number
  totalRefunds: number
  replayAvailable: boolean
  acknowledgedAt?: string | null
}

export type RecoveryIncidentCursor = {
  detectedAt: string
  gameId: string
}

export type RecoveryIncidentPage = {
  incidents: AdminRecoveryIncident[]
  total: number
  nextCursor: RecoveryIncidentCursor | null
}

export type AdminRecoveryIncidentExport = {
  roomId: string
  gameId: string
  cause: string
  status: 'cancelled_crash' | 'manual_review' | 'closed'
  resolutionReason: string | null
  completedRefunds: number
  totalRefunds: number
  detectedAt: string
  resolvedAt: string | null
}

type RecoveryActionResult<T> = { data: T } | { error: string }

const reconcileRecoveryRefundSchema = z.object({
  refundId: z.uuid('El refund no es válido'),
  reason: z.string().trim().min(10, 'El motivo debe tener entre 10 y 500 caracteres').max(500, 'El motivo debe tener entre 10 y 500 caracteres'),
})

const recoveryIncidentIdSchema = z.uuid('El incidente no es válido')

const closeRecoveryIncidentSchema = z.object({
  incidentId: recoveryIncidentIdSchema,
  reason: z.string().trim().min(10, 'El motivo debe tener entre 10 y 500 caracteres').max(500, 'El motivo debe tener entre 10 y 500 caracteres'),
  confirmed: z.literal(true, 'Debes confirmar el cierre irreversible'),
})

const recoveryIncidentFiltersBaseSchema = z.object({
  status: z.enum(['cancelled_crash', 'manual_review', 'closed']).optional(),
  cause: z.string().trim().min(1).max(80).optional(),
  query: z.string().trim().max(120).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  cursor: z.object({
    detectedAt: z.iso.datetime({ offset: true }),
    gameId: z.string().uuid(),
  }).optional(),
}).strict()

const hasValidDateRange = (filters: { from?: string; to?: string }) => (
  !filters.from || !filters.to || filters.from <= filters.to
)

const recoveryIncidentFiltersSchema = recoveryIncidentFiltersBaseSchema.refine(
  hasValidDateRange,
  { message: 'El rango de fechas es inválido' }
)

const recoveryIncidentExportFiltersSchema = recoveryIncidentFiltersBaseSchema
  .omit({ cursor: true })
  .refine(hasValidDateRange, { message: 'El rango de fechas es inválido' })

export type RecoveryIncidentFilters = z.infer<typeof recoveryIncidentFiltersSchema>

export type AdminRecoveryRefund = {
  refundId: string
  userId: string
  amountCents: number
  status: 'pending' | 'completed' | 'failed'
  ledgerId: string | null
  completedAt: string | null
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Acceso denegado')
  return supabase
}

function mapRecoveryIncident(incident: RecoveryIncidentRow | RecoveryIncidentPageRow): AdminRecoveryIncident {
  return {
    gameId: incident.game_id,
    roomId: incident.room_id,
    cause: incident.cause_code,
    detectedAt: incident.detected_at,
    resolvedAt: incident.resolved_at,
    status: incident.status,
    resolutionReason: incident.resolution_reason,
    completedRefunds: Number(incident.refunds_completed_count),
    totalRefunds: Number(incident.refunds_total_count),
    replayAvailable: 'replay_available' in incident ? incident.replay_available : false,
  }
}

export async function getAdminRecoveryIncidents(): Promise<AdminRecoveryIncident[]> {
  const supabase = await verifyAdmin()
  const { data, error } = await supabase.rpc('list_admin_recovery_incidents') as {
    data: RecoveryIncidentRow[] | null
    error: { message: string } | null
  }

  if (error) throw new Error('No se pudo cargar el historial de recuperación')

  return (data ?? []).map(mapRecoveryIncident)
}

export async function getAdminRecoveryIncidentPage(input: RecoveryIncidentFilters = {}): Promise<RecoveryIncidentPage> {
  const parsedFilters = recoveryIncidentFiltersSchema.safeParse(input)
  if (!parsedFilters.success) throw new Error('Filtros de recuperación inválidos')

  const filters = parsedFilters.data
  const supabase = await verifyAdmin()
  const { data, error } = await supabase.rpc('list_admin_recovery_incidents_v2', {
    p_status: filters.status ?? null,
    p_cause_code: filters.cause ?? null,
    p_query: filters.query || null,
    p_detected_from: filters.from ?? null,
    p_detected_to: filters.to ?? null,
    p_cursor_detected_at: filters.cursor?.detectedAt ?? null,
    p_cursor_game_id: filters.cursor?.gameId ?? null,
    p_limit: RECOVERY_PAGE_SIZE + 1,
  }) as {
    data: RecoveryIncidentPageRow[] | null
    error: { message: string } | null
  }

  if (error) throw new Error('No se pudo cargar el historial de recuperación')

  const rows = data ?? []
  const pageRows = rows.slice(0, RECOVERY_PAGE_SIZE)
  const lastRow = pageRows.at(-1)
  const gameIds = pageRows.map((row) => row.game_id)
  const { data: recoveryRows, error: recoveryError } = gameIds.length === 0
    ? { data: [], error: null }
    : await supabase
      .from('game_recovery_incidents')
      .select('id, game_id, acknowledged_at')
      .in('game_id', gameIds)

  if (recoveryError) throw new Error('No se pudo cargar el historial de recuperación')
  const recoveryByGameId = new Map((recoveryRows ?? []).map((incident) => [incident.game_id, incident]))

  return {
    incidents: pageRows.map((row) => {
      const incident = recoveryByGameId.get(row.game_id)
      return {
        ...mapRecoveryIncident(row),
        incidentId: incident?.id,
        acknowledgedAt: incident?.acknowledged_at,
      }
    }),
    total: Number(rows.at(0)?.total_count ?? 0),
    nextCursor: rows.length > RECOVERY_PAGE_SIZE && lastRow
      ? { detectedAt: lastRow.detected_at, gameId: lastRow.game_id }
      : null,
  }
}

export async function getAdminRecoveryIncidentExport(input: Omit<RecoveryIncidentFilters, 'cursor'> = {}): Promise<AdminRecoveryIncidentExport[]> {
  const parsedFilters = recoveryIncidentExportFiltersSchema.safeParse(input)
  if (!parsedFilters.success) throw new Error('Filtros de recuperación inválidos')

  const filters = parsedFilters.data
  const supabase = await verifyAdmin()
  const { data, error } = await supabase.rpc('list_admin_recovery_incidents_export', {
    p_status: filters.status ?? null,
    p_cause_code: filters.cause ?? null,
    p_query: filters.query || null,
    p_detected_from: filters.from ?? null,
    p_detected_to: filters.to ?? null,
  }) as {
    data: RecoveryIncidentRow[] | null
    error: { message: string } | null
  }

  if (error) throw new Error('No se pudo exportar el historial de recuperación')
  const rows = data ?? []
  if (rows.length > RECOVERY_EXPORT_MAX_ROWS) {
    throw new Error('La exportación supera 5000 filas; acota los filtros')
  }

  return rows.map((incident) => ({
    roomId: incident.room_id,
    gameId: incident.game_id,
    cause: incident.cause_code,
    status: incident.status,
    resolutionReason: incident.resolution_reason,
    completedRefunds: Number(incident.refunds_completed_count),
    totalRefunds: Number(incident.refunds_total_count),
    detectedAt: incident.detected_at,
    resolvedAt: incident.resolved_at,
  }))
}

export async function reconcileRecoveryRefund(input: {
  refundId: string
  reason: string
}): Promise<RecoveryActionResult<{
  refundId: string
  ledgerId: string
  alreadyReconciled: boolean
}>> {
  const parsed = reconcileRecoveryRefundSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Refund inválido' }

  const supabase = await verifyAdmin()
  const { data, error } = await supabase.rpc('reconcile_game_recovery_refund', {
    p_refund_id: parsed.data.refundId,
    p_reason: parsed.data.reason,
  }) as {
    data: { success?: boolean; error?: string; refund_id?: string; ledger_id?: string; already_reconciled?: boolean } | null
    error: { message: string } | null
  }

  if (error) return { error: 'No fue posible reconciliar el refund' }
  if (!data?.success || !data.refund_id || !data.ledger_id || typeof data.already_reconciled !== 'boolean') {
    return { error: 'No fue posible reconciliar el refund' }
  }

  revalidatePath('/admin/recovery')
  revalidatePath('/admin/ledger')
  return {
    data: {
      refundId: data.refund_id,
      ledgerId: data.ledger_id,
      alreadyReconciled: data.already_reconciled,
    },
  }
}

export async function getAdminRecoveryRefunds(gameId: string): Promise<AdminRecoveryRefund[]> {
  const parsedGameId = z.uuid('El juego no es válido').safeParse(gameId)
  if (!parsedGameId.success) throw new Error('El juego no es válido')

  const supabase = await verifyAdmin()
  const { data, error } = await supabase.rpc('list_admin_recovery_refunds', {
    p_game_id: parsedGameId.data,
  }) as {
    data: Array<{
      refund_id: string
      user_id: string
      amount_cents: number
      status: 'pending' | 'completed' | 'failed'
      ledger_id: string | null
      completed_at: string | null
    }> | null
    error: { message: string } | null
  }

  if (error) throw new Error('No se pudo cargar el detalle de refunds')
  return (data ?? []).map((refund) => ({
    refundId: refund.refund_id,
    userId: refund.user_id,
    amountCents: Number(refund.amount_cents),
    status: refund.status,
    ledgerId: refund.ledger_id,
    completedAt: refund.completed_at,
  }))
}

export async function acknowledgeRecoveryIncident(incidentId: string): Promise<RecoveryActionResult<{
  incidentId: string
  acknowledgedAt: string
  alreadyAcknowledged: boolean
}>> {
  const parsedIncidentId = recoveryIncidentIdSchema.safeParse(incidentId)
  if (!parsedIncidentId.success) return { error: parsedIncidentId.error.issues[0]?.message ?? 'Incidente inválido' }

  const supabase = await verifyAdmin()
  const { data, error } = await supabase.rpc('acknowledge_game_recovery_incident', {
    p_incident_id: parsedIncidentId.data,
  }) as {
    data: { success?: boolean; error?: string; incident_id?: string; acknowledged_at?: string; already_acknowledged?: boolean } | null
    error: { message: string } | null
  }

  if (error) return { error: 'No fue posible reconocer el incidente' }
  if (!data?.success || !data.incident_id || !data.acknowledged_at || typeof data.already_acknowledged !== 'boolean') {
    return { error: 'No fue posible reconocer el incidente' }
  }

  revalidatePath('/admin/recovery')
  return {
    data: {
      incidentId: data.incident_id,
      acknowledgedAt: data.acknowledged_at,
      alreadyAcknowledged: data.already_acknowledged,
    },
  }
}

export async function closeRecoveryIncident(input: {
  incidentId: string
  reason: string
  confirmed: boolean
}): Promise<RecoveryActionResult<{
  incidentId: string
  closedAt: string
  alreadyClosed: boolean
}>> {
  const parsed = closeRecoveryIncidentSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Cierre inválido' }

  const supabase = await verifyAdmin()
  const { data, error } = await supabase.rpc('close_game_recovery_incident', {
    p_incident_id: parsed.data.incidentId,
    p_reason: parsed.data.reason,
  }) as {
    data: { success?: boolean; error?: string; incident_id?: string; closed_at?: string; already_closed?: boolean } | null
    error: { message: string } | null
  }

  if (error) return { error: 'No fue posible cerrar el incidente' }
  if (!data?.success || !data.incident_id || !data.closed_at || typeof data.already_closed !== 'boolean') {
    return { error: 'No fue posible cerrar el incidente' }
  }

  revalidatePath('/admin/recovery')
  return {
    data: {
      incidentId: data.incident_id,
      closedAt: data.closed_at,
      alreadyClosed: data.already_closed,
    },
  }
}
