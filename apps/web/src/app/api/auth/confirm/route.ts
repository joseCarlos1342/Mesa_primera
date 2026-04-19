import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/login/admin'
  }

  return nextPath
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNextPath(request.nextUrl.searchParams.get('next'))
  const redirectTo = request.nextUrl.clone()

  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  const errorRedirect = request.nextUrl.clone()
  errorRedirect.pathname = '/login/admin/recovery'
  errorRedirect.searchParams.set('error', 'invalid_or_expired_link')
  return NextResponse.redirect(errorRedirect)
}