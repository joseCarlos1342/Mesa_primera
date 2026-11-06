'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ReceiptText } from 'lucide-react'
import { TransactionModal } from '@/components/wallet/TransactionModal'
import { EmptyState, RowList, playerButton } from '@/components/player/PlayerUI'
import { TransactionRow, type PlayerTransaction } from '@/components/player/transactions'

type Filter = 'all' | 'deposit' | 'withdrawal' | 'transfer' | 'other'

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'deposit', label: 'Cargas' },
  { value: 'withdrawal', label: 'Retiros' },
  { value: 'transfer', label: 'Transferencias' },
  { value: 'other', label: 'Otros' },
]

function matches(tx: PlayerTransaction, filter: Filter) {
  if (filter === 'all') return true
  if (filter === 'other') return !['deposit', 'withdrawal', 'transfer'].includes(tx.type)
  return tx.type === filter
}

const monthFormat = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })

function monthKey(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : monthFormat.format(date)
}

/** Historial completo con filtro por tipo y agrupado por mes. */
export function HistoryList({ transactions }: { transactions: readonly PlayerTransaction[] }) {
  const [selectedTx, setSelectedTx] = useState<PlayerTransaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const groups = useMemo(() => {
    const map = new Map<string, PlayerTransaction[]>()
    for (const tx of transactions) {
      if (!matches(tx, filter)) continue
      const key = monthKey(tx.created_at)
      map.set(key, [...(map.get(key) ?? []), tx])
    }
    return Array.from(map.entries())
  }, [transactions, filter])

  const handleTxClick = (tx: PlayerTransaction) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Aún no tienes movimientos"
        text="Tus cargas, retiros y transferencias aparecerán aquí."
        action={
          <Link href="/wallet/deposit" className={`${playerButton.secondary} w-full`}>
            Cargar saldo
          </Link>
        }
      />
    )
  }

  return (
    <>
      <div role="group" aria-label="Filtrar movimientos" className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map(({ value, label }) => {
          const active = filter === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(value)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
                active
                  ? 'border-brand-gold bg-[#0a2c20] text-brand-gold-light'
                  : 'border-[#8b6b2e]/60 text-[#d9d3bf] hover:border-brand-gold hover:text-text-premium'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-lg text-[#bdb7a6]" role="status">
          No hay movimientos de este tipo.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map(([month, items]) => (
            <section key={month} aria-label={month}>
              <h2 className="border-b border-[#8b6b2e]/45 pb-2 font-display text-[1.375rem] font-bold text-text-premium first-letter:uppercase">
                {month}
              </h2>
              <RowList>
                {items.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow tx={tx} onSelect={handleTxClick} />
                  </li>
                ))}
              </RowList>
            </section>
          ))}
        </div>
      )}

      <TransactionModal transaction={selectedTx} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
