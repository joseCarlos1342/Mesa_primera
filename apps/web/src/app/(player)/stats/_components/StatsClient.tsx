'use client'

import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'
import { StatsDashboard } from './stats-dashboard'
import { Leaderboard } from './Leaderboard'
import { useStatsTab } from './stats-tab-context'
import { getLeaderboard, type PlayerStats, type LeaderboardEntry } from '@/app/actions/stats'
import { type BonusStatus } from '@/app/actions/bonus'

interface StatsClientProps {
  initialStats: PlayerStats | null
  initialLeaderboard: LeaderboardEntry[]
  initialBonusStatus: BonusStatus | null
}

export function StatsClient({ initialStats, initialLeaderboard, initialBonusStatus }: StatsClientProps) {
  const { activeTab } = useStatsTab()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard)
  const [leaderboardCategory, setLeaderboardCategory] = useState<'total_ganadas' | 'top_ganadores' | 'mejor_racha' | 'maestro_primera'>('total_ganadas')
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
    return () => { cancelled = true }
  }, [leaderboardCategory, initialLeaderboard])

  return (
    <AnimatePresence mode="wait">
      {activeTab === 'personal' ? (
        <m.div
          key="personal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          {initialStats ? (
            <StatsDashboard stats={initialStats} bonusStatus={initialBonusStatus} />
          ) : (
            <div className="text-center py-20 bg-black/40 border-2 border-dashed border-white/5 rounded-[3rem] px-8">
               <Star className="w-12 h-12 text-text-secondary opacity-20 mx-auto mb-4" />
               <h2 className="text-xl font-display font-black text-text-premium uppercase italic mb-2">Sin actividad registrada</h2>
               <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest max-w-xs mx-auto">
                 Aún no has participado en ninguna mesa oficial. ¡Empieza a jugar para ver tus estadísticas aquí!
               </p>
            </div>
          )}
        </m.div>
      ) : (
        <m.div
          key="global"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Leaderboard Categories */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { id: 'total_ganadas', label: 'Partidas' },
              { id: 'top_ganadores', label: 'Ganancias' },
              { id: 'mejor_racha', label: 'Rachas' },
              { id: 'maestro_primera', label: 'Especiales' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setLeaderboardCategory(cat.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  leaderboardCategory === cat.id 
                    ? 'bg-white/10 text-white shadow-xl border border-white/10' 
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {isSwitching ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin" />
            </div>
          ) : (
            <Leaderboard entries={leaderboard} category={leaderboardCategory} />
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
