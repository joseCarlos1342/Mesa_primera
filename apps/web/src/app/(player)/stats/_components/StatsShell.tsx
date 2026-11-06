'use client'

import { useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/player/PlayerUI'
import { StatsTabs } from './StatsTabs'
import { StatsTabContext } from './stats-tab-context'

export function StatsShell({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal')

  return (
    <StatsTabContext.Provider value={{ activeTab, setActiveTab }}>
      <PageHeader title="Estadísticas" lead="Tus números en las mesas y el ranking de jugadores." />
      <StatsTabs activeTab={activeTab} onChange={setActiveTab} />

      <div id="stats-panel" role="tabpanel" aria-labelledby={`stats-tab-${activeTab}`} className="min-h-[24rem]">
        {children}
      </div>

      <p className="mt-12 border-t border-[#8b6b2e]/35 pt-5 text-base text-[#bdb7a6]">
        Los datos se actualizan al terminar cada ronda.
      </p>
    </StatsTabContext.Provider>
  )
}
