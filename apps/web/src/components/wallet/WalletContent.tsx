'use client';

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRightLeft, ArrowUpRight, Plus, ReceiptText } from 'lucide-react'
import { TransactionModal } from './TransactionModal'
import { TransferModal } from './TransferModal'
import { BalancePanel } from '@/components/player/BalancePanel'
import { EmptyState, PageHeader, RowList, Section, playerButton, playerTextLink } from '@/components/player/PlayerUI'
import { TransactionRow, type PlayerTransaction } from '@/components/player/transactions'

interface WalletContentProps {
  wallet: { balance_cents?: number | null } | null;
  transactions: readonly PlayerTransaction[];
}

/** Montos rápidos de carga en pesos. */
export const QUICK_AMOUNTS = [50000, 100000, 200000, 500000] as const

export function WalletContent({ wallet, transactions }: WalletContentProps) {
  const router = useRouter()
  const [selectedTx, setSelectedTx] = useState<PlayerTransaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  const balance = wallet?.balance_cents ?? 0

  const handleTxClick = (tx: PlayerTransaction) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  const closeTransfer = () => {
    setShowTransfer(false)
    router.refresh()
  }

  return (
    <>
      <PageHeader title="Billetera" lead="Carga saldo con Nequi, retíralo a tu cuenta o pásalo a otro jugador." />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
        <div className="min-w-0 space-y-10">
          <BalancePanel cents={balance}>
            <Link href="/wallet/deposit" className={`${playerButton.primary} w-full`}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Cargar saldo
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link href="/wallet/withdraw" className={`${playerButton.secondary} whitespace-nowrap bg-[#0a0a0a]/35 px-2 text-base sm:text-lg`}>
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                Retirar
              </Link>
              <button
                type="button"
                onClick={() => setShowTransfer(true)}
                className={`${playerButton.secondary} whitespace-nowrap bg-[#0a0a0a]/35 px-2 text-base sm:text-lg`}
              >
                <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
                Transferir
              </button>
            </div>
          </BalancePanel>

          <Section id="billetera-montos" title="Carga rápida">
            <p className="mt-3 text-base text-[#bdb7a6]">Elige un monto y sube el comprobante de Nequi.</p>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {QUICK_AMOUNTS.map((amount) => (
                <li key={amount}>
                  <Link
                    href={`/wallet/deposit?amount=${amount}`}
                    aria-label={`Cargar $${amount.toLocaleString('es-CO')}`}
                    className="flex min-h-[4.5rem] items-center justify-center rounded-lg border border-[#8b6b2e]/70 bg-[#120806] font-mono text-xl font-medium tabular-nums text-text-premium transition-colors duration-200 hover:border-brand-gold hover:bg-[#1b0d08] hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
                  >
                    <span className="mr-0.5 text-[#c5a059]">$</span>
                    {amount.toLocaleString('es-CO')}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/wallet/deposit" className={`${playerTextLink} mt-3`}>
              Otro monto
            </Link>
          </Section>
        </div>

        <Section
          id="billetera-movimientos"
          title="Movimientos"
          aside={
            <Link href="/wallet/history" className={playerTextLink}>
              Ver todo
            </Link>
          }
        >
          {transactions.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="Aún no tienes movimientos"
              text="Tus cargas, retiros y transferencias aparecerán aquí."
            />
          ) : (
            <RowList label="Movimientos recientes">
              {transactions.map((tx) => (
                <li key={tx.id}>
                  <TransactionRow tx={tx} onSelect={handleTxClick} />
                </li>
              ))}
            </RowList>
          )}
        </Section>
      </div>

      <TransactionModal transaction={selectedTx} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <TransferModal isOpen={showTransfer} onClose={closeTransfer} currentBalance={balance} />
    </>
  )
}
