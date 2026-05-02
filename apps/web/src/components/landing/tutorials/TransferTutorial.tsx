'use client'

import { Search, ArrowRightLeft, CheckCircle2, UserCheck, Phone } from 'lucide-react'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Screen 1: Search User ────────────────────────────────────── */
function TransferSearchScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-y-auto px-3 pt-8 pb-4">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-3 self-center">
        <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
        <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">TRANSFERIR SALDO</span>
      </div>

      <h3 className="text-sm font-display font-black italic text-[#d4af37] uppercase tracking-tight mb-4 text-center">Transferir a Jugador</h3>

      {/* Search */}
      <div className="w-full mb-4">
        <label className="text-[6px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-0.5 block">Teléfono del destinatario</label>
        <div className="w-full h-10 pl-8 pr-3 bg-black/50 border-2 border-cyan-500/30 rounded-2xl flex items-center shadow-inner relative">
          <span className="text-brand-gold font-mono font-black text-xs absolute left-2 top-1/2 -translate-y-1/2">+57</span>
          <span className="text-[#f3edd7] text-xs font-mono tracking-tighter pl-4">3007654321</span>
        </div>
        <p className="text-[6px] text-[#f3edd7]/30 mt-1 ml-1">Ingresa 10 dígitos sin el +57</p>
      </div>

      <div className="w-full h-10 bg-gradient-to-b from-cyan-500 to-cyan-700 text-white font-black uppercase tracking-widest text-[9px] rounded-2xl flex items-center justify-center gap-2 border-b-4 border-cyan-900 shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
        <Search className="w-4 h-4" />
        BUSCAR JUGADOR
      </div>
    </div>
  )
}

/* ── Screen 2: Confirm Recipient ──────────────────────────────── */
function TransferConfirmRecipientScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-y-auto px-3 pt-8 pb-4 items-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] p-[2px] mb-3">
        <div className="w-full h-full rounded-full bg-[#111] border border-black/20 flex items-center justify-center">
          <span className="text-xl text-[#f3edd7] font-black">M</span>
        </div>
      </div>
      <h3 className="text-base font-bold text-[#f3edd7] mb-0.5">MariaGamer</h3>
      <p className="text-[8px] text-text-secondary mb-1">Nivel 12</p>
      <div className="flex items-center gap-1 mb-5">
        <Phone className="w-3 h-3 text-brand-gold/50" />
        <span className="text-[8px] text-brand-gold/50 font-mono">+57 300 *** 4321</span>
      </div>

      <div className="flex gap-2 w-full">
        <div className="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-text-secondary text-[8px] font-semibold">
          BUSCAR OTRO
        </div>
        <div className="flex-1 h-9 bg-gradient-to-b from-cyan-500 to-cyan-700 text-white font-black text-[8px] uppercase tracking-wider rounded-xl flex items-center justify-center border-b-2 border-cyan-900">
          CONFIRMAR
        </div>
      </div>
    </div>
  )
}

/* ── Screen 3: Enter Amount ───────────────────────────────────── */
function TransferAmountScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-y-auto px-3 pt-8 pb-4 items-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] p-[2px] mb-2">
        <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
          <span className="text-lg text-[#f3edd7] font-black">M</span>
        </div>
      </div>
      <p className="text-[8px] text-text-secondary mb-4">MariaGamer</p>

      <div className="w-full mb-1">
        <label className="text-[6px] font-black text-brand-gold/60 uppercase tracking-widest ml-1 mb-0.5 block">Monto a transferir</label>
        <div className="w-full h-12 px-3 bg-black/40 border-2 border-cyan-500/30 rounded-2xl flex items-center" style={{ boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.5)' }}>
          <span className="text-sm font-display font-black text-cyan-400 italic mr-1 opacity-60">$</span>
          <span className="text-sm font-display font-black text-[#f3edd7] italic">25.000</span>
        </div>
        <p className="text-[6px] text-[#f3edd7]/30 mt-1 ml-1">Mínimo $1.000 · Disponible: $150.000</p>
      </div>

      <div className="w-full h-10 mt-4 bg-gradient-to-b from-cyan-500 to-cyan-700 text-white font-black uppercase tracking-widest text-[9px] rounded-2xl flex items-center justify-center gap-2 border-b-4 border-cyan-900 shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
        CONTINUAR
      </div>
    </div>
  )
}

/* ── Screen 4: Final Confirm ──────────────────────────────────── */
function TransferFinalConfirmScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-y-auto px-3 pt-8 pb-4 items-center">
      <h3 className="text-sm font-display font-black italic text-[#d4af37] uppercase tracking-tight mb-4 text-center">Confirmar Transferencia</h3>

      <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[8px] text-text-secondary">Para</span>
          <span className="text-[10px] text-[#f3edd7] font-bold">MariaGamer</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[8px] text-text-secondary">Monto</span>
          <span className="text-[10px] text-cyan-400 font-bold font-mono">$25.000</span>
        </div>
        <div className="h-px bg-white/10 mb-3" />
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-text-secondary">Saldo restante</span>
          <span className="text-[10px] text-brand-gold font-bold font-mono">$125.000</span>
        </div>
      </div>

      <div className="flex gap-2 w-full">
        <div className="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-text-secondary text-[8px] font-semibold">
          CANCELAR
        </div>
        <div className="flex-1 h-9 bg-gradient-to-b from-cyan-500 to-cyan-700 text-white font-black text-[8px] uppercase tracking-wider rounded-xl flex items-center justify-center border-b-2 border-cyan-900">
          CONFIRMAR
        </div>
      </div>
    </div>
  )
}

/* ── Screen 5: Success ────────────────────────────────────────── */
function TransferSuccessScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-lg font-bold text-[#f3edd7] mb-1">Transferencia Exitosa</h2>
      <p className="text-[8px] text-text-secondary mb-4 text-center max-w-[200px]">
        Enviaste <span className="text-cyan-400 font-bold">$25.000</span> a MariaGamer
      </p>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
        <UserCheck className="w-3 h-3 text-emerald-400" />
        <span className="text-[8px] text-emerald-400 font-bold">Destinatario notificado</span>
      </div>
      <p className="text-[8px] text-brand-gold font-mono">Saldo restante: $125.000</p>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const transferSteps: TutorialStep[] = [
  { label: 'Busca al jugador por teléfono', screen: <TransferSearchScreen /> },
  { label: 'Confirma el destinatario', screen: <TransferConfirmRecipientScreen /> },
  { label: 'Ingresa el monto a transferir', screen: <TransferAmountScreen /> },
  { label: 'Revisa y confirma', screen: <TransferFinalConfirmScreen /> },
  { label: 'Transferencia completada', screen: <TransferSuccessScreen /> },
]
