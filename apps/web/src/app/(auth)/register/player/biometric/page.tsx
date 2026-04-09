"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPasskeyRegistrationOptions, verifyPasskeyRegistration } from '../../../passkey-actions'
import { Fingerprint, ShieldCheck, ArrowRight } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'

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
    router.push('/')
  }

  // If still checking support, show nothing
  if (isSupported === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-white/30 text-lg">Verificando compatibilidad...</div>
      </div>
    )
  }

  // If biometric is not supported on this device, skip automatically
  if (!isSupported) {
    router.push('/')
    return null
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-text-premium font-sans selection:bg-brand-gold/30 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_#0a2a1f_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3%3C/filter%3%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3%3C/svg%3")` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-1000">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] [word-spacing:0.15em]">
            MESA&nbsp; PRIMERA
          </h1>
        </div>

        {/* Card */}
        <div className="relative backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">

          {success ? (
            /* ── Success state ── */
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="mx-auto w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                <ShieldCheck className="w-12 h-12 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-premium">¡Listo!</h2>
              <p className="text-text-secondary">
                Tu huella digital ha sido registrada. Ahora podrás desbloquear tu cuenta con solo un toque.
              </p>
              <div className="text-brand-gold text-sm animate-pulse">Entrando...</div>
            </div>
          ) : (
            /* ── Offer state ── */
            <>
              <div className="space-y-4 mb-10 text-center">
                <div className="mx-auto w-28 h-28 rounded-full bg-brand-gold/5 border-2 border-brand-gold/20 flex items-center justify-center mb-4 animate-in zoom-in-50 duration-700">
                  <Fingerprint className="w-16 h-16 text-brand-gold" strokeWidth={1.5} />
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[12px] font-black tracking-widest uppercase">
                  <ShieldCheck className="w-4 h-4" /> OPCIONAL
                </div>
                <h2 className="text-3xl font-bold text-text-premium">¿Activar Huella Digital?</h2>
                <p className="text-text-secondary text-base leading-relaxed">
                  Accede más rápido a tu cuenta usando tu <span className="text-brand-gold font-bold">huella</span> o <span className="text-brand-gold font-bold">reconocimiento facial</span>. Es seguro y solo tarda un segundo.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Enable button */}
                <button
                  onClick={handleEnableBiometric}
                  disabled={isLoading}
                  className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-base rounded-2xl transition-all duration-200 border-b-4 border-brand-gold-dark active:border-b-0 active:translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] disabled:opacity-50 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <Fingerprint className="w-6 h-6" />
                    {isLoading ? 'VERIFICANDO...' : 'SÍ, ACTIVAR HUELLA'}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-x-[-105%] skew-x-[-20deg] group-hover:translate-x-[155%] transition-transform duration-1000 ease-in-out" />
                </button>

                {/* Skip button */}
                <button
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="group w-full h-14 bg-transparent border-2 border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 font-bold uppercase tracking-wider text-sm rounded-2xl transition-all duration-200 disabled:opacity-30"
                >
                  <span className="flex items-center justify-center gap-2">
                    AHORA NO, GRACIAS
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>

              <footer className="mt-8 pt-6 border-t-2 border-white/5 text-center">
                <p className="text-xs text-white/30">
                  Siempre podrás activar o desactivar esta opción desde tu perfil.
                  <br />Tu clave de 6 dígitos seguirá siendo tu principal forma de acceso.
                </p>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
