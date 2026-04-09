'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redis } from '@/utils/redis'
import crypto from 'crypto'

/**
 * Genera un device ID seguro, lo guarda como cookie httpOnly,
 * actualiza profiles.last_device_id y publica un evento Redis
 * para forzar el logout de sesiones anteriores.
 */
export async function enforceSessionPolicy(userId: string) {
  const deviceId = crypto.randomUUID()

  // 1. Set httpOnly cookie so middleware can compare later
  const cookieStore = await cookies()
  cookieStore.set('session_device_id', deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  // 2. Update DB with new device identifier
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ last_device_id: deviceId, is_online: true })
    .eq('id', userId)

  // 3. Publish kick event for old sessions (game-server subscribes)
  try {
    await redis.publish('session_kick', JSON.stringify({ userId, deviceId }))
  } catch (e) {
    // Non-critical: if Redis is down the middleware check still protects HTTP routes
    console.warn('[SESSION_POLICY] Redis publish failed:', (e as Error).message)
  }
}
