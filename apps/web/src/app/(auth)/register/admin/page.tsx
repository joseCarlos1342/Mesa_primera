"use client"

import { useActionState } from 'react'
import { registerAdmin } from '../../auth-actions'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'
import { AdminAlert, AdminAuthShell, AdminButton, AdminField, adminTextLink } from '@/components/auth/AdminAuthShell'

export default function AdminRegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAdmin, null)

  return (
    <AdminAuthShell
      icon={UserPlus}
      title="Nuevo administrador"
      description="Alta de cuenta del panel. Necesitas un token de invitación vigente."
    >
      {state?.error && <AdminAlert>{state.error}</AdminAlert>}

      <form action={formAction} className="space-y-5">
        <AdminField label="Nombre completo" name="fullName" type="text" autoComplete="name" required placeholder="Admin Boss" />
        <AdminField
          label="Correo corporativo"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@terminal.auth"
        />
        <AdminField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
        />
        <AdminField
          label="Token de invitación"
          name="inviteToken"
          type="password"
          autoComplete="off"
          required
          placeholder="••••••••••••"
          className="font-mono"
        />

        <AdminButton type="submit" pending={isPending} className="mt-2">
          {!isPending && <UserPlus className="h-4 w-4" aria-hidden="true" />}
          {isPending ? 'Registrando...' : 'Alta de administrador'}
        </AdminButton>
      </form>

      <p className="mt-6 border-t border-white/5 pt-5 text-sm text-slate-400">
        ¿Ya estás autorizado?{' '}
        <Link href="/login/admin" className={adminTextLink}>
          Iniciar sesión admin
        </Link>
      </p>
    </AdminAuthShell>
  )
}
