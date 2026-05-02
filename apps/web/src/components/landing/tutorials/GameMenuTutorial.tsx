'use client'

import {
  ShoppingCart, Menu, Mic, HelpCircle, Headphones, ArrowRightLeft,
  Maximize, LogOut, ShieldAlert, AlertTriangle, Wrench, Send,
  X, Check, Landmark, Copy, ShieldCheck, Upload,
} from 'lucide-react'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Screen 1: Shopping Cart / Recharge ───────────────────────── */
function RechargeScreen() {
  return (
    <div className="w-full h-full bg-[#073926] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-[#073b24] pointer-events-none" />
      <div className="absolute inset-0 bg-black/40" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-2 pt-3 pb-1">
        <div className="flex items-center gap-1 bg-[#0a180e]/80 rounded-lg px-1.5 py-0.5 border border-[#d4af37]/20">
          <Menu className="w-3 h-3 text-[#fdf0a6]" />
          <span className="text-[5px] text-[#c0a060] font-bold uppercase tracking-wider">Mesa #1</span>
        </div>
        <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] flex items-center justify-center" style={{ borderBottom: '2px solid #5c4613', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
          <ShoppingCart className="w-3 h-3 text-[#2a1b04]" />
        </div>
      </div>

      {/* Deposit Form Modal */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-2 py-2">
        <div className="w-full max-w-[220px] bg-gradient-to-br from-[#1b4d3e] via-[#1b4d3e] to-[#0d211a] border border-[#c0a060]/40 rounded-[1.5rem] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          {/* Title */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#c0a060]/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#c0a060]/10 rounded-lg flex items-center justify-center border border-[#c0a060]/20">
                <ShoppingCart className="w-3 h-3 text-[#c0a060]" />
              </div>
              <span className="text-[8px] font-black text-[#d4af37] uppercase tracking-wider italic">Cargar Saldo</span>
            </div>
            <div className="w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center">
              <X className="w-3 h-3 text-[#f3edd7]/50" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* Bank Details Card */}
            <div className="bg-black/40 border border-[#c0a060]/30 rounded-xl p-2">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-[#c0a060]/10 rounded-lg flex items-center justify-center border border-[#c0a060]/20">
                  <Landmark className="w-3 h-3 text-[#c0a060]" />
                </div>
                <span className="text-[6px] text-[#c0a060]/60 font-black uppercase tracking-wider">Cuenta de Transferencia</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-[10px] text-[#f3edd7] font-bold">Nequi Personal</span>
              </div>
              <div className="text-center mb-1.5">
                <span className="text-[12px] font-display font-black text-[#f3edd7] italic tracking-wide">3125822841</span>
              </div>
              <div className="flex justify-center">
                <div className="flex items-center gap-1 px-3 py-1 bg-[#c0a060]/10 border border-[#c0a060]/20 rounded-lg">
                  <Copy className="w-2.5 h-2.5 text-[#c0a060]" />
                  <span className="text-[6px] text-[#c0a060] font-bold uppercase">Copiar</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c0a060]" />
                <span className="text-[5px] text-[#f3edd7]/60 font-black uppercase tracking-wider">Monto a Cargar ($)</span>
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-display font-black text-[#c0a060] opacity-60">$</span>
                <input
                  type="text"
                  placeholder="0"
                  className="w-full h-8 pl-6 pr-2 bg-black/40 border border-[#c0a060]/20 rounded-lg text-[10px] font-display font-black text-[#f3edd7] placeholder:text-brand-gold/10 focus:outline-none focus:border-[#c0a060]/60 italic"
                />
              </div>
              <p className="text-[5px] text-[#f3edd7]/20 font-bold uppercase">Mínimo $10.000 — Máximo $50.000.000 COP</p>
            </div>

            {/* Upload */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c0a060]" />
                <span className="text-[5px] text-[#f3edd7]/60 font-black uppercase tracking-wider">Comprobante</span>
              </div>
              <div className="relative h-16 border-2 border-dashed border-[#c0a060]/20 rounded-xl bg-black/30 flex flex-col items-center justify-center">
                <Upload className="w-5 h-5 text-[#c0a060]/40 mb-0.5" />
                <p className="text-[5px] text-[#f3edd7]/30 font-black uppercase">Presiona para subir</p>
                <p className="text-[4px] text-[#f3edd7]/20">PNG, JPG</p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c0a060]/30" />
                <span className="text-[5px] text-[#f3edd7]/40 font-black uppercase tracking-wider">Notas (opcional)</span>
              </div>
              <textarea
                placeholder="..."
                className="w-full h-10 p-2 bg-black/30 border border-brand-gold/5 rounded-lg text-[6px] text-[#f3edd7] placeholder:text-[#f3edd7]/10 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="p-2 border-t border-[#c0a060]/20">
            <div className="w-full h-8 bg-accent-gold-shimmer text-slate-950 rounded-lg font-black text-[7px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg">
              <ShieldCheck className="w-3 h-3" />
              Confirmar Depósito
            </div>
          </div>
        </div>
      </div>

      {/* Callout */}
      <div className="relative z-10 pb-2 flex items-center justify-center gap-1.5">
        <div className="w-2 h-2 bg-[#d4af37] rounded-full animate-pulse" />
        <span className="text-[6px] text-[#d4af37] font-bold">Carrito de recarga rápida</span>
      </div>
    </div>
  )
}

/* ── Screen 2: Menu Dropdown ──────────────────────────────────── */
function MenuDropdownScreen() {
  const items = [
    { icon: Mic, label: 'Audio de Jugadores', color: 'text-[#f3edd7]/70' },
    { icon: HelpCircle, label: 'Reglas del Juego', color: 'text-[#f3edd7]/70' },
    { icon: Headphones, label: 'Llamar al Admin', color: 'text-[#c0a060]', bold: true },
    { icon: ArrowRightLeft, label: 'Transferir Saldo', color: 'text-cyan-400', bold: true },
    { icon: Maximize, label: 'Pantalla Completa', color: 'text-[#f3edd7]/70' },
  ]

  return (
    <div className="w-full h-full bg-[#073926] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-[#073b24] pointer-events-none" />
      <div className="absolute inset-0 bg-black/50" />

      {/* Header with menu open */}
      <div className="relative z-10 flex items-center justify-between px-3 pt-5 pb-2">
        <div className="flex items-center gap-1 bg-[#0a180e]/80 rounded-lg px-2 py-1 border border-[#d4af37]/20">
          <X className="w-3.5 h-3.5 text-[#fdf0a6]" />
          <span className="text-[6px] text-[#c0a060] font-bold uppercase tracking-wider">Mesa #1</span>
        </div>
      </div>

      {/* Menu panel */}
      <div className="relative z-10 w-full max-w-[200px] self-start ml-3 mt-2 bg-[#0d211a]/95 backdrop-blur-xl border border-[#c0a060]/30 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
        <div className="px-3 py-1.5 border-b border-[#c0a060]/15">
          <span className="text-[7px] font-black text-[#c0a060]/70 uppercase tracking-[0.2em]">Opciones de Mesa</span>
        </div>
        <div className="py-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-3 py-1.5">
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              <span className={`text-[8px] ${item.color} ${item.bold ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </div>
          ))}
          <div className="h-px bg-[#c0a060]/10 mx-3 my-0.5" />
          <div className="flex items-center gap-2 px-3 py-1.5">
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider">Abandonar Partida</span>
          </div>
        </div>
      </div>

      {/* Callout */}
      <div className="relative z-10 mt-auto pb-3 flex items-center justify-center gap-1.5">
        <div className="w-2.5 h-2.5 bg-[#d4af37] rounded-full animate-pulse" />
        <span className="text-[7px] text-[#d4af37] font-bold">Menú de opciones durante la partida</span>
      </div>
    </div>
  )
}

/* ── Screen 3: Call Admin ─────────────────────────────────────── */
function CallAdminScreen() {
  return (
    <div className="w-full h-full bg-[#073926] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-[#073b24] pointer-events-none" />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[240px] bg-[#0d211a]/95 backdrop-blur-xl border border-red-500/20 rounded-[2rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-2 border border-red-500/20">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-xs font-black text-[#f3edd7] text-center mb-3 uppercase tracking-wider">Llamar al Admin</h3>

          <div className="space-y-1.5 mb-3">
            {[
              { icon: AlertTriangle, label: 'Disputa en la Mesa' },
              { icon: ShieldAlert, label: 'Juego Desleal' },
              { icon: Wrench, label: 'Problema Técnico' },
              { icon: HelpCircle, label: 'Otro Motivo' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-black/30 border border-white/5">
                <item.icon className="w-3.5 h-3.5 text-[#c0a060] shrink-0" />
                <span className="text-[8px] text-[#f3edd7] font-medium">{item.label}</span>
                <div className="ml-auto w-3 h-3 rounded-full border border-[#c0a060]/30" />
              </div>
            ))}
          </div>

          <div className="w-full h-8 bg-gradient-to-b from-red-500 to-red-700 text-white font-black text-[7px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 border-b-2 border-red-900">
            <Send className="w-3 h-3" />
            Enviar Solicitud
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Screen 4: Exit Confirmation ──────────────────────────────── */
function ExitConfirmScreen() {
  return (
    <div className="w-full h-full bg-[#073926] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-[#073b24] pointer-events-none" />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[240px] bg-[#0d211a] border-2 border-red-500/20 rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 border border-red-500/20">
            <LogOut className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-base font-black text-[#f3edd7] mb-2 uppercase tracking-wider">¿Abandonar Mesa?</h3>
          <p className="text-[8px] text-[#f3edd7]/40 mb-4 leading-relaxed">
            Si abandonas la partida ahora, <span className="text-red-400 font-bold">perderás las fichas que ya apostaste</span>, se quedarán en la mesa.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 h-9 bg-[#1b4d3e]/40 border border-[#c0a060]/15 rounded-xl flex items-center justify-center text-[#f3edd7] font-bold text-[8px] uppercase tracking-wider">
              Cancelar
            </div>
            <div className="flex-1 h-9 bg-gradient-to-r from-red-600 to-red-800 rounded-xl flex items-center justify-center text-white font-bold text-[8px] uppercase tracking-wider border border-red-500/40">
              Sí, Salir
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const gameMenuSteps: TutorialStep[] = [
  { label: 'Carrito de recarga rápida', screen: <RechargeScreen />, landscape: true },
  { label: 'Menú de opciones de mesa', screen: <MenuDropdownScreen />, landscape: true },
  { label: 'Llamar al Admin', screen: <CallAdminScreen />, landscape: true },
  { label: 'Abandonar partida', screen: <ExitConfirmScreen />, landscape: true },
]
