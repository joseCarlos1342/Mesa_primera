import { createBrowserClient } from '@supabase/ssr'
import { getPublicSupabaseEnv } from './env'

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv()

  if (typeof window === 'undefined') {
    return createBrowserClient(
      url,
      anonKey
    )
  }

  if (!client) {
    client = createBrowserClient(
      url,
      anonKey
    )
  }
  
  return client
}

