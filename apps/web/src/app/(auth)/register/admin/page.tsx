"use client"

import { useActionState } from 'react'
import { registerAdmin } from '../../auth-actions'
import { ShieldAlert, UserPlus, Mail, Lock, User, KeyRound } from 'lucide-react'
import Link from 'next/link'

export default function AdminRegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAdmin, null)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 blur-[150px] rounded-full" />

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-top-8 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black tracking-widest uppercase rounded-full mb-4">
            <ShieldAlert className="w-3 h-3" /> Alta de Comandante
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">
            NUEVO ADMINISTRADOR
          </h1>
        </div>

        <div className="backdrop-blur-3xl bg-slate-900/40 border border-white/5 p-8 md:p-10 rounded-[3rem] shadow-2xl">
          {state?.error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold text-center">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-red-500 transition-colors flex items-center gap-2">
                  <User className="w-3 h-3" /> Nombre Completo
                </label>
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="Admin Boss"
                  className="w-full h-16 px-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-red-500 transition-colors flex items-center gap-2">
                  <Mail className="w-3 h-3" /> E-mail Corporativo
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="admin@terminal.auth"
                  className="w-full h-16 px-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all font-mono"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-red-500 transition-colors flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Clave Maestra
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full h-16 px-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-red-500 transition-colors flex items-center gap-2">
                  <KeyRound className="w-3 h-3" /> Token de Invitación
                </label>
                <input
                  name="inviteToken"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full h-16 px-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-18 bg-white text-slate-950 font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 hover:bg-red-600 hover:text-white hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] active:scale-95 disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" />
                {isPending ? 'REGISTRANDO...' : 'ALTA DE ADMINISTRADOR'}
              </span>
              <div className="absolute inset-0 bg-red-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </button>
          </form>

          <footer className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-slate-400">
              ¿Ya estás autorizado?{' '}
              <Link href="/login/admin" className="text-red-400 font-bold hover:text-red-300 underline underline-offset-4">
                Iniciar Sesión Admin
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
