"use client"

import { useActionState, useState } from 'react'
import { registerPlayer } from '../../auth-actions'
import { AvatarSelector } from '@/components/auth/avatar-selector'
import Image from 'next/image'
import Link from 'next/link'
import { UserPlus, ShieldCheck } from 'lucide-react'

export default function PlayerRegisterPage() {
  const [state, formAction, isPending] = useActionState(registerPlayer, null)
  const [selectedAvatar, setSelectedAvatar] = useState('as-oros')

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/login-bg.png"
          alt="Luxury Background"
          fill
          className="object-cover opacity-20 scale-110"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950" />
      </div>

      <div className="w-full max-w-lg z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black tracking-[0.2em] uppercase mb-4">
            <UserPlus className="w-3 h-3" /> Crear Identidad
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-br from-white via-indigo-200 to-indigo-500 bg-clip-text text-transparent">
            ÚNETE A LA ELITE
          </h1>
        </div>

        <div className="relative backdrop-blur-3xl bg-slate-900/50 border border-white/10 p-8 md:p-10 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
          {state?.error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold animate-in shake-1">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-indigo-400 transition-colors">
                  Nombre Real
                </label>
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="Jose Carlos"
                  className="w-full h-16 px-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-indigo-400 transition-colors">
                  Apodo de Jugador
                </label>
                <input
                  name="nickname"
                  type="text"
                  required
                  placeholder="@AsDelDestino"
                  className="w-full h-16 px-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-indigo-400 transition-colors">
                  Número de Celular
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+57</span>
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="320..."
                    className="w-full h-16 pl-16 pr-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <AvatarSelector onSelect={setSelectedAvatar} selectedId={selectedAvatar} />
            <input type="hidden" name="avatarId" value={selectedAvatar} />

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-18 bg-white text-slate-950 font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 hover:bg-indigo-600 hover:text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95 disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10">{isPending ? 'CREANDO...' : 'RECLAMAR MI LUGAR'}</span>
              <div className="absolute inset-0 bg-indigo-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </button>
          </form>

          <footer className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login/player" className="text-indigo-400 font-bold hover:text-indigo-300 underline underline-offset-4">
                Entrar ahora
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
