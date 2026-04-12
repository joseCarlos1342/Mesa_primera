import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * OAuth PKCE callback handler.
 *
 * After the user authenticates with Google, Supabase redirects here with a
 * `code` query param. We exchange it for a session, then inspect the user's
 * profile to decide the next step:
 *
 * 1. Profile complete + device trusted  → lobby  (/)
 * 2. Profile complete + device unknown  → device-verify OTP
 * 3. Profile incomplete (new Google user) → complete registration
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  // Resolve the actual origin (Vercel uses x-forwarded-host behind its proxy)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const origin = forwardedHost
    ? `https://${forwardedHost}`
    : new URL(request.url).origin

  // Ensure "next" is always a relative path (prevent open redirect)
  if (!next.startsWith('/')) {
    next = '/'
  }

  if (!code) {
    console.error('[OAUTH_CALLBACK] Missing code parameter')
    return NextResponse.redirect(`${origin}/login/player?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[OAUTH_CALLBACK] Code exchange failed:', error.message)
    return NextResponse.redirect(
      `${origin}/login/player?error=${encodeURIComponent(error.message)}`
    )
  }

  // Session is now set in cookies. Get the authenticated user.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('[OAUTH_CALLBACK] No user after code exchange')
    return NextResponse.redirect(`${origin}/login/player?error=no_user`)
  }

  // Check profile completeness
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, username, full_name, avatar_url, phone, has_pin')
    .eq('id', user.id)
    .maybeSingle()

  // Google sign-in is only for players — block admin accounts
  if (profile?.role === 'admin') {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      `${origin}/login/player?error=${encodeURIComponent('Google solo está disponible para jugadores. Los admins deben usar su acceso habitual.')}`
    )
  }

  const isProfileComplete = profile &&
    profile.username &&
    profile.full_name &&
    profile.avatar_url &&
    profile.phone

  if (!isProfileComplete) {
    // Google-first user without complete profile → complete registration
    return NextResponse.redirect(`${origin}/register/player/complete`)
  }

  if (!profile.has_pin) {
    // Has profile but no PIN → set PIN
    return NextResponse.redirect(`${origin}/register/player/pin`)
  }

  // Profile is complete — redirect to the requested destination
  return NextResponse.redirect(`${origin}${next}`)
}
