"use client"

import { useActionState } from 'react'
import { loginWithPhone } from '../../auth-actions'
import Image from 'next/image'
import Link from 'next/link'
import { LogIn } from 'lucide-react'

export default function PlayerLoginPage() {
  const [state, formAction, isPending] = useActionState(loginWithPhone, null)

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

          {state?.error && (
            <div className="mb-8 p-5 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-8">
            <div className="space-y-3 group">
              <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors">
                Tu Número de Celular
              </label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-gold/80 font-black text-xl">+57</span>
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="320..."
                  className="w-full h-20 pl-20 pr-6 bg-black/50 border-2 border-white/10 rounded-2xl text-xl md:text-2xl text-text-premium placeholder-white/10 focus:outline-none focus:border-brand-gold/50 focus:ring-4 focus:ring-brand-gold/10 transition-all font-mono tracking-[0.1em] md:tracking-[0.2em]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all duration-300 shadow-[0_10px_0_#8b6b2e,0_20px_30px_rgba(0,0,0,0.5)] hover:translate-y-[2px] hover:shadow-[0_8px_0_#8b6b2e,0_15px_25px_rgba(0,0,0,0.5)] active:translate-y-[8px] active:shadow-none disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending ? 'AUTENTICANDO...' : 'ENTRAR A JUGAR'}
              </span>
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
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
