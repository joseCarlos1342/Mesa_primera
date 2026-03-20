"use client"

import { useSearchParams } from 'next/navigation'
import { useActionState, Suspense, useEffect, useRef } from 'react'
import { verifyOtp } from '../../../auth-actions'
import Image from 'next/image'

function VerifyContent() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const [state, formAction, isPending] = useActionState(verifyOtp, null)
  const formRef = useRef<HTMLFormElement>(null)

  const TEST_PHONES = [
    '+573001112233',
    '+573104445566',
    '+573207778899',
    '+573150001122'
  ]

  const isTestPhone = TEST_PHONES.includes(phone)
  const isDev = process.env.NODE_ENV === 'development'

  // Auto-submit in DEV for test users
  useEffect(() => {
    if (isDev && isTestPhone && formRef.current) {
      const timer = setTimeout(() => {
        const tokenInput = formRef.current?.querySelector('input[name="token"]') as HTMLInputElement
        const submitBtn = formRef.current?.querySelector('button[type="submit"]') as HTMLButtonElement
        if (tokenInput && submitBtn) {
          tokenInput.value = '123456'
          submitBtn.click()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isDev, isTestPhone])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-text-premium font-sans selection:bg-brand-gold/30 overflow-hidden">
      {/* Premium Casino Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_#0a2a1f_100%)]" />
        {/* Subtle Felt Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3%3C/filter%3%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3%3C/svg%3")` }} 
        />
        {/* Shadow Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-1000">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] [word-spacing:0.15em]">
            MESA&nbsp; PRIMERA
          </h1>
        </div>

        {/* Verification Card */}
        <div className="relative backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
          <div className="space-y-3 mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[12px] font-black tracking-widest uppercase mb-2">
              🔐 ACCESO BÓVEDA
            </div>
            <h2 className="text-3xl font-bold text-text-premium">Verifica tu Código</h2>
            <p className="text-text-secondary text-base">
              Enviamos la clave maestra a <br/>
              <span className="text-brand-gold font-mono font-bold tracking-widest">{phone}</span>
            </p>
          </div>

          {state?.error && (
            <div className="mb-8 p-5 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
              {state.error}
            </div>
          )}

          <form action={formAction} ref={formRef} className="space-y-10">
            <input type="hidden" name="phone" value={phone} />
            
            <div className="group relative">
              <input
                name="token"
                type="text"
                pattern="\d*"
                maxLength={6}
                placeholder="000000"
                required
                className="w-full h-20 md:h-24 text-center text-3xl md:text-5xl font-black tracking-[0.3em] bg-black/50 border-2 border-white/10 rounded-[2rem] text-text-premium placeholder-white/5 focus:outline-none focus:border-brand-gold/50 focus:ring-4 focus:ring-brand-gold/10 transition-all font-mono shadow-inner"
              />
              {/* Decorative focus glow */}
              <div className="absolute inset-0 rounded-[2rem] bg-brand-gold/5 blur-xl -z-10 group-focus-within:opacity-100 opacity-0 transition-opacity" />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all duration-300 shadow-[0_10px_0_#8b6b2e,0_20px_30px_rgba(0,0,0,0.5)] hover:translate-y-[2px] hover:shadow-[0_8px_0_#8b6b2e,0_15px_25px_rgba(0,0,0,0.5)] active:translate-y-[8px] active:shadow-none disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending ? 'AUTENTICANDO...' : 'CÓDIGO CORRECTO →'}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
            </button>
          </form>

          <footer className="mt-10 pt-10 border-t-2 border-white/5 text-center">
            <p className="text-sm text-text-secondary uppercase tracking-widest font-bold">
              ¿Problemas con el SMS? <br/>
              <button type="button" className="text-brand-gold hover:text-white font-black underline underline-offset-8 decoration-2 decoration-brand-gold/40 hover:decoration-brand-gold transition-all mt-4">
                Reintentar Envío
              </button>
            </p>
          </footer>
        </div>

        {/* Security Indicator */}
        <div className="mt-12 text-center pb-8 opacity-40">
          <div className="inline-flex items-center gap-2 text-text-secondary text-[10px] font-black tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-brand-gold animate-ping" />
            CONEXIÓN SEGURA TLS 1.3
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando Bóveda...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
