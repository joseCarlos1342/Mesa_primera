'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { requestAdminPasswordReset } from '@/app/actions/admin-security'
import { AdminAlert, AdminAuthShell, AdminButton, AdminField } from '@/components/auth/AdminAuthShell'

export default function AdminRecoveryPage() {
  const searchParams = useSearchParams()
  const [state, formAction, isPending] = useActionState(requestAdminPasswordReset, null)
  const invalidLink = searchParams.get('error') === 'invalid_or_expired_link'

  return (
    <AdminAuthShell
      icon={ShieldAlert}
      title="Restablecer acceso"
      description="Ingresa el correo autorizado para recibir un enlace firmado que te permitirá rotar la contraseña del panel."
    >
      {invalidLink ? <AdminAlert>El enlace ya expiró o no es válido. Solicita uno nuevo.</AdminAlert> : null}
      {state?.error ? <AdminAlert>{state.error}</AdminAlert> : null}
      {state?.success ? <AdminAlert tone="success">{state.success}</AdminAlert> : null}

      <form action={formAction} className="space-y-5">
        <AdminField
          label="Correo administrativo"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="admin@mesa.co"
          error={state?.fieldErrors?.email}
        />

        <AdminButton type="submit" pending={isPending}>
          {isPending ? 'Enviando enlace...' : 'Enviar enlace seguro'}
        </AdminButton>
      </form>
    </AdminAuthShell>
  )
}
