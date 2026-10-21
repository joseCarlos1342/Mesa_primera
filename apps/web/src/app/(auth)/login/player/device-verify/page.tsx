"use client"

import { useSearchParams } from 'next/navigation'
import { useActionState, Suspense } from 'react'
import { verifyOtp } from '../../../auth-actions'
import { AuthShell } from '@/components/auth/AuthShell'
import { CodeInput } from '@/components/auth/CodeInput'
import { AuthAlert, AuthButton, AuthFooter } from '@/components/auth/AuthForm'

function DeviceVerifyContent() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const [state, formAction, isPending] = useActionState(verifyOtp, null)

  return (
    <AuthShell
      title={
        <>
          Verifica tu <span className="italic text-brand-gold-light">identidad</span>
        </>
      }
      lead={
        <p>
          Detectamos un inicio de sesión desde un dispositivo nuevo. Enviamos un código de seguridad a{' '}
          <span className="whitespace-nowrap font-mono font-semibold tabular-nums text-text-premium">{phone}</span>
        </p>
      }
    >
      {state?.error && <AuthAlert className="mb-6">{state.error}</AuthAlert>}

      <form action={formAction} className="space-y-7">
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="flow" value="device-verify" />

        <CodeInput name="token" label="Código del SMS" oneTimeCode autoFocus />

        <AuthButton type="submit" pending={isPending}>
          {isPending ? 'Verificando…' : 'Confirmar dispositivo'}
        </AuthButton>
      </form>

      <AuthFooter>
        <p>Este dispositivo será recordado por 30 días. No necesitarás verificar nuevamente desde aquí.</p>
      </AuthFooter>
    </AuthShell>
  )
}

export default function DeviceVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0a0a0a]" />}>
      <DeviceVerifyContent />
    </Suspense>
  )
}
