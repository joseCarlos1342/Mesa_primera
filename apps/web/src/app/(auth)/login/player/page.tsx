'use client'

import { useActionState } from 'react'
import { loginWithPhone } from '../../auth-actions'

export default function PlayerLoginPage() {
  const [state, formAction, isPending] = useActionState(loginWithPhone, null)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent italic">
            MESA PRIMERA
          </h1>
          <p className="text-slate-400 text-lg">Inicia sesión para jugar</p>
        </div>

        {state?.error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-slate-300 ml-1">
              Número de Teléfono
            </label>
            <div className="relative group">
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+57 320 580 2918"
                required
                className="w-full h-14 px-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all group-hover:border-slate-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-wait"
          >
            {isPending ? 'Enviando código...' : 'Continuar'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 px-6">
          Al continuar, aceptas nuestros términos de servicio y política de privacidad.
          Recibirás un código por SMS.
        </p>
      </div>

      <div className="absolute bottom-8 text-slate-600 font-mono text-[10px] tracking-widest uppercase">
        V2.0 Core Infrastructure
      </div>
    </div>
  )
}
