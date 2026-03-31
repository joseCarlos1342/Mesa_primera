'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GLOBAL_CLIENT_ERROR] message:', error.message)
    if (error.stack) {
      console.error('[GLOBAL_CLIENT_ERROR] stack:', error.stack)
    }
    if (error.digest) {
      console.error('[GLOBAL_CLIENT_ERROR] digest:', error.digest)
    }
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md text-center space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-widest text-amber-400">
            Error de Aplicación
          </h2>

          <p className="text-red-400 text-sm font-mono break-words">
            {error.message || 'Error desconocido'}
          </p>

          {error.digest && (
            <p className="text-slate-500 text-xs font-mono">
              Código de error: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            className="mt-4 px-8 py-3 bg-amber-500 text-black font-black uppercase tracking-widest rounded-2xl"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
