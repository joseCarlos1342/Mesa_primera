import { getMyStats, getLeaderboard } from '@/app/actions/stats'
import { getBonusStatus } from '@/app/actions/bonus'
import { Skeleton } from '@/components/player/PlayerUI'

/** Async server component that fetches data and passes it down. */
export async function StatsData() {
  const [stats, leaderboard, bonusStatus] = await Promise.all([
    getMyStats(),
    getLeaderboard('total_ganadas'),
    getBonusStatus(),
  ])

  const { StatsClient } = await import('./_components/StatsClient')
  return <StatsClient initialStats={stats} initialLeaderboard={leaderboard} initialBonusStatus={bonusStatus} />
}

export function StatsLoadingSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Cargando estadísticas">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}
