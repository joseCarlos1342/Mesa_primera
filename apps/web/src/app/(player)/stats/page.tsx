import { Suspense } from 'react'
import { getMyStats, getLeaderboard } from '@/app/actions/stats'
import { getBonusStatus } from '@/app/actions/bonus'
import { StatsShell } from './_components/StatsShell'

/** Async server component that fetches data and passes it down */
async function StatsData() {
  const [stats, leaderboard, bonusStatus] = await Promise.all([
    getMyStats(),
    getLeaderboard('total_ganadas'),
    getBonusStatus()
  ])

  // Dynamically import the heavy client component only after data is ready
  const { StatsClient } = await import('./_components/StatsClient')
  return <StatsClient initialStats={stats} initialLeaderboard={leaderboard} initialBonusStatus={bonusStatus} />
}

function StatsLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-40 rounded-[2.5rem] bg-white/5 border-2 border-white/5" />
        ))}
      </div>
      <div className="h-60 rounded-[2.5rem] bg-white/5 border-2 border-white/5" />
      <div className="h-40 rounded-[2.5rem] bg-white/5 border-2 border-white/5" />
    </div>
  )
}

export default function StatsPage() {
  return (
    <div className="min-h-full py-12 px-6 max-w-4xl mx-auto space-y-10">
      <StatsShell>
        <Suspense fallback={<StatsLoadingSkeleton />}>
          <StatsData />
        </Suspense>
      </StatsShell>
    </div>
  )
}
