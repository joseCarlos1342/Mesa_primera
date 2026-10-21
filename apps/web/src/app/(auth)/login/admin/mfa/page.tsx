'use client'

import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { redeemAdminRecoveryCode, verifyAdminTotp } from '../../../auth-actions'
import { AdminAlert, AdminAuthShell, AdminButton, adminInputClass } from '@/components/auth/AdminAuthShell'

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
    <AdminAuthShell
      icon={LockKeyhole}
      title="Verificación 2FA"
      description="Ingresa el código de 6 dígitos de tu app autenticadora (Google Authenticator o Authy)."
    >
      <form onSubmit={handleVerify} className="space-y-5">
        {error && <AdminAlert>{error}</AdminAlert>}

        <div className="space-y-2">
          <label htmlFor="admin-totp" className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
            Código de la app
          </label>
          <input
            id="admin-totp"
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

        <AdminButton type="submit" disabled={code.length !== 6} pending={loading}>
          {loading ? 'Verificando...' : 'Verificar Código'}
        </AdminButton>
      </form>

      <section aria-labelledby="admin-recovery-title" className="mt-8 border-t border-white/10 pt-6">
        <h2 id="admin-recovery-title" className="text-base font-bold text-white">
          ¿Perdiste tu app autenticadora?
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Usa uno de tus recovery codes para invalidar el factor actual y volver a configurarlo.
        </p>

        <form onSubmit={handleRecovery} className="mt-4 space-y-4">
          {recoveryError && <AdminAlert>{recoveryError}</AdminAlert>}

          <label htmlFor="admin-recovery-code" className="sr-only">
            Código de recuperación
          </label>
          <input
            id="admin-recovery-code"
            type="text"
            autoComplete="off"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH-IJKL"
            required
            className={`${adminInputClass()} text-center font-mono tracking-[0.2em]`}
          />

          <AdminButton
            type="submit"
            variant="secondary"
            disabled={recoveryCode.trim().length < 12}
            pending={recoveryLoading}
          >
            {recoveryLoading ? 'Validando...' : 'Usar código de recuperación'}
          </AdminButton>
        </form>
      </section>
    </AdminAuthShell>
  )
}
