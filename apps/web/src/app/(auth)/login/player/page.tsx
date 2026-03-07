"use client"

import { useActionState } from 'react'
import { loginWithPhone } from '../../auth-actions'
import Image from 'next/image'
import Link from 'next/link'
import { LogIn } from 'lucide-react'

export default function PlayerLoginPage() {
  const [state, formAction, isPending] = useActionState(loginWithPhone, null)

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/login-bg.png"
          alt="Luxury Background"
          fill
          className="object-cover opacity-30 animate-pulse-slow"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950" />
      </div>

      <div className="w-full max-w-sm z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-br from-white via-indigo-200 to-indigo-500 bg-clip-text text-transparent italic">
            MESA PRIMERA
          </h1>
          <p className="text-indigo-300 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Elite Gaming Society</p>
        </div>

        <div className="relative backdrop-blur-3xl bg-slate-900/50 border border-white/10 p-8 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
          <div className="space-y-2 mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-widest uppercase mb-2">
              <LogIn className="w-3 h-3" /> Acceso Directo
            </div>
            <h2 className="text-2xl font-bold text-white">Bienvenido de nuevo</h2>
          </div>

          {state?.error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold text-center">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-indigo-400 transition-colors">
                Tu Número de Celular
              </label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+57</span>
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="320..."
                  className="w-full h-18 pl-16 pr-6 bg-black/40 border border-white/5 rounded-2xl text-white text-xl placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-mono tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-18 bg-white text-slate-950 font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 hover:bg-indigo-600 hover:text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95 disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10">{isPending ? 'ENVIANDO OTP...' : 'ENTRAR A JUGAR'}</span>
              <div className="absolute inset-0 bg-indigo-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </button>
          </form>

          <footer className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-slate-500">
              ¿Eres nuevo?{' '}
              <Link href="/register/player" className="text-indigo-400 font-bold hover:text-indigo-300 underline underline-offset-4">
                Regístrate aquí
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
