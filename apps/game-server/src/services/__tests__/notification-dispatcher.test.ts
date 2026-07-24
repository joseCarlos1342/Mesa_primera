import { describe, expect, it, vi } from 'vitest';

const sendOneSignalPush = vi.hoisted(() => vi.fn());
vi.mock('../onesignal', () => ({
  sendOneSignalPush,
  OneSignalDeliveryError: class OneSignalDeliveryError extends Error {
    retryable = true;
  },
}));

function updateChain() {
  const chain = {
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'outbox-1' }, error: null }),
  };
  chain.eq.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  const update = vi.fn().mockReturnValue(chain);
  return { update, eq: chain.eq };
}

function clientFor(rows: unknown[]) {
  const outbox = updateChain();
  const broadcasts = updateChain();
  return {
    rpc: vi.fn().mockResolvedValue({ data: rows, error: null }),
    from: vi.fn((table: string) => table === 'notification_outbox' ? outbox : broadcasts),
    outbox,
    broadcasts,
  };
}

describe('notification dispatcher', () => {
  it('marks a notification accepted and records broadcast delivery', async () => {
    sendOneSignalPush.mockResolvedValue('message-1');
    const client = clientFor([{
      id: 'outbox-1', notification_id: 'notification-1', user_id: 'user-1',
      title: 'Aviso', body: 'Mensaje', data: { url: '/wallet' }, attempts: 1,
      claim_token: 'claim-1',
    }]);
    const { dispatchPendingNotifications } = await import('../notification-dispatcher');

    await expect(dispatchPendingNotifications(client as never)).resolves.toBe(1);
    expect(sendOneSignalPush).toHaveBeenCalledWith('user-1', expect.objectContaining({ title: 'Aviso' }), 'outbox-1');
    expect(client.outbox.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted', provider_message_id: 'message-1' }));
    expect(client.broadcasts.update).toHaveBeenCalledWith(expect.objectContaining({ push_sent_at: expect.any(String) }));
  });

  it('returns failed jobs to pending with exponential retry delay', async () => {
    sendOneSignalPush.mockRejectedValue(new Error('provider unavailable'));
    const client = clientFor([{
      id: 'outbox-1', notification_id: 'notification-1', user_id: 'user-1',
      title: 'Aviso', body: 'Mensaje', data: null, attempts: 1,
      claim_token: 'claim-1',
    }]);
    const { dispatchPendingNotifications } = await import('../notification-dispatcher');

    await expect(dispatchPendingNotifications(client as never)).resolves.toBe(0);
    expect(client.outbox.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      last_error: 'provider unavailable',
      available_at: expect.any(String),
    }));
  });
});
