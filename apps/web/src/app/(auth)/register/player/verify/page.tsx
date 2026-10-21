"use client"

import { useSearchParams } from 'next/navigation'
import { useActionState, Suspense } from 'react'
import { verifyOtp } from '../../../auth-actions'
import { AuthShell } from '@/components/auth/AuthShell'
import { REGISTER_STEPS } from '@/components/auth/AuthStepper'
import { CodeInput } from '@/components/auth/CodeInput'
import { AuthAlert, AuthButton, AuthFooter, authTextLink } from '@/components/auth/AuthForm'

function VerifyContent() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const [state, formAction, isPending] = useActionState(verifyOtp, null)

  return (
    <AuthShell
      steps={{ labels: REGISTER_STEPS, current: 2 }}
      title={
        <>
          Confirma tu <span className="italic text-brand-gold-light">número</span>
        </>
      }
      lead={
        <p>
          Enviamos un código de 6 dígitos a{' '}
          <span className="whitespace-nowrap font-mono font-semibold tabular-nums text-text-premium">{phone}</span>
        </p>
      }
    >
      {state?.error && <AuthAlert className="mb-6">{state.error}</AuthAlert>}

      <form action={formAction} className="space-y-7">
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="flow" value="register" />

        <CodeInput name="token" label="Código del SMS" oneTimeCode autoFocus />

        <AuthButton type="submit" pending={isPending}>
          {isPending ? 'Verificando…' : 'Confirmar código'}
        </AuthButton>
      </form>

      <AuthFooter>
        <p>
          ¿Problemas con el SMS?{' '}
          <button type="button" className={authTextLink}>
            Reintentar envío
          </button>
        </p>
      </AuthFooter>
    </AuthShell>
  )
}

export default function RegisterVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0a0a0a]" />}>
      <VerifyContent />
    </Suspense>
  )
}
