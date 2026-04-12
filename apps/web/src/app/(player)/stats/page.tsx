import { getMyStats, getLeaderboard } from '@/app/actions/stats'
import { StatsClient } from './_components/StatsClient'

export default async function StatsPage() {
  const [stats, leaderboard] = await Promise.all([
    getMyStats(),
    getLeaderboard('total_ganadas')
  ])

  return (
    <div className="min-h-full py-12 px-6 max-w-4xl mx-auto space-y-10">
      <StatsClient initialStats={stats} initialLeaderboard={leaderboard} />
    </div>
  )
}
