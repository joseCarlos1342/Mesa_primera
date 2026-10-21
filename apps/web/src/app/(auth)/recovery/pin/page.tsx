"use client"

import { useActionState, useState } from 'react'
import { setPlayerPin } from '../../auth-actions'
import { pinSchema } from '@/lib/validations'
import { AuthShell } from '@/components/auth/AuthShell'
import { RECOVERY_STEPS } from '@/components/auth/AuthStepper'
import { CodeInput } from '@/components/auth/CodeInput'
import { AuthAlert, AuthButton } from '@/components/auth/AuthForm'

type PinState = { error?: string; fieldErrors?: Record<string, string> } | null

export default function RecoveryPinPage() {
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
      steps={{ labels: RECOVERY_STEPS, current: 3 }}
      title={
        <>
          Restablece tu <span className="italic text-brand-gold-light">clave</span>
        </>
      }
      lead="Elige una nueva clave de 6 dígitos."
      panelTitle={
        <>
          Vuelve a <span className="italic text-brand-gold-light">la mesa</span>
        </>
      }
      panelText="Recupera tu clave con un código SMS y sigue jugando con tu misma cuenta."
    >
      {typedState?.error && <AuthAlert className="mb-6">{typedState.error}</AuthAlert>}

      <form action={formAction} className="space-y-7">
        <input type="hidden" name="flow" value="recovery" />

        <CodeInput
          name="pin"
          label="Nueva clave de 6 dígitos"
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
          label="Repite tu nueva clave"
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
          {isPending ? 'Guardando…' : 'Guardar clave'}
        </AuthButton>
      </form>
    </AuthShell>
  )
}
