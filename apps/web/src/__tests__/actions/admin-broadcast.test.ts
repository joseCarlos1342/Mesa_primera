/**
 * @jest-environment node
 */
import { sendBroadcast, getBroadcastHistory } from '@/app/actions/admin-broadcast';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Suppress fetch to game server
global.fetch = jest.fn().mockResolvedValue({ ok: true });

describe('sendBroadcast', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();

    // Chain-friendly mock: from().insert().select().single() etc.
    const chainable: any = {};
    chainable.select = jest.fn().mockReturnValue(chainable);
    chainable.eq = jest.fn().mockReturnValue(chainable);
    chainable.in = jest.fn().mockReturnValue(chainable);
    chainable.not = jest.fn().mockReturnValue(chainable);
    chainable.is = jest.fn().mockReturnValue(chainable);
    chainable.order = jest.fn().mockReturnValue(chainable);
    chainable.limit = jest.fn().mockReturnValue(chainable);
    chainable.insert = jest.fn().mockReturnValue(chainable);
    chainable.update = jest.fn().mockReturnValue(chainable);
    chainable.single = jest.fn();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-1' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue(chainable),
      _chain: chainable,
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Reset env
    process.env.GAME_SERVER_URL = 'http://localhost:2567';
    process.env.INTERNAL_API_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setupAdminCalls() {
    const adminChain: any = {};
    adminChain.select = jest.fn().mockReturnValue(adminChain);
    adminChain.eq = jest.fn().mockReturnValue(adminChain);
    adminChain.single = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null });
    mockSupabase.from.mockReturnValueOnce(adminChain);
  }

  it('rejects non-admin users', async () => {
    const chain = mockSupabase._chain;
    chain.single.mockResolvedValueOnce({ data: { role: 'player' }, error: null });

    await expect(
      sendBroadcast({ type: 'system_announcement', title: 'Test', body: 'Hola' })
    ).rejects.toThrow('Acceso denegado');
  });

  it('rejects unauthenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'No auth' },
    });

    await expect(
      sendBroadcast({ type: 'system_announcement', title: 'Test', body: 'Hola' })
    ).rejects.toThrow('No autenticado');
  });

  it('rejects invalid broadcast type', async () => {
    setupAdminCalls();

    await expect(
      sendBroadcast({ type: 'invalid_type' as any, title: 'Test', body: 'Hola' })
    ).rejects.toThrow('Tipo inválido');
  });

  it('returns audienceCount 0 when no players exist', async () => {
    setupAdminCalls();
    // from('profiles').select('id').eq('role', 'player')
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const result = await sendBroadcast({
      type: 'system_announcement',
      title: 'Test',
      body: 'Hola',
    });

    expect(result.success).toBe(true);
    expect(result.audienceCount).toBe(0);
  });

  it('enforces cooldown between broadcasts', async () => {
    // First call: set up full happy path
    setupAdminCalls();
    const users = [{ id: 'user-1' }, { id: 'user-2' }];

    // profiles query (audience)
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: users, error: null }),
      }),
    });

    // broadcast_messages insert
    const insertChain1: any = {};
    insertChain1.select = jest.fn().mockReturnValue(insertChain1);
    insertChain1.single = jest.fn().mockResolvedValue({
      data: { id: 'broadcast-1' },
      error: null,
    });
    insertChain1.insert = jest.fn().mockReturnValue(insertChain1);
    mockSupabase.from.mockReturnValueOnce(insertChain1);

    // notifications insert
    const insertChain2: any = {};
    insertChain2.select = jest.fn().mockResolvedValue({
      data: users.map(u => ({ id: `notif-${u.id}`, user_id: u.id })),
      error: null,
    });
    insertChain2.insert = jest.fn().mockReturnValue(insertChain2);
    mockSupabase.from.mockReturnValueOnce(insertChain2);

    // broadcast_deliveries insert
    const insertChain3: any = {};
    insertChain3.insert = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValueOnce(insertChain3);

    const r1 = await sendBroadcast({
      type: 'system_announcement',
      title: 'First',
      body: 'Hola',
    });
    expect(r1.success).toBe(true);
    expect(r1.audienceCount).toBe(2);

    // Second call within cooldown — should fail
    setupAdminCalls();
    await expect(
      sendBroadcast({ type: 'maintenance', title: 'Second', body: 'World' })
    ).rejects.toThrow(/esperar/);

    // Advance past cooldown
    jest.advanceTimersByTime(31_000);

    // Third call after cooldown — should succeed
    setupAdminCalls();
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: users, error: null }),
      }),
    });
    mockSupabase.from.mockReturnValueOnce(insertChain1);
    insertChain1.single.mockResolvedValue({ data: { id: 'broadcast-2' }, error: null });
    mockSupabase.from.mockReturnValueOnce(insertChain2);
    mockSupabase.from.mockReturnValueOnce(insertChain3);

    const r3 = await sendBroadcast({
      type: 'maintenance',
      title: 'After cooldown',
      body: 'OK',
    });
    expect(r3.success).toBe(true);
  });
});

