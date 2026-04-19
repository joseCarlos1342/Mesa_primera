'use client'

import { useState } from 'react'
import { redeemAdminRecoveryCode, verifyAdminTotp } from '../../../auth-actions'

export default function AdminMFAPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('code', code)

    const result = await verifyAdminTotp(null, formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // Si no hay error, redirect ocurre en server action
  }

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryLoading(true)
    setRecoveryError('')

    const formData = new FormData()
    formData.append('code', recoveryCode)

    const result = await redeemAdminRecoveryCode(null, formData)
    if (result?.error) {
      setRecoveryError(result.error)
      setRecoveryLoading(false)
      return
    }

    if (result?.fieldErrors?.code) {
      setRecoveryError(result.fieldErrors.code)
      setRecoveryLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-amber-600 via-orange-500 to-amber-600 opacity-50" />

      <div className="w-full max-w-md space-y-8 z-10 border border-slate-800 p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Verificación 2FA
          </h1>
          <p className="text-slate-400 text-sm">
            Ingresa el código de tu app autenticadora
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
            className="w-full h-16 text-center text-3xl font-black tracking-[0.8em] bg-black/40 border border-slate-800 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all shadow-inner font-mono"
          />

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full h-12 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-amber-600/20"
          >
            {loading ? 'Verificando...' : 'Verificar Código'}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest">
          Código generado por Google Authenticator / Authy
        </p>

        <div className="border-t border-white/10 pt-6">
          <div className="mb-4 text-center">
            <p className="text-[10px] text-cyan-300 uppercase tracking-[0.28em] font-black">Recuperación</p>
            <p className="mt-2 text-sm text-slate-400">
              Si perdiste tu app autenticadora, usa uno de tus recovery codes para invalidar el factor actual y volver a configurarlo.
            </p>
          </div>

          <form onSubmit={handleRecovery} className="space-y-4">
            {recoveryError && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-sm text-center font-medium">
                {recoveryError}
              </div>
            )}

            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH-IJKL"
              required
              className="w-full h-14 text-center text-sm font-black tracking-[0.35em] bg-black/40 border border-slate-800 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all shadow-inner font-mono"
            />

            <button
              type="submit"
              disabled={recoveryLoading || recoveryCode.trim().length < 12}
              className="w-full h-12 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-cyan-600/10"
            >
              {recoveryLoading ? 'Validando...' : 'Usar código de recuperación'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
