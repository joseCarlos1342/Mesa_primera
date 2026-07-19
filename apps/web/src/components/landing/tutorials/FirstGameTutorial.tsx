'use client'

import {
  ShoppingCart, Menu, Users, Trophy, Plus, Film,
  MicOff,
} from 'lucide-react'
import Image from 'next/image'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Helper: Opponent Badge (exact style from real game) ──────── */
function OppBadge({ name, balance, avatar, order }: { name: string; balance: string; avatar?: string; order?: string }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-[#0a180e]/80 border border-[#d4af37]/30 shadow-lg">
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] p-[1px] shrink-0">
        <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center overflow-hidden">
          {avatar ? (
            <span className="text-[6px] text-[#f3edd7] font-bold">{avatar}</span>
          ) : (
            <div className="w-3 h-3 rounded-full bg-gray-600" />
          )}
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[5px] text-[#e2c161] font-bold tracking-wider uppercase">{name}</span>
        <span className="text-[4px] text-[#c1a052] font-mono font-bold">{balance}</span>
      </div>
      {order && (
        <span className="text-[4px] text-[#d4af37] font-black">{order}</span>
      )}
    </div>
  )
}

/* ── Helper: Chip ─────────────────────────────────────────────── */
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[6px] md:text-[7px] font-black border-[1.5px] border-dashed border-black/30 shadow-md ${color}`}>
      {label}
    </div>
  )
}

/* ── Screen 1: Lobby ─────────────────────────────────────────── */
function LobbyScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0a1f15] via-[#0d2818] to-[#0a1f15] flex flex-col overflow-y-auto">
      <div className="w-full flex flex-col items-center gap-2 px-3 pt-8 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand-gold/5 border border-brand-gold/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[7px] font-black text-brand-gold uppercase tracking-[0.3em]">SERVIDOR ACTIVO</span>
          <div className="w-px h-2 bg-brand-gold/20" />
          <span className="text-[7px] font-black text-[#f3edd7] uppercase tracking-wider">3 MESAS</span>
        </div>
        <h1 className="text-3xl font-display font-black italic text-[#d4af37] uppercase tracking-tighter leading-none">Lobby</h1>
        <p className="text-[7px] text-slate-400 tracking-[0.3em] uppercase italic">Selecciona tu mesa</p>

        <div className="w-full p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-brand-gold/10">
          <div className="flex flex-col items-center mb-2">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-gold">Mi Balance</span>
            <span className="text-2xl font-black text-[#f3edd7] tracking-tighter leading-none">
              <span className="text-[#d4af37] mr-1 opacity-90">$</span>150.000
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <div className="flex-1 h-7 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8b6b2e] rounded-lg flex items-center justify-center gap-1 text-black font-black text-[7px] uppercase tracking-widest" style={{ borderBottom: '3px solid #5c4613' }}>
              <Plus className="w-3 h-3" /> Recargar
            </div>
            <div className="flex-1 h-7 bg-purple-600 rounded-lg flex items-center justify-center gap-1 text-white font-black text-[7px] uppercase tracking-widest border-b-2 border-purple-900/50">
              <Film className="w-3 h-3" /> Repeticiones
            </div>
          </div>
        </div>

        <div className="w-full p-3 bg-black/40 backdrop-blur-3xl rounded-2xl border border-brand-gold/10">
          <h2 className="text-xs font-display font-black italic uppercase text-[#f3edd7] tracking-widest text-center mb-2">Mesas</h2>
          <div className="bg-black/40 backdrop-blur-3xl rounded-xl p-3 border border-brand-gold/20 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5 text-[#d4af37]" />
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 border border-white/5">
                  <Users className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-[8px] text-emerald-400 font-bold">3<span className="text-slate-600 mx-0.5">/</span><span className="text-slate-500">7</span></span>
                </div>
              </div>
              <span className="text-[7px] text-[#d4af37] font-bold">Pique min: $5K</span>
            </div>
            <h3 className="text-xl font-display font-black text-[#f3edd7] uppercase italic tracking-tighter text-center mb-2"># 1</h3>
            <div className="w-full h-7 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] rounded-lg flex items-center justify-center font-display font-black text-[8px] uppercase italic tracking-widest text-[#2a1b04]" style={{ borderBottom: '3px solid #5c4613' }}>
              ENTRAR
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Screen 2: Waiting Room (landscape) ──────────────────────── */
function WaitingRoomScreen() {
  return (
    <div className="w-full h-full bg-[#073926] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-[#073b24] pointer-events-none" />
      <div className="absolute inset-0 border-t-4 border-[#0a2e1b] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-[#c5a059]" />
          <span className="text-base font-display font-black italic text-[#c5a059] uppercase tracking-[0.2em]">SALA DE ESPERA</span>
        </div>

        <p className="text-[7px] text-[#f3edd7]/60 font-bold uppercase tracking-[0.3em] mb-2">
          JUGADORES: <span className="text-[#c5a059]">3 / 7</span>
        </p>

        <div className="bg-[#0a180e]/80 border border-[#d4af37]/20 rounded-xl px-3 py-1 mb-2 flex items-center gap-2">
          <span className="text-[6px] text-[#f3edd7]/50 uppercase tracking-wider">Pique Mín:</span>
          <span className="text-[8px] text-[#d4af37] font-black">$5.000</span>
          <span className="text-[5px] text-[#f3edd7]/30">|</span>
          <span className="text-[6px] text-[#f3edd7]/50 uppercase tracking-wider">Banda:</span>
          <span className="text-[8px] text-[#d4af37] font-black">$1.000</span>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mb-2">
          {[
            { name: 'Carlos', chips: '$80K', ready: true, dealer: true },
            { name: 'Maria', chips: '$120K', ready: true, dealer: false },
            { name: 'Tú', chips: '$150K', ready: false, dealer: false },
          ].map((p, i) => (
            <div key={i} className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl ${p.ready ? 'bg-[#0f2e1a]/90 border border-[#d4af37]/30' : 'bg-[#071a0e]/60 border border-white/5 opacity-60'}`}>
              <div className={`w-3 h-3 rounded-full ${p.ready ? 'bg-emerald-500 shadow-[0_0_6px_rgba(74,222,128,0.4)]' : 'bg-red-500'}`} />
              <span className="text-[7px] text-[#f3edd7] font-bold">{p.name}{p.name === 'Tú' && ' (TÚ)'}</span>
              <span className="text-[6px] text-[#c5a059] font-mono font-bold">{p.chips}</span>
              {p.dealer && <span className="bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[5px] text-[#1a0f02] font-black px-1 rounded">MANO</span>}
            </div>
          ))}
        </div>

        <div className="w-full max-w-[280px] h-8 bg-gradient-to-b from-[#2ecc71] via-[#27ae60] to-[#1e8449] rounded-xl flex items-center justify-center text-white font-black uppercase tracking-[0.2em] text-[9px]" style={{ borderBottom: '3px solid #14532d' }}>
          ESTOY LISTO!
        </div>
      </div>
    </div>
  )
}

