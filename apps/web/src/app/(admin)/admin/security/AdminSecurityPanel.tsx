'use client'

import { startTransition, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import {
  requestAdminEmailChange,
  requestAdminPasswordReset,
  resetAdminTotpFactor,
  rotateAdminRecoveryCodes,
  revokeOtherAdminSessions,
  signOutAllAdminSessions,
  type AdminSecurityActionState,
  type AdminSecuritySnapshot,
} from '@/app/actions/admin-security'

type Props = {
  snapshot: AdminSecuritySnapshot
}

function ActionNotice({ state }: { state: AdminSecurityActionState | null }) {
  if (!state) {
    return null
  }

  if (state.error) {
    return <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{state.error}</p>
  }

  if (state.success) {
    return <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{state.success}</p>
  }

  return null
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-xs font-semibold text-red-300">{message}</p>
}

export function AdminSecurityPanel({ snapshot }: Props) {
  const router = useRouter()
  const [emailState, emailAction, emailPending] = useActionState(requestAdminEmailChange, null)
  const [passwordState, passwordAction, passwordPending] = useActionState(requestAdminPasswordReset, null)
  const [totpState, totpAction, totpPending] = useActionState(resetAdminTotpFactor, null)
  const [recoveryState, recoveryAction, recoveryPending] = useActionState(rotateAdminRecoveryCodes, null)
  const [revokeState, revokeAction, revokePending] = useActionState(revokeOtherAdminSessions, null)
  const [globalState, globalAction, globalPending] = useActionState(signOutAllAdminSessions, null)

  useEffect(() => {
    const redirectTo = totpState?.redirectTo ?? globalState?.redirectTo

    if (!redirectTo) {
      return
    }

    startTransition(() => {
      router.push(redirectTo)
    })
  }, [globalState?.redirectTo, router, totpState?.redirectTo])

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-[2rem] border border-white/8 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/15">
            <Mail className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Correo</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Cambio endurecido de email</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Se exige un código TOTP válido antes de abrir el flujo de confirmación por correo.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-slate-300">
          Correo actual: <span className="font-semibold text-white">{snapshot.email}</span>
        </div>

        <form action={emailAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Nuevo correo</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={snapshot.email}
              className="h-14 w-full rounded-2xl border border-white/8 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
            />
            <FieldError message={emailState?.fieldErrors?.email} />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Código TOTP actual</label>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              placeholder="000000"
              className="h-14 w-full rounded-2xl border border-white/8 bg-black/30 px-4 text-sm tracking-[0.3em] text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
            />
            <FieldError message={emailState?.fieldErrors?.code} />
          </div>

          <button
            type="submit"
            disabled={emailPending}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-500 px-5 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-indigo-400 disabled:opacity-60"
          >
            {emailPending ? 'Validando...' : 'Solicitar cambio'}
          </button>
        </form>

        <div className="mt-4">
          <ActionNotice state={emailState} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15">
            <KeyRound className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">Contraseña</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Recuperación controlada</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Envía un enlace seguro al correo administrativo actual para rotar la contraseña sin exponer un cambio directo desde esta pantalla.
            </p>
          </div>
        </div>

        <form action={passwordAction} className="space-y-4">
          <input type="hidden" name="email" value={snapshot.email} />
          <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-slate-300">
            El enlace se enviará a <span className="font-semibold text-white">{snapshot.email}</span>
          </div>
          <button
            type="submit"
            disabled={passwordPending}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-amber-400 px-5 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {passwordPending ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <div className="mt-4">
          <ActionNotice state={passwordState} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/15">
            <Smartphone className="h-6 w-6 text-red-300" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">TOTP</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Restablecer factor</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              El factor actual solo se elimina después de validar el código vigente. Luego se fuerza un nuevo enrolamiento.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-slate-300">
          {snapshot.hasTotpFactor ? <ShieldCheck className="h-5 w-5 text-emerald-300" /> : <ShieldAlert className="h-5 w-5 text-amber-300" />}
          <span>{snapshot.hasTotpFactor ? 'Factor TOTP activo y verificado.' : 'No hay factor TOTP verificado.'}</span>
        </div>

        <form action={totpAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Código TOTP actual</label>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              placeholder="000000"
              className="h-14 w-full rounded-2xl border border-white/8 bg-black/30 px-4 text-sm tracking-[0.3em] text-white outline-none transition focus:border-red-400/40 focus:ring-2 focus:ring-red-500/20"
            />
            <FieldError message={totpState?.fieldErrors?.code} />
          </div>

          <button
            type="submit"
            disabled={totpPending}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-red-500 px-5 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-red-400 disabled:opacity-60"
          >
            {totpPending ? 'Revocando...' : 'Eliminar y volver a configurar'}
          </button>
        </form>

        <div className="mt-4">
          <ActionNotice state={totpState} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/15">
            <RefreshCw className="h-6 w-6 text-cyan-300" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Recovery codes</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Respaldo de MFA</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Genera códigos de un solo uso para recuperar el acceso si pierdes la app autenticadora. Rotarlos invalida el lote anterior.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-slate-300">
          Códigos activos: <span className="font-semibold text-white">{snapshot.activeRecoveryCodes}</span>
        </div>

        <form action={recoveryAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Código TOTP actual</label>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              placeholder="000000"
              className="h-14 w-full rounded-2xl border border-white/8 bg-black/30 px-4 text-sm tracking-[0.3em] text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
            />
            <FieldError message={recoveryState?.fieldErrors?.code} />
          </div>

          <button
            type="submit"
            disabled={recoveryPending}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-cyan-400 px-5 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {recoveryPending ? 'Regenerando...' : 'Regenerar códigos'}
          </button>
        </form>

        <div className="mt-4 space-y-4">
          <ActionNotice state={recoveryState} />

          {recoveryState?.recoveryCodes?.length ? (
            <div className="rounded-[1.75rem] border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Guárdalos fuera del panel</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {recoveryState.recoveryCodes.map((recoveryCode) => (
                  <div
                    key={recoveryCode}
                    className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 font-mono text-sm tracking-[0.18em] text-white"
                  >
                    {recoveryCode}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-cyan-100/80">
                Cada código sirve una sola vez. Si alguien ve este lote, regénéralo inmediatamente.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15">
            <LogOut className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Sesiones</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Cierre remoto</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Revoca otras sesiones abiertas o fuerza cierre global si sospechas compromiso del dispositivo.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <form action={revokeAction} className="space-y-4 rounded-[1.75rem] border border-white/5 bg-black/20 p-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Otras sesiones</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Mantiene esta sesión activa y cierra el resto.</p>
            </div>
            <button
              type="submit"
              disabled={revokePending}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {revokePending ? 'Cerrando...' : 'Revocar otras'}
            </button>
            <ActionNotice state={revokeState} />
          </form>

          <form action={globalAction} className="space-y-4 rounded-[1.75rem] border border-red-500/15 bg-red-500/5 p-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Cierre total</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Revoca todo y devuelve el acceso al login administrativo.</p>
            </div>
            <button
              type="submit"
              disabled={globalPending}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-red-100 disabled:opacity-60"
            >
              {globalPending ? 'Revocando...' : 'Cerrar todo'}
            </button>
            <ActionNotice state={globalState} />
          </form>
        </div>
      </section>
    </div>
  )
}