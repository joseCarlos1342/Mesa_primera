'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { enrollAdminTotp, verifyAdminTotpSetup } from '../../../../auth-actions'
import { AdminAlert, AdminAuthShell, AdminButton, adminInputClass } from '@/components/auth/AdminAuthShell'

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
  }, [router])

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
    <AdminAuthShell
      icon={ShieldCheck}
      title="Configurar 2FA"
      description="Escanea el código QR con tu app autenticadora (Google Authenticator o Authy)."
    >
      {enrolling ? (
        <div role="status" className="flex min-h-[360px] items-center justify-center gap-3 text-sm text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400 motion-reduce:animate-none" aria-hidden="true" />
          Generando código QR…
        </div>
      ) : (
        <>
          {qrCode && (
            <div className="mb-6 space-y-4">
              <div className="flex justify-center">
                <div className="rounded-xl bg-white p-3">
                  {/* data URI generado por Supabase */}
                  <img src={qrCode} alt="Código QR para autenticación" width={200} height={200} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-center text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Clave manual</p>
                <p className="select-all break-all rounded-xl border border-white/10 bg-gray-800 p-3 text-center font-mono text-sm text-slate-300">
                  {secret}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            {error && <AdminAlert>{error}</AdminAlert>}

            <div className="space-y-2">
              <label htmlFor="admin-totp-setup" className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                Código de verificación
              </label>
              <input
                id="admin-totp-setup"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className={`${adminInputClass()} h-14 text-center font-mono text-2xl tabular-nums tracking-[0.5em] sm:text-2xl`}
              />
            </div>

            <AdminButton type="submit" disabled={code.length !== 6 || !factorId} pending={loading}>
              {loading ? 'Activando...' : 'Activar 2FA'}
            </AdminButton>
          </form>
        </>
      )}
    </AdminAuthShell>
  )
}
