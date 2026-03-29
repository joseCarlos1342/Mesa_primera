"use client"

import { useActionState, useState } from 'react'
import { loginWithPhone } from '../../auth-actions'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { phoneSchema } from '@/lib/validations'

export default function PlayerLoginPage() {
  const [state, formAction, isPending] = useActionState(loginWithPhone, null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [phoneTouched, setPhoneTouched] = useState(false)

  function validatePhone(value: string) {
    const result = phoneSchema.safeParse(value.trim())
    setPhoneError(result.success ? null : result.error.issues?.[0]?.message ?? 'Número inválido')
  }

  // Combine local + server errors (server error takes precedence after submit)
  const serverPhoneError = (state as any)?.fieldErrors?.phone
  const displayPhoneError = serverPhoneError ?? phoneError
  const phoneIsValid = phoneTouched && !displayPhoneError

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

      <div className="w-full max-w-sm z-10 animate-in fade-in zoom-in-95 duration-1000">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-display font-black tracking-tighter bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            MESA PRIMERA
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

          {(state as any)?.error && (
            <div className="mb-8 p-5 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
              {(state as any).error}
            </div>
          )}

          <form action={formAction} className="space-y-8">
            <div className="space-y-3 group">
              <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors">
                Tu Número de Celular
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-6 text-brand-gold font-mono font-black text-xl md:text-2xl tracking-tighter pointer-events-none">
                  +57
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  placeholder="3001234567"
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    e.target.value = digits
                    if (phoneTouched) validatePhone(digits)
                  }}
                  onBlur={e => {
                    setPhoneTouched(true)
                    validatePhone(e.target.value)
                  }}
                  className={`w-full h-20 pl-20 pr-6 bg-black/50 border-2 rounded-2xl text-xl md:text-2xl text-text-premium placeholder-white/10 focus:outline-none focus:ring-4 transition-all font-mono tracking-tighter md:tracking-normal shadow-inner
                    ${displayPhoneError
                      ? 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/10'
                      : phoneIsValid
                        ? 'border-green-500/40 focus:border-green-500/60 focus:ring-green-500/10'
                        : 'border-white/10 focus:border-brand-gold/50 focus:ring-brand-gold/10'
                    }`}
                />
                {phoneIsValid && (
                  <span className="absolute right-5 text-green-400 text-xl font-black pointer-events-none">✓</span>
                )}
              </div>
              {displayPhoneError && (
                <p className="text-red-400 text-xs font-bold ml-2 mt-1">
                  {displayPhoneError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-base rounded-2xl transition-all duration-200 border-b-4 border-brand-gold-dark active:border-b-0 active:translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending ? 'AUTENTICANDO...' : 'ENTRAR A JUGAR'}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-105%] skew-x-[-20deg] group-hover:translate-x-[155%] transition-transform duration-1000 ease-in-out" />
            </button>
          </form>

          <footer className="mt-10 pt-10 border-t-2 border-white/5 text-center">
            <p className="text-sm text-text-secondary">
              ¿Aún no tienes cuenta?{' '}
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
