"use client"

import { useSearchParams } from 'next/navigation'
import { useActionState, Suspense } from 'react'
import { verifyOtp } from '../../auth-actions'
import { ShieldCheck } from 'lucide-react'


function RecoveryVerifyContent() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const [state, formAction, isPending] = useActionState(verifyOtp, null)

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
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] [word-spacing:0.15em]">
            MESA&nbsp; PRIMERA
          </h1>
        </div>

        <div className="relative backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
          <div className="space-y-3 mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[12px] font-black tracking-widest uppercase mb-2">
              <ShieldCheck className="w-4 h-4" /> VERIFICACIÓN
            </div>
            <h2 className="text-3xl font-bold text-text-premium">Confirma tu Identidad</h2>
            <p className="text-text-secondary text-base">
              Enviamos un código a <br/>
              <span className="text-brand-gold font-mono font-bold tracking-widest">{phone}</span>
            </p>
          </div>

          {state?.error && (
            <div className="mb-8 p-5 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-10">
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="flow" value="recovery" />

            <div className="group relative">
              <input
                name="token"
                type="text"
                pattern="\d*"
                maxLength={6}
                placeholder="000000"
                required
                className="w-full h-20 md:h-24 text-center text-2xl md:text-5xl font-black tracking-[0.1em] md:tracking-[0.3em] bg-black/50 border-2 border-white/10 rounded-[2rem] text-text-premium placeholder-white/5 focus:outline-none focus:border-brand-gold/50 focus:ring-4 focus:ring-brand-gold/10 transition-all font-mono shadow-inner"
              />
              <div className="absolute inset-0 rounded-[2rem] bg-brand-gold/5 blur-xl -z-10 group-focus-within:opacity-100 opacity-0 transition-opacity" />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-base rounded-2xl transition-all duration-200 border-b-4 border-brand-gold-dark active:border-b-0 active:translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending ? 'VERIFICANDO...' : 'CONFIRMAR CÓDIGO →'}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-105%] skew-x-[-20deg] group-hover:translate-x-[155%] transition-transform duration-1000 ease-in-out" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function RecoveryVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando...</div>}>
      <RecoveryVerifyContent />
    </Suspense>
  )
}
