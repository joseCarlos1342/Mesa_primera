import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAdminSupabaseEnv, getPublicSupabaseEnv } from './env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getPublicSupabaseEnv()

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: 604800, // 7 days – match Supabase inactivity_timeout
              })
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
 
  return supabase
}

export async function createAdminClient() {
  const cookieStore = await cookies()
  const { url, serviceRoleKey } = getAdminSupabaseEnv()

  return createServerClient(
    url,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore if called from Server Component during render
          }
        },
      },
    }
  )
}
