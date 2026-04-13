"use client";

import { m } from "framer-motion";
import { Trophy, Medal, Target, User } from "lucide-react";
import { getAvatarSvg } from "@/utils/avatars";

interface LeaderboardProps {
  entries: any[];
  category: string;
}

export function Leaderboard({ entries, category }: LeaderboardProps) {
  const getCategoryIcon = () => {
    switch (category) {
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
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary italic">Buscando leyendas...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <m.div
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

              <div className="flex items-center gap-5 min-w-0 flex-1">
                {/* Avatar with Integrated Rank Badge */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-brand-gold/30 bg-slate-900 flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-105">
                    {entry.avatar_url && getAvatarSvg(entry.avatar_url) ? (
                      <div className="w-full h-full scale-[1.1]">
                        {getAvatarSvg(entry.avatar_url)}
                      </div>
                    ) : (
                      <User className="w-7 h-7 text-text-secondary opacity-40" />
                    )}
                  </div>
                  
                  {/* Rank Badge Overlay */}
                  <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-lg flex items-center justify-center font-display font-black text-[10px] italic border-2 shadow-xl z-20 ${
                    idx === 0 ? 'bg-brand-gold text-black border-brand-gold shadow-brand-gold/40' :
                    idx === 1 ? 'bg-slate-300 text-black border-slate-300' :
                    idx === 2 ? 'bg-amber-700 text-white border-amber-700' :
                    'bg-slate-900 text-text-secondary border-brand-gold/20'
                  }`}>
                    {idx + 1}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`font-display font-black text-sm md:text-lg italic uppercase tracking-tight transition-all leading-tight break-words ${
                    idx === 0 ? 'text-brand-gold' : 'text-text-premium group-hover:text-brand-gold'
                  }`}>
                    {entry.username || 'Anónimo'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Icon className="w-3 h-3 text-text-secondary" />
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest whitespace-nowrap">Global Ranking</span>
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="shrink-0 text-right">
                <p className={`font-display font-black text-lg md:text-xl italic tracking-tighter transition-all ${
                  idx === 0 ? 'text-brand-gold scale-110 drop-shadow-[0_0_8px_rgba(202,171,114,0.4)]' : 'text-text-premium'
                }`}>
                  {entry.score}
                </p>
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  {category === 'mejor_racha' ? 'Best Streak' : 
                   category === 'maestro_primera' ? 'Especiales' : 'Partidas'}
                </span>
              </div>
            </m.div>
          ))}
        </div>
      )}
    </div>
  );
}
