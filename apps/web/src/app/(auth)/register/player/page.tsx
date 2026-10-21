"use client"

import { useActionState, useState } from 'react'
import { registerPlayer } from '../../auth-actions'
import { AvatarSelector } from '@/components/auth/avatar-selector'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { TurnstileWidget } from '@/components/auth/turnstile-widget'
import Link from 'next/link'
import { fullNameSchema, nicknameSchema, phoneSchema } from '@/lib/validations'
import { AuthShell } from '@/components/auth/AuthShell'
import { REGISTER_STEPS } from '@/components/auth/AuthStepper'
import { AuthAlert, AuthButton, AuthDivider, AuthField, AuthFooter, authTextLink } from '@/components/auth/AuthForm'

type RegisterState = { error?: string; fieldErrors?: Record<string, string> } | null

export default function PlayerRegisterPage() {
  const [state, formAction, isPending] = useActionState(registerPlayer, null)
  const [selectedAvatar, setSelectedAvatar] = useState('as-oros')

  // Local field errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [nicknameLen, setNicknameLen] = useState(0)

  const typedState = state as RegisterState
  const serverErrors = typedState?.fieldErrors ?? {}

  function touch(field: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  function setError(field: string, msg: string | null) {
    setErrors(prev => {
      if (msg === null) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: msg }
    })
  }

  function validateField(field: string, value: string) {
    touch(field)
    let result
    if (field === 'fullName') result = fullNameSchema.safeParse(value.trim())
    else if (field === 'nickname') result = nicknameSchema.safeParse(value.trim())
    else if (field === 'phone') result = phoneSchema.safeParse(value.trim())
    else return

    setError(field, result.success ? null : result.error.issues?.[0]?.message ?? 'Campo inválido')
  }

  function displayError(field: string) {
    return serverErrors[field] ?? errors[field]
  }

  function isValid(field: string) {
    return touched[field] && !displayError(field)
  }

  return (
    <AuthShell
      deal
      wide
      nav={{ href: '/login/player', label: 'Iniciar sesión', quiet: true }}
      steps={{ labels: REGISTER_STEPS, current: 1 }}
      title={
        <>
          Crea tu <span className="italic text-brand-gold-light">cuenta</span>
        </>
      }
      lead="Regístrate gratis con tu celular. Después te enviaremos un código por SMS."
      panelTitle={
        <>
          Tu lugar en <span className="italic text-brand-gold-light">la mesa</span>
        </>
      }
      panelText="Crea tu cuenta gratis en Primera Riverada los 4 Ases y únete al club de cartas de Neiva. Juega Primera en tiempo real."
    >
      {typedState?.error && <AuthAlert className="mb-6">{typedState.error}</AuthAlert>}

      <form action={formAction} className="space-y-7">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 md:gap-5">
          <AuthField
            label="Nombre real"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            maxLength={80}
            placeholder="Jose Carlos"
            onChange={e => { if (touched.fullName) validateField('fullName', e.target.value) }}
            onBlur={e => validateField('fullName', e.target.value)}
            error={displayError('fullName')}
            valid={isValid('fullName')}
            hint="Solo letras, espacios y guiones"
          />

          <AuthField
            label="Apodo"
            labelAside={
              <span
                className={`font-mono text-sm tabular-nums ${nicknameLen > 18 ? 'text-brand-gold-light' : 'text-[#8a8478]'}`}
              >
                {nicknameLen}/20
              </span>
            }
            name="nickname"
            type="text"
            autoComplete="nickname"
            required
            maxLength={20}
            placeholder="AsDelDestino"
            onChange={e => {
              setNicknameLen(e.target.value.length)
              if (touched.nickname) validateField('nickname', e.target.value)
            }}
            onBlur={e => validateField('nickname', e.target.value)}
            error={displayError('nickname')}
            valid={isValid('nickname')}
            hint="Letras, números y _ (sin espacios)"
          />
        </div>

        <AuthField
          label="Número de celular"
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
            if (touched.phone) validateField('phone', digits)
          }}
          onBlur={e => validateField('phone', e.target.value)}
          error={displayError('phone')}
          valid={isValid('phone')}
          hint="10 dígitos, debe empezar por 3"
        />

        <AvatarSelector onSelect={setSelectedAvatar} selectedId={selectedAvatar} />
        <input type="hidden" name="avatarId" value={selectedAvatar} />

        <TurnstileWidget />

        <AuthButton type="submit" pending={isPending}>
          {isPending ? 'Registrando…' : 'Reclamar mi lugar'}
        </AuthButton>
      </form>

      <AuthDivider />
      <GoogleSignInButton label="Registrarme con Google" />

      <AuthFooter>
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login/player" className={authTextLink}>
            Entrar ahora
          </Link>
        </p>
      </AuthFooter>
    </AuthShell>
  )
}
