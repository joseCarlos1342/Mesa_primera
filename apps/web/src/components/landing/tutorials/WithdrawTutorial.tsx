'use client'

import { ArrowUpWideNarrow, Landmark, ShieldCheck } from 'lucide-react'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Screen 1: Withdraw Amount ────────────────────────────────── */
function WithdrawAmountScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-y-auto px-3 pt-8 pb-4">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 mb-3 self-center">
        <ArrowUpWideNarrow className="w-3 h-3 text-[#d4af37]" />
        <span className="text-[8px] font-black text-[#d4af37] uppercase tracking-widest">RETIRAR SALDO</span>
      </div>

      <h3 className="text-sm font-display font-black italic text-[#d4af37] uppercase tracking-tight mb-4 text-center">Retirar Saldo</h3>

      {/* Amount */}
      <div className="w-full mb-4">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" style={{ boxShadow: '0 0 12px rgba(212,175,55,0.8)' }} />
          <span className="text-[8px] font-black text-[#f3edd7]/60 uppercase tracking-[0.3em]">Monto (COP)</span>
        </div>
        <div className="w-full h-12 px-3 bg-black/40 border-2 border-[#d4af37]/20 rounded-2xl flex items-center" style={{ boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.5)' }}>
          <span className="text-sm font-display font-black text-[#d4af37] italic mr-1 opacity-60">$</span>
          <span className="text-sm font-display font-black text-[#f3edd7] italic">50.000</span>
        </div>
        <p className="text-[6px] text-[#f3edd7]/30 mt-1 ml-1">Saldo disponible: $150.000</p>
      </div>

      {/* Bank details */}
      <div className="w-full mb-4">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" style={{ boxShadow: '0 0 12px rgba(212,175,55,0.8)' }} />
          <span className="text-[8px] font-black text-[#f3edd7]/60 uppercase tracking-[0.3em]">Datos bancarios (Alias/CBU)</span>
        </div>
        <div className="w-full h-14 px-3 pt-2 bg-black/40 border-2 border-[#d4af37]/20 rounded-2xl" style={{ boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.5)' }}>
          <span className="text-[10px] text-[#f3edd7]">Nequi - 3125822841</span>
        </div>
      </div>

      {/* Submit */}
      <div className="w-full h-10 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[#2a1b04] font-black uppercase tracking-[0.25em] text-[8px] rounded-2xl flex items-center justify-center gap-2 mb-4" style={{ borderBottom: '4px solid #8b6b2e', boxShadow: '0 15px 40px rgba(192,160,89,0.3)' }}>
        <ShieldCheck className="w-3.5 h-3.5" />
        Confirmar Retiro
      </div>

      {/* Protocol card */}
      <div className="bg-[#0a180e] border border-[#d4af37]/20 rounded-[1.5rem] p-3">
        <p className="text-[9px] font-bold text-[#d4af37] mb-2 uppercase tracking-wider">Protocolo de Retiro</p>
        <div className="space-y-1.5">
          <p className="text-[7px] text-[#f3edd7]/50 flex items-start gap-1"><span className="text-[#d4af37] shrink-0">●</span> Procesamiento entre 1 y 12 horas hábiles</p>
          <p className="text-[7px] text-[#f3edd7]/50 flex items-start gap-1"><span className="text-[#d4af37] shrink-0">●</span> El CBU/alias debe coincidir con tu cuenta</p>
          <p className="text-[7px] text-[#f3edd7]/50 flex items-start gap-1"><span className="text-red-400 shrink-0">●</span> No se permiten transferencias a terceros</p>
        </div>
      </div>
    </div>
  )
}

/* ── Screen 2: Processing ─────────────────────────────────────── */
function WithdrawProcessingScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="w-16 h-16 rounded-full bg-brand-gold/10 border-2 border-brand-gold/30 flex items-center justify-center mb-4">
        <Landmark className="w-8 h-8 text-brand-gold" />
      </div>
      <h2 className="text-lg font-bold text-[#f3edd7] mb-2">Retiro en Proceso</h2>
      <p className="text-[8px] text-text-secondary text-center max-w-[200px] mb-4">
        Tu solicitud de retiro de <span className="text-brand-gold font-bold">$50.000</span> ha sido recibida.
      </p>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">Pendiente</span>
      </div>
      <p className="text-[7px] text-text-secondary mt-4 text-center">
        Recibirás una notificación cuando el pago sea procesado.
      </p>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const withdrawSteps: TutorialStep[] = [
  { label: 'Ingresa monto y datos bancarios', screen: <WithdrawAmountScreen /> },
  { label: 'Confirmar y esperar procesamiento', screen: <WithdrawProcessingScreen /> },
]
