'use client'

import { Download, Share, Plus, ChevronRight, Smartphone, MoreVertical } from 'lucide-react'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Screen 1: Banner PWA ─────────────────────────────────────── */
function BannerScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0a1a12] to-[#0d2818] flex flex-col">
      {/* Fake app content - lobby dimmed */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 opacity-30">
        <h2 className="text-sm font-display font-black text-[#d4af37] italic uppercase tracking-tighter mb-2">Lobby</h2>
        <div className="w-20 h-1 bg-[#d4af37]/20 rounded-full" />
      </div>

      {/* PWA banner */}
      <div className="mx-3 mb-3 rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-emerald-500/30 p-3.5 flex items-center gap-3 shadow-2xl shadow-emerald-500/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-brand-gold-dark flex items-center justify-center shrink-0" style={{ boxShadow: '0 0 12px rgba(212,175,55,0.3)' }}>
          <Smartphone className="w-5 h-5 text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold truncate">Instalar 4 Ases</p>
          <p className="text-emerald-300/70 text-[8px]">Juega sin barra del navegador a pantalla completa</p>
        </div>
        <div role="button" className="shrink-0 bg-emerald-600 text-white text-[8px] font-bold px-2.5 py-1.5 rounded-lg">
          Instalar app
        </div>
      </div>
    </div>
  )
}

/* ── Screen 2: Chrome 3 Dots Menu ─────────────────────────────── */
function ChromeMenuScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0a1a12] to-[#0d2818] flex flex-col">
      {/* Chrome address bar */}
      <div className="bg-zinc-900 px-2 pt-7 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-zinc-700" />
          <div className="flex-1 h-4 rounded-full bg-zinc-800 flex items-center px-1.5">
            <svg className="w-2.5 h-2.5 text-green-500 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" /></svg>
            <span className="text-[7px] text-zinc-400 truncate">primerariveradalos4ases.com</span>
          </div>
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
            <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Dimmed content */}
      <div className="flex-1 bg-black/60 relative">
        {/* Chrome menu overlay */}
        <div className="absolute top-2 right-2 w-40 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 text-[8px] text-zinc-400 border-b border-zinc-700">primerariveradalos4ases.com</div>
          <div className="py-1">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Share className="w-3 h-3 text-zinc-300" />
              <span className="text-[9px] text-zinc-200">Compartir</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-gold/10">
              <Download className="w-3 h-3 text-brand-gold" />
              <span className="text-[9px] text-brand-gold font-bold">Instalar app</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="text-[9px] text-zinc-300">Añadir a pantalla de inicio</span>
            </div>
          </div>
        </div>
      </div>

      {/* Callout */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5">
        <div className="w-2.5 h-2.5 bg-[#d4af37] rounded-full animate-pulse" />
        <span className="text-[7px] text-[#d4af37] font-bold">Toca los 3 puntos y selecciona "Instalar app"</span>
      </div>
    </div>
  )
}

