/**
 * @jest-environment node
 */
import { logAdminAction, getAuditLog } from '@/app/actions/admin-audit';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Admin Audit — logAdminAction contract', () => {
  let mockSupabase: any;
  let insertSpy: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    insertSpy = jest.fn().mockResolvedValue({ error: null });

    mockSupabase = {
      from: jest.fn().mockReturnValue({
        insert: insertSpy,
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      }),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }),
      },
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('inserts into admin_audit_log with required fields', async () => {
    await logAdminAction('admin-1', 'test_action', 'user', 'user-1');

    expect(mockSupabase.from).toHaveBeenCalledWith('admin_audit_log');
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: 'admin-1',
        action: 'test_action',
        target_type: 'user',
        target_id: 'user-1',
      }),
    );
  });

  it('accepts and passes context field', async () => {
    await logAdminAction('admin-1', 'broadcast_sent', 'broadcast', 'bc-1', {}, {
      context: 'communications',
    });

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'communications',
      }),
    );
  });

  it('accepts and passes before_state and after_state', async () => {
    const before = { content: 'old rulebook' };
    const after = { content: 'new rulebook' };
    await logAdminAction('admin-1', 'settings_changed', 'setting', 'rulebook', {}, {
      context: 'settings',
      before_state: before,
      after_state: after,
    });

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        before_state: before,
        after_state: after,
      }),
    );
  });

  it('accepts actor_kind and actor_label for system events', async () => {
    await logAdminAction(null, 'system_integrity_alert', 'system', 'vault', { discrepancy_cents: 100 }, {
      context: 'integrity',
      actor_kind: 'system',
      actor_label: 'integrity-cron',
    });

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: null,
        actor_kind: 'system',
        actor_label: 'integrity-cron',
      }),
    );
  });

  it('defaults actor_kind to "admin" when admin_id is provided', async () => {
    await logAdminAction('admin-1', 'user_banned', 'user', 'user-1');

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_kind: 'admin',
      }),
    );
  });

  it('passes ip_address when provided via options', async () => {
    await logAdminAction('admin-1', 'balance_adjusted', 'user', 'user-1', {}, {
      ip_address: '192.168.1.1',
    });

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: '192.168.1.1',
      }),
    );
  });
});

describe('Admin Audit — getAuditLog with filters', () => {
  let mockSupabase: any;
  let chainMethods: any;

  beforeEach(() => {
    jest.resetAllMocks();

    chainMethods = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [] }),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    };

    mockSupabase = {
      from: jest.fn().mockReturnValue(chainMethods),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }),
      },
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('accepts filter by action', async () => {
    await getAuditLog({ limit: 50, action: 'broadcast_sent' });

    expect(chainMethods.eq).toHaveBeenCalledWith('action', 'broadcast_sent');
  });

  it('accepts filter by context', async () => {
    await getAuditLog({ limit: 50, context: 'settings' });

    expect(chainMethods.eq).toHaveBeenCalledWith('context', 'settings');
  });

  it('accepts filter by admin_id', async () => {
    await getAuditLog({ limit: 50, adminId: 'admin-2' });

    expect(chainMethods.eq).toHaveBeenCalledWith('admin_id', 'admin-2');
  });

  it('accepts date range filters', async () => {
    await getAuditLog({
      limit: 50,
      dateFrom: '2026-04-01T00:00:00Z',
      dateTo: '2026-04-14T23:59:59Z',
    });

    expect(chainMethods.gte).toHaveBeenCalledWith('created_at', '2026-04-01T00:00:00Z');
    expect(chainMethods.lte).toHaveBeenCalledWith('created_at', '2026-04-14T23:59:59Z');
  });
});
