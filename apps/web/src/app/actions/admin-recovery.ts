'use server'

import { createClient } from '@/utils/supabase/server'

type RecoveryIncidentRow = {
  game_id: string
  room_id: string
  cause_code: string
  detected_at: string
  resolved_at: string | null
  status: 'cancelled_crash' | 'manual_review'
  resolution_reason: string | null
  refunds_completed_count: number
  refunds_total_count: number
}

export type AdminRecoveryIncident = {
  gameId: string
  roomId: string
  cause: string
  detectedAt: string
  resolvedAt: string | null
  status: 'cancelled_crash' | 'manual_review'
  resolutionReason: string | null
  completedRefunds: number
  totalRefunds: number
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

export async function getAdminRecoveryIncidents(): Promise<AdminRecoveryIncident[]> {
  const supabase = await verifyAdmin()
  const { data, error } = await supabase.rpc('list_admin_recovery_incidents') as {
    data: RecoveryIncidentRow[] | null
    error: { message: string } | null
  }

  if (error) throw new Error('No se pudo cargar el historial de recuperación')

  return (data ?? []).map((incident) => ({
    gameId: incident.game_id,
    roomId: incident.room_id,
    cause: incident.cause_code,
    detectedAt: incident.detected_at,
    resolvedAt: incident.resolved_at,
    status: incident.status,
    resolutionReason: incident.resolution_reason,
    completedRefunds: incident.refunds_completed_count,
    totalRefunds: incident.refunds_total_count,
  }))
}
