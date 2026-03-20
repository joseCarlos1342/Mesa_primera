"use client";

import { motion } from "framer-motion";
import { Trophy, Medal, Target, TrendingUp, User } from "lucide-react";
import Image from "next/image";

interface LeaderboardProps {
  entries: any[];
  category: string;
}

export function Leaderboard({ entries, category }: LeaderboardProps) {
  const getCategoryIcon = () => {
    switch (category) {
      case 'top_ganadores': return TrendingUp;
      case 'mejor_racha': return Medal;
      case 'maestro_primera': return Target;
      default: return Trophy;
    }
  };

  const Icon = getCategoryIcon();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {entries.length === 0 ? (
        <div className="text-center py-20 bg-black/40 border-2 border-dashed border-white/5 rounded-[2.5rem]">
          <Trophy className="w-12 h-12 text-text-secondary opacity-20 mx-auto mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-60 italic">Buscando leyendas...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`group relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/5 p-4 rounded-3xl flex items-center justify-between transition-all hover:bg-black/60 hover:border-brand-gold/20 shadow-xl ${
                idx === 0 ? 'border-brand-gold/40 bg-brand-gold/5 shadow-[0_15px_30px_rgba(202,171,114,0.1)]' : ''
              }`}
            >
              {idx === 0 && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              )}

              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Rank Badge */}
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-xs italic border-2 transition-all duration-500 group-hover:scale-110 ${
                  idx === 0 ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(202,171,114,0.4)]' :
                  idx === 1 ? 'bg-slate-300 text-black border-slate-300 opacity-90' :
                  idx === 2 ? 'bg-amber-700 text-white border-amber-700 opacity-80' :
                  'bg-white/5 text-text-secondary border-white/10'
                }`}>
                  {idx + 1}
                </div>

                {/* Avatar */}
                <div className="relative shrink-0 w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg">
                  {entry.avatar_url && (entry.avatar_url.startsWith('http') || entry.avatar_url.startsWith('/')) ? (
                    <Image 
                      src={entry.avatar_url} 
                      alt={entry.username || 'User'} 
                      fill 
                      className="object-cover"
                      unoptimized={true} // In case they are external without domain config
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <User className="w-6 h-6 text-text-secondary opacity-40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className={`font-display font-black text-sm md:text-base italic uppercase tracking-tight truncate transition-all ${
                    idx === 0 ? 'text-brand-gold' : 'text-text-premium group-hover:text-brand-gold'
                  }`}>
                    {entry.username || 'Anónimo'}
                  </p>
                  <div className="flex items-center gap-1.5 opacity-60">
                    <Icon className="w-3 h-3 text-text-secondary" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Global Ranking</span>
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="shrink-0 text-right">
                <p className={`font-display font-black text-lg md:text-xl italic tracking-tighter transition-all ${
                  idx === 0 ? 'text-brand-gold scale-110 drop-shadow-[0_0_8px_rgba(202,171,114,0.4)]' : 'text-text-premium'
                }`}>
                  {category === 'top_ganadores' ? `$${(Number(entry.score) / 100).toLocaleString()}` : entry.score}
                </p>
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest opacity-40">
                  {category === 'top_ganadores' ? 'Ganancias' : 
                   category === 'mejor_racha' ? 'Best Streak' : 
                   category === 'maestro_primera' ? 'Especiales' : 'Partidas'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