describe('getBroadcastHistory', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.resetAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-1' } },
          error: null,
        }),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  function setupAdminAndHistory(broadcasts: any[], deliveries: any[], readNotifs: any[]) {
    // ensureAdmin: profiles.select().eq().single()
    const adminChain: any = {};
    adminChain.select = jest.fn().mockReturnValue(adminChain);
    adminChain.eq = jest.fn().mockReturnValue(adminChain);
    adminChain.single = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null });
    mockSupabase.from.mockReturnValueOnce(adminChain);

    // broadcast_messages query
    const bcastChain: any = {};
    bcastChain.select = jest.fn().mockReturnValue(bcastChain);
    bcastChain.order = jest.fn().mockReturnValue(bcastChain);
    bcastChain.limit = jest.fn().mockResolvedValue({ data: broadcasts, error: null });
    mockSupabase.from.mockReturnValueOnce(bcastChain);

    // broadcast_deliveries aggregate
    const delChain: any = {};
    delChain.select = jest.fn().mockReturnValue(delChain);
    delChain.in = jest.fn().mockResolvedValue({ data: deliveries, error: null });
    mockSupabase.from.mockReturnValueOnce(delChain);

    // notifications read counts
    const readChain: any = {};
    readChain.select = jest.fn().mockReturnValue(readChain);
    readChain.in = jest.fn().mockReturnValue(readChain);
    readChain.not = jest.fn().mockResolvedValue({ data: readNotifs, error: null });
    mockSupabase.from.mockReturnValueOnce(readChain);
  }

  it('returns enriched history with delivery counts', async () => {
    const broadcasts = [
      { id: 'b1', admin_id: 'admin-1', type: 'system_announcement', title: 'Test', body: 'Hello', audience_count: 3, created_at: '2026-01-01' },
    ];
    const deliveries = [
      { broadcast_id: 'b1', push_sent_at: '2026-01-01T00:01:00Z', push_failed_at: null },
      { broadcast_id: 'b1', push_sent_at: '2026-01-01T00:01:00Z', push_failed_at: null },
      { broadcast_id: 'b1', push_sent_at: null, push_failed_at: '2026-01-01T00:02:00Z' },
    ];
    const readNotifs = [
      { broadcast_id: 'b1', read_at: '2026-01-01T01:00:00Z' },
    ];

    setupAdminAndHistory(broadcasts, deliveries, readNotifs);

    const result = await getBroadcastHistory();

    expect(result).toHaveLength(1);
    expect(result[0].push_sent_count).toBe(2);
    expect(result[0].push_failed_count).toBe(1);
    expect(result[0].read_count).toBe(1);
    expect(result[0].audience_count).toBe(3);
  });

  it('returns empty array on error', async () => {
    // ensureAdmin
    const adminChain: any = {};
    adminChain.select = jest.fn().mockReturnValue(adminChain);
    adminChain.eq = jest.fn().mockReturnValue(adminChain);
    adminChain.single = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null });
    mockSupabase.from.mockReturnValueOnce(adminChain);

    // broadcast_messages error
    const bcastChain: any = {};
    bcastChain.select = jest.fn().mockReturnValue(bcastChain);
    bcastChain.order = jest.fn().mockReturnValue(bcastChain);
    bcastChain.limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
    mockSupabase.from.mockReturnValueOnce(bcastChain);

    const result = await getBroadcastHistory();
    expect(result).toEqual([]);
  });
});
