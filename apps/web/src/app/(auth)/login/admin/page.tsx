"use client"

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { loginAdmin } from '../../auth-actions'
import { ShieldCheck } from 'lucide-react'
import { adminEmailSchema, adminPasswordSchema } from '@/lib/validations'
import { AdminAlert, AdminAuthShell, AdminButton, AdminField, adminTextLink } from '@/components/auth/AdminAuthShell'

type AdminLoginState = { error?: string; fieldErrors?: Record<string, string> } | null

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAdmin, null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  function validateEmail(value: string) {
    const r = adminEmailSchema.safeParse(value.trim())
    setEmailError(r.success ? null : r.error.issues?.[0]?.message ?? 'Correo inválido')
  }

  function validatePassword(value: string) {
    const r = adminPasswordSchema.safeParse(value)
    setPasswordError(r.success ? null : r.error.issues?.[0]?.message ?? 'Contraseña inválida')
  }

  const typedState = state as AdminLoginState
  const serverErrors = typedState?.fieldErrors ?? {}
  const displayEmailError = serverErrors.email ?? emailError
  const displayPasswordError = serverErrors.password ?? passwordError
  const emailValid = emailTouched && !displayEmailError
  const passwordValid = passwordTouched && !displayPasswordError

  return (
    <AdminAuthShell
      icon={ShieldCheck}
      title="Admin"
      description="Acceso del personal autorizado. Después de la contraseña se pide el código 2FA."
    >
      {typedState?.error && <AdminAlert>{typedState.error}</AdminAlert>}

      <form action={formAction} className="space-y-5">
        <AdminField
          label="Correo autorizado"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="admin@mesa.co"
          onBlur={e => {
            setEmailTouched(true)
            validateEmail(e.target.value)
          }}
          onChange={e => {
            if (emailTouched) validateEmail(e.target.value)
          }}
          error={displayEmailError}
          valid={emailValid}
        />

        <AdminField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          onBlur={e => {
            setPasswordTouched(true)
            validatePassword(e.target.value)
          }}
          onChange={e => {
            if (passwordTouched) validatePassword(e.target.value)
          }}
          error={displayPasswordError}
          valid={passwordValid}
        />

        <AdminButton type="submit" pending={isPending} className="mt-2">
          {isPending ? 'Verificando...' : 'Acceder'}
        </AdminButton>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-5 text-sm text-slate-400">
          <span>2FA obligatorio</span>
          <Link href="/login/admin/recovery" className={adminTextLink}>
            Restablecer acceso
          </Link>
        </div>
      </form>
    </AdminAuthShell>
  )
}
