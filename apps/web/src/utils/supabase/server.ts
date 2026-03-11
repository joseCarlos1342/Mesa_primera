import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // DEV BYPASS: If cookie exists, mock the auth user
  if (process.env.NODE_ENV === 'development') {
    const devPhone = cookieStore.get('mesa_dev_bypass')?.value
    if (devPhone) {
      const originalAuth = supabase.auth
      supabase.auth = {
        ...originalAuth,
        getUser: async () => {
          // Attempt to find the real profile in DB to make it realistic
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('phone', devPhone)
            .single()

          if (profile) {
            return {
              data: {
                user: {
                  id: profile.id,
                  phone: devPhone,
                  role: 'authenticated',
                  app_metadata: {},
                  user_metadata: {}
                }
              },
              error: null
            }
          }
          return { data: { user: null }, error: new Error('Dev bypass profile not found') }
        }
      } as any
    }
  }

  return supabase
}
