import { NextResponse, type NextRequest } from 'next/server'
import { buildContentSecurityPolicy } from '@/lib/security/csp'
import { updateSession } from '@/utils/supabase/middleware'

const CANONICAL_HOST = 'primerariveradalos4ases.com'
const REDIRECT_HOSTS = new Set([
  'www.primerariveradalos4ases.com',
  'mesa-primera-web.vercel.app',
])

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestHeaders = new Headers(request.headers)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    isDevelopment,
  })

  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)

  const { hostname } = request.nextUrl
  const shouldRedirect =
    (request.method === 'GET' || request.method === 'HEAD') &&
    REDIRECT_HOSTS.has(hostname)

  if (shouldRedirect) {
    const canonicalUrl = request.nextUrl.clone()
    canonicalUrl.protocol = 'https'
    canonicalUrl.hostname = CANONICAL_HOST
    const response = NextResponse.redirect(canonicalUrl, 308)
    response.headers.set('Content-Security-Policy', contentSecurityPolicy)
    return response
  }

  const response = await updateSession(request, requestHeaders)
  response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|xml|txt)$).*)',
  ],
}
