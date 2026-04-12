"use client"

import { useState, useEffect } from 'react'
import { useGamePermissions } from '@/hooks/useGamePermissions'
import { Bell, Mic, Check, ChevronRight, X } from 'lucide-react'

interface PermissionsGateProps {
  children: React.ReactNode
}

export function PermissionsGate({ children }: PermissionsGateProps) {
  const { allGranted, requestAll, notifications, microphone } = useGamePermissions()
  const [isRequesting, setIsRequesting] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Auto-dismiss after permissions are resolved
  useEffect(() => {
    if (allGranted) setDismissed(true)
  }, [allGranted])

  const handleRequestClick = async () => {
    setIsRequesting(true)
    await requestAll()
    setIsRequesting(false)
    setDismissed(true)
  }

  const showBanner = !allGranted && !dismissed

  return (
    <>
      {children}

      {/* Non-blocking permissions banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative bg-[#0a180e]/95 backdrop-blur-3xl border border-[#d4af37]/40 rounded-2xl p-4 shadow-[0_20px_80px_rgba(0,0,0,0.8),_0_0_40px_rgba(212,175,55,0.1)]">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4 text-[#8faa96]" />
            </button>

            <p className="text-[#fdf0a6] text-xs font-bold uppercase tracking-wider mb-3 pr-6">
              Permisos opcionales
            </p>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 text-[10px] text-[#8faa96]">
                {microphone === 'granted'
                  ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                  : <Mic className="w-3.5 h-3.5 text-[#d4af37]" />}
                <span>Micrófono</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8faa96]">
                {notifications === 'granted'
                  ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                  : <Bell className="w-3.5 h-3.5 text-[#d4af37]" />}
                <span>Notificaciones</span>
              </div>
            </div>

            <button
              onClick={handleRequestClick}
              disabled={isRequesting}
              className="w-full bg-gradient-to-b from-[#d4af37] to-[#b8860b] text-[#0a180e] font-black text-xs uppercase tracking-[0.15em] py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(212,175,55,0.3)] active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              {isRequesting ? 'Concediendo...' : 'Conceder'}
              {!isRequesting && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
