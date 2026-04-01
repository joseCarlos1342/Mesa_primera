"use client"

import { useState } from 'react'
import { useGamePermissions } from '@/hooks/useGamePermissions'
import { ShieldAlert, Bell, Mic, Smartphone, Check, ChevronRight } from 'lucide-react'

interface PermissionsGateProps {
  children: React.ReactNode
}

export function PermissionsGate({ children }: PermissionsGateProps) {
  const { isMobile, allGranted, requestAll, notifications, microphone, orientation } = useGamePermissions()
  const [isRequesting, setIsRequesting] = useState(false)

  // Wait for user interaction to request permissions
  const handleRequestClick = async () => {
    setIsRequesting(true)
    await requestAll()
    setIsRequesting(false)
  }

  // If already granted, or we don't need to block anymore, render children
  if (allGranted) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#073926] flex items-center justify-center p-4 landscape:p-3 text-center text-[#f3edd7] overflow-y-auto">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 mix-blend-multiply pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#d4af37]/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md landscape:max-w-2xl my-auto bg-[#0a180e]/95 backdrop-blur-3xl border border-[#d4af37]/40 rounded-[2rem] landscape:rounded-[1.5rem] p-8 landscape:p-5 shadow-[0_20px_80px_rgba(0,0,0,0.8),_0_0_40px_rgba(212,175,55,0.1)] flex flex-col landscape:flex-row landscape:gap-6 items-center overflow-hidden">
        {/* Glowing border top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-50" />

        {/* Left column in landscape: header + description */}
        <div className="landscape:flex landscape:flex-col landscape:items-center landscape:justify-center landscape:w-2/5 landscape:shrink-0">
          <div className="w-20 h-20 landscape:w-14 landscape:h-14 rounded-full bg-[#071a0e] border-[3px] border-[#d4af37]/30 flex items-center justify-center mb-4 landscape:mb-3 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
            <ShieldAlert className="w-10 h-10 landscape:w-7 landscape:h-7 text-[#d4af37]" />
          </div>

          <h2 className="text-2xl md:text-3xl landscape:text-xl font-black font-display text-[#fdf0a6] uppercase tracking-[0.2em] mb-2 landscape:mb-1 leading-none text-center">
            Permisos
          </h2>
          <div className="h-px w-16 bg-[#d4af37]/50 mb-4 landscape:mb-3" />

          <p className="text-[#8faa96] text-sm md:text-base landscape:text-xs leading-relaxed mb-6 landscape:mb-0 max-w-sm">
            Para una experiencia premium en la mesa, requerimos acceso a los siguientes permisos.
          </p>
        </div>

        {/* Right column in landscape: permissions + button */}
        <div className="w-full landscape:flex-1">
          <div className="w-full space-y-2 landscape:space-y-1.5 mb-6 landscape:mb-3">
            {/* Orientation - Mobile Only */}
            {isMobile && (
              <div className="flex items-center gap-4 landscape:gap-3 bg-[#071a0e]/50 border border-[#d4af37]/20 p-4 landscape:p-2.5 rounded-2xl landscape:rounded-xl w-full">
                <div className="w-10 h-10 landscape:w-8 landscape:h-8 rounded-xl landscape:rounded-lg bg-[#0a180e] border border-[#d4af37]/30 flex items-center justify-center shadow-inner shrink-0">
                  <Smartphone className="w-5 h-5 landscape:w-4 landscape:h-4 text-[#d4af37]" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-[#fdf0a6] text-sm landscape:text-xs uppercase tracking-wider">Rotación de Pantalla</h3>
                  <p className="text-[11px] landscape:text-[10px] text-[#8faa96]">Bloqueo en formato horizontal</p>
                </div>
                <div>
                  {orientation === 'granted' ? <Check className="w-5 h-5 landscape:w-4 landscape:h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-yellow-500/50" />}
                </div>
              </div>
            )}

            {/* Microphone */}
            <div className="flex items-center gap-4 landscape:gap-3 bg-[#071a0e]/50 border border-[#d4af37]/20 p-4 landscape:p-2.5 rounded-2xl landscape:rounded-xl w-full">
              <div className="w-10 h-10 landscape:w-8 landscape:h-8 rounded-xl landscape:rounded-lg bg-[#0a180e] border border-[#d4af37]/30 flex items-center justify-center shadow-inner shrink-0">
                <Mic className="w-5 h-5 landscape:w-4 landscape:h-4 text-[#d4af37]" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-[#fdf0a6] text-sm landscape:text-xs uppercase tracking-wider">Micrófono</h3>
                <p className="text-[11px] landscape:text-[10px] text-[#8faa96]">Chat de voz en tiempo real</p>
              </div>
              <div>
                {microphone === 'granted' ? <Check className="w-5 h-5 landscape:w-4 landscape:h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-yellow-500/50" />}
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center gap-4 landscape:gap-3 bg-[#071a0e]/50 border border-[#d4af37]/20 p-4 landscape:p-2.5 rounded-2xl landscape:rounded-xl w-full">
              <div className="w-10 h-10 landscape:w-8 landscape:h-8 rounded-xl landscape:rounded-lg bg-[#0a180e] border border-[#d4af37]/30 flex items-center justify-center shadow-inner shrink-0">
                <Bell className="w-5 h-5 landscape:w-4 landscape:h-4 text-[#d4af37]" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-[#fdf0a6] text-sm landscape:text-xs uppercase tracking-wider">Notificaciones</h3>
                <p className="text-[11px] landscape:text-[10px] text-[#8faa96]">Avisos de turno y sala</p>
              </div>
              <div>
                {notifications === 'granted' ? <Check className="w-5 h-5 landscape:w-4 landscape:h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-yellow-500/50" />}
              </div>
            </div>
          </div>

          <button
            onClick={handleRequestClick}
            disabled={isRequesting}
            className="group relative w-full bg-gradient-to-b from-[#d4af37] to-[#b8860b] hover:from-[#fdf0a6] hover:to-[#d4af37] text-[#0a180e] font-black text-sm md:text-base landscape:text-xs uppercase tracking-[0.2em] py-5 landscape:py-3 px-6 rounded-2xl landscape:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_rgba(212,175,55,0.5)] hover:-translate-y-1 active:translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 flex items-center justify-center w-full h-full">
              <div className="w-[120%] h-[10px] bg-white/30 rotate-45 blur-md -top-10 -left-10 group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />
            </div>
            <span className="relative flex items-center justify-center gap-2">
              {isRequesting ? 'Concediendo...' : 'Conceder Permisos'}
              {!isRequesting && <ChevronRight className="w-5 h-5 landscape:w-4 landscape:h-4 group-hover:translate-x-1 transition-transform" />}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
