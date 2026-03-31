'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to Vercel runtime logs so the stack trace is visible in the dashboard
    console.error('[CLIENT_ERROR] message:', error.message)
    if (error.stack) {
      console.error('[CLIENT_ERROR] stack:', error.stack)
    }
    if (error.digest) {
      console.error('[CLIENT_ERROR] digest:', error.digest)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-md text-center space-y-6">
        <h2 className="text-2xl font-black uppercase tracking-widest text-brand-gold">
          Algo salió mal
        </h2>

        <p className="text-red-400 text-sm font-mono break-words">
          {error.message || 'Error desconocido'}
        </p>

        {error.digest && (
          <p className="text-slate-500 text-xs font-mono">
            Código de error: {error.digest}
          </p>
        )}

        {process.env.NODE_ENV !== 'production' && error.stack && (
          <pre className="text-left text-xs text-slate-400 bg-slate-900 p-4 rounded-xl max-w-full overflow-auto border border-slate-700">
            {error.stack}
          </pre>
        )}

        <button
          onClick={reset}
          className="mt-4 px-8 py-3 bg-brand-gold text-black font-black uppercase tracking-widest rounded-2xl hover:brightness-110 transition-all active:scale-95"
        >
          Intentar de nuevo
        </button>

        <p className="text-slate-600 text-xs">
          Si el problema persiste, recarga la página.
        </p>
      </div>
    </div>
  )
}
