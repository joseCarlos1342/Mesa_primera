'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRightLeft, Check, Search } from 'lucide-react'
import { lookupUserByPhone, transferToPlayer } from '@/app/actions/transfer'
import { formatAmount } from '@/utils/format'
import { AuthAlert, AuthButton, AuthField } from '@/components/auth/AuthForm'
import { PlayerSheet } from '@/components/player/PlayerSheet'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { Money } from '@/components/player/PlayerUI'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
}

type Step = 'search' | 'confirm-recipient' | 'amount' | 'confirm-transfer' | 'result'

interface RecipientInfo {
  id: string
  username: string
  avatar_url: string | null
  level: number
}

const STEP_TEXT: Record<Step, string> = {
  search: 'Buscar destinatario',
  'confirm-recipient': 'Confirmar destinatario',
  amount: 'Ingresar monto',
  'confirm-transfer': 'Revisar y confirmar',
  result: 'Resultado',
}

const STEP_NUMBER: Partial<Record<Step, number>> = { search: 1, 'confirm-recipient': 2, amount: 3, 'confirm-transfer': 4 }

const MIN_TRANSFER_CENTS = 100000

export function TransferModal({ isOpen, onClose, currentBalance }: TransferModalProps) {
  const [step, setStep] = useState<Step>('search')
  const [phone, setPhone] = useState('')
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ success: boolean; referenceId?: string; newBalance?: number } | null>(null)

  const amountCents = Math.round(parseFloat(amountInput || '0') * 100)
  const amountTooLow = amountCents > 0 && amountCents < MIN_TRANSFER_CENTS
  const amountTooHigh = amountCents > currentBalance
  const amountValid = amountCents >= MIN_TRANSFER_CENTS && !amountTooHigh

  function reset() {
    setStep('search')
    setPhone('')
    setRecipient(null)
    setAmountInput('')
    setLoading(false)
    setError('')
    setResult(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function goBack() {
    if (step === 'confirm-recipient') setStep('search')
    else if (step === 'amount') setStep('confirm-recipient')
    else if (step === 'confirm-transfer') setStep('amount')
  }

  async function handleSearch() {
    if (!phone.trim()) return
    setLoading(true)
    setError('')

    const res = await lookupUserByPhone(phone.trim())

    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }

    if (res.user) {
      setRecipient(res.user)
      setStep('confirm-recipient')
    }
    setLoading(false)
  }

  async function handleTransfer() {
    if (!recipient || amountCents < MIN_TRANSFER_CENTS) return
    setLoading(true)
    setError('')

    const res = await transferToPlayer(recipient.id, amountCents)

    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }

    setResult({ success: true, referenceId: res.referenceId, newBalance: res.senderBalanceAfter })
    setStep('result')
    setLoading(false)
  }

  function maskPhone(p: string) {
    if (p.length <= 4) return p
    return p.slice(0, 3) + '•'.repeat(p.length - 6) + p.slice(-3)
  }

  if (!isOpen) return null

  const stepNumber = STEP_NUMBER[step]
  const canGoBack = step !== 'search' && step !== 'result'

  const footer =
    step === 'search' ? (
      <AuthButton onClick={handleSearch} disabled={!phone.trim()} pending={loading} icon={<Search className="h-5 w-5" aria-hidden="true" />}>
        {loading ? 'Buscando…' : 'Buscar jugador'}
      </AuthButton>
    ) : step === 'confirm-recipient' ? (
      <div className="grid grid-cols-2 gap-3">
        <AuthButton
          variant="secondary"
          onClick={() => {
            setRecipient(null)
            setStep('search')
          }}
        >
          Buscar otro
        </AuthButton>
        <AuthButton onClick={() => setStep('amount')} icon={<Check className="h-5 w-5" aria-hidden="true" />}>
          Confirmar
        </AuthButton>
      </div>
    ) : step === 'amount' ? (
      <AuthButton onClick={() => setStep('confirm-transfer')} disabled={!amountValid}>
        Continuar
      </AuthButton>
    ) : step === 'confirm-transfer' ? (
      <div className="grid grid-cols-2 gap-3">
        <AuthButton variant="secondary" onClick={() => setStep('amount')} disabled={loading}>
          Cancelar
        </AuthButton>
        <AuthButton onClick={handleTransfer} pending={loading} icon={<ArrowRightLeft className="h-5 w-5" aria-hidden="true" />}>
          {loading ? 'Enviando…' : 'Confirmar'}
        </AuthButton>
      </div>
    ) : (
      <AuthButton variant="secondary" onClick={handleClose}>
        Cerrar
      </AuthButton>
    )

  return (
    <PlayerSheet
      open={isOpen}
      onClose={handleClose}
      title="Transferir saldo"
      description={stepNumber ? `Paso ${stepNumber} de 4 · ${STEP_TEXT[step]}` : STEP_TEXT[step]}
      closeLabel="Cerrar transferencia"
      footer={footer}
      headerStart={
        canGoBack ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Volver al paso anterior"
            className="-ml-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-[#d9d3bf] transition-colors hover:bg-[#35180f] hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5 pt-1">
        {step === 'search' && (
          <AuthField
            label="Celular del jugador"
            hint="10 dígitos, sin +57."
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            prefix="+57"
            mono
            maxLength={10}
            value={phone}
            data-autofocus
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="3001234567"
          />
        )}

        {step === 'confirm-recipient' && recipient && (
          <>
            <p className="text-lg leading-relaxed text-[#d9d3bf]">Verifica que sea el jugador correcto antes de seguir.</p>
            <div className="flex items-center gap-4 border-y border-[#8b6b2e]/35 py-4">
              <PlayerAvatar avatar={recipient.avatar_url} name={recipient.username} size={64} />
              <div className="min-w-0">
                <p className="truncate font-display text-[1.5rem] font-bold leading-tight text-text-premium">{recipient.username}</p>
                <p className="text-base text-[#bdb7a6]">Nivel {recipient.level}</p>
                <p className="font-mono text-base tabular-nums text-[#d9d3bf]">{maskPhone(phone)}</p>
              </div>
            </div>
          </>
        )}

        {step === 'amount' && (
          <>
            <p className="text-lg text-[#d9d3bf]">
              Tu saldo: <Money cents={currentBalance} className="font-semibold" />
            </p>
            <AuthField
              label="Monto a enviar"
              type="text"
              inputMode="numeric"
              prefix="$"
              mono
              value={amountInput}
              data-autofocus
              onChange={(e) => {
                setAmountInput(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && amountValid && setStep('confirm-transfer')}
              placeholder="0"
              error={amountTooLow ? 'Monto mínimo: $1.000' : amountTooHigh ? 'Excede tu saldo disponible' : null}
              hint="Mínimo $1.000, en pesos y sin puntos."
            />
          </>
        )}

        {step === 'confirm-transfer' && recipient && (
          <>
            <p className="text-lg leading-relaxed text-[#d9d3bf]">Revisa los datos. Una transferencia enviada no se puede deshacer.</p>
            <dl className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
              <SummaryRow label="Para">{recipient.username}</SummaryRow>
              <SummaryRow label="Celular">
                <span className="font-mono tabular-nums">{maskPhone(phone)}</span>
              </SummaryRow>
              <SummaryRow label="Monto">
                <Money cents={amountCents} className="text-[1.5rem] font-semibold" />
              </SummaryRow>
            </dl>
          </>
        )}

        {step === 'result' && result?.success && (
          <div className="py-2 text-center" role="status">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#2ecc71]/50 bg-[#0a2c20] text-[#5fd38d]">
              <Check className="h-8 w-8" aria-hidden="true" />
            </span>
            <p className="font-display text-[1.625rem] font-bold text-text-premium">Transferencia exitosa</p>
            <p className="mt-2 font-mono text-[2.25rem] font-medium tabular-nums text-text-premium">${formatAmount(amountCents)}</p>
            <p className="mt-1 text-lg text-[#d9d3bf]">
              enviados a <strong className="font-semibold text-text-premium">{recipient?.username}</strong>
            </p>
            {result.newBalance !== undefined && (
              <p className="mt-5 border-t border-[#8b6b2e]/35 pt-4 text-lg text-[#d9d3bf]">
                Tu nuevo saldo: <Money cents={result.newBalance} className="font-semibold" />
              </p>
            )}
          </div>
        )}

        {error && <AuthAlert>{error}</AuthAlert>}
      </div>
    </PlayerSheet>
  )
}

function SummaryRow({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="text-base text-[#bdb7a6]">{label}</dt>
      <dd className="min-w-0 truncate text-right text-lg font-semibold text-text-premium">{children}</dd>
    </div>
  )
}
