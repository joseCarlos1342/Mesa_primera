import { Suspense } from 'react'
import { StatsShell } from './_components/StatsShell'
import { StatsData, StatsLoadingSkeleton } from './stats-data'

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
