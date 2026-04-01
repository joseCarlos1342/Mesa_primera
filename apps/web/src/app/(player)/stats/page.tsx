'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Crown } from 'lucide-react'
import { StatsTabs } from './_components/StatsTabs'
import { StatsDashboard } from './_components/stats-dashboard'
import { Leaderboard } from './_components/Leaderboard'
import { getMyStats, getLeaderboard, PlayerStats, LeaderboardEntry } from '@/app/actions/stats'

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal')
  const [personalStats, setPersonalStats] = useState<PlayerStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardCategory, setLeaderboardCategory] = useState<'total_ganadas' | 'top_ganadores' | 'mejor_racha' | 'maestro_primera'>('total_ganadas')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [stats, ranking] = await Promise.all([
          getMyStats(),
          getLeaderboard(leaderboardCategory)
        ])
        setPersonalStats(stats)
        setLeaderboard(ranking)
      } catch (error) {
        console.error("Error loading stats data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [leaderboardCategory])

  return (
    <div className="min-h-full py-12 px-6 max-w-4xl mx-auto space-y-10">
      {/* Header Section */}
      <header className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full"
        >
          <Crown className="w-4 h-4 text-brand-gold" />
          <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Salón de la Fama</span>
        </motion.div>
        
        <div className="space-y-1">
          <h1 className="text-4xl md:text-6xl font-display font-black italic text-white uppercase tracking-tighter leading-none break-words">
            Estadísticas
          </h1>
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] opacity-60">
            Mesa Primera • Elite Club
          </p>
        </div>
      </header>

      {/* Tab Switcher */}
      <StatsTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Content Area */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 py-20"
            >
              <div className="w-12 h-12 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin shadow-[0_0_15px_rgba(202,171,114,0.2)]" />
              <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] animate-pulse">Sincronizando Bóveda...</p>
            </motion.div>
          ) : activeTab === 'personal' ? (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {personalStats ? (
                <StatsDashboard stats={personalStats} />
              ) : (
                <div className="text-center py-20 bg-black/40 border-2 border-dashed border-white/5 rounded-[3rem] px-8">
                   <Star className="w-12 h-12 text-text-secondary opacity-20 mx-auto mb-4" />
                   <h3 className="text-xl font-display font-black text-text-premium uppercase italic mb-2">Sin actividad registrada</h3>
                   <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest max-w-xs mx-auto opacity-60">
                     Aún no has participado en ninguna mesa oficial. ¡Empieza a jugar para ver tus estadísticas aquí!
                   </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
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
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      leaderboardCategory === cat.id 
                        ? 'bg-white/10 text-white shadow-xl border border-white/10' 
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <Leaderboard entries={leaderboard} category={leaderboardCategory} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <footer className="text-center pt-10">
        <p className="text-[9px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-30">
          Los datos se actualizan en tiempo real al finalizar cada ronda
        </p>
      </footer>
    </div>
  )
}
