"use client"

import { useSearchParams } from 'next/navigation'
import { useActionState, Suspense } from 'react'
import { verifyOtp } from '../../../auth-actions'
import { ShieldCheck } from 'lucide-react'


function DeviceVerifyContent() {
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
        {/* Logo Section */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] [word-spacing:0.15em]">
            MESA&nbsp; PRIMERA
          </h1>
        </div>

        {/* Device Verify Card */}
        <div className="relative backdrop-blur-2xl bg-black/40 border-2 border-amber-500/30 p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
          <div className="space-y-3 mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[12px] font-black tracking-widest uppercase mb-2">
              <ShieldCheck className="w-4 h-4" /> NUEVO DISPOSITIVO
            </div>
            <h2 className="text-3xl font-bold text-text-premium">Verifica tu Identidad</h2>
            <p className="text-text-secondary text-base">
              Detectamos un inicio de sesión desde un <span className="text-amber-400 font-bold">dispositivo nuevo</span>.
              <br />
              Enviamos un código de seguridad a <br/>
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
            <input type="hidden" name="flow" value="device-verify" />

            <div className="group relative">
              <input
                name="token"
                type="text"
                pattern="\d*"
                maxLength={6}
                placeholder="000000"
                required
                className="w-full h-20 md:h-24 text-center text-2xl md:text-5xl font-black tracking-[0.1em] md:tracking-[0.3em] bg-black/50 border-2 border-white/10 rounded-[2rem] text-text-premium placeholder-white/5 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all font-mono shadow-inner"
              />
              <div className="absolute inset-0 rounded-[2rem] bg-amber-500/5 blur-xl -z-10 group-focus-within:opacity-100 opacity-0 transition-opacity" />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black font-black uppercase tracking-widest text-base rounded-2xl transition-all duration-200 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending ? 'VERIFICANDO...' : 'CONFIRMAR DISPOSITIVO →'}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-105%] skew-x-[-20deg] group-hover:translate-x-[155%] transition-transform duration-1000 ease-in-out" />
            </button>
          </form>

          <footer className="mt-10 pt-8 border-t-2 border-white/5 text-center">
            <p className="text-xs text-white/30">
              Este dispositivo será recordado por 30 días.
              <br />No necesitarás verificar nuevamente desde aquí.
            </p>
          </footer>
        </div>

        {/* Security Indicator */}
        <div className="mt-12 text-center pb-8 opacity-40">
          <div className="inline-flex items-center gap-2 text-text-secondary text-[10px] font-black tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            VERIFICACIÓN DE DOS PASOS
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DeviceVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Verificando...</div>}>
      <DeviceVerifyContent />
    </Suspense>
  )
}
