'use client'

import { UserPlus, KeyRound, Fingerprint, ShieldCheck } from 'lucide-react'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Screen 1: Registration Form + Avatars (SAME SCREEN) ──────── */
function RegisterFormScreen() {
  const avatars = [
    { id: 'as-oros', name: 'AS DE OROS', color: 'from-yellow-400 to-amber-500', selected: true },
    { id: 'rey-espadas', name: 'REY DE ESPADAS', color: 'from-slate-400 to-slate-600', selected: false },
    { id: 'copa-real', name: 'COPA REAL', color: 'from-red-400 to-rose-600', selected: false },
    { id: 'ficha-elite', name: 'FICHA ELITE', color: 'from-emerald-400 to-teal-600', selected: false },
  ]

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-y-auto px-3 pt-4 pb-3">
      {/* Logo */}
      <h1 className="text-base font-display font-black tracking-tight bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic text-center mb-2">
        PRIMERA RIVERADA
      </h1>

      {/* Form Card */}
      <div className="relative w-full backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-3 rounded-[1.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
        {/* Badge */}
        <div className="flex items-center justify-center mb-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[7px] font-black tracking-widest uppercase">
            <UserPlus className="w-2.5 h-2.5" /> NUEVA IDENTIDAD
          </div>
        </div>

        <h2 className="text-sm font-bold text-center text-[#f3edd7] mb-0.5">Regístrate</h2>
        <p className="text-[7px] text-text-secondary text-center mb-2">Crea tu perfil para empezar a jugar</p>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div>
            <label className="text-[5px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-0.5 block">Nombre Real</label>
            <div className="w-full h-8 px-2 bg-black/50 border-2 border-green-500/40 rounded-2xl flex items-center text-[#f3edd7] text-xs shadow-inner">
              Santi
              <span className="ml-auto text-green-400 text-xs font-black">✓</span>
            </div>
          </div>
          <div>
            <label className="text-[5px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-0.5 flex justify-between">
              <span>Apodo</span>
              <span className="text-white/20 font-mono">0/20</span>
            </label>
            <div className="w-full h-8 px-2 bg-black/50 border-2 border-green-500/40 rounded-2xl flex items-center text-[#f3edd7] text-xs shadow-inner">
              4ases
              <span className="ml-auto text-green-400 text-xs font-black">✓</span>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="mb-2">
          <label className="text-[5px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-0.5 block">Número de Celular</label>
          <div className="w-full h-8 pl-7 pr-2 bg-black/50 border-2 border-green-500/40 rounded-2xl flex items-center shadow-inner relative">
            <span className="text-brand-gold font-mono font-black text-xs absolute ml-2 left-2 top-1/2 -translate-y-1/2">+57</span>
            <span className="text-[#f3edd7] text-xs font-mono tracking-tighter pl-4">3001234567</span>
            <span className="ml-auto text-green-400 text-xs font-bold">✓</span>
          </div>
        </div>

        {/* Avatar Selection - SAME SCREEN */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-black text-brand-gold uppercase tracking-wider">IDENTIDAD</span>
            </div>
            <span className="text-[5px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-1 py-px rounded font-bold uppercase">Requerido</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {avatars.map((av) => (
              <div
                key={av.id}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
                  av.selected
                    ? 'bg-brand-gold/10 border-2 border-brand-gold shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                    : 'bg-white/3 border border-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${av.color} flex items-center justify-center shadow-lg`}>
                  {av.id === 'as-oros' && <span className="text-sm text-white font-black">A</span>}
                  {av.id === 'rey-espadas' && <span className="text-sm text-white font-black">♔</span>}
                  {av.id === 'copa-real' && <span className="text-sm text-white font-black">🏆</span>}
                  {av.id === 'ficha-elite' && <span className="text-sm text-white font-black">$</span>}
                </div>
                <span className={`text-[4px] font-bold uppercase tracking-wider text-center leading-tight ${av.selected ? 'text-brand-gold' : 'text-text-secondary'}`}>
                  {av.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="w-full h-10 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-[8px] rounded-2xl flex items-center justify-center border-b-4 border-brand-gold-dark shadow-[0_10px_20px_rgba(0,0,0,0.4)] mb-2">
          RECLAMAR MI LUGAR
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">o</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google */}
        <div className="w-full h-8 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-[9px] text-white/70">Registrarme con Google</span>
        </div>

        {/* Login link */}
        <p className="text-center text-[7px] text-text-secondary mt-1.5">
          ¿Ya tienes cuenta? <span className="text-brand-gold underline underline-offset-2">Entrar ahora</span>
        </p>
      </div>
    </div>
  )
}

/* ── Screen 2: OTP Verification ───────────────────────────────── */
function OTPVerifyScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[7px] font-black tracking-widest uppercase mb-2">
        <ShieldCheck className="w-2.5 h-2.5" /> VERIFICACIÓN
      </div>

      <h2 className="text-base font-bold text-[#f3edd7] mb-0.5">Confirma tu Número</h2>
      <p className="text-[7px] text-text-secondary mb-1">Código enviado a</p>
      <p className="text-[10px] text-brand-gold font-mono mb-3">+57 300 *** 4567</p>

      <div className="flex gap-1.5 mb-3">
        {['4', '7', '2', '8', '1', '9'].map((digit, i) => (
          <div
            key={i}
            className={`w-8 h-10 rounded-xl flex items-center justify-center text-base font-bold font-mono ${
              i === 5
                ? 'bg-black/50 border-2 border-white/10 text-text-secondary'
                : 'bg-brand-gold/10 border-2 border-brand-gold text-brand-gold shadow-[0_0_12px_rgba(212,175,55,0.15)]'
            }`}
          >
            {digit}
          </div>
        ))}
      </div>

      <div className="w-44 h-9 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark rounded-xl flex items-center justify-center text-black font-black uppercase tracking-widest text-[8px] border-b-4 border-brand-gold-dark shadow-[0_10px 20px_rgba(0,0,0,0.4)]">
        CÓDIGO CORRECTO →
      </div>

      <p className="mt-2 text-[7px] text-brand-gold/50 underline underline-offset-2">Reintentar envío</p>
    </div>
  )
}

/* ── Screen 3: PIN Setup ──────────────────────────────────────── */
function PinSetupScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[8px] font-black tracking-widest uppercase mb-3">
        <KeyRound className="w-3 h-3" /> CLAVE DE ACCESO
      </div>

      <h2 className="text-lg font-bold text-[#f3edd7] mb-1">Crea tu Clave</h2>
      <p className="text-[8px] text-text-secondary mb-4 text-center">Será tu forma rápida de entrar</p>

      <div className="w-full max-w-[220px] mb-3">
        <label className="text-[7px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-1 block">Clave de 6 dígitos</label>
        <div className="w-full h-11 px-3 bg-black/50 border-2 border-white/10 rounded-2xl flex items-center justify-center gap-2 shadow-inner">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 bg-brand-gold rounded-full" />
          ))}
        </div>
      </div>

      <div className="w-full max-w-[220px] mb-4">
        <label className="text-[7px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-1 block">Repite tu Clave</label>
        <div className="w-full h-11 px-3 bg-black/50 border-2 border-green-500/40 rounded-2xl flex items-center justify-center gap-2 shadow-inner">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 bg-green-400 rounded-full" />
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1 ml-1">
          <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[7px] text-green-400 font-bold">Las claves coinciden</span>
        </div>
      </div>

      <div className="w-48 h-11 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark rounded-2xl flex items-center justify-center text-black font-black uppercase tracking-widest text-[9px] border-b-4 border-brand-gold-dark shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
        GUARDAR MI CLAVE →
      </div>
    </div>
  )
}

/* ── Screen 4: Biometric Setup ────────────────────────────────── */
function BiometricScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black tracking-widest uppercase mb-4">
        OPCIONAL
      </div>

      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-gold/10 to-brand-gold/5 border-2 border-brand-gold/30 flex items-center justify-center">
          <Fingerprint className="w-10 h-10 text-brand-gold" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-brand-gold/15 animate-ping" />
      </div>

      <h2 className="text-lg font-bold text-[#f3edd7] mb-1">Activar Huella Digital?</h2>
      <p className="text-[8px] text-text-secondary mb-5 text-center max-w-[220px] leading-relaxed">
        Accede más rápido usando tu huella o reconocimiento facial.
      </p>

      <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
        <div className="w-full h-11 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark rounded-2xl flex items-center justify-center text-black font-black uppercase tracking-widest text-[9px] border-b-4 border-brand-gold-dark shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
          SÍ, ACTIVAR HUELLA
        </div>
        <div className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-text-secondary text-[9px] font-semibold">
          AHORA NO, GRACIAS
        </div>
      </div>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const registerSteps: TutorialStep[] = [
  { label: 'Completa tus datos y elige tu avatar', screen: <RegisterFormScreen /> },
  { label: 'Verifica tu número con el código SMS', screen: <OTPVerifyScreen /> },
  { label: 'Crea tu clave de acceso de 6 dígitos', screen: <PinSetupScreen /> },
  { label: 'Activa la huella digital (opcional)', screen: <BiometricScreen /> },
]