/* ── Screen 3: REAL Game Table (landscape) — exact from image ─── */
function GameTableScreen() {
  return (
    <div className="w-full h-full bg-[#073926] flex flex-col overflow-hidden relative">
      {/* Felt texture */}
      <div className="absolute inset-0 bg-[#073b24] pointer-events-none" />
      <div className="absolute inset-0 border-t-4 border-[#0a2e1b] pointer-events-none" />
      {/* Decorative ellipse */}
      <div className="absolute inset-[5%] border-[5px] border-black/10 rounded-[50%]" style={{ filter: 'blur(1px)' }} />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between px-2 pt-2 pb-0.5">
        <div className="flex items-center gap-1 bg-[#0a180e]/80 rounded-lg px-1.5 py-0.5 border border-[#d4af37]/20">
          <Menu className="w-3 h-3 text-[#fdf0a6]" />
        </div>
        <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] flex items-center justify-center" style={{ borderBottom: '2px solid #5c4613' }}>
          <ShoppingCart className="w-3 h-3 text-[#2a1b04]" />
        </div>
      </div>

      {/* OPPONENTS ARC */}
      <div className="relative z-10 flex items-center justify-center gap-2 px-2">
        <OppBadge name="MIDUDEV" balance="$ 1.632.000" avatar="M" />
        <OppBadge name="VACÍO" balance="$0" />
        <OppBadge name="VACÍO" balance="$0" />
        <OppBadge name="VACÍO" balance="$0" />
      </div>
      <div className="relative z-10 flex items-center justify-center gap-2 px-2 mt-0.5">
        <OppBadge name="@XIMENA" balance="$ 772.363" avatar="X" order="2°" />
        <div className="w-6" />
        <OppBadge name="VACÍO" balance="$0" />
      </div>

      {/* CENTER: Pots + Deck */}
      <div className="relative z-10 flex-1 flex items-center justify-center gap-3">
        <div className="flex flex-col gap-1">
          <div className="bg-[#0a180e]/90 border border-[#d4af37]/20 rounded-lg px-2 py-1 flex flex-col items-center min-w-[60px]">
            <span className="text-[4px] text-[#fdf0a6] font-black uppercase tracking-[0.1em] opacity-60">APUESTA</span>
            <span className="text-[10px] text-[#4ade80] font-mono font-black">$ 0</span>
          </div>
          <div className="bg-[#0a180e]/90 border border-[#d4af37]/20 rounded-lg px-2 py-1 flex flex-col items-center min-w-[60px]">
            <span className="text-[4px] text-[#fdf0a6] font-black uppercase tracking-[0.1em] opacity-60">PIQUE</span>
            <span className="text-[10px] text-[#4ade80] font-mono font-black">$ 15K</span>
          </div>
        </div>

        {/* Deck */}
        <div className="relative w-8 h-11">
          <div className="absolute inset-0 rounded border-2 border-[#d4af37]/40 overflow-hidden shadow-xl" style={{ backgroundImage: 'url(/images/card-back-rooster.png)', backgroundSize: 'cover' }} />
        </div>
      </div>

      {/* BOTTOM AREA */}
      <div className="relative z-10 px-2 pb-1.5">
        {/* Chips + Cards + Actions row */}
        <div className="flex items-end justify-between gap-1.5">
          {/* LEFT: Chips */}
          <div className="flex items-center gap-0.5">
            <Chip label="1k" color="bg-yellow-400 text-black" />
            <Chip label="2k" color="bg-blue-500 text-white" />
            <Chip label="5k" color="bg-red-500 text-white" />
            <Chip label="10k" color="bg-gray-900 text-white" />
            <Chip label="20k" color="bg-green-600 text-white" />
            <Chip label="50k" color="bg-white text-black" />
          </div>

          {/* CENTER: My cards */}
          <div className="flex items-end gap-0.5">
            {[
              '/cards/01-copas.png',
              '/cards/03-bastos.png',
              '/cards/01-espadas.png',
              '/cards/06-oros.png',
            ].map((src, i) => (
              <div key={i} className="w-[18px] h-[26px] rounded-[2px] overflow-hidden border border-white/20 shadow-md">
                <Image src={src} alt="" width={52} height={76} className="w-full h-full object-cover" unoptimized />
              </div>
            ))}
          </div>

          {/* RIGHT: Mic + Action */}
          <div className="flex flex-col items-end gap-0.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#f87171] via-[#dc2626] to-[#991b1b] flex items-center justify-center shadow-lg" style={{ borderBottom: '2px solid #7f1d1d' }}>
              <MicOff className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="h-5 px-2 bg-gradient-to-b from-[#6b7280] to-[#4b5563] rounded flex items-center justify-center text-white font-black text-[5px] uppercase tracking-wider shadow-md" style={{ borderBottom: '2px solid #374151' }}>
              PASO
            </div>
          </div>
        </div>

        {/* HUD */}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] text-[#4ade80] font-mono font-black">$ 981.500</span>
          <span className="text-[5px] text-[#fdf0a6]/60 font-black uppercase">PTS</span>
          <span className="text-[10px] text-[#d4af37] font-mono font-black">33</span>
          <span className="bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[4px] text-[#1a0f02] font-black uppercase px-1 py-px rounded">MANO</span>
        </div>
      </div>
    </div>
  )
}

