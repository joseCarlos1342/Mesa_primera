import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const webpushMock = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

const queueMock = vi.hoisted(() => ({
  add: vi.fn(),
  instances: [] as any[],
}));

vi.mock('web-push', () => ({ default: webpushMock }));

vi.mock('bullmq', () => ({
  Queue: vi.fn(function Queue(this: any, name: string, options: unknown) {
    this.name = name;
    this.options = options;
    this.add = queueMock.add;
    queueMock.instances.push(this);
  }),
}));

describe('push-notifications service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    queueMock.instances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('configures VAPID details and queue connection at module load', async () => {
    vi.stubEnv('REDIS_HOST', 'redis.test');
    vi.stubEnv('REDIS_PORT', '6380');
    vi.stubEnv('REDIS_PASSWORD', 'secret');
    await import('../push-notifications');

    expect(webpushMock.setVapidDetails).toHaveBeenCalledWith(
      expect.stringContaining('mailto:'),
      expect.any(String),
      expect.any(String),
    );
    expect(queueMock.instances[0]).toMatchObject({
      name: 'push-notifications',
      options: {
        connection: expect.objectContaining({ host: 'redis.test', port: 6380, password: 'secret' }),
      },
    });
  });

  it('stops Redis queue retries in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    await import('../push-notifications');

    const retryStrategy = queueMock.instances[0].options.connection.retryStrategy;
    expect(retryStrategy(3)).toBeNull();
  });

  it('backs off Redis queue retries outside development', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await import('../push-notifications');

    const retryStrategy = queueMock.instances[0].options.connection.retryStrategy;
    expect(retryStrategy(3)).toBe(150);
    expect(retryStrategy(100)).toBe(2000);
  });

  it('sends web push payload as JSON and returns true on success', async () => {
    webpushMock.sendNotification.mockResolvedValue(undefined);
    const { sendWebPush } = await import('../push-notifications');
    const subscription = { endpoint: 'https://push.test', keys: { p256dh: 'key', auth: 'auth' } };

    await expect(sendWebPush(subscription, { title: 'Mesa' })).resolves.toBe(true);
    expect(webpushMock.sendNotification).toHaveBeenCalledWith(subscription, JSON.stringify({ title: 'Mesa' }));
  });

  it('returns false and logs when web push delivery fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('expired subscription');
    webpushMock.sendNotification.mockRejectedValue(error);
    const { sendWebPush } = await import('../push-notifications');

    await expect(sendWebPush({ endpoint: 'x', keys: { p256dh: 'k', auth: 'a' } }, { body: 'B' })).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('Error sending push notification:', error);
  });

  it('enqueues push jobs by user id', async () => {
    queueMock.add.mockResolvedValue({ id: 'job-1' });
    const { enqueuePushNotification } = await import('../push-notifications');

    await enqueuePushNotification('user-1', { title: 'Nuevo mensaje' });

    expect(queueMock.add).toHaveBeenCalledWith('send-push', {
      userId: 'user-1',
      payload: { title: 'Nuevo mensaje' },
    });
  });
});
