import { Suspense } from 'react'
import { StatsShell } from './_components/StatsShell'
import { StatsData, StatsLoadingSkeleton } from './stats-data'

export default function StatsPage() {
  return (
    <StatsShell>
      <Suspense fallback={<StatsLoadingSkeleton />}>
        <StatsData />
      </Suspense>
    </StatsShell>
  )
}
