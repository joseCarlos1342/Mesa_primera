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

      {/* Aviso no bloqueante de permisos (micrófono y notificaciones). */}
      {showBanner && (
        <div
          role="region"
          aria-label="Permisos de la mesa"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
        >
          <div className="relative rounded-lg border border-[#8b6b2e] bg-[#120806]/95 p-4 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(240,170,105,0.28)]">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="absolute right-1.5 top-1.5 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#bdb7a6] transition-colors hover:text-text-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <p className="pr-10 text-lg font-semibold text-text-premium">Activa la voz y los avisos</p>
            <p className="mt-0.5 pr-10 text-base text-[#bdb7a6]">Son opcionales: sirven para hablar en la mesa y saber cuándo es tu turno.</p>

            <ul className="mt-3 flex items-center gap-5 text-base text-[#d9d3bf]">
              <li className="flex items-center gap-2">
                {microphone === 'granted'
                  ? <Check className="h-5 w-5 text-[#5fd38d]" aria-hidden="true" />
                  : <Mic className="h-5 w-5 text-brand-gold-light" aria-hidden="true" />}
                Micrófono{microphone === 'granted' ? ' activo' : ''}
              </li>
              <li className="flex items-center gap-2">
                {notifications === 'granted'
                  ? <Check className="h-5 w-5 text-[#5fd38d]" aria-hidden="true" />
                  : <Bell className="h-5 w-5 text-brand-gold-light" aria-hidden="true" />}
                Notificaciones{notifications === 'granted' ? ' activas' : ''}
              </li>
            </ul>

            <button
              type="button"
              onClick={handleRequestClick}
              disabled={isRequesting}
              aria-busy={isRequesting || undefined}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-lg border border-[#8b6b2e]/80 text-lg font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-60"
            >
              {isRequesting ? 'Pidiendo permiso…' : 'Permitir'}
              {!isRequesting && <ChevronRight className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
