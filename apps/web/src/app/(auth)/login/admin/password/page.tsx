'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, ShieldCheck } from 'lucide-react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { completeAdminPasswordReset } from '@/app/actions/admin-security'
import { createClient as createBrowserClient } from '@/utils/supabase/client'

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
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-xl flex-col">
        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/70 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] border border-emerald-500/30 bg-emerald-500/10">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">Rotación de contraseña</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Definir nueva clave</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Este paso requiere que hayas llegado desde el enlace enviado por correo. La sesión temporal quedará asociada al cambio de contraseña.
              </p>
            </div>
          </div>

          {recoverySessionError ? (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {recoverySessionError}
            </div>
          ) : null}

          {state?.error ? (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {state.error}
            </div>
          ) : null}

          {state?.success ? (
            <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {state.success}
            </div>
          ) : null}

          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                <KeyRound className="h-4 w-4" />
                Nueva contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="h-14 w-full rounded-2xl border border-white/8 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
              />
              {state?.fieldErrors?.password ? <p className="text-xs font-semibold text-red-300">{state.fieldErrors.password}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Confirmar contraseña</label>
              <input
                name="passwordConfirm"
                type="password"
                required
                placeholder="••••••••"
                className="h-14 w-full rounded-2xl border border-white/8 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
              />
              {state?.fieldErrors?.passwordConfirm ? <p className="text-xs font-semibold text-red-300">{state.fieldErrors.passwordConfirm}</p> : null}
            </div>

            <button
              type="submit"
              disabled={isPending || recoverySessionStatus !== 'ready'}
              className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {isPending ? 'Actualizando...' : recoverySessionStatus === 'loading' ? 'Validando enlace...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}