'use client'

import { createClient } from '@/utils/supabase/client'

/**
 * Initiates the Google OAuth sign-in flow (PKCE).
 *
 * Called from the browser — redirects the user to Google's consent screen.
 * After authentication, Supabase redirects to /api/auth/callback which
 * exchanges the code for a session and resolves the user's state.
 */
export async function signInWithGoogle() {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })

  if (error) {
    console.error('[GOOGLE_AUTH] signInWithOAuth failed:', error.message)
    return { error: error.message }
  }

  // signInWithOAuth redirects the browser — this line only reached on error
  return { error: null }
}
