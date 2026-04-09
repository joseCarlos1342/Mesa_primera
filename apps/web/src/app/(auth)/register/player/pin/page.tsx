"use client"

import { useActionState, useState } from 'react'
import { setPlayerPin } from '../../../auth-actions'
import { pinSchema } from '@/lib/validations'
import { KeyRound } from 'lucide-react'

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-400 text-xs font-bold ml-2 mt-1">{msg}</p>
}

export default function SetPinPage() {
  const [state, formAction, isPending] = useActionState(setPlayerPin, null)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const serverErrors = (state as any)?.fieldErrors ?? {}

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
    return touched[field] && !displayError(field)
  }

  function inputBorder(field: string) {
    const err = displayError(field)
    if (err) return 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/10'
    if (isValid(field)) return 'border-green-500/40 focus:border-green-500/60 focus:ring-green-500/10'
    return 'border-white/10 focus:border-brand-gold/50 focus:ring-brand-gold/10'
  }

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

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-1000">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] [word-spacing:0.15em]">
            MESA&nbsp; PRIMERA
          </h1>
        </div>

        {/* PIN Setup Card */}
        <div className="relative backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
          <div className="space-y-3 mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[12px] font-black tracking-widest uppercase mb-2">
              <KeyRound className="w-4 h-4" /> CLAVE DE ACCESO
            </div>
            <h2 className="text-3xl font-bold text-text-premium">Crea tu Clave</h2>
            <p className="text-text-secondary text-base">
              Elige una clave de <span className="text-brand-gold font-bold">6 dígitos</span> para acceder a tu cuenta.
              <br />
              <span className="text-xs text-white/40">Úsala como la clave de tu tarjeta bancaria</span>
            </p>
          </div>

          {(state as any)?.error && (
            <div className="mb-8 p-5 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
              {(state as any).error}
            </div>
          )}

          <form action={formAction} className="space-y-8">
            <input type="hidden" name="flow" value="register" />

            {/* PIN */}
            <div className="space-y-2 group">
              <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors">
                Clave de 6 dígitos
              </label>
              <div className="relative">
                <input
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  required
                  value={pin}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setPin(digits)
                    if (touched.pin) validatePin(digits)
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, pin: true }))
                    validatePin(pin)
                  }}
                  className={`w-full h-20 text-center text-3xl md:text-5xl font-black tracking-[0.3em] bg-black/50 border-2 rounded-[2rem] text-text-premium placeholder-white/10 focus:outline-none focus:ring-4 transition-all font-mono shadow-inner ${inputBorder('pin')}`}
                />
                {isValid('pin') && (
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-green-400 text-xl font-black">✓</span>
                )}
              </div>
              <FieldError msg={displayError('pin')} />
            </div>

            {/* PIN Confirm */}
            <div className="space-y-2 group">
              <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors">
                Repite tu Clave
              </label>
              <div className="relative">
                <input
                  name="pinConfirm"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  required
                  value={pinConfirm}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setPinConfirm(digits)
                    if (touched.pinConfirm) validateConfirm(digits)
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, pinConfirm: true }))
                    validateConfirm(pinConfirm)
                  }}
                  className={`w-full h-20 text-center text-3xl md:text-5xl font-black tracking-[0.3em] bg-black/50 border-2 rounded-[2rem] text-text-premium placeholder-white/10 focus:outline-none focus:ring-4 transition-all font-mono shadow-inner ${inputBorder('pinConfirm')}`}
                />
                {isValid('pinConfirm') && (
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-green-400 text-xl font-black">✓</span>
                )}
              </div>
              <FieldError msg={displayError('pinConfirm')} />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-base rounded-2xl transition-all duration-200 border-b-4 border-brand-gold-dark active:border-b-0 active:translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending ? 'CONFIGURANDO...' : 'GUARDAR MI CLAVE →'}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-105%] skew-x-[-20deg] group-hover:translate-x-[155%] transition-transform duration-1000 ease-in-out" />
            </button>
          </form>

          <footer className="mt-10 pt-8 border-t-2 border-white/5 text-center">
            <p className="text-xs text-white/30">
              Esta clave se usará cada vez que inicies sesión en tu cuenta.
              <br />Si la olvidas, podrás recuperarla con un SMS.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
