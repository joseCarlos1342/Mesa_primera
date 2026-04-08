'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Registra una acción del admin en el audit log inmutable.
 * Se llama internamente desde las server actions de admin.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  const supabase = await createClient()

  await supabase.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  })
}

export type AuditLogEntry = {
  id: string
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
  admin?: {
    display_name: string
  } | null
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

export async function getAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  const supabase = await verifyAdmin()

  // admin_audit_log.admin_id references auth.users (not profiles),
  // so we fetch entries first, then resolve admin names from profiles separately.
  const { data: entries, error } = await supabase
    .from('admin_audit_log')
    .select('id, admin_id, action, target_type, target_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

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
