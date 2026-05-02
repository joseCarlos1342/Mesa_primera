'use client'

import { Landmark, ArrowRightLeft, Plus, ShieldCheck } from 'lucide-react'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Screen 1: Wallet Home ────────────────────────────────────── */
function WalletHomeScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-y-auto px-3 pt-10 pb-4">
      {/* Premium Balance Card */}
      <div className="relative bg-[#0a2a1f] p-4 rounded-[2rem] border-2 border-brand-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-4 group">
        <div className="absolute inset-0 opacity-20 pointer-events-none rounded-[2rem]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3\")" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,transparent_100%)] opacity-40 group-hover:opacity-60 transition-opacity duration-1000 rounded-[2rem]" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-text-secondary">Saldo en Cartera</span>
          <h2 className="text-3xl font-display font-black text-brand-gold italic tracking-tighter leading-none select-none">
            <span className="text-brand-gold mr-1 opacity-90">$</span>150.000
          </h2>
          <div className="w-full pt-2 flex gap-2">
            <div className="flex-1 h-8 bg-brand-gold rounded-xl flex items-center justify-center gap-1 text-black font-black text-[7px] uppercase tracking-[0.15em]" style={{ boxShadow: 'inset 0 -8px 0 #8b6b2e, 0 8px 20px rgba(0,0,0,0.4)' }}>
              Retirar
            </div>
            <div className="flex-1 h-8 bg-brand-gold/15 border-2 border-brand-gold/30 rounded-xl flex items-center justify-center gap-1 text-brand-gold font-black text-[7px] uppercase tracking-[0.15em]">
              <ArrowRightLeft className="w-3 h-3" />
              Transferir
            </div>
          </div>
        </div>
      </div>

      {/* Chip Packs Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-gold/10 rounded-xl flex items-center justify-center border border-brand-gold/20 shadow-inner">
            <Plus className="w-3.5 h-3.5 text-brand-gold" />
          </div>
          <h3 className="text-xs font-display font-black text-text-premium uppercase tracking-tight italic">Carga Saldo</h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            { amount: '$50.000', label: 'Pagas $50.000', popular: false },
            { amount: '$100.000', label: 'Pagas $100.000', popular: true },
            { amount: '$200.000', label: 'Pagas $200.000', popular: false },
            { amount: '$500.000', label: 'Pagas $500.000', popular: false },
          ].map((pack, i) => (
            <div
              key={i}
              className={`relative p-3 rounded-[1.5rem] border-2 flex flex-col items-center text-center gap-1 transition-all ${
                pack.popular
                  ? 'bg-[#0a2a1f] border-brand-gold/60 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
                  : 'bg-black/40 border-brand-gold/10 shadow-xl'
              }`}
            >
              {pack.popular && (
                <span className="absolute top-0 right-0 bg-brand-gold text-black text-[6px] font-black uppercase py-1 px-2.5 rounded-bl-xl tracking-[0.2em] shadow-xl border-b border-l border-white/20">
                  Popular
                </span>
              )}
              <div className={`p-2 rounded-full shadow-inner ${pack.popular ? 'bg-brand-gold/20' : 'bg-brand-gold/5'}`}>
                <Landmark className={`w-4 h-4 ${pack.popular ? 'text-brand-gold' : 'text-brand-gold/60'}`} />
              </div>
              <span className="text-sm font-display font-black text-white leading-tight">{pack.amount}</span>
              <span className="text-[7px] font-black text-brand-gold/80 uppercase tracking-widest">{pack.label}</span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <span className="text-[8px] text-brand-gold/50 underline underline-offset-2">Otro Monto Manual</span>
        </div>
      </div>
    </div>
  )
}

/* ── Screen 2: Deposit Form ───────────────────────────────────── */
function DepositFormScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#1b4d3e] via-[#1b4d3e] to-[#0d211a] flex flex-col overflow-y-auto px-3 pt-8 pb-4">
      <div className="absolute top-0 left-0 w-full h-96 bg-[#c5a059]/5 rounded-full pointer-events-none" style={{ filter: 'blur(120px)', transform: 'translateY(-50%)' }} />

      <div className="relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 mb-3">
          <Plus className="w-3 h-3 text-[#d4af37]" />
          <span className="text-[8px] font-black text-[#d4af37] uppercase tracking-widest">CARGAR SALDO</span>
        </div>
        <h3 className="text-base font-display font-black italic text-[#d4af37] uppercase tracking-tight mb-3">Cargar Saldo</h3>

        {/* Bank card */}
        <div className="w-full bg-gradient-to-br from-black/40 to-black/60 border-2 border-[#c0a060]/30 rounded-[2rem] p-3 shadow-[0_25px_50px_rgba(0,0,0,0.5)] mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#c0a060]/20 to-[#8b6b2e]/10 rounded-xl border-2 border-[#c0a060]/30 flex items-center justify-center" style={{ boxShadow: '0 0 12px rgba(192,160,96,0.1)' }}>
              <Landmark className="w-4 h-4 text-[#c0a060]" />
            </div>
            <div>
              <p className="text-[7px] text-[#c0a060]/60 font-black uppercase tracking-[0.3em]">Nequi Personal</p>
              <p className="text-[10px] text-[#f3edd7] font-bold tracking-tight">3125822841</p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-display font-black text-2xl text-[#f3edd7] italic tracking-[0.05em]" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>3125822841</p>
            <div className="h-1 bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent mt-1" style={{ filter: 'blur(1px)' }} />
          </div>
          <div role="button" className="w-full mt-2 h-8 bg-[#d4af37]/10 text-[#c0a060] border border-[#c0a060]/20 rounded-xl font-black text-[8px] uppercase tracking-[0.2em] flex items-center justify-center">
            Copiar Número
          </div>
        </div>

        {/* Amount */}
        <div className="w-full mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" style={{ boxShadow: '0 0 12px rgba(212,175,55,0.8)', animation: 'pulse 2s infinite' }} />
            <span className="text-[8px] font-black text-[#f3edd7]/60 uppercase tracking-[0.3em]">Monto a depositar</span>
          </div>
          <div className="w-full h-10 pl-4 pr-3 bg-black/40 border-2 border-[#d4af37]/30 rounded-2xl flex items-center" style={{ boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.6)' }}>
            <span className="text-lg font-display font-black text-[#c0a060] italic pr-2 opacity-60">$</span>
            <span className="text-lg font-display font-black text-[#f3edd7] italic">100.000</span>
          </div>
        </div>

        {/* Upload */}
        <div className="w-full min-h-[70px] border-2 border-dashed border-[#d4af37]/20 rounded-2xl bg-black/30 flex flex-col items-center justify-center gap-1 mb-2" style={{ boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.4)' }}>
          <div className="w-10 h-10 bg-[#d4af37]/10 rounded-xl border-2 border-[#d4af37]/20 flex items-center justify-center" style={{ boxShadow: '0 0 12px rgba(192,160,96,0.5)' }}>
            <svg className="w-5 h-5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-[8px] text-[#f3edd7] font-black uppercase tracking-[0.2em]">Comprobante de pago</span>
        </div>

        {/* Submit */}
        <div className="relative w-full h-10 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[#2a1b04] font-black uppercase tracking-[0.25em] text-[8px] rounded-2xl flex items-center justify-center gap-2" style={{ borderBottom: '4px solid #8b6b2e', boxShadow: '0 15px 40px rgba(192,160,89,0.3)' }}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Confirmar Depósito
        </div>
      </div>
    </div>
  )
}

/* ── Screen 3: Success ────────────────────────────────────────── */
function DepositSuccessScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-3">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-4">
        <ShieldCheck className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-lg font-bold text-[#f3edd7] mb-1">Depósito Enviado</h2>
      <p className="text-[8px] text-text-secondary text-center max-w-[200px] mb-4">
        Tu solicitud de <span className="text-brand-gold font-bold">$100.000</span> está siendo procesada.
      </p>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">En revisión</span>
      </div>
      <p className="text-[7px] text-text-secondary mt-4 text-center">
        Recibirás una notificación cuando el saldo sea acreditado.
      </p>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const walletSteps: TutorialStep[] = [
  { label: 'Tu billetera con balance y opciones', screen: <WalletHomeScreen /> },
  { label: 'Elige un monto y ve al depósito', screen: <WalletHomeScreen /> },
  { label: 'Deposita vía Nequi con comprobante', screen: <DepositFormScreen /> },
  { label: 'Tu depósito está siendo procesado', screen: <DepositSuccessScreen /> },
]
