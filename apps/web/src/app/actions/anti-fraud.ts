'use server'

import { createClient } from '@/utils/supabase/server'

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
