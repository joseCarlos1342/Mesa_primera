import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // DEV BYPASS: Allow access if bypass cookie exists
  if (process.env.NODE_ENV === 'development' && request.cookies.get('mesa_dev_bypass')) {
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'player'

    // 1. Protección de rutas administrativas
    if (isAdminPath && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // 2. Redirección si está en páginas de Auth (Login/Register) o en la raíz
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
