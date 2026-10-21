"use client"

import { useActionState, useState } from 'react'
import { startPinRecovery } from '../auth-actions'
import Link from 'next/link'
import { phoneSchema } from '@/lib/validations'
import { TurnstileWidget } from '@/components/auth/turnstile-widget'
import { AuthShell } from '@/components/auth/AuthShell'
import { RECOVERY_STEPS } from '@/components/auth/AuthStepper'
import { AuthAlert, AuthButton, AuthField, AuthFooter, authTextLink } from '@/components/auth/AuthForm'

type RecoveryState = { error?: string; fieldErrors?: Record<string, string> } | null

export default function RecoveryPage() {
  const [state, formAction, isPending] = useActionState(startPinRecovery, null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [phoneTouched, setPhoneTouched] = useState(false)

  function validatePhone(value: string) {
    const result = phoneSchema.safeParse(value.trim())
    setPhoneError(result.success ? null : result.error.issues?.[0]?.message ?? 'Número inválido')
  }

  const typedState = state as RecoveryState
  const displayPhoneError = typedState?.fieldErrors?.phone ?? phoneError
  const phoneIsValid = phoneTouched && !displayPhoneError

  return (
    <AuthShell
      nav={{ href: '/login/player', label: 'Iniciar sesión', quiet: true }}
      steps={{ labels: RECOVERY_STEPS, current: 1 }}
      title={
        <>
          ¿Olvidaste tu <span className="italic text-brand-gold-light">clave</span>?
        </>
      }
      lead="Escribe tu número de celular y te enviaremos un código SMS para restablecer tu clave."
      panelTitle={
        <>
          Vuelve a <span className="italic text-brand-gold-light">la mesa</span>
        </>
      }
      panelText="Recupera tu clave con un código SMS y sigue jugando con tu misma cuenta."
    >
      {typedState?.error && <AuthAlert className="mb-6">{typedState.error}</AuthAlert>}

      <form action={formAction} className="space-y-7">
        <AuthField
          label="Tu número de celular"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          required
          placeholder="3001234567"
          prefix="+57"
          mono
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '')
            e.target.value = digits
            if (phoneTouched) validatePhone(digits)
          }}
          onBlur={e => {
            setPhoneTouched(true)
            validatePhone(e.target.value)
          }}
          error={displayPhoneError}
          valid={phoneIsValid}
        />

        <TurnstileWidget />

        <AuthButton type="submit" pending={isPending}>
          {isPending ? 'Enviando…' : 'Enviar código SMS'}
        </AuthButton>
      </form>

      <AuthFooter>
        <p>
          ¿Recuerdas tu clave?{' '}
          <Link href="/login/player" className={authTextLink}>
            Iniciar sesión
          </Link>
        </p>
      </AuthFooter>
    </AuthShell>
  )
}