/* ── Screen 4: Game Phases (landscape) ───────────────────────── */
function GamePhaseScreen() {
  return (
    <div className="w-full h-full bg-[#073926] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-[#073b24] pointer-events-none" />
      <div className="absolute inset-0 border-t-4 border-[#0a2e1b] pointer-events-none" />
      <div className="absolute inset-[5%] border-[5px] border-black/10 rounded-[50%]" style={{ filter: 'blur(1px)' }} />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between px-2 pt-2 pb-0.5">
        <div className="flex items-center gap-1 bg-[#0a180e]/80 rounded-lg px-1.5 py-0.5 border border-[#d4af37]/20">
          <Menu className="w-3 h-3 text-[#fdf0a6]" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#f87171] via-[#dc2626] to-[#991b1b] flex items-center justify-center shadow-lg" style={{ borderBottom: '2px solid #7f1d1d' }}>
            <MicOff className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] flex items-center justify-center" style={{ borderBottom: '2px solid #5c4613' }}>
            <ShoppingCart className="w-3 h-3 text-[#2a1b04]" />
          </div>
        </div>
      </div>

      {/* OPPONENTS ARC — dimmed */}
      <div className="relative z-10 flex items-start justify-center gap-1 px-1 pt-0.5 opacity-40">
        <OppBadge name="MIDUDEV" balance="$ 1.632K" />
        <div className="w-6" />
        <OppBadge name="@XIMENA" balance="$ 772K" />
      </div>
      <div className="relative z-10 flex items-center justify-between px-4 mt-0.5 opacity-40">
        <OppBadge name="VACÍO" balance="$0" />
        <OppBadge name="VACÍO" balance="$0" />
        <OppBadge name="VACÍO" balance="$0" />
      </div>

      {/* CENTER: Phase announcement */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="bg-[#0a180e]/95 border border-[#d4af37]/40 rounded-xl px-4 py-3 text-center shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          <div className="w-7 h-7 rounded-full bg-brand-gold/20 border border-[#d4af37]/40 flex items-center justify-center mx-auto mb-1.5">
            <span className="text-brand-gold text-sm">⚜</span>
          </div>
          <h2 className="text-sm font-display font-black italic text-brand-gold uppercase tracking-wider mb-0.5">
            ¡A Picar!
          </h2>
          <p className="text-[6px] text-[#f3edd7]/50 uppercase tracking-[0.2em]">
            Fase de Pique Inicial
          </p>
        </div>
      </div>

      {/* Bottom: HUD + Buttons */}
      <div className="relative z-10 px-2 pb-1.5">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex flex-col">
            <span className="text-[5px] text-[#fdf0a6] uppercase tracking-[0.15em] font-black opacity-60 leading-none">Saldo</span>
            <span className="text-[10px] text-[#4ade80] font-mono font-black leading-none">$981.500</span>
          </div>
          <span className="bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[4px] text-[#1a0f02] font-black uppercase px-1 py-px rounded ml-1">MANO</span>
        </div>
        <div className="flex gap-1">
          <div className="flex-1 h-6 bg-gradient-to-b from-[#6b7280] to-[#4b5563] rounded flex items-center justify-center text-white font-black text-[5px] uppercase tracking-wider shadow-md" style={{ borderBottom: '2px solid #374151' }}>
            PASO
          </div>
          <div className="flex-1 h-6 bg-gradient-to-b from-[#4ade80] to-[#16a34a] rounded flex items-center justify-center text-white font-black text-[5px] uppercase tracking-wider shadow-lg" style={{ borderBottom: '2px solid #15703a' }}>
            IR! $5K
          </div>
          <div className="flex-1 h-6 bg-gradient-to-b from-[#374151] to-[#1f2937] rounded flex items-center justify-center text-[#9ca3af] font-black text-[5px] uppercase tracking-wider border border-white/10">
            LIMPIAR
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const firstGameSteps: TutorialStep[] = [
  { label: 'Elige una mesa en el lobby', screen: <LobbyScreen /> },
  { label: 'Sala de espera: confirma que estás listo', screen: <WaitingRoomScreen />, landscape: true },
  { label: 'La mesa de juego: cartas, fichas y acciones', screen: <GameTableScreen />, landscape: true },
  { label: 'Las fases del juego', screen: <GamePhaseScreen />, landscape: true },
]
