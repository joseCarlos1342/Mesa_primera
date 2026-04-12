"use client"

import { Suspense, useActionState, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginWithPin, loginWithPhone, checkPhoneHasPin } from '../../auth-actions'
import { getPasskeyLoginOptions, verifyPasskeyLogin } from '../../passkey-actions'
import Link from 'next/link'
import { LogIn, KeyRound, Fingerprint } from 'lucide-react'
import { phoneSchema, pinSchema } from '@/lib/validations'
import { startAuthentication } from '@simplewebauthn/browser'
import { setAuthBypass } from '@/lib/app-lock-session'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'

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
      // Check if user has a PIN configured
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
    } catch (e) {
      setPasskeyError('Verificación biométrica cancelada o fallida.')
    } finally {
      setPasskeyLoading(false)
    }
  }

  // Combine local + server errors
  const state = hasPin === false ? otpState : pinState
  const serverPhoneError = (state as any)?.fieldErrors?.phone
  const serverPinError = (state as any)?.fieldErrors?.pin
  const displayPhoneError = serverPhoneError ?? phoneError
  const displayPinError = serverPinError ?? pinError
  const phoneIsValid = phoneTouched && !displayPhoneError
  const pinIsValid = pinTouched && !displayPinError

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-text-premium font-sans selection:bg-brand-gold/30 overflow-hidden">
      {/* Premium Casino Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_#0a2a1f_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3%3C/filter%3%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3%3C/svg%3")` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      <div className="w-full max-w-xl z-10 animate-in fade-in zoom-in-95 duration-1000">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black tracking-tighter bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            PRIMERA RIVERADA
          </h1>
        </div>

        {/* Login Card */}
        <div className="relative backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-8 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
          <div className="space-y-3 mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[12px] font-black tracking-widest uppercase mb-2">
              <LogIn className="w-4 h-4" /> ACCESO SEGURO
            </div>
            <h2 className="text-3xl font-bold text-text-premium">Bienvenido</h2>
            <p className="text-text-secondary text-base">Ingresa para entrar a la mesa</p>
          </div>

          {wasKicked && (
            <div className="mb-8 p-5 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl text-amber-400 text-sm font-bold text-center animate-shake">
              Se ha iniciado sesión en otro dispositivo. Tu sesión anterior ha expirado.
            </div>
          )}

          {oauthError && (
            <div className="mb-8 p-5 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
              Error de autenticación con Google: {oauthError}
            </div>
          )}

          {(state as any)?.error && (
            <div className="mb-8 p-5 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
              {(state as any).error}
            </div>
          )}

          <form action={hasPin === false ? otpFormAction : pinFormAction} className="space-y-8">
            {/* Phone Input */}
            <div className="space-y-3 group">
              <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors">
                Tu Número de Celular
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-5 text-brand-gold font-mono font-black text-lg md:text-2xl tracking-tighter pointer-events-none">
                  +57
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  placeholder="3001234567"
                  value={phoneValue}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setPhoneValue(digits)
                    if (phoneTouched) validatePhone(digits)
                  }}
                  onBlur={e => handlePhoneBlur(e.target.value)}
                  className={`w-full h-20 pl-16 pr-6 bg-black/50 border-2 rounded-2xl text-lg md:text-2xl text-text-premium placeholder-white/10 focus:outline-none focus:ring-4 transition-all font-mono tracking-tighter md:tracking-normal shadow-inner
                    ${displayPhoneError
                      ? 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/10'
                      : phoneIsValid
                        ? 'border-green-500/40 focus:border-green-500/60 focus:ring-green-500/10'
                        : 'border-white/10 focus:border-brand-gold/50 focus:ring-brand-gold/10'
                    }`}
                />
                {phoneIsValid && !isCheckingPin && (
                  <span className="absolute right-5 text-green-400 text-xl font-black pointer-events-none">✓</span>
                )}
                {isCheckingPin && (
                  <span className="absolute right-5 text-brand-gold text-sm font-black pointer-events-none animate-pulse">...</span>
                )}
              </div>
              {displayPhoneError && (
                <p className="text-red-400 text-xs font-bold ml-2 mt-1">
                  {displayPhoneError}
                </p>
              )}
            </div>

            {/* PIN Input — shown when user has PIN configured */}
            {hasPin !== false && (
              <div className="space-y-3 group animate-in fade-in slide-in-from-top-4 duration-500">
                <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5" /> Tu Clave de 6 Dígitos
                </label>
                <div className="relative">
                  <input
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="••••••"
                    value={pinValue}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '')
                      setPinValue(digits)
                      if (pinTouched) validatePin(digits)
                    }}
                    onBlur={() => {
                      setPinTouched(true)
                      validatePin(pinValue)
                    }}
                    className={`w-full h-20 text-center text-2xl md:text-4xl font-black tracking-[0.2em] bg-black/50 border-2 rounded-2xl text-text-premium placeholder-white/10 focus:outline-none focus:ring-4 transition-all font-mono shadow-inner
                      ${displayPinError
                        ? 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/10'
                        : pinIsValid
                          ? 'border-green-500/40 focus:border-green-500/60 focus:ring-green-500/10'
                          : 'border-white/10 focus:border-brand-gold/50 focus:ring-brand-gold/10'
                      }`}
                  />
                  {pinIsValid && (
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-green-400 text-xl font-black">✓</span>
                  )}
                </div>
                {displayPinError && (
                  <p className="text-red-400 text-xs font-bold ml-2 mt-1">{displayPinError}</p>
                )}
              </div>
            )}

            {/* Hint for users without PIN */}
            {hasPin === false && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-amber-400/80 text-sm text-center animate-in fade-in duration-500">
                Tu cuenta aún no tiene clave. Te enviaremos un código SMS para configurarla.
              </div>
            )}

            {/* Biometric Fast Login */}
            {passkeyAvailable && phoneIsValid && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {passkeyError && (
                  <p className="text-red-400 text-xs font-bold text-center mb-3">{passkeyError}</p>
                )}
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading || isPending}
                  className="group relative w-full h-20 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 text-white font-black uppercase tracking-widest text-base rounded-2xl transition-all duration-200 border-b-4 border-emerald-900 active:border-b-0 active:translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] disabled:opacity-50 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <Fingerprint className="w-6 h-6" />
                    {passkeyLoading ? 'VERIFICANDO...' : 'ENTRAR CON HUELLA'}
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-x-[-105%] skew-x-[-20deg] group-hover:translate-x-[155%] transition-transform duration-1000 ease-in-out" />
                </button>
                <p className="text-center text-white/30 text-xs mt-3 uppercase tracking-widest font-bold">
                  — o usa tu clave —
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-base rounded-2xl transition-all duration-200 border-b-4 border-brand-gold-dark active:border-b-0 active:translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending
                  ? 'AUTENTICANDO...'
                  : hasPin === false
                    ? 'ENVIAR CÓDIGO SMS'
                    : 'ENTRAR A JUGAR'}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-105%] skew-x-[-20deg] group-hover:translate-x-[155%] transition-transform duration-1000 ease-in-out" />
            </button>
          </form>

          {/* Google Sign-In */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center"><span className="bg-slate-950 px-4 text-xs font-bold text-white/30 uppercase tracking-widest">o</span></div>
          </div>
          <GoogleSignInButton label="Ingresar con Google" />

          <footer className="mt-10 pt-10 border-t-2 border-white/5 space-y-4 text-center">
            {hasPin !== false && (
              <p className="text-sm text-text-secondary">
                ¿Olvidaste tu clave?<br className="sm:hidden" />{' '}
                <Link href="/recovery" className="text-brand-gold font-black hover:text-white underline underline-offset-8 decoration-2 decoration-brand-gold/40 hover:decoration-brand-gold transition-all">
                  Recupérala aquí
                </Link>
              </p>
            )}
            <p className="text-sm text-text-secondary">
              ¿Aún no tienes cuenta?<br className="sm:hidden" />{' '}
              <Link href="/register/player" className="text-brand-gold font-black hover:text-white underline underline-offset-8 decoration-2 decoration-brand-gold/40 hover:decoration-brand-gold transition-all">
                Regístrate aquí
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default function PlayerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PlayerLoginContent />
    </Suspense>
  )
}
