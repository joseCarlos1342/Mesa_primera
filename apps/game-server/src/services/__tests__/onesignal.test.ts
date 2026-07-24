import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendOneSignalPush } from '../onesignal';

describe('OneSignal provider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('requires server-only credentials', async () => {
    vi.stubEnv('ONESIGNAL_APP_ID', '');
    vi.stubEnv('ONESIGNAL_REST_API_KEY', '');

    await expect(sendOneSignalPush('user-1', { title: 'Hola', body: 'Mensaje' }))
      .rejects.toThrow('ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY are required');
  });

  it('sends an external-id targeted push and returns provider id', async () => {
    vi.stubEnv('ONESIGNAL_APP_ID', 'app-1');
    vi.stubEnv('ONESIGNAL_REST_API_KEY', 'secret');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ id: 'message-1' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));

    await expect(sendOneSignalPush('user-1', {
      title: 'Recarga aprobada',
      body: 'Tu saldo está disponible',
      data: { url: '/wallet', kind: 'deposit' },
    }, 'idempotency-1')).resolves.toBe('message-1');

    expect(fetchMock).toHaveBeenCalledWith('https://api.onesignal.com/notifications', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Key secret' }),
      body: expect.stringContaining('"external_id":["user-1"]'),
    }));
  });

  it('turns provider errors into retryable errors', async () => {
    vi.stubEnv('ONESIGNAL_APP_ID', 'app-1');
    vi.stubEnv('ONESIGNAL_REST_API_KEY', 'secret');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ errors: ['invalid target'] }),
      { status: 400 },
    ));

    await expect(sendOneSignalPush('user-1', { title: 'Hola', body: 'Mensaje' }))
      .rejects.toThrow('OneSignal rejected notification: ["invalid target"]');
  });
});
