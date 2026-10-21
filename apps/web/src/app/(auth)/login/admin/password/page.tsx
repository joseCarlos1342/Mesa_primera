'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { completeAdminPasswordReset } from '@/app/actions/admin-security'
import { createClient as createBrowserClient } from '@/utils/supabase/client'
import { AdminAlert, AdminAuthShell, AdminButton, AdminField } from '@/components/auth/AdminAuthShell'

function getRecoveryTokensFromHash() {
  const hash = window.location.hash.replace(/^#/, '')

  if (!hash) {
    return null
  }

  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const type = params.get('type')

  if (!accessToken || !refreshToken || type !== 'recovery') {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

export default function AdminPasswordResetPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(completeAdminPasswordReset, null)
  const [recoverySessionStatus, setRecoverySessionStatus] = useState<'loading' | 'ready' | 'invalid'>('loading')

  useEffect(() => {
    let isMounted = true
    const supabase = createBrowserClient()

    const syncRecoverySession = async () => {
      const recoveryTokens = getRecoveryTokensFromHash()

      if (recoveryTokens) {
        const { data, error } = await supabase.auth.setSession({
          access_token: recoveryTokens.accessToken,
          refresh_token: recoveryTokens.refreshToken,
        })

        if (!isMounted) {
          return
        }

        if (error) {
          setRecoverySessionStatus('invalid')
          return
        }

        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
        setRecoverySessionStatus(data.session ? 'ready' : 'invalid')
        return
      }

      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        setRecoverySessionStatus('invalid')
        return
      }

      setRecoverySessionStatus(data.session ? 'ready' : 'invalid')
    }

    void syncRecoverySession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) {
        return
      }

      setRecoverySessionStatus(session ? 'ready' : 'invalid')
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (state?.success) {
      router.push('/login/admin')
    }
  }, [router, state?.success])

  const recoverySessionError = recoverySessionStatus === 'invalid'
    ? 'El enlace ya expiró o no es válido. Solicita uno nuevo.'
    : null

  return (
    <AdminAuthShell
      icon={ShieldCheck}
      title="Definir nueva clave"
      description="Este paso requiere que hayas llegado desde el enlace enviado por correo. La sesión temporal quedará asociada al cambio de contraseña."
    >
      {recoverySessionError ? <AdminAlert>{recoverySessionError}</AdminAlert> : null}
      {state?.error ? <AdminAlert>{state.error}</AdminAlert> : null}
      {state?.success ? <AdminAlert tone="success">{state.success}</AdminAlert> : null}

      <form action={formAction} className="space-y-5">
        <AdminField
          label="Nueva contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          error={state?.fieldErrors?.password}
        />

        <AdminField
          label="Confirmar contraseña"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          error={state?.fieldErrors?.passwordConfirm}
        />

        <AdminButton type="submit" disabled={recoverySessionStatus !== 'ready'} pending={isPending}>
          {isPending ? 'Actualizando...' : recoverySessionStatus === 'loading' ? 'Validando enlace...' : 'Actualizar contraseña'}
        </AdminButton>
      </form>
    </AdminAuthShell>
  )
}