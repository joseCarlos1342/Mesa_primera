'use client'

import { useActionState } from 'react'
import { loginAdmin } from '../../auth-actions'

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAdmin, null)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 opacity-50" />
      
      <div className="w-full max-w-sm space-y-8 z-10 border border-slate-800 p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl shadow-2xl">
        <div className="text-center space-y-1">
          <div className="inline-block px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black tracking-widest uppercase rounded-full border border-red-500/20 mb-2">
            Acceso Restringido
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            ADMIN PANEL
          </h1>
          <p className="text-slate-500 text-sm">Ingresos de Seguridad</p>
        </div>

        {state?.error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">E-mail</label>
            <input
              name="email"
              type="email"
              required
              className="w-full h-12 px-4 bg-black/40 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:border-red-500/50 transition-all font-mono text-sm"
              placeholder="admin@mesaprimera.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Contraseña</label>
            <input
              name="password"
              type="password"
              required
              className="w-full h-12 px-4 bg-black/40 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-12 mt-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
          >
            {isPending ? 'Autenticando...' : 'Autenticar'}
          </button>
        </form>
      </div>

      <div className="mt-8 text-slate-700 text-[10px] uppercase tracking-tighter">
        Secure Terminal • Mesa Primera Admin
      </div>
    </div>
  )
}
