import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({
  instances: [] as any[],
}));

vi.mock('ioredis', () => ({
  default: vi.fn(function Redis(this: any, url: string, options: unknown) {
    this.url = url;
    this.options = options;
    this.handlers = {} as Record<string, (...args: any[]) => void>;
    this.on = vi.fn((event: string, handler: (...args: any[]) => void) => {
      this.handlers[event] = handler;
    });
    redisMock.instances.push(this);
  }),
}));

describe('redis service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    redisMock.instances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('creates shared and subscriber Redis clients with the configured URL', async () => {
    vi.stubEnv('REDIS_URL', 'redis://redis.test:6380');

    const { redis, createRedisSubscriber } = await import('../redis');
    const subscriber = createRedisSubscriber();

    expect(redis).toMatchObject({
      url: 'redis://redis.test:6380',
      options: { maxRetriesPerRequest: 3, lazyConnect: true },
    });
    expect(subscriber).toMatchObject({
      url: 'redis://redis.test:6380',
      options: { maxRetriesPerRequest: 3, lazyConnect: true },
    });
    expect(redisMock.instances).toHaveLength(2);
  });

  it('deduplicates Redis error logs and only warns in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { redis } = await import('../redis');

    redis.handlers.error(new Error('connection refused'));
    redis.handlers.error(new Error('connection refused'));
    redis.handlers.error(new Error('auth failed'));

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenNthCalledWith(1, '[GameServer Redis]:', 'connection refused');
    expect(warnSpy).toHaveBeenNthCalledWith(2, '[GameServer Redis]:', 'auth failed');
  });
});
