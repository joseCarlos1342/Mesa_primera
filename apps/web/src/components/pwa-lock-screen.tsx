'use client'

import { useState } from 'react'

interface PwaLockScreenProps {
  onUnlock: () => Promise<boolean>
}

export function PwaLockScreen({ onUnlock }: PwaLockScreenProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-slate-950/98 backdrop-blur-xl">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_60%)]" />
      </div>

      <div className="relative flex flex-col items-center gap-8 px-6">
        {/* Lock icon */}
        <div className="w-24 h-24 rounded-full bg-brand-gold/10 border-2 border-brand-gold/30 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.15)]">
          <svg
            className="w-12 h-12 text-brand-gold"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-black uppercase italic text-text-premium tracking-wide">
            Mesa Primera
          </h2>
          <p className="mt-2 text-sm text-white/50 max-w-65">
            Verifica tu identidad para continuar
          </p>
        </div>

        <button
          onClick={handleUnlock}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-gold/10 border-2 border-brand-gold/40 text-brand-gold font-bold uppercase tracking-wider text-sm hover:bg-brand-gold/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-wait shadow-lg"
        >
          {/* Fingerprint icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a48.667 48.667 0 0 0 .048 6M12 10.5a4.5 4.5 0 0 0-9 0 48.932 48.932 0 0 0 .356 7.112M12 10.5c0 5.018-.755 9.86-2.148 14.398M15.75 10.5c0 3.527-.464 6.94-1.325 10.19"
            />
          </svg>
          {loading ? 'Verificando...' : 'Desbloquear'}
        </button>

        {error && (
          <p className="text-red-400 text-sm animate-in fade-in duration-300">
            No se pudo verificar. Inténtalo de nuevo.
          </p>
        )}
      </div>
    </div>
  )
}
