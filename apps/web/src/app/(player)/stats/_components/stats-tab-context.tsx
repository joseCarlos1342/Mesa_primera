'use client'

import { createContext, useContext } from 'react'

interface StatsTabContextValue {
  activeTab: 'personal' | 'global'
  setActiveTab: (tab: 'personal' | 'global') => void
}

export const StatsTabContext = createContext<StatsTabContextValue>({
  activeTab: 'personal',
  setActiveTab: () => {},
})

export const useStatsTab = () => useContext(StatsTabContext)
