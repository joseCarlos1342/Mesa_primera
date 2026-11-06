'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestWithdrawal } from '@/app/actions/withdrawals'
import { AuthAlert, AuthButton, AuthField } from '@/components/auth/AuthForm'
import { PageHeader, Section, TextareaField } from '@/components/player/PlayerUI'

const WITHDRAW_RULES = [
  'Los retiros se procesan en un plazo de 1 a 12 horas hábiles.',
  'La cuenta debe estar a tu nombre.',
  'Por seguridad, no se realizan transferencias a terceros.',
] as const

const BLOCKED_KEYS = ['.', ',', 'e', 'E', '+', '-']

export default function WithdrawPage() {
  const [amount, setAmount] = useState('')
  const [bankDetails, setBankDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !bankDetails) return

    setLoading(true)
    setError(null)
    try {
      const { error: actionError } = await requestWithdrawal(Number(amount), bankDetails)
      if (actionError) throw new Error(actionError)

      router.push('/wallet')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar la solicitud. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: '/wallet', label: 'Billetera' }}
        title="Retirar saldo"
        lead="Pide el retiro y lo enviamos a tu cuenta cuando el equipo lo revise."
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <form onSubmit={handleWithdraw} className="min-w-0 max-w-xl space-y-7">
          {error && <AuthAlert>{error}</AuthAlert>}
          <AuthField
            label="Monto a retirar"
            hint="En pesos, sin puntos ni comas. Mínimo $10.000."
            type="number"
            inputMode="numeric"
            prefix="$"
            mono
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (BLOCKED_KEYS.includes(e.key)) e.preventDefault()
            }}
            placeholder="0"
            required
            min={10000}
            step={1000}
          />
          <TextareaField
            label="Cuenta donde recibes el dinero"
            hint="Escribe la entidad, el número y el titular."
            value={bankDetails}
            onChange={(e) => setBankDetails(e.target.value)}
            placeholder="Ej.: Nequi 3001234567, a nombre de Ana Pérez"
            required
          />
          <AuthButton type="submit" pending={loading}>
            {loading ? 'Enviando…' : 'Confirmar retiro'}
          </AuthButton>
        </form>

        <Section id="retiro-reglas" title="Antes de retirar" className="min-w-0">
          <ul className="divide-y divide-[#8b6b2e]/30">
            {WITHDRAW_RULES.map((rule) => (
              <li key={rule} className="py-4 text-lg leading-relaxed text-[#d9d3bf]">
                {rule}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}
