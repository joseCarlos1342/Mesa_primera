'use client'

import { useState, useEffect } from 'react'
import { X, Search, ArrowRightLeft, Check, ArrowLeft } from 'lucide-react'
import { formatAmount } from '@/utils/format'
import type { Room } from '@colyseus/sdk'
import { AuthAlert, AuthButton, AuthField } from '@/components/auth/AuthForm'
import { PlayerSheet } from '@/components/player/PlayerSheet'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { Money } from '@/components/player/PlayerUI'

interface GameTransferModalProps {
  isOpen: boolean
  onClose: () => void
  room: Room | null
  myChips: number
}

type Step = 'search' | 'confirm-recipient' | 'amount' | 'confirm-transfer' | 'result'

interface RecipientInfo {
  id: string
  username: string
  avatar_url: string | null
  level: number
}

export function GameTransferModal({ isOpen, onClose, room, myChips }: GameTransferModalProps) {
  const [step, setStep] = useState<Step>('search')
  const [phone, setPhone] = useState('')
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ success: boolean; recipientName?: string; amountCents?: number; newBalance?: number; error?: string } | null>(null)

  const amountCents = Math.round(parseFloat(amountInput || '0') * 100)

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

  // Escuchar respuestas del servidor Colyseus
  useEffect(() => {
    if (!room || !isOpen) return

    const handleResult = (data: { success: boolean; recipientName?: string; amountCents?: number; newBalance?: number; error?: string }) => {
      setLoading(false)
      if (data.success) {
        setResult(data)
        setStep('result')
      } else {
        setError(data.error || 'Error en la transferencia')
      }
    }

    const handleLookup = (data: { success: boolean; userId?: string; name?: string; avatar_url?: string | null; error?: string }) => {
      setLoading(false)
      if (data.success && data.userId && data.name) {
        setRecipient({
          id: data.userId,
          username: data.name,
          avatar_url: data.avatar_url ?? null,
          level: 1,
        })
        setStep('confirm-recipient')
      } else {
        setError(data.error || 'Usuario no encontrado')
      }
    }

    room.onMessage('transfer-result', handleResult)
    room.onMessage('lookup-result', handleLookup)

    return () => {
      // Only remove our specific listeners by replacing with no-ops
      room.onMessage('transfer-result', () => {})
      room.onMessage('lookup-result', () => {})
    }
  }, [room, isOpen])

  async function handleSearch() {
    if (!phone.trim() || !room) return
    setLoading(true)
    setError('')

    // Use Colyseus message instead of HTTP server action to avoid cookie/auth issues
    room.send('lookup-player', { phone: phone.trim() })
    // Result arrives via room.onMessage('lookup-result')
  }

  function handleTransfer() {
    if (!room || !recipient || amountCents < MIN_TRANSFER_CENTS) return
    setLoading(true)
    setError('')

    // Enviar mensaje de transferencia al servidor Colyseus
    room.send('transfer', {
      recipientUserId: recipient.id,
      amountCents,
    })
    // El resultado llega por room.onMessage('transfer-result')
  }

  function maskPhone(p: string) {
    if (p.length <= 4) return p
    return p.slice(0, 3) + '•'.repeat(p.length - 6) + p.slice(-3)
  }

  if (!isOpen) return null

  const stepNumber = STEP_NUMBER[step]
  const canGoBack = step !== 'search' && step !== 'result'
  const amountTooLow = amountCents > 0 && amountCents < MIN_TRANSFER_CENTS
  const amountTooHigh = amountCents > myChips
  const amountValid = amountCents >= MIN_TRANSFER_CENTS && !amountTooHigh

  const goBack = () => {
    if (step === 'confirm-recipient') setStep('search')
    else if (step === 'amount') setStep('confirm-recipient')
    else if (step === 'confirm-transfer') setStep('amount')
  }

  const footer =
    step === 'search' ? (
      <AuthButton onClick={handleSearch} disabled={!phone.trim()} pending={loading} icon={!loading ? <Search className="h-5 w-5" aria-hidden="true" /> : undefined}>
        {loading ? 'Buscando…' : 'Buscar jugador'}
      </AuthButton>
    ) : step === 'confirm-recipient' ? (
      <div className="grid grid-cols-2 gap-3">
        <AuthButton variant="secondary" onClick={() => { setRecipient(null); setStep('search'); }}>
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
        <AuthButton onClick={handleTransfer} pending={loading} icon={!loading ? <ArrowRightLeft className="h-5 w-5" aria-hidden="true" /> : undefined}>
          {loading ? 'Enviando…' : 'Confirmar'}
        </AuthButton>
      </div>
    ) : (
      <AuthButton variant="secondary" onClick={handleClose}>
        Volver a la mesa
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
            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
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
                <p className="font-mono text-base tabular-nums text-[#d9d3bf]">{maskPhone(phone)}</p>
              </div>
            </div>
          </>
        )}

        {step === 'amount' && (
          <>
            <p className="text-lg text-[#d9d3bf]">
              Tus fichas: <Money cents={myChips} className="font-semibold" />
            </p>
            <AuthField
              label="Monto a enviar"
              type="text"
              inputMode="numeric"
              prefix="$"
              mono
              value={amountInput}
              data-autofocus
              onChange={(e) => { setAmountInput(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && amountValid && setStep('confirm-transfer')}
              placeholder="0"
              error={amountTooLow ? 'Monto mínimo: $1.000' : amountTooHigh ? 'Excede tus fichas disponibles' : null}
              hint="Mínimo $1.000, en pesos y sin puntos."
            />
          </>
        )}

        {step === 'confirm-transfer' && recipient && (
          <>
            <p className="text-lg leading-relaxed text-[#d9d3bf]">Revisa los datos. Una transferencia enviada no se puede deshacer.</p>
            <dl className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
              <div className="flex items-baseline justify-between gap-4 py-3.5">
                <dt className="text-base text-[#bdb7a6]">Para</dt>
                <dd className="min-w-0 truncate text-right text-lg font-semibold text-text-premium">{recipient.username}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3.5">
                <dt className="text-base text-[#bdb7a6]">Monto</dt>
                <dd><Money cents={amountCents} className="text-[1.5rem] font-semibold" /></dd>
              </div>
            </dl>
          </>
        )}

        {step === 'result' && result && (
          <div className="py-2 text-center" role="status">
            {result.success ? (
              <>
                <span aria-hidden="true" className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#2ecc71]/50 bg-[#0a2c20] text-[#5fd38d]">
                  <Check className="h-8 w-8" />
                </span>
                <p className="font-display text-[1.625rem] font-bold text-text-premium">Transferencia exitosa</p>
                <p className="mt-2 font-mono text-[2.25rem] font-medium tabular-nums text-text-premium">${formatAmount(result.amountCents || 0)}</p>
                <p className="mt-1 text-lg text-[#d9d3bf]">
                  enviados a <strong className="font-semibold text-text-premium">{result.recipientName}</strong>
                </p>
                {result.newBalance !== undefined && (
                  <p className="mt-5 border-t border-[#8b6b2e]/35 pt-4 text-lg text-[#d9d3bf]">
                    Fichas restantes: <Money cents={result.newBalance} className="font-semibold" />
                  </p>
                )}
              </>
            ) : (
              <>
                <span aria-hidden="true" className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#e74c3c]/60 bg-[#2a0f0c] text-[#f08a7e]">
                  <X className="h-8 w-8" />
                </span>
                <p className="font-display text-[1.625rem] font-bold text-text-premium">No se pudo transferir</p>
                <p className="mt-2 text-lg text-[#d9d3bf]">{result.error}</p>
              </>
            )}
          </div>
        )}

        {error && <AuthAlert>{error}</AuthAlert>}
      </div>
    </PlayerSheet>
  )
}

const MIN_TRANSFER_CENTS = 100000

const STEP_TEXT: Record<Step, string> = {
  search: 'Buscar jugador',
  'confirm-recipient': 'Confirmar destinatario',
  amount: 'Ingresar monto',
  'confirm-transfer': 'Revisar y confirmar',
  result: 'Resultado',
}

const STEP_NUMBER: Partial<Record<Step, number>> = { search: 1, 'confirm-recipient': 2, amount: 3, 'confirm-transfer': 4 }
