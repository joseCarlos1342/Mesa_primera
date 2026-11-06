'use client'

import { Fingerprint, Lock } from 'lucide-react'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PwaLockScreenProps {
  onUnlock: () => Promise<boolean>
}

export function PwaLockScreen({ onUnlock }: PwaLockScreenProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Wait for client-side mount & block body scroll
  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  async function handleUnlock() {
    setError(false)
    setLoading(true)
    try {
      const ok = await onUnlock()
      if (!ok) setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-lock-title"
      style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
      className="player-layout flex flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center font-sans"
    >
      <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full border border-[#8b6b2e] bg-[#0a2c20] text-brand-gold-light">
        <Fingerprint className="h-10 w-10" strokeWidth={1.5} />
      </span>
      <h2 id="pwa-lock-title" className="mt-6 font-display text-[2rem] font-bold leading-tight text-text-premium">
        Primera Riverada los 4 Ases
      </h2>
      <p className="mt-2 max-w-xs text-lg leading-relaxed text-[#d9d3bf]">
        Usa tu huella o tu rostro para abrir la app.
      </p>

      <button
        type="button"
        onClick={handleUnlock}
        disabled={loading}
        aria-busy={loading || undefined}
        className="mt-8 inline-flex min-h-14 w-full max-w-xs items-center justify-center gap-2.5 rounded-lg bg-brand-gold px-6 text-lg font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:cursor-wait disabled:opacity-60"
      >
        <Lock className="h-5 w-5" aria-hidden="true" />
        {loading ? 'Verificando…' : 'Desbloquear'}
      </button>

      {error && (
        <p role="alert" className="mt-4 text-base font-semibold text-[#f08a7e]">
          No se pudo verificar. Inténtalo de nuevo.
        </p>
      )}
    </div>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
