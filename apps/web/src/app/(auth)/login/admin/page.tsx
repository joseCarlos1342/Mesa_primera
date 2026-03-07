"use client"

import { useActionState, useEffect, useState } from 'react'
import { loginAdmin } from '../../auth-actions'
import { ShieldCheck, Lock, Mail } from 'lucide-react'

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAdmin, null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans overflow-hidden selection:bg-red-500/30">
      {/* Security Scanning Effect Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/0 via-red-500 to-red-600/0 opacity-50 animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)]" />
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-red-500/20 to-transparent blur-sm" />
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent blur-sm" />
      </div>
      
      <div className="w-full max-w-md space-y-10 z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <ShieldCheck className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
              Estación Admin
            </h1>
            <p className="text-red-500/60 font-black tracking-[0.4em] text-[10px] uppercase mt-2">
              Autenticación de Bóveda
            </p>
          </div>
        </div>

        <div className="relative backdrop-blur-3xl bg-slate-900/60 border border-white/10 p-8 md:p-10 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10 overflow-hidden">
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl rounded-full" />

          {state?.error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-3 animate-in shake-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors flex items-center gap-2">
                <Mail className="w-3 h-3" /> Correo Autorizado
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full h-16 px-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all font-mono shadow-inner"
                placeholder="id@terminal.auth"
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors flex items-center gap-2">
                <Lock className="w-3 h-3" /> Clave de Acceso
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full h-16 px-6 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all shadow-inner"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-16 mt-4 bg-white text-slate-950 font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 hover:bg-red-600 hover:text-white hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] active:scale-95 disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10">{isPending ? 'Verificando...' : 'Acceder al Centro de Mando'}</span>
              <div className="absolute inset-0 bg-red-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em] leading-relaxed">
            Authorized Personnel Only — TLS 1.3 Secure <br/>
            E2E Encryption Enabled • Network: {mounted ? window.location.hostname : 'secure-node'}
          </p>
        </div>
      </div>
    </div>
  )
}
