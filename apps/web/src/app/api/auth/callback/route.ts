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
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  // Ensure "next" is always a relative path (prevent open redirect)
  if (!next.startsWith('/')) {
    next = '/'
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login/player?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[OAUTH_CALLBACK] Code exchange failed:', error.message)
    return NextResponse.redirect(`${origin}/login/player?error=auth_callback_failed`)
  }

  // Session is now set in cookies. Get the authenticated user.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login/player?error=no_user`)
  }

  // Check profile completeness
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url, phone, has_pin')
    .eq('id', user.id)
    .maybeSingle()

  const isProfileComplete = profile &&
    profile.username &&
    profile.full_name &&
    profile.avatar_url &&
    profile.phone

  if (!isProfileComplete) {
    // Google-first user without complete profile → complete registration
    return redirectTo(request, `${origin}/register/player/complete`)
  }

  if (!profile.has_pin) {
    // Has profile but no PIN → set PIN
    return redirectTo(request, `${origin}/register/player/pin`)
  }

  // Profile is complete — redirect to the requested destination
  return redirectTo(request, `${origin}${next}`)
}

function redirectTo(request: Request, url: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  if (isLocalEnv) {
    return NextResponse.redirect(url)
  } else if (forwardedHost) {
    // Behind load balancer — use the forwarded host
    const path = new URL(url).pathname + new URL(url).search
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  }

  return NextResponse.redirect(url)
}
