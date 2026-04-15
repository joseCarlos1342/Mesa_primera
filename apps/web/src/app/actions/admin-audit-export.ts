'use server'

import { getAuditLog, type AuditLogFilters, type AuditLogEntry } from '@/app/actions/admin-audit'

export async function exportAuditLog(
  filters: AuditLogFilters,
  format: 'csv' | 'json' = 'csv'
): Promise<string> {
  const entries = await getAuditLog({ ...filters, limit: filters.limit ?? 5000 })

  if (format === 'json') {
    return JSON.stringify(entries, null, 2)
  }

  // CSV export
  const headers = [
    'id', 'created_at', 'action', 'context', 'actor_kind', 'actor_label',
    'admin_id', 'admin_name', 'target_type', 'target_id', 'details',
    'before_state', 'after_state', 'ip_address',
  ]

  const rows = entries.map((e: AuditLogEntry) => [
    e.id,
    e.created_at,
    e.action,
    e.context ?? '',
    e.actor_kind,
    e.actor_label ?? '',
    e.admin_id ?? '',
    e.admin?.display_name ?? '',
    e.target_type ?? '',
    e.target_id ?? '',
    JSON.stringify(e.details ?? {}),
    JSON.stringify(e.before_state ?? {}),
    JSON.stringify(e.after_state ?? {}),
    e.ip_address ?? '',
  ])

  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`
  const csvLines = [
    headers.join(','),
    ...rows.map(r => r.map(v => escapeCsv(String(v))).join(',')),
  ]

  return csvLines.join('\n')
}
