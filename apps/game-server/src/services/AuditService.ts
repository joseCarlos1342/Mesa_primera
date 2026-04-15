import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AuditOptions = {
  context?: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  actor_kind?: 'admin' | 'system';
  actor_label?: string;
  ip_address?: string;
};

/**
 * Registra una acción en admin_audit_log desde el game server.
 * Usa service_role key para bypass RLS.
 */
export async function logAuditAction(
  adminId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
  options: AuditOptions = {}
): Promise<void> {
  if (!supabase) {
    console.warn('[AuditService] No Supabase client — audit skipped:', action);
    return;
  }

  const actor_kind = options.actor_kind ?? (adminId ? 'admin' : 'system');

  const { error } = await supabase.from('admin_audit_log').insert({
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
  });

  if (error) {
    console.error('[AuditService] Failed to write audit log:', error.message, { action, targetType });
  }
}
