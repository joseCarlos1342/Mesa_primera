'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { enrollAdminTotp, verifyAdminTotpSetup } from '../../../../auth-actions'

export default function AdminMFASetupPage() {
  const router = useRouter()
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(true)

  useEffect(() => {
    async function enroll() {
      const result = await enrollAdminTotp()
      if ('sessionExpired' in result && result.sessionExpired) {
        router.replace('/login/admin')
        return
      }
      if (result.error) {
        setError(result.error)
      } else if (result.factorId && result.qrCode && result.secret) {
        setFactorId(result.factorId)
        setQrCode(result.qrCode)
        setSecret(result.secret)
      }
      setEnrolling(false)
    }
    enroll()
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('factorId', factorId)
    formData.append('code', code)

    const result = await verifyAdminTotpSetup(null, formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // Si no hay error, redirect ocurre en server action
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-amber-600 via-orange-500 to-amber-600 opacity-50" />

      <div className="w-full max-w-sm space-y-8 z-10 border border-slate-800 p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Configurar 2FA
          </h1>
          <p className="text-slate-400 text-sm">
            Escanea el código QR con tu app autenticadora
          </p>
        </div>

        {enrolling ? (
          <div className="flex items-center justify-center min-h-[360px] py-8">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {qrCode && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-2xl">
                    <img
                      src={qrCode}
                      alt="Código QR para autenticación"
                      width={200}
                      height={200}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center">
                    Clave manual
                  </p>
                  <p className="text-xs text-slate-400 text-center font-mono break-all bg-black/40 p-2 rounded-xl border border-slate-800 select-all">
                    {secret}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Código de verificación
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  className="w-full h-16 text-center text-3xl font-black tracking-[0.8em] bg-black/40 border border-slate-800 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all shadow-inner font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6 || !factorId}
                className="w-full h-12 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-amber-600/20"
              >
                {loading ? 'Activando...' : 'Activar 2FA'}
              </button>
            </form>

            <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest">
              Usa Google Authenticator / Authy
            </p>
          </>
        )}
      </div>
    </div>
  )
}
