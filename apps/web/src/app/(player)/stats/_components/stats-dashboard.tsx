"use client";

import { m } from "framer-motion";
import { Trophy, Target, TrendingUp, Flame, Star, Crown } from "lucide-react";

interface PlayerStats {
  games_played: number;
  games_won: number;
  current_streak: number;
  best_streak: number;
  primeras_count: number;
  chivos_count: number;
  segundas_count: number;
  total_won_cents: number;
  total_lost_cents: number;
  total_rake_paid_cents: number;
}

export function StatsDashboard({ stats }: { stats: PlayerStats }) {
  const winRate = stats.games_played > 0 
    ? Math.round((stats.games_won / stats.games_played) * 100) 
    : 0;

  const netBalance = (Number(stats.total_won_cents || 0) - Number(stats.total_lost_cents || 0) - Number(stats.total_rake_paid_cents || 0)) / 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatHero 
          title="Partidas Jugadas" 
          value={stats.games_played} 
          icon={Target} 
          color="from-blue-500/20 to-blue-600/5"
          borderColor="border-blue-500/30"
          iconColor="text-blue-400"
        />
        <StatHero 
          title="Juegos Ganados" 
          value={stats.games_won} 
          sub={`${winRate}% Win Rate`}
          icon={Trophy} 
          color="from-emerald-500/20 to-emerald-600/5"
          borderColor="border-emerald-500/30"
          iconColor="text-emerald-400"
        />
        <StatHero 
          title="Racha Actual" 
          value={stats.current_streak} 
          sub={`Mejor racha: ${stats.best_streak}`}
          icon={Flame} 
          color="from-orange-500/20 to-orange-600/5"
          borderColor="border-orange-500/30"
          iconColor="text-orange-400"
        />
        <StatHero 
          title="Ganancia Neta" 
          value={`$${netBalance.toLocaleString()}`} 
          sub={netBalance >= 0 ? "Bóveda en Positivo" : "Bóveda en Negativo"}
          icon={TrendingUp} 
          color={netBalance >= 0 ? "from-brand-gold/20 to-brand-gold/5" : "from-red-500/20 to-red-600/5"}
          borderColor={netBalance >= 0 ? "border-brand-gold/30" : "border-red-500/30"}
          iconColor={netBalance >= 0 ? "text-brand-gold" : "text-red-400"}
        />
      </div>

      {/* Special Plays / Cantos Section */}
      <section className="bg-black/40 backdrop-blur-xl border-2 border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute inset-0 bg-felt-texture opacity-10 pointer-events-none" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-gold/10 rounded-xl flex items-center justify-center border border-brand-gold/20">
              <Star className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-text-premium uppercase tracking-tight italic">Cantos Especiales</h2>
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Tu desempeño técnico en mesa</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SpecialStat label="Primeras" count={stats.primeras_count} color="text-brand-gold" bgColor="bg-brand-gold/10" description="La racha perfecta" />
            <SpecialStat label="Chivos" count={stats.chivos_count} color="text-orange-400" bgColor="bg-orange-400/10" description="Doblada de apuesta" />
            <SpecialStat label="Segundas" count={stats.segundas_count} color="text-brand-red" bgColor="bg-brand-red/10" description="Asegurando el punto" />
          </div>
        </div>
      </section>

      {/* Player Level / Rank Progress */}
      <section className="bg-gradient-to-br from-indigo-600/15 via-black/40 to-black/60 backdrop-blur-xl border-2 border-indigo-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0 w-24 h-24 rounded-3xl bg-indigo-600/20 border-2 border-indigo-500/40 flex flex-col items-center justify-center shadow-2xl transition-transform group-hover:scale-110 duration-500">
            <Crown className="w-8 h-8 text-indigo-400 mb-1" />
            <span className="text-xl font-display font-black text-white">NIV. 4</span>
          </div>
          
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-lg font-display font-black text-text-premium uppercase tracking-tighter italic">Rango: Veterano de Bóveda</h2>
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Próximo: Gran Maestro</p>
              </div>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">650 / 1000 XP</span>
            </div>
            
            <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 p-1">
              <m.div 
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-shimmer" />
              </m.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatHero({ title, value, sub, icon: Icon, color, borderColor, iconColor }: any) {
  return (
    <m.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative overflow-hidden bg-gradient-to-br ${color} backdrop-blur-xl border-2 ${borderColor} p-6 h-40 rounded-[2.5rem] flex flex-col justify-center gap-1 group transition-all duration-500 shadow-xl`}
    >
      <div className="absolute top-4 right-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
        <Icon className={`w-16 h-16 ${iconColor}`} />
      </div>
      
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">{title}</p>
      <div className="flex flex-col">
        <p className="text-4xl font-display font-black text-white italic tracking-tighter drop-shadow-lg">{value}</p>
        {sub && <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{sub}</span>}
      </div>
    </m.div>
  );
}

function SpecialStat({ label, count, color, bgColor, description }: any) {
  return (
    <div className={`p-6 ${bgColor} rounded-[2rem] border border-white/5 flex flex-col items-center text-center gap-2 group hover:border-brand-gold/20 transition-all active:scale-95`}>
      <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${color}`}>{label}</span>
      <span className="text-3xl font-display font-black text-white italic">{count}</span>
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{description}</p>
    </div>
  );
}
