import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPublicSupabaseEnv, getSupabaseEnvErrorMessage } from './env'

export async function updateSession(request: NextRequest) {
  const envErrorMessage = getSupabaseEnvErrorMessage()

  if (envErrorMessage) {
    return new NextResponse(envErrorMessage, {
      status: 500,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    })
  }

  const { url, anonKey } = getPublicSupabaseEnv()
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isAdminPath = pathname.startsWith('/admin')
  const isMfaPage = pathname === '/login/admin/mfa'

  // PREVENT REDIRECT FOR STATIC FILES
  const isStaticFile = pathname.match(/\.(json|png|jpg|jpeg|gif|webp|svg|ico)$/)
  if (isStaticFile) {
    return supabaseResponse
  }

  // --- Caso 1: No Autenticado ---
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login/player'
    return NextResponse.redirect(url)
  }

  // --- Caso 2: Autenticado ---
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, last_device_id')
      .eq('id', user.id)
      .single()

    let role: string
    let lastDeviceId: string | null = null

    if (profileError || !profile) {
      // Fallback: last_device_id column might not exist yet (migration pending)
      const { data: fallback } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      role = fallback?.role || 'player'
    } else {
      role = profile.role || 'player'
      lastDeviceId = profile.last_device_id ?? null
    }

    // ── Single-session policy: compare device cookie vs DB ──
    const sessionDeviceCookie = request.cookies.get('session_device_id')?.value
    if (
      lastDeviceId &&
      sessionDeviceCookie &&
      sessionDeviceCookie !== lastDeviceId
    ) {
      // This session is stale — another device logged in
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login/player'
      url.searchParams.set('kicked', 'true')
      const redirectResponse = NextResponse.redirect(url)
      // Clear the stale cookie
      redirectResponse.cookies.delete('session_device_id')
      return redirectResponse
    }

    // 1. Protección de rutas administrativas
    if (isAdminPath && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // 2. Admin no debe acceder a rutas de jugador
    if (role === 'admin' && !isAdminPath && !isAuthPage && !isMfaPage && pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    // 3. Redirección si está en páginas de Auth (Login/Register) o en la raíz
    const isRootPage = pathname === '/'
    
    if (isAuthPage || isRootPage) {
      if (role === 'admin') {
        // Un admin logueado NO debe estar en páginas de auth genéricas o en el lobby del player
        // Si no está ya en /admin, lo mandamos para allá
        if (!isAdminPath || isAuthPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          return NextResponse.redirect(url)
        }
      } else {
        // Un jugador logueado NO debe estar en páginas de auth
        if (isAuthPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}
