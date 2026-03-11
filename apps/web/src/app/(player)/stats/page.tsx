'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Trophy, Zap, Target, Award } from 'lucide-react'

export default function StatsPage() {
  const stats = [
    { label: 'Partidas Jugadas', value: '128', icon: Target, color: 'text-blue-400' },
    { label: 'Partidas Ganadas', value: '42', icon: Trophy, color: 'text-emerald-400' },
    { label: 'Racha Actual', value: '3', icon: Zap, color: 'text-amber-400' },
    { label: 'Total Ganado', value: '$1.2M', icon: TrendingUp, color: 'text-indigo-400' },
  ]

  return (
    <div className="min-h-full py-12 px-6 max-w-lg mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2">
        <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">Estadísticas</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Tu rendimiento en Mesa Primera</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] flex items-center justify-between"
          >
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl bg-white/5 ${stat.color}`}>
                <stat.icon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                <p className="text-3xl font-black text-white italic">{stat.value}</p>
              </div>
            </div>
            <Award className="w-6 h-6 text-slate-800" />
          </motion.div>
        ))}
      </div>

      <section className="bg-gradient-to-br from-indigo-600/10 to-transparent p-8 rounded-[2rem] border border-indigo-500/20 text-center space-y-4">
        <h3 className="text-lg font-black uppercase tracking-tighter text-indigo-300">Nivel de Jugador</h3>
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '65%' }}
            className="h-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">65% para el siguiente nivel</p>
      </section>
    </div>
  )
}
