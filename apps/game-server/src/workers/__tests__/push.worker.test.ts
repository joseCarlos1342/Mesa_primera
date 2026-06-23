import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const workerMock = vi.hoisted(() => ({
  processor: null as null | ((job: any) => Promise<void>),
  options: null as unknown,
  on: vi.fn(),
  instances: [] as any[],
}));

const sendWebPush = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('../../services/push-notifications', () => ({ sendWebPush }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: supabaseMock.createClient,
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn(function Worker(this: any, name: string, processor: (job: any) => Promise<void>, options: unknown) {
    this.name = name;
    this.processor = processor;
    this.options = options;
    this.on = workerMock.on;
    workerMock.processor = processor;
    workerMock.options = options;
    workerMock.instances.push(this);
  }),
}));

function subscriptionsQuery(result: unknown) {
  const eq = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, eq };
}

describe('push worker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    workerMock.processor = null;
    workerMock.options = null;
    workerMock.instances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('registers a BullMQ worker with Redis connection options and event handlers', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    vi.stubEnv('REDIS_HOST', 'redis.test');
    vi.stubEnv('REDIS_PORT', '6380');
    vi.stubEnv('REDIS_PASSWORD', 'secret');
    supabaseMock.createClient.mockReturnValue({ from: vi.fn() });

    await import('../push.worker');

    expect(workerMock.instances[0]).toMatchObject({ name: 'push-notifications' });
    expect(workerMock.options).toEqual({
      connection: expect.objectContaining({ host: 'redis.test', port: 6380, password: 'secret' }),
    });
    expect(workerMock.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(workerMock.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(workerMock.on).toHaveBeenCalledWith('failed', expect.any(Function));
  });

  it('uses Redis retry strategy only outside development', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    supabaseMock.createClient.mockReturnValue({ from: vi.fn() });
    await import('../push.worker');

    const connection = (workerMock.options as { connection: { retryStrategy: (times: number) => number | null } }).connection;

    vi.stubEnv('NODE_ENV', 'development');
    expect(connection.retryStrategy(1)).toBeNull();

    vi.stubEnv('NODE_ENV', 'production');
    expect(connection.retryStrategy(10)).toBe(500);
    expect(connection.retryStrategy(100)).toBe(2000);
  });

  it('does not query Supabase when no key is configured', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await import('../push.worker');

    await expect(workerMock.processor!({ data: { userId: 'user-1', payload: { title: 'Mesa' } } })).resolves.toBeUndefined();
    expect(supabaseMock.createClient).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[PushWorker] No Supabase key found to query subscriptions');
  });

  it('logs and skips users without subscriptions', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const query = subscriptionsQuery({ data: [], error: null });
    supabaseMock.createClient.mockReturnValue({ from: query.from });
    await import('../push.worker');

    await workerMock.processor!({ data: { userId: 'user-1', payload: { title: 'Mesa' } } });

    expect(query.from).toHaveBeenCalledWith('push_subscriptions');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(logSpy).toHaveBeenCalledWith('[PushWorker] No subscriptions found for user user-1');
    expect(sendWebPush).not.toHaveBeenCalled();
  });

  it('sends web push to every stored subscription for the user', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    const subscriptions = [
      { endpoint: 'https://push.test/1', p256dh: 'key-1', auth: 'auth-1' },
      { endpoint: 'https://push.test/2', p256dh: 'key-2', auth: 'auth-2' },
    ];
    const query = subscriptionsQuery({ data: subscriptions, error: null });
    supabaseMock.createClient.mockReturnValue({ from: query.from });
    sendWebPush.mockResolvedValue(true);
    await import('../push.worker');

    await workerMock.processor!({ data: { userId: 'user-1', payload: { title: 'Mesa' } } });

    expect(sendWebPush).toHaveBeenCalledTimes(2);
    expect(sendWebPush).toHaveBeenNthCalledWith(1, {
      endpoint: 'https://push.test/1',
      keys: { p256dh: 'key-1', auth: 'auth-1' },
    }, { title: 'Mesa' });
  });

  it('logs completed, failed and deduplicated Redis error events', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    vi.stubEnv('NODE_ENV', 'development');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    supabaseMock.createClient.mockReturnValue({ from: vi.fn() });
    await import('../push.worker');

    const completed = workerMock.on.mock.calls.find(call => call[0] === 'completed')![1];
    const error = workerMock.on.mock.calls.find(call => call[0] === 'error')![1];
    const failed = workerMock.on.mock.calls.find(call => call[0] === 'failed')![1];

    completed({ id: 'job-1', data: { userId: 'user-1' } });
    error(new Error('redis down'));
    error(new Error('redis down'));
    failed({ id: 'job-2' }, new Error('push failed'));

    expect(logSpy).toHaveBeenCalledWith('[PushWorker] Job job-1 completed for userId: user-1');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[Redis Silenced - PushWorker]:', 'redis down');
    expect(errorSpy).toHaveBeenCalledWith('[PushWorker] Job job-2 failed:', expect.any(Error));
  });

  it('logs Redis worker errors as errors outside development', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    vi.stubEnv('NODE_ENV', 'production');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    supabaseMock.createClient.mockReturnValue({ from: vi.fn() });
    await import('../push.worker');

    const error = workerMock.on.mock.calls.find(call => call[0] === 'error')![1];
    const redisError = new Error('redis unavailable');
    error(redisError);

    expect(errorSpy).toHaveBeenCalledWith('[PushWorker] Redis Error:', redisError);
  });
});
