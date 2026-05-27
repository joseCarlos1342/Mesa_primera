const redisInstances: MockRedis[] = []
let mockHeadersImpl: () => Promise<{ get: (name: string) => string | null }>

class MockRedis {
  static publish = jest.fn()
  static setex = jest.fn()
  static incr = jest.fn()
  static expire = jest.fn()

  public on = jest.fn((event: string, handler: (error: Error) => void) => {
    if (event === 'error') this.errorHandler = handler
    return this
  })

  private errorHandler?: (error: Error) => void

  constructor(public url: string, public options: Record<string, unknown>) {
    redisInstances.push(this)
  }

  publish(channel: string, message: string) {
    return MockRedis.publish(channel, message)
  }

  setex(key: string, seconds: number, value: string) {
    return MockRedis.setex(key, seconds, value)
  }

  incr(key: string) {
    return MockRedis.incr(key)
  }

  expire(key: string, seconds: number) {
    return MockRedis.expire(key, seconds)
  }

  triggerError(message: string) {
    this.errorHandler?.(new Error(message))
  }
}

jest.mock('ioredis', () => MockRedis)
jest.mock('next/headers', () => ({
  headers: () => mockHeadersImpl(),
}))

async function loadRedisModule(redisUrl?: string) {
  jest.resetModules()
  jest.clearAllMocks()
  redisInstances.length = 0
  delete (global as { redis?: unknown }).redis
  if (redisUrl) {
    process.env.REDIS_URL = redisUrl
  } else {
    delete process.env.REDIS_URL
  }
  mockHeadersImpl = async () => ({ get: () => null })
  return import('../redis')
}

describe('redis utils', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    process.env.NODE_ENV = originalNodeEnv
    delete process.env.REDIS_URL
    delete (global as { redis?: unknown }).redis
  })

  it('usa fallback en memoria cuando Redis no esta configurado', async () => {
    const { checkRateLimit, redis } = await loadRedisModule()

    await expect(redis.publish('canal', 'mensaje')).resolves.toBe(0)
    await expect(redis.setex('clave', 60, 'valor')).resolves.toBeNull()
    await expect(checkRateLimit('ip:1', 2, 60)).resolves.toEqual({ success: true, limit: 2, remaining: 1, reset: 60 })
    await expect(checkRateLimit('ip:1', 2, 60)).resolves.toEqual({ success: true, limit: 2, remaining: 0, reset: 60 })
    await expect(checkRateLimit('ip:1', 2, 60)).resolves.toEqual({ success: false, limit: 2, remaining: 0, reset: 60 })
  })

  it('publica, setea expiracion y limita usando Redis configurado', async () => {
    MockRedis.publish.mockResolvedValue(1)
    MockRedis.setex.mockResolvedValue('OK')
    MockRedis.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(3)
    MockRedis.expire.mockResolvedValue(1)

    const { checkRateLimit, redis } = await loadRedisModule('redis://localhost:6380')

    expect(redisInstances[0]).toMatchObject({
      url: 'redis://localhost:6380',
      options: { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 },
    })
    await expect(redis.publish('support', 'hola')).resolves.toBe(1)
    await expect(redis.setex('session', 30, '1')).resolves.toBe('OK')
    await expect(checkRateLimit('ip:2', 2, 60)).resolves.toEqual({ success: true, limit: 2, remaining: 1, reset: 60 })
    expect(MockRedis.expire).toHaveBeenCalledWith('ip:2', 60)
    await expect(checkRateLimit('ip:2', 2, 60)).resolves.toEqual({ success: false, limit: 2, remaining: 0, reset: 60 })
  })

  it('cae a memoria si Redis falla durante rate limit', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    MockRedis.incr.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const { checkRateLimit } = await loadRedisModule('redis://localhost:6380')

    await expect(checkRateLimit('ip:fallback', 1, 10)).resolves.toEqual({ success: true, limit: 1, remaining: 0, reset: 10 })
    expect(warn).toHaveBeenCalledWith('[REDIS_FALLBACK] Redis error in rate limit — using memory fallback:', 'ECONNREFUSED')
  })

  it('silencia errores repetidos de cliente Redis solo en desarrollo', async () => {
    process.env.NODE_ENV = 'development'
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    await loadRedisModule('redis://localhost:6380')
    redisInstances[0].triggerError('socket closed')
    redisInstances[0].triggerError('socket closed')
    redisInstances[0].triggerError('timeout')

    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenNthCalledWith(1, '[REDIS_SILENCED_ERROR]:', 'socket closed')
    expect(warn).toHaveBeenNthCalledWith(2, '[REDIS_SILENCED_ERROR]:', 'timeout')
  })

  it('obtiene IP por headers de proxy y aplica fallback seguro', async () => {
    const { getClientIp } = await loadRedisModule()

    mockHeadersImpl = async () => ({ get: (name) => name === 'x-forwarded-for' ? '10.0.0.1, 10.0.0.2' : null })
    await expect(getClientIp()).resolves.toBe('10.0.0.1')

    mockHeadersImpl = async () => ({ get: (name) => name === 'x-real-ip' ? '192.168.0.10' : null })
    await expect(getClientIp()).resolves.toBe('192.168.0.10')

    mockHeadersImpl = async () => ({ get: () => null })
    await expect(getClientIp()).resolves.toBe('127.0.0.1')

    mockHeadersImpl = async () => { throw new Error('headers unavailable') }
    await expect(getClientIp()).resolves.toBe('127.0.0.1')
  })
})
