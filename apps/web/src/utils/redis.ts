import Redis from 'ioredis'
import { headers } from 'next/headers'

// Usar una variable global en desarrollo para prevenir múltiples conexiones por HMR de Next.js
const globalForRedis = global as unknown as { redis?: Redis }
const redisUrl = process.env.REDIS_URL?.trim()

function createRedisClient() {
  if (!redisUrl) {
    return null
  }

  const client = new Redis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  })

  let lastRedisError = ''
  client.on('error', (err) => {
    if (err.message === lastRedisError) return
    lastRedisError = err.message

    if (process.env.NODE_ENV === 'development') {
      console.warn('[REDIS_SILENCED_ERROR]:', err.message)
    }
  })

  return client
}

const redisClient = globalForRedis.redis ?? createRedisClient()

if (redisClient && process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redisClient
}

// In-memory fallback rate limiter (per-process; used when Redis is unavailable)
const _memFallback = new Map<string, { count: number; resetAt: number }>()

function _checkMemFallback(key: string, limit: number, windowSecs: number) {
  const now = Date.now()
  const entry = _memFallback.get(key)
  const count = (!entry || entry.resetAt < now) ? 1 : entry.count + 1
  _memFallback.set(key, { count, resetAt: (!entry || entry.resetAt < now) ? now + windowSecs * 1000 : entry.resetAt })
  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset: windowSecs,
  }
}

export const redis = {
  async publish(channel: string, message: string) {
    if (!redisClient) {
      return 0
    }

    return redisClient.publish(channel, message)
  },

  async setex(key: string, seconds: number, value: string) {
    if (!redisClient) {
      return null
    }

    return redisClient.setex(key, seconds, value)
  },
}

/**
 * Ticker Token Bucket Rate Limiter
 * @param key Identificador (IP o User ID)
 * @param limit Máximo número de requests
 * @param window Tiempo en segundos
 */
export async function checkRateLimit(key: string, limit: number, windowSecs: number) {
  if (!redisClient) {
    // No Redis configured — use in-memory fallback (per-process, not distributed)
    return _checkMemFallback(key, limit, windowSecs)
  }

  try {
    const current = await redisClient.incr(key)
    if (current === 1) {
      await redisClient.expire(key, windowSecs)
    }
    
    return {
      success: current <= limit,
      limit,
      remaining: Math.max(0, limit - current),
      reset: windowSecs
    }
  } catch (e: any) {
    console.warn('[REDIS_FALLBACK] Redis error in rate limit — using memory fallback:', e.message)
    return _checkMemFallback(key, limit, windowSecs)
  }
}

/**
 * Obtiene la IP con headers de Vercel/proxies
 */
export async function getClientIp() {
  try {
    const headersList = await headers()
    // Intenta diferentes headers estándar donde puede venir la real IP
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    
    if (realIp) return realIp
    return '127.0.0.1' // Fallback
  } catch {
    return '127.0.0.1'
  }
}
