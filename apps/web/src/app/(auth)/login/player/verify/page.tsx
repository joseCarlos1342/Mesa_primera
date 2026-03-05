'use client'

import { useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { verifyOtp } from '../../../auth-actions'
import { Suspense } from 'react'

function VerifyContent() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const [state, formAction, isPending] = useActionState(verifyOtp, null)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            Verifica tu código
          </h1>
          <p className="text-slate-400 text-sm">
            Enviamos un código de 6 dígitos a <span className="text-indigo-400 font-bold">{phone}</span>
          </p>
        </div>

        {state?.error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="phone" value={phone} />
          
          <div className="flex justify-center gap-2">
            <input
              name="token"
              type="text"
              maxLength={6}
              placeholder="000000"
              required
              autoFocus
              className="w-full h-16 text-center text-3xl font-black tracking-[1em] bg-slate-900/50 border border-slate-800 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-wait"
          >
            {isPending ? 'Verificando...' : 'Verificar e Iniciar'}
          </button>
        </form>

        <p className="text-sm text-slate-500">
          ¿No recibiste el código? <button type="button" className="text-indigo-400 font-bold hover:underline">Reenviar</button>
        </p>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
