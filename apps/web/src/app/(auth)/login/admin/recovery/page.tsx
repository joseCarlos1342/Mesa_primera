'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Mail, ShieldAlert } from 'lucide-react'
import { requestAdminPasswordReset } from '@/app/actions/admin-security'

export default function AdminRecoveryPage() {
  const searchParams = useSearchParams()
  const [state, formAction, isPending] = useActionState(requestAdminPasswordReset, null)
  const invalidLink = searchParams.get('error') === 'invalid_or_expired_link'

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-8">
        <Link
          href="/login/admin"
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al login
        </Link>

        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/70 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] border border-red-500/30 bg-red-500/10">
              <ShieldAlert className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-300">Recuperación administrativa</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Restablecer acceso</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Ingresa el correo autorizado para recibir un enlace firmado que te permitirá rotar la contraseña del panel.
              </p>
            </div>
          </div>

          {invalidLink ? (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              El enlace ya expiró o no es válido. Solicita uno nuevo.
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
                <Mail className="h-4 w-4" />
                Correo administrativo
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="admin@mesa.co"
                className="h-14 w-full rounded-2xl border border-white/8 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-red-400/40 focus:ring-2 focus:ring-red-500/20"
              />
              {state?.fieldErrors?.email ? <p className="text-xs font-semibold text-red-300">{state.fieldErrors.email}</p> : null}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-red-500 hover:text-white disabled:opacity-60"
            >
              {isPending ? 'Enviando enlace...' : 'Enviar enlace seguro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}