'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { StatsDashboard } from './stats-dashboard'
import { Leaderboard } from './Leaderboard'
import { useStatsTab } from './stats-tab-context'
import { getLeaderboard, type PlayerStats, type LeaderboardEntry } from '@/app/actions/stats'
import { type BonusStatus } from '@/app/actions/bonus'
import { EmptyState, Skeleton, playerButton } from '@/components/player/PlayerUI'

type LeaderboardCategory = 'total_ganadas' | 'mejor_racha' | 'maestro_primera'

const CATEGORIES: ReadonlyArray<{ id: LeaderboardCategory; label: string }> = [
  { id: 'total_ganadas', label: 'Partidas' },
  { id: 'mejor_racha', label: 'Rachas' },
  { id: 'maestro_primera', label: 'Especiales' },
]

interface StatsClientProps {
  initialStats: PlayerStats | null
  initialLeaderboard: LeaderboardEntry[]
  initialBonusStatus: BonusStatus | null
}

export function StatsClient({ initialStats, initialLeaderboard, initialBonusStatus }: StatsClientProps) {
  const { activeTab } = useStatsTab()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard)
  const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('total_ganadas')
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    if (leaderboardCategory === 'total_ganadas') {
      setLeaderboard(initialLeaderboard)
      return
    }
    let cancelled = false
    setIsSwitching(true)
    getLeaderboard(leaderboardCategory).then((data) => {
      if (!cancelled) {
        setLeaderboard(data)
        setIsSwitching(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [leaderboardCategory, initialLeaderboard])

  if (activeTab === 'personal') {
    return initialStats ? (
      <StatsDashboard stats={initialStats} bonusStatus={initialBonusStatus} />
    ) : (
      <EmptyState
        icon={BarChart3}
        title="Sin actividad registrada"
        text="Aún no has participado en ninguna mesa. Juega tu primera partida y aquí verás tus números."
        action={
          <Link href="/lobby" className={`${playerButton.primary} w-full`}>
            Ver mesas
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Clasificar ranking por" className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const active = leaderboardCategory === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onClick={() => setLeaderboardCategory(cat.id)}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
                active
                  ? 'border-brand-gold bg-[#0a2c20] text-brand-gold-light'
                  : 'border-[#8b6b2e]/60 text-[#d9d3bf] hover:border-brand-gold hover:text-text-premium'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {isSwitching ? (
        <div className="space-y-4" aria-busy="true" aria-label="Cargando ranking">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <Leaderboard entries={leaderboard} category={leaderboardCategory} currentUserId={initialStats?.user_id} />
      )}
    </div>
  )
}
