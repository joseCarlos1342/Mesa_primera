"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPasskeyRegistrationOptions, verifyPasskeyRegistration } from '../../../passkey-actions'
import { Fingerprint, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'
import { setAuthBypass } from '@/lib/app-lock-session'
import { AuthShell } from '@/components/auth/AuthShell'
import { REGISTER_STEPS } from '@/components/auth/AuthStepper'
import { AuthAlert, AuthButton, AuthFooter } from '@/components/auth/AuthForm'

export default function BiometricSetupPage() {
  const router = useRouter()
  const [isSupported, setIsSupported] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    checkBiometricSupport()
  }, [])

  async function checkBiometricSupport() {
    if (
      typeof window === 'undefined' ||
      !window.PublicKeyCredential ||
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
    ) {
      setIsSupported(false)
      return
    }
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      setIsSupported(available)
    } catch {
      setIsSupported(false)
    }
  }

  async function handleEnableBiometric() {
    setError(null)
    setIsLoading(true)
    try {
      const { options, error: optError } = await getPasskeyRegistrationOptions()
      if (optError || !options) {
        setError(optError ?? 'No se pudieron obtener las opciones de registro.')
        return
      }

      const registration = await startRegistration({ optionsJSON: options })

      // Use device_trusted_id cookie value or generate a fallback
      const deviceId = document.cookie
        .split('; ')
        .find(c => c.startsWith('device_trusted_id='))
        ?.split('=')[1] ?? crypto.randomUUID()

      const result = await verifyPasskeyRegistration(registration, deviceId)

      if (result.error) {
        setError(result.error)
        return
      }

      setSuccess(true)
      setAuthBypass()
      setTimeout(() => router.push('/'), 1500)
    } catch (e) {
      const msg = (e as Error).message ?? ''
      if (msg.includes('cancelled') || msg.includes('canceled') || msg.includes('AbortError') || msg.includes('NotAllowedError')) {
        setError('Verificación cancelada. Puedes intentar de nuevo o saltar este paso.')
      } else {
        setError('Error al configurar la biometría. Puedes intentar de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleSkip() {
    setAuthBypass()
    router.push('/')
  }

  // If still checking support, show nothing
  if (isSupported === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 bg-[#0a0a0a] text-lg text-[#d9d3bf]" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-brand-gold motion-reduce:animate-none" aria-hidden="true" />
        Verificando compatibilidad...
      </div>
    )
  }

  // If biometric is not supported on this device, skip automatically
  if (!isSupported) {
    router.push('/')
    return null
  }

  if (success) {
    return (
      <AuthShell
        steps={{ labels: REGISTER_STEPS, current: 4 }}
        title="¡Listo!"
        lead="Tu huella digital ha sido registrada. Ahora podrás desbloquear tu cuenta con solo un toque."
      >
        <p role="status" className="flex items-center gap-3 text-lg text-brand-gold-light">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          Entrando...
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      steps={{ labels: REGISTER_STEPS, current: 4 }}
      title={
        <>
          ¿Activar <span className="italic text-brand-gold-light">huella digital</span>?
        </>
      }
      lead="Es opcional. Entra más rápido usando tu huella o reconocimiento facial. Es seguro y solo tarda un segundo."
    >
      {error && <AuthAlert className="mb-6">{error}</AuthAlert>}

      <div className="space-y-4">
        <AuthButton
          onClick={handleEnableBiometric}
          pending={isLoading}
          icon={<Fingerprint className="h-6 w-6" aria-hidden="true" />}
        >
          {isLoading ? 'Verificando…' : 'Sí, activar huella'}
        </AuthButton>

        <AuthButton variant="secondary" onClick={handleSkip} disabled={isLoading} className="group">
          Ahora no, gracias
          <ArrowRight
            className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </AuthButton>
      </div>

      <AuthFooter>
        <p>Siempre podrás activar o desactivar esta opción desde tu perfil.</p>
        <p>Tu clave de 6 dígitos seguirá siendo tu principal forma de acceso.</p>
      </AuthFooter>
    </AuthShell>
  )
}
