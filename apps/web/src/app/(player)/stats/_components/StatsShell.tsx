'use client'

import { useState, type ReactNode } from 'react'
import { m } from 'framer-motion'
import { Crown } from 'lucide-react'
import { StatsTabs } from './StatsTabs'
import { StatsTabContext } from './stats-tab-context'

export function StatsShell({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal')

  return (
    <StatsTabContext.Provider value={{ activeTab, setActiveTab }}>
      {/* Header Section — renders instantly (no data dependency) */}
      <header className="text-center space-y-4">
        <m.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full"
        >
          <Crown className="w-4 h-4 text-brand-gold" />
          <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Salón de la Fama</span>
        </m.div>
        
        <div className="space-y-1">
          <h1 className="text-4xl md:text-6xl font-display font-black italic text-white uppercase tracking-tighter leading-none break-words">
            Estadísticas
          </h1>
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em]">
            Primera Riverada • Elite Club
          </p>
        </div>
      </header>

      {/* Tab Switcher — renders instantly */}
      <StatsTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Content Area — streamed via Suspense */}
      <div className="relative min-h-[400px]">
        {children}
      </div>

      {/* Footer */}
      <footer className="text-center pt-10">
        <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em]">
          Los datos se actualizan en tiempo real al finalizar cada ronda
        </p>
      </footer>
    </StatsTabContext.Provider>
  )
}
