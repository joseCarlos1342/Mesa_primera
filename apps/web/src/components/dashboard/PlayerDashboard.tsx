'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, BarChart3, Play, Plus, ReceiptText } from 'lucide-react'
import { getWalletData } from '@/app/actions/wallet'
import type { PlayerStats } from '@/app/actions/stats'
import { TransactionModal } from '../wallet/TransactionModal'
import { BalancePanel } from '../player/BalancePanel'
import { EmptyState, RowList, Section, Skeleton, playerButton, playerTextLink } from '../player/PlayerUI'
import { TransactionRow, type PlayerTransaction } from '../player/transactions'

interface WalletSnapshot {
  readonly wallet: { readonly balance_cents?: number | null } | null
  readonly transactions: readonly PlayerTransaction[]
}

interface PlayerDashboardProps {
  readonly initialData?: WalletSnapshot | null
  readonly stats?: Pick<PlayerStats, 'games_played' | 'games_won' | 'current_streak'> | null
}

export function PlayerDashboard({ initialData, stats }: PlayerDashboardProps) {
  const [data, setData] = useState<WalletSnapshot | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [selectedTx, setSelectedTx] = useState<PlayerTransaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (initialData) return
    getWalletData().then((res) => {
      setData('error' in res ? null : (res as WalletSnapshot))
      setLoading(false)
    })
  }, [initialData])

  const handleTxClick = (tx: PlayerTransaction) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  const balance = data?.wallet?.balance_cents ?? 0
  const recent = (data?.transactions ?? []).slice(0, 3)

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
      <div className="min-w-0 space-y-10">
        <h1 className="sr-only">Inicio</h1>
        <BalancePanel cents={balance}>
          <Link href="/lobby" className={`${playerButton.primary} w-full`}>
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            Jugar ahora
          </Link>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link href="/wallet/deposit" className={`${playerButton.secondary} whitespace-nowrap bg-[#0a0a0a]/35 px-2 text-base sm:text-lg`}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Cargar saldo
            </Link>
            <Link href="/wallet/withdraw" className={`${playerButton.secondary} whitespace-nowrap bg-[#0a0a0a]/35 px-2 text-base sm:text-lg`}>
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              Retirar
            </Link>
          </div>
        </BalancePanel>

        <Section
          id="inicio-juego"
          title="Tu juego"
          aside={
            <Link href="/stats" className={playerTextLink}>
              Estadísticas
            </Link>
          }
        >
          {stats ? (
            <dl className="mt-4 grid grid-cols-3 divide-x divide-[#8b6b2e]/35">
              <StatCell label="Partidas" value={stats.games_played} />
              <StatCell label="Ganadas" value={stats.games_won} />
              <StatCell label="Racha" value={stats.current_streak} />
            </dl>
          ) : (
            <Link
              href="/stats"
              className="mt-4 flex min-h-14 items-center gap-3 rounded-lg text-lg text-[#d9d3bf] transition-colors hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            >
              <BarChart3 className="h-6 w-6 text-[#c5a059]" aria-hidden="true" />
              Juega tu primera partida y aquí verás tus números.
            </Link>
          )}
        </Section>
      </div>

      <Section
        id="inicio-movimientos"
        title="Últimos movimientos"
        aside={
          <Link href="/wallet/history" className={playerTextLink}>
            Ver todo
          </Link>
        }
      >
        {loading ? (
          <div className="mt-2 space-y-5 py-3" data-testid="dashboard-loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-11 w-11" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : recent.length > 0 ? (
          <RowList label="Últimos movimientos">
            {recent.map((tx) => (
              <li key={tx.id}>
                <TransactionRow tx={tx} onSelect={handleTxClick} />
              </li>
            ))}
          </RowList>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="Aún no tienes movimientos"
            text="Cuando cargues saldo o juegues una mesa, lo verás aquí."
            action={
              <Link href="/wallet/deposit" className={`${playerButton.secondary} w-full`}>
                Cargar saldo
              </Link>
            }
          />
        )}
      </Section>

      <TransactionModal transaction={selectedTx} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

function StatCell({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="px-3 py-1 text-center first:pl-0 last:pr-0">
      <dt className="text-base text-[#bdb7a6]">{label}</dt>
      <dd className="mt-1 font-mono text-[1.75rem] font-medium leading-none text-text-premium tabular-nums">{value}</dd>
    </div>
  )
}
