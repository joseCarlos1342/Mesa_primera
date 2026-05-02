'use client'

import { KeyRound, Fingerprint, Smartphone, ShieldCheck } from 'lucide-react'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Screen 1: Login Form ─────────────────────────────────────── */
function LoginFormScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3\")" }} />

      <h1 className="text-base font-display font-black tracking-tight bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic mb-3">
        PRIMERA RIVERADA
      </h1>

      <div className="relative w-full backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-4 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-center mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[8px] font-black tracking-widest uppercase">
            <KeyRound className="w-3 h-3" /> BIENVENIDO
          </div>
        </div>

        <h2 className="text-sm font-bold text-center text-[#f3edd7] mb-3">Ingresa a la mesa</h2>

        {/* Phone */}
        <div className="mb-3">
          <label className="text-[6px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-0.5 block">Número de Celular</label>
          <div className="w-full h-9 pl-8 pr-2 bg-black/50 border-2 border-green-500/40 rounded-2xl flex items-center shadow-inner relative">
            <span className="text-brand-gold font-mono font-black text-xs absolute left-2 top-1/2 -translate-y-1/2">+57</span>
            <span className="text-[#f3edd7] text-xs font-mono tracking-tighter pl-4">3001234567</span>
            <span className="ml-auto text-green-400 text-xs font-black">✓</span>
          </div>
        </div>

        {/* PIN */}
        <div className="mb-3">
          <label className="text-[6px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-0.5 block">Clave de 6 dígitos</label>
          <div className="w-full h-9 px-2 bg-black/50 border-2 border-green-500/40 rounded-2xl flex items-center justify-center gap-2 shadow-inner">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-2 h-2 bg-brand-gold rounded-full" />
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="w-full h-10 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-[9px] rounded-2xl flex items-center justify-center border-b-4 border-brand-gold-dark shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
          ENTRAR A JUGAR
        </div>

        <p className="mt-2 text-center text-[7px] text-brand-gold/40 underline underline-offset-2">¿Olvidaste tu clave?</p>
      </div>
    </div>
  )
}

/* ── Screen 2: Biometric Login ────────────────────────────────── */
function BiometricLoginScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black tracking-widest uppercase mb-4">
        ACCESO RÁPIDO
      </div>

      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-gold/10 to-brand-gold/5 border-2 border-brand-gold/30 flex items-center justify-center">
          <Fingerprint className="w-8 h-8 text-brand-gold" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-brand-gold/15 animate-ping" />
      </div>

      <h2 className="text-sm font-bold text-[#f3edd7] mb-1">Entrar con Huella</h2>
      <p className="text-[8px] text-text-secondary mb-5 text-center max-w-[200px]">
        Si ya activaste tu huella, toca el botón para acceder sin escribir tu PIN.
      </p>

      <div className="w-full max-w-[200px] h-10 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-black uppercase tracking-widest text-[9px] rounded-2xl flex items-center justify-center gap-2 border-b-4 border-emerald-900 shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
        <Fingerprint className="w-4 h-4" />
        ENTRAR CON HUELLA
      </div>
    </div>
  )
}

/* ── Screen 3: Device Verify ──────────────────────────────────── */
function DeviceVerifyScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black tracking-widest uppercase mb-3">
        <Smartphone className="w-3 h-3" /> DISPOSITIVO NUEVO
      </div>

      <h2 className="text-sm font-bold text-[#f3edd7] mb-1 text-center">Detectamos un inicio de sesión nuevo</h2>
      <p className="text-[8px] text-text-secondary mb-4 text-center max-w-[200px]">
        Enviamos un código SMS para verificar que eres tú.
      </p>

      <div className="flex gap-1.5 mb-4">
        {['4', '7', '2', '8', '1', '9'].map((digit, i) => (
          <div
            key={i}
            className={`w-8 h-10 rounded-xl flex items-center justify-center text-base font-bold font-mono ${
              i === 5
                ? 'bg-black/50 border-2 border-white/10 text-text-secondary'
                : 'bg-amber-500/10 border-2 border-amber-400 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
            }`}
          >
            {digit}
          </div>
        ))}
      </div>

      <div className="w-full max-w-[200px] h-10 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-[9px] rounded-2xl flex items-center justify-center border-b-4 border-brand-gold-dark shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
        VERIFICAR
      </div>
    </div>
  )
}

/* ── Screen 4: PIN Recovery ───────────────────────────────────── */
function PinRecoveryScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[8px] font-black tracking-widest uppercase mb-3">
        <ShieldCheck className="w-3 h-3" /> RECUPERACIÓN
      </div>

      <h2 className="text-sm font-bold text-[#f3edd7] mb-1 text-center">¿Olvidaste tu clave?</h2>
      <p className="text-[8px] text-text-secondary mb-4 text-center max-w-[200px]">
        Te enviaremos un código SMS para crear una nueva clave de acceso.
      </p>

      <div className="w-full max-w-[220px] mb-3">
        <label className="text-[6px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-0.5 block">Número de Celular</label>
        <div className="w-full h-9 pl-8 pr-3 bg-black/50 border-2 border-white/10 rounded-2xl flex items-center shadow-inner relative">
          <span className="text-brand-gold font-mono font-black text-xs absolute left-2 top-1/2 -translate-y-1/2">+57</span>
          <span className="text-[#f3edd7] text-xs font-mono tracking-tighter pl-4">3001234567</span>
        </div>
      </div>

      <div className="w-full max-w-[220px] h-10 bg-gradient-to-b from-red-500 to-red-700 text-white font-black uppercase tracking-widest text-[9px] rounded-2xl flex items-center justify-center border-b-4 border-red-900 shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
        ENVIAR CÓDIGO SMS
      </div>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const loginSteps: TutorialStep[] = [
  { label: 'Ingresa tu teléfono y PIN', screen: <LoginFormScreen /> },
  { label: 'O usa tu huella digital registrada', screen: <BiometricLoginScreen /> },
  { label: 'Dispositivo nuevo: verifica con SMS', screen: <DeviceVerifyScreen /> },
  { label: '¿Olvidaste tu clave? Recupérala por SMS', screen: <PinRecoveryScreen /> },
]
