"use client"

import { useActionState, useState } from 'react'
import { setPlayerPin } from '../../../auth-actions'
import { pinSchema } from '@/lib/validations'
import { AuthShell } from '@/components/auth/AuthShell'
import { REGISTER_STEPS } from '@/components/auth/AuthStepper'
import { CodeInput } from '@/components/auth/CodeInput'
import { AuthAlert, AuthButton, AuthFooter } from '@/components/auth/AuthForm'

type PinState = { error?: string; fieldErrors?: Record<string, string> } | null

export default function SetPinPage() {
  const [state, formAction, isPending] = useActionState(setPlayerPin, null)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const typedState = state as PinState
  const serverErrors = typedState?.fieldErrors ?? {}

  function validatePin(value: string) {
    const result = pinSchema.safeParse(value)
    setErrors(prev => ({
      ...prev,
      pin: result.success ? '' : (result.error.issues?.[0]?.message ?? 'Clave inválida'),
    }))
  }

  function validateConfirm(value: string) {
    setErrors(prev => ({
      ...prev,
      pinConfirm: value === pin ? '' : 'Las claves no coinciden',
    }))
  }

  function displayError(field: string) {
    return serverErrors[field] || errors[field] || undefined
  }

  function isValid(field: string) {
    return Boolean(touched[field]) && !displayError(field)
  }

  return (
    <AuthShell
      steps={{ labels: REGISTER_STEPS, current: 3 }}
      title={
        <>
          Crea tu <span className="italic text-brand-gold-light">clave</span>
        </>
      }
      lead={
        <p>
          Elige una clave de 6 dígitos para entrar a tu cuenta. Úsala como la clave de tu tarjeta bancaria.
        </p>
      }
    >
      {typedState?.error && <AuthAlert className="mb-6">{typedState.error}</AuthAlert>}

      <form action={formAction} className="space-y-7">
        <input type="hidden" name="flow" value="register" />

        <CodeInput
          name="pin"
          label="Clave de 6 dígitos"
          masked
          autoFocus
          value={pin}
          onChange={digits => {
            setPin(digits)
            if (touched.pin) validatePin(digits)
          }}
          onBlur={() => {
            setTouched(prev => ({ ...prev, pin: true }))
            validatePin(pin)
          }}
          error={displayError('pin')}
          valid={isValid('pin')}
        />

        <CodeInput
          name="pinConfirm"
          label="Repite tu clave"
          masked
          value={pinConfirm}
          onChange={digits => {
            setPinConfirm(digits)
            if (touched.pinConfirm) validateConfirm(digits)
          }}
          onBlur={() => {
            setTouched(prev => ({ ...prev, pinConfirm: true }))
            validateConfirm(pinConfirm)
          }}
          error={displayError('pinConfirm')}
          valid={isValid('pinConfirm')}
        />

        <AuthButton type="submit" pending={isPending}>
          {isPending ? 'Configurando…' : 'Guardar mi clave'}
        </AuthButton>
      </form>

      <AuthFooter>
        <p>Esta clave se usará cada vez que inicies sesión. Si la olvidas, podrás recuperarla con un SMS.</p>
      </AuthFooter>
    </AuthShell>
  )
}
