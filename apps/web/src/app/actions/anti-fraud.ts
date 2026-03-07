'use server'

import { createClient } from '@/utils/supabase/server'
import { getClientIp, checkRateLimit } from '@/utils/redis'

/**
 * Registers an unknown device fingerprint into the database
 */
export async function registerDevice(fingerprint: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No user authenticated' }

  const { error } = await supabase
    .from('user_devices')
    .upsert({
      user_id: user.id,
      device_id: fingerprint, // Usamos el hash como ID único del dispositivo para este usuario
      fingerprint: { 
        hash: fingerprint,
        last_seen: new Date().toISOString()
      },
      last_login_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, device_id'
    })

  if (error) {
    console.error('Error registering device:', error)
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Protege una acción bloqueando por Rate Limiting si excede la IP de origen
 * @param actionName El nombre de la acción (e.g. 'login', 'withdraw')
 * @param limit Limite máximo de llamadas permitidas
 * @param windowSecs Ventana de tiempo (en segundos)
 */
export async function enforceRateLimiting(actionName: string, limit: number = 5, windowSecs: number = 60) {
  const ip = await getClientIp()
  const key = `rate_limit:${actionName}:${ip}`
  
  const result = await checkRateLimit(key, limit, windowSecs)
  
  if (!result.success) {
    console.warn(`[ANTI-FRAUD] Rate Limit Exceeded for IP ${ip} on action ${actionName}`)
    return { error: 'Demasiados intentos. Por favor espera antes de volver a intentar.' }
  }
  
  return { success: true }
}
