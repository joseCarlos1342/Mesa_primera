'use client'

import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Gamepad2,
  Gift,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
} from 'lucide-react'
import { ListRow, Money, StatusTag, normalizeStatus, type IconType } from './PlayerUI'

/** Movimiento normalizado por `getWalletData` / `getWalletHistory`. */
export interface PlayerTransaction {
  readonly id: string
  readonly type: string
  readonly amount_cents: number | null
  readonly direction?: 'credit' | 'debit' | (string & {}) | null
  readonly balance_after_cents?: number | null
  readonly status: string
  readonly created_at: string
  readonly description?: string | null
  readonly proof_url?: string | null
  readonly observations?: string | null
}

const CREDIT_TYPES = new Set(['deposit', 'refund', 'win', 'bonus'])

export function isCredit(tx: Pick<PlayerTransaction, 'type' | 'direction'>): boolean {
  if (tx.direction === 'credit') return true
  if (tx.direction === 'debit') return false
  return CREDIT_TYPES.has(tx.type)
}

export function transactionLabel(tx: Pick<PlayerTransaction, 'type' | 'direction'>): string {
  switch (tx.type) {
    case 'deposit':
      return 'Carga de saldo'
    case 'withdrawal':
      return 'Retiro'
    case 'refund':
      return 'Reembolso'
    case 'transfer':
      return isCredit(tx) ? 'Transferencia recibida' : 'Transferencia enviada'
    case 'adjustment':
    case 'admin_adjustment':
      return 'Ajuste de saldo'
    case 'bonus':
      return 'Bono'
    case 'win':
      return 'Ganancia en mesa'
    case 'bet':
      return 'Apuesta'
    case 'rake':
      return 'Comisión'
    default:
      return tx.type
  }
}

export function transactionIcon(type: string, credit: boolean): IconType {
  switch (type) {
    case 'deposit':
      return Plus
    case 'withdrawal':
      return ArrowUpRight
    case 'refund':
      return RotateCcw
    case 'transfer':
      return credit ? ArrowDownLeft : ArrowRightLeft
    case 'bonus':
      return Gift
    case 'win':
      return Trophy
    case 'bet':
    case 'rake':
      return Gamepad2
    default:
      return SlidersHorizontal
  }
}

const dateFormat = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
const timeFormat = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })

export function formatTxDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${dateFormat.format(date)} · ${timeFormat.format(date)}`
}

interface TransactionRowProps {
  readonly tx: PlayerTransaction
  readonly onSelect?: (tx: PlayerTransaction) => void
}

/** Fila de movimiento: tipo, fecha, monto con signo y estado si no está completado. */
export function TransactionRow({ tx, onSelect }: TransactionRowProps) {
  const credit = isCredit(tx)
  const status = normalizeStatus(tx.status)
  const label = transactionLabel(tx)
  return (
    <ListRow
      icon={transactionIcon(tx.type, credit)}
      iconTone={status === 'failed' ? 'danger' : credit ? 'credit' : 'debit'}
      title={label}
      meta={<span className="tabular-nums">{formatTxDate(tx.created_at)}</span>}
      trailing={
        <>
          <Money cents={tx.amount_cents} direction={credit ? 'credit' : 'debit'} className="text-lg font-semibold" />
          {status !== 'completed' && <StatusTag status={tx.status} />}
        </>
      }
      onClick={onSelect ? () => onSelect(tx) : undefined}
    />
  )
}
