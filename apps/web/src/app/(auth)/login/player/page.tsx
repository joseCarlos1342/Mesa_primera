"use client"

import { Suspense, useActionState, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginWithPin, loginWithPhone, checkPhoneHasPin } from '../../auth-actions'
import { getPasskeyLoginOptions, verifyPasskeyLogin } from '../../passkey-actions'
import Link from 'next/link'
import { Fingerprint } from 'lucide-react'
import { phoneSchema, pinSchema } from '@/lib/validations'
import { startAuthentication } from '@simplewebauthn/browser'
import { setAuthBypass } from '@/lib/app-lock-session'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { TurnstileWidget } from '@/components/auth/turnstile-widget'
import { AuthShell } from '@/components/auth/AuthShell'
import { CodeInput } from '@/components/auth/CodeInput'
import { AuthAlert, AuthButton, AuthDivider, AuthField, AuthFooter, authTextLink } from '@/components/auth/AuthForm'

type LoginState = { error?: string; fieldErrors?: Record<string, string> } | null

function PlayerLoginContent() {
  const [pinState, pinFormAction, isPinPending] = useActionState(loginWithPin, null)
  const [otpState, otpFormAction, isOtpPending] = useActionState(loginWithPhone, null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [pinTouched, setPinTouched] = useState(false)
  const [phoneValue, setPhoneValue] = useState('')
  const [pinValue, setPinValue] = useState('')
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [isCheckingPin, startCheckingPin] = useTransition()
  const [passkeyAvailable, setPasskeyAvailable] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const wasKicked = searchParams.get('kicked') === 'true'
  const oauthError = searchParams.get('error')

  const isPending = isPinPending || isOtpPending

  function validatePhone(value: string) {
    const result = phoneSchema.safeParse(value.trim())
    setPhoneError(result.success ? null : result.error.issues?.[0]?.message ?? 'Número inválido')
    return result.success
  }

  function validatePin(value: string) {
    const result = pinSchema.safeParse(value.trim())
    setPinError(result.success ? null : result.error.issues?.[0]?.message ?? 'Clave inválida')
  }

  async function handlePhoneBlur(value: string) {
    setPhoneTouched(true)
    const isValid = validatePhone(value)

    if (isValid && value.length === 10) {
      // Check if user has a PIN configured. `null` significa "desconocido"
      // (p.ej. RPC caído): la UI trata ese caso como si tuviera PIN para no
      // mostrar el mensaje engañoso "tu cuenta no tiene clave".
      startCheckingPin(async () => {
        const result = await checkPhoneHasPin(value)
        setHasPin(result)
      })
      // Check if user has a trusted passkey device (in parallel)
      getPasskeyLoginOptions(value).then(res => {
        setPasskeyAvailable(!!res.available)
      }).catch(() => setPasskeyAvailable(false))
    }
  }

  async function handlePasskeyLogin() {
    setPasskeyError(null)
    setPasskeyLoading(true)
    try {
      const optionsResult = await getPasskeyLoginOptions(phoneValue)
      if (!optionsResult.available || !optionsResult.options) {
        setPasskeyError('No hay huella registrada para este dispositivo.')
        return
      }

      const assertion = await startAuthentication({ optionsJSON: optionsResult.options })
      const result = await verifyPasskeyLogin(phoneValue, assertion)

      if (result.ok) {
        setAuthBypass()
        router.push('/')
        return
      }

      setPasskeyError(result.error ?? 'Error en la verificación.')
    } catch {
      setPasskeyError('Verificación biométrica cancelada o fallida.')
    } finally {
      setPasskeyLoading(false)
    }
  }

  // Combine local + server errors
  const state = (hasPin === false ? otpState : pinState) as LoginState
  const displayPhoneError = state?.fieldErrors?.phone ?? phoneError
  const displayPinError = state?.fieldErrors?.pin ?? pinError
  const phoneIsValid = phoneTouched && !displayPhoneError
  const pinIsValid = pinTouched && !displayPinError

  return (
    <AuthShell
      deal
      nav={{ href: '/register/player', label: 'Crear cuenta', quiet: true }}
      title={
        <>
          Inicia <span className="italic text-brand-gold-light">sesión</span>
        </>
      }
      lead="Escribe tu celular y tu clave de 6 dígitos para entrar a la mesa."
      panelText="Inicia sesión en Primera Riverada los 4 Ases para acceder a tu cuenta, retomar partidas y jugar cartas online con amigos en tiempo real."
    >
      <div className="space-y-4">
        {wasKicked && (
          <AuthAlert tone="notice">Se ha iniciado sesión en otro dispositivo. Tu sesión anterior ha expirado.</AuthAlert>
        )}
        {oauthError && <AuthAlert>Error de autenticación con Google: {oauthError}</AuthAlert>}
        {state?.error && <AuthAlert>{state.error}</AuthAlert>}
      </div>

      <form action={hasPin === false ? otpFormAction : pinFormAction} className="mt-2 space-y-7">
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
          value={phoneValue}
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '')
            setPhoneValue(digits)
            if (phoneTouched) validatePhone(digits)
          }}
          onBlur={e => handlePhoneBlur(e.target.value)}
          error={displayPhoneError}
          valid={phoneIsValid && !isCheckingPin}
          hint={isCheckingPin ? 'Comprobando tu cuenta…' : undefined}
        />

        {/* Clave: visible salvo que la cuenta confirme que aún no tiene PIN */}
        {hasPin !== false && (
          <CodeInput
            name="pin"
            label="Tu clave de 6 dígitos"
            masked
            value={pinValue}
            onChange={digits => {
              setPinValue(digits)
              if (pinTouched) validatePin(digits)
            }}
            onBlur={() => {
              setPinTouched(true)
              validatePin(pinValue)
            }}
            error={displayPinError}
            valid={pinIsValid}
          />
        )}

        {hasPin === false && (
          <AuthAlert tone="notice">
            Tu cuenta aún no tiene clave. Te enviaremos un código SMS para configurarla.
          </AuthAlert>
        )}

        {passkeyAvailable && phoneIsValid && (
          <div className="space-y-3">
            {passkeyError && <AuthAlert>{passkeyError}</AuthAlert>}
            <AuthButton
              variant="secondary"
              onClick={handlePasskeyLogin}
              disabled={isPending}
              pending={passkeyLoading}
              icon={<Fingerprint className="h-6 w-6" aria-hidden="true" />}
            >
              {passkeyLoading ? 'Verificando…' : 'Entrar con huella'}
            </AuthButton>
            <p className="text-center text-base text-[#bdb7a6]">o usa tu clave</p>
          </div>
        )}

        <TurnstileWidget />

        <AuthButton type="submit" pending={isPending}>
          {isPending ? 'Autenticando…' : hasPin === false ? 'Enviar código SMS' : 'Entrar a jugar'}
        </AuthButton>
      </form>

      <AuthDivider />
      <GoogleSignInButton label="Ingresar con Google" />

      <AuthFooter>
        {hasPin !== false && (
          <p>
            ¿Olvidaste tu clave?{' '}
            <Link href="/recovery" className={authTextLink}>
              Recupérala aquí
            </Link>
          </p>
        )}
        <p>
          ¿Aún no tienes cuenta?{' '}
          <Link href="/register/player" className={authTextLink}>
            Regístrate aquí
          </Link>
        </p>
      </AuthFooter>
    </AuthShell>
  )
}

export default function PlayerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0a0a0a]" />}>
      <PlayerLoginContent />
    </Suspense>
  )
}
