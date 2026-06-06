import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('AuditService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('skips audit writes when service role key is not configured', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const createClient = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({ createClient }));

    const { logAuditAction } = await import('../AuditService');

    await logAuditAction(null, 'room_started', 'room', 'room-1');

    expect(createClient).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[AuditService] No Supabase client — audit skipped:', 'room_started');
  });

  it('writes admin audit entries with explicit options', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test');
    vi.stubEnv('SUPABASE_URL', 'https://supabase.test');
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const createClient = vi.fn().mockReturnValue({ from });
    vi.doMock('@supabase/supabase-js', () => ({ createClient }));

    const { logAuditAction } = await import('../AuditService');

    await logAuditAction(
      'admin-1',
      'spectate_started',
      'room',
      'room-1',
      { reason: 'support' },
      {
        context: 'spectate',
        before_state: { active: false },
        after_state: { active: true },
        actor_label: 'Admin Principal',
        ip_address: '127.0.0.1',
      },
    );

    expect(createClient).toHaveBeenCalledWith('https://supabase.test', 'service-role-test', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    expect(from).toHaveBeenCalledWith('admin_audit_log');
    expect(insert).toHaveBeenCalledWith({
      admin_id: 'admin-1',
      action: 'spectate_started',
      target_type: 'room',
      target_id: 'room-1',
      details: { reason: 'support' },
      context: 'spectate',
      before_state: { active: false },
      after_state: { active: true },
      actor_kind: 'admin',
      actor_label: 'Admin Principal',
      ip_address: '127.0.0.1',
    });
  });

  it('logs insert errors without throwing', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const insert = vi.fn().mockResolvedValue({ error: { message: 'db unavailable' } });
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ insert }) }),
    }));

    const { logAuditAction } = await import('../AuditService');

    await expect(logAuditAction(null, 'integrity_check_failed', 'system', 'cron')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('[AuditService] Failed to write audit log:', 'db unavailable', {
      action: 'integrity_check_failed',
      targetType: 'system',
    });
  });
});
