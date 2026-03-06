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
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/auth')
  const isAdminPage = pathname.startsWith('/admin')
  const isAdminLogin = pathname.startsWith('/login/admin')
  const isMfaPage = pathname === '/login/admin/mfa'

  // --- No autenticado ---
  if (!user && !isAuthPage) {
    // Sin sesión y no es página de auth → redirigir a login player
    const url = request.nextUrl.clone()
    url.pathname = '/login/player'
    return NextResponse.redirect(url)
  }

  // --- Autenticado + intenta entrar a auth o root ---
  const isRootPage = pathname === '/'
  
  if (user && (isAuthPage || isRootPage) && !isMfaPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'player'

    // Redirección basada en rol
    if (role === 'admin') {
      // Si es admin y no está en /admin, mandarlo allá (excepto si está en MFA)
      if (!pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    } else {
      // Si es player y está en auth page o root, mandarlo al lobby (que es /)
      if (isAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  // --- Protección rutas Admin ---
  if (user && isAdminPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
