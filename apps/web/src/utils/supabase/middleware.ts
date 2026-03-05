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

  // --- Autenticado + intenta entrar a auth ---
  if (user && isAuthPage && !isMfaPage) {
    // Si es admin login, verificar si el usuario ya es admin
    // Si ya es admin, redirigir al panel admin
    // Si no es admin, dejar pasar (puede querer loguearse con otra cuenta)
    if (isAdminLogin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        // Ya es admin → mandarlo al dashboard admin
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
      // No es admin → redirigir al home del player
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Resto de páginas auth → redirigir a home
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
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
