"use client"

import { useSearchParams } from 'next/navigation'
import { useActionState, Suspense } from 'react'
import { verifyOtp } from '../../auth-actions'
import { AuthShell } from '@/components/auth/AuthShell'
import { RECOVERY_STEPS } from '@/components/auth/AuthStepper'
import { CodeInput } from '@/components/auth/CodeInput'
import { AuthAlert, AuthButton } from '@/components/auth/AuthForm'

function RecoveryVerifyContent() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const [state, formAction, isPending] = useActionState(verifyOtp, null)

  return (
    <AuthShell
      steps={{ labels: RECOVERY_STEPS, current: 2 }}
      title={
        <>
          Confirma tu <span className="italic text-brand-gold-light">identidad</span>
        </>
      }
      lead={
        <p>
          Enviamos un código a{' '}
          <span className="whitespace-nowrap font-mono font-semibold tabular-nums text-text-premium">{phone}</span>
        </p>
      }
      panelTitle={
        <>
          Vuelve a <span className="italic text-brand-gold-light">la mesa</span>
        </>
      }
      panelText="Recupera tu clave con un código SMS y sigue jugando con tu misma cuenta."
    >
      {state?.error && <AuthAlert className="mb-6">{state.error}</AuthAlert>}

      <form action={formAction} className="space-y-7">
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="flow" value="recovery" />

        <CodeInput name="token" label="Código del SMS" oneTimeCode autoFocus />

        <AuthButton type="submit" pending={isPending}>
          {isPending ? 'Verificando…' : 'Confirmar código'}
        </AuthButton>
      </form>
    </AuthShell>
  )
}

export default function RecoveryVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0a0a0a]" />}>
      <RecoveryVerifyContent />
    </Suspense>
  )
}
