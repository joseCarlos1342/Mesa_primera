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
          // We trigger the action by clicking the button to ensure useActionState sees it
          submitBtn.click()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isDev, isTestPhone])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans">
      {/* Background Image (Shared with Login) */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/login-bg.png"
          alt="Luxury Background"
          fill
          className="object-cover opacity-30 brightness-50"
          priority
        />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      </div>

      <div className="w-full max-w-md space-y-8 z-10 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-2 shadow-[0_0_30px_rgba(99,102,241,0.2)] animate-pulse">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Verifica tu Código
          </h1>
          <p className="text-slate-400 text-lg">
            Enviamos la clave maestra a <br/>
            <span className="text-indigo-400 font-mono font-bold tracking-widest">{phone}</span>
          </p>
        </div>

        {state?.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-medium animate-in shake-1">
            {state.error}
          </div>
        )}

        <form action={formAction} ref={formRef} className="space-y-8">
          <input type="hidden" name="phone" value={phone} />
          
          <div className="group relative">
            <input
              name="token"
              type="text"
              maxLength={6}
              placeholder="000 000"
              required
              className="w-full h-24 text-center text-5xl font-black tracking-[0.2em] bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] text-white placeholder-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-2xl font-mono"
            />
            {/* Decorative focus glow */}
            <div className="absolute inset-0 rounded-[2rem] bg-indigo-500/5 blur-xl -z-10 group-focus-within:opacity-100 opacity-0 transition-opacity" />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="group relative w-full h-18 bg-white text-slate-950 font-black text-xl rounded-2xl transition-all duration-300 hover:bg-indigo-50 active:scale-[0.98] shadow-[0_10px_30px_rgba(255,255,255,0.1)] disabled:opacity-50 overflow-hidden"
          >
            <span className="relative z-10">
              {isPending ? 'AUTENTICANDO...' : 'CÓDIGO CORRECTO →'}
            </span>
            <div className="absolute inset-0 bg-indigo-100 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
          </button>
        </form>

        <p className="text-slate-500 text-sm uppercase tracking-widest font-bold">
          ¿Problemas con el SMS? <br/>
          <button type="button" className="text-indigo-400 hover:text-indigo-300 transition-colors mt-2">Reintentar Envío</button>
        </p>
      </div>

      <div className="absolute top-8 left-8 flex items-center gap-2 opacity-40">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
        <span className="text-[10px] font-black tracking-widest uppercase">Secured Connection</span>
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