/* ── Screen 3: Android Install Prompt ─────────────────────────── */
function AndroidPromptScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0a1a12] to-[#0d2818] flex flex-col">
      {/* Chrome address bar */}
      <div className="bg-zinc-900 px-2 pt-7 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-zinc-700" />
          <div className="flex-1 h-4 rounded-full bg-zinc-800 flex items-center px-1.5">
            <svg className="w-2.5 h-2.5 text-green-500 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" /></svg>
            <span className="text-[7px] text-zinc-400 truncate">primerariveradalos4ases.com</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-black/60" />

      {/* Native install dialog */}
      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 z-10">
        <div className="w-full rounded-3xl bg-zinc-900 border border-zinc-700/50 p-4 shadow-2xl shadow-black/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-gold-dark flex items-center justify-center" style={{ boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }}>
              <span className="text-black font-display font-bold">4A</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-bold">4 Ases</p>
              <p className="text-zinc-400 text-[9px]">primerariveradalos4ases.com · Juego de cartas</p>
            </div>
          </div>
          <p className="text-zinc-300 text-[10px] mb-4 leading-relaxed">
            ¿Quieres añadir esta aplicación a tu pantalla de inicio? Funciona sin conexión y de forma rápida.
          </p>
          <div className="flex gap-3">
            <div role="button" className="flex-1 py-2.5 rounded-2xl bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-700">
              Cancelar
            </div>
            <div role="button" className="flex-1 py-2.5 rounded-2xl bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[#2a1b04] text-xs font-bold flex items-center justify-center gap-1.5" style={{ borderBottom: '3px solid #5c4613' }}>
              <Download className="w-3.5 h-3.5" />
              Instalar
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Screen 4: iOS Share Menu Instructions ────────────────────── */
function IOSShareScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0a1a12] to-[#0d2818] flex flex-col">
      {/* Safari header */}
      <div className="bg-zinc-900 px-2 pt-7 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-zinc-700" />
          <div className="flex-1 h-4 rounded-full bg-zinc-800 flex items-center px-1.5">
            <span className="text-[7px] text-zinc-400 truncate">primerariveradalos4ases.com</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-black/70" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-3">
          <div className="flex items-center gap-2.5 w-full">
            <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] flex items-center justify-center shrink-0 shadow-lg shadow-[#d4af37]/20">
              <span className="text-[#d4af37] text-xs font-black">1</span>
            </div>
            <div className="flex-1 bg-zinc-900/95 backdrop-blur-md rounded-xl p-2.5 border border-[#d4af37]/20 shadow-lg">
              <p className="text-white text-[10px] font-semibold flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5 text-blue-400" />
                Toca <span className="text-blue-400 font-bold">Compartir</span> en Safari
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#d4af37]/30 rotate-90" />

          <div className="flex items-center gap-2.5 w-full">
            <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] flex items-center justify-center shrink-0">
              <span className="text-[#d4af37] text-xs font-black">2</span>
            </div>
            <div className="flex-1 bg-zinc-900/95 backdrop-blur-md rounded-xl p-2.5 border border-[#d4af37]/20 shadow-lg">
              <p className="text-white text-[10px] font-semibold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Selecciona <span className="text-emerald-400 font-bold">Añadir a pantalla de inicio</span>
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#d4af37]/30 rotate-90" />

          <div className="flex items-center gap-2.5 w-full">
            <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] flex items-center justify-center shrink-0">
              <span className="text-[#d4af37] text-xs font-black">3</span>
            </div>
            <div className="flex-1 bg-zinc-900/95 backdrop-blur-md rounded-xl p-2.5 border border-[#d4af37]/20 shadow-lg">
              <p className="text-white text-[10px] font-semibold">
                Toca <span className="text-blue-400 font-bold">Agregar</span> en la esquina superior
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* iOS bottom bar */}
      <div className="bg-zinc-900 px-4 py-2 flex items-center justify-center border-t border-zinc-800">
        <div className="w-28 h-1 bg-zinc-600 rounded-full" />
      </div>
    </div>
  )
}

/* ── Screen 5: App Installed Success ──────────────────────────── */
function InstalledScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#16213e] to-[#1a1a2e] flex flex-col">
      {/* Status bar */}
      <div className="pt-7 px-3 pb-1 flex items-center justify-between">
        <span className="text-[8px] text-zinc-400">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm border border-zinc-500 flex items-end py-px px-0.5">
            <div className="w-full h-full bg-green-500 rounded-sm" />
          </div>
          <div className="w-1.5 h-2 bg-zinc-500 rounded-sm" />
        </div>
      </div>

      {/* Home screen grid */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-zinc-400 text-[8px] mb-4 uppercase tracking-widest">Pantalla de inicio</p>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Tel', bg: 'bg-green-600' },
            { label: 'Msg', bg: 'bg-green-500' },
            { label: 'Saf', bg: 'bg-blue-500' },
            { label: 'Cam', bg: 'bg-zinc-700' },
          ].map((app, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-10 h-10 rounded-2xl ${app.bg} flex items-center justify-center opacity-40`}>
                <span className="text-[7px] text-white/60">{app.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 4 Ases app icon - HIGHLIGHTED */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-brand-gold via-brand-gold to-brand-gold-dark flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 20px rgba(212,175,55,0.4), 0 4px 12px rgba(0,0,0,0.3)' }}>
            <span className="text-black font-display font-black text-xl">4A</span>
          </div>
          <span className="text-white text-[9px] mt-1 font-medium">4 Ases</span>
          <div className="mt-1 w-5 h-0.5 bg-white/30 rounded-full" />
        </div>

        {/* Success badge */}
        <div className="flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-500/20 rounded-xl px-3 py-1.5">
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-300 text-[9px] font-bold">App instalada correctamente</span>
        </div>
      </div>

      {/* Bottom dock */}
      <div className="pb-3 px-5">
        <div className="w-full h-px bg-zinc-700 mb-2" />
        <div className="flex items-center justify-around">
          {['Tel', 'Msg', 'Saf', 'Cam'].map((label) => (
            <div key={label} className="w-10 h-10 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <span className="text-[7px] text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const installAppSteps: TutorialStep[] = [
  { label: 'Aparece el banner de instalación', screen: <BannerScreen /> },
  { label: 'Chrome: los 3 puntos → Instalar app', screen: <ChromeMenuScreen /> },
  { label: 'Android: confirma la instalación', screen: <AndroidPromptScreen /> },
  { label: 'iOS: usa el menú de Safari', screen: <IOSShareScreen /> },
  { label: 'App lista en tu pantalla de inicio', screen: <InstalledScreen /> },
]
