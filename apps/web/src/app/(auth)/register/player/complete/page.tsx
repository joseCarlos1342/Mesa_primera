"use client"

import { useActionState, useEffect, useState } from 'react'
import { completeGoogleRegistration, getGoogleUserData } from '../../../auth-actions'
import { AvatarSelector } from '@/components/auth/avatar-selector'
import { Mail } from 'lucide-react'
import { fullNameSchema, nicknameSchema, phoneSchema } from '@/lib/validations'
import { AuthShell } from '@/components/auth/AuthShell'
import { REGISTER_STEPS } from '@/components/auth/AuthStepper'
import { AuthAlert, AuthButton, AuthField } from '@/components/auth/AuthForm'

type CompleteState = { error?: string; fieldErrors?: Record<string, string> } | null

export default function CompleteGoogleRegistrationPage() {
  const [state, formAction, isPending] = useActionState(completeGoogleRegistration, null)
  const [selectedAvatar, setSelectedAvatar] = useState('as-oros')
  const [googleData, setGoogleData] = useState<{ fullName: string; email: string; avatarUrl: string } | null>(null)
  const [fullNameValue, setFullNameValue] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [nicknameLen, setNicknameLen] = useState(0)

  const typedState = state as CompleteState
  const serverErrors = typedState?.fieldErrors ?? {}

  useEffect(() => {
    getGoogleUserData().then(data => {
      if (data) {
        setGoogleData(data)
        if (data.fullName) setFullNameValue(data.fullName)
      }
    })
  }, [])

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
      wide
      steps={{ labels: REGISTER_STEPS, current: 1 }}
      title={
        <>
          Casi <span className="italic text-brand-gold-light">listo</span>
        </>
      }
      lead="Completa tu perfil de Google para empezar a jugar."
      panelTitle={
        <>
          Tu lugar en <span className="italic text-brand-gold-light">la mesa</span>
        </>
      }
    >
      {googleData?.email && (
        <div className="mb-6 flex min-w-0 items-start gap-3 rounded-lg border border-[#8b6b2e]/60 bg-[#120806] px-4 py-3.5 text-base text-[#d9d3bf]">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" aria-hidden="true" />
          <div className="min-w-0">
            <p>Conectado como</p>
            <p className="break-words font-semibold text-text-premium [overflow-wrap:anywhere]">{googleData.email}</p>
          </div>
        </div>
      )}

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
            value={fullNameValue}
            onChange={e => {
              setFullNameValue(e.target.value)
              if (touched.fullName) validateField('fullName', e.target.value)
            }}
            onBlur={e => validateField('fullName', e.target.value)}
            error={displayError('fullName')}
            valid={isValid('fullName')}
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
          hint="10 dígitos, debe empezar por 3. Recibirás un código de verificación."
        />

        <AvatarSelector onSelect={setSelectedAvatar} selectedId={selectedAvatar} />
        <input type="hidden" name="avatarId" value={selectedAvatar} />

        <AuthButton type="submit" pending={isPending}>
          {isPending ? 'Guardando…' : 'Verificar teléfono'}
        </AuthButton>
      </form>
    </AuthShell>
  )
}
