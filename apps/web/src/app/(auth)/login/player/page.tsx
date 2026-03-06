"use client"

import { useActionState, useState } from 'react'
import { loginWithPhone } from '../../auth-actions'
import { AvatarSelector } from '@/components/auth/avatar-selector'
import Image from 'next/image'

export default function PlayerLoginPage() {
  const [state, formAction, isPending] = useActionState(loginWithPhone, null)
  const [selectedAvatar, setSelectedAvatar] = useState('as-oros')

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      {/* Premium Background Image with Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image 
          src="/images/login-bg.png"
          alt="Luxury Background"
          fill
          className="object-cover opacity-40 scale-105 animate-pulse-slow"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90" />
      </div>

      {/* Decorative Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse-slow-reverse" />

      <div className="w-full max-w-lg z-10 my-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Header Section */}
        <div className="text-center space-y-3 mb-10 drop-shadow-2xl">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-br from-white via-indigo-200 to-indigo-500 bg-clip-text text-transparent italic leading-tight">
            MESA PRIMERA
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-indigo-500/50" />
            <p className="text-indigo-300 font-bold uppercase tracking-[0.3em] text-sm">Elite Gaming</p>
            <div className="h-px w-12 bg-indigo-500/50" />
          </div>
        </div>

        {/* Form Container (Glassmorphism) */}
        <div className="relative backdrop-blur-2xl bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
          <div className="absolute -top-4 -right-4 bg-indigo-600 text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg rotate-12 animate-bounce">
            NUEVA TEMPORADA
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-bold bg-white bg-clip-text text-transparent">Crea tu Identidad</h2>
            <p className="text-slate-400 text-sm">Completa tu perfil para entrar a la mesa exclusiva.</p>
          </div>

          {state?.error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3 animate-in shake-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="font-medium">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2 group">
                <label htmlFor="fullName" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-indigo-400 transition-colors">
                  Nombre Real
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Jose Carlos"
                  required
                  className="w-full h-16 px-5 bg-slate-950/50 border border-white/5 rounded-2xl text-white text-lg placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2 group">
                <label htmlFor="nickname" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-indigo-400 transition-colors">
                  Apodo de Jugador
                </label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  placeholder="@MaestroDeLaMesa"
                  required
                  className="w-full h-16 px-5 bg-slate-950/50 border border-white/5 rounded-2xl text-white text-lg placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2 group">
                <label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-indigo-400 transition-colors">
                  Número de WhatsApp / Celular
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+57</span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="320 580 2918"
                    required
                    className="w-full h-16 pl-16 pr-5 bg-slate-950/50 border border-white/5 rounded-2xl text-white text-lg placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner font-mono tracking-wider"
                  />
                </div>
              </div>
            </div>

            <AvatarSelector onSelect={setSelectedAvatar} selectedId={selectedAvatar} />
            <input type="hidden" name="avatarId" value={selectedAvatar} />

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-black text-2xl rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] active:scale-95 shadow-xl mt-4 overflow-hidden disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending ? 'ENVIANDO SMS...' : '¡ENTRAR A LA MESA!'}
                {!isPending && <span className="text-3xl">→</span>}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </form>

          <footer className="mt-8 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
              Sistema Blindado v2.0 • Conexión Segura TLS 1.3<br/>
              © 2026 Mesa Primera - Todos los derechos reservados
            </p>
          </footer>
        </div>
      </div>

      {/* Decorative Floor Reflection */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-indigo-500/5 to-transparent blur-3xl pointer-events-none" />
    </div>
  )
}
