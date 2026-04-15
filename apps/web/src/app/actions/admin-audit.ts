'use server'

import { createClient } from '@/utils/supabase/server'

export type AuditOptions = {
  context?: string
  before_state?: Record<string, unknown> | null
  after_state?: Record<string, unknown> | null
  actor_kind?: 'admin' | 'system'
  actor_label?: string
  ip_address?: string
}

/**
 * Registra una acción del admin en el audit log inmutable.
 * Se llama internamente desde las server actions de admin.
 */
export async function logAdminAction(
  adminId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
  options: AuditOptions = {}
) {
  const supabase = await createClient()

  const actor_kind = options.actor_kind ?? (adminId ? 'admin' : 'system')

  await supabase.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
    context: options.context ?? null,
    before_state: options.before_state ?? null,
    after_state: options.after_state ?? null,
    actor_kind,
    actor_label: options.actor_label ?? null,
    ip_address: options.ip_address ?? null,
  })
}

export type AuditLogEntry = {
  id: string
  admin_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown>
  context: string | null
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  actor_kind: 'admin' | 'system'
  actor_label: string | null
  ip_address: string | null
  created_at: string
  admin?: {
    display_name: string
  } | null
}

export type AuditLogFilters = {
  limit?: number
  action?: string
  context?: string
  adminId?: string
  dateFrom?: string
  dateTo?: string
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error('No autenticado')

  const { data: userRecord } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (userRecord?.role !== 'admin') throw new Error('Acceso denegado')
  return supabase
}

export async function getAuditLog(filters: AuditLogFilters | number = 200): Promise<AuditLogEntry[]> {
  const supabase = await verifyAdmin()

  // Backward compat: accept plain number as limit
  const opts: AuditLogFilters = typeof filters === 'number' ? { limit: filters } : filters
  const limit = opts.limit ?? 200

  // admin_audit_log.admin_id references auth.users (not profiles),
  // so we fetch entries first, then resolve admin names from profiles separately.
  let query = supabase
    .from('admin_audit_log')
    .select('id, admin_id, action, target_type, target_id, details, context, before_state, after_state, actor_kind, actor_label, ip_address, created_at')
    .order('created_at', { ascending: false })

  if (opts.action) query = query.eq('action', opts.action)
  if (opts.context) query = query.eq('context', opts.context)
  if (opts.adminId) query = query.eq('admin_id', opts.adminId)
  if (opts.dateFrom) query = query.gte('created_at', opts.dateFrom)
  if (opts.dateTo) query = query.lte('created_at', opts.dateTo)

  const { data: entries, error } = await query.limit(limit)

  if (error) throw error

  // Resolve admin names from profiles
  const adminIds = [...new Set((entries || []).map((e: any) => e.admin_id).filter(Boolean))]
  let adminMap: Record<string, { full_name: string | null; username: string | null }> = {}
  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', adminIds)
    for (const a of (admins || [])) {
      adminMap[a.id] = { full_name: a.full_name, username: a.username }
    }
  }

  return (entries || []).map((en: any) => {
    const pInfo = adminMap[en.admin_id] || null
    return {
      ...en,
      admin: pInfo ? { display_name: pInfo.full_name || pInfo.username || 'Admin' } : null,
    }
  }) as AuditLogEntry[]
}
