'use client'

import { useState } from 'react'
import { AVATARS } from '@/utils/avatars'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

interface AvatarSelectorProps {
  onSelect: (id: string) => void
  selectedId?: string
}

export function AvatarSelector({ onSelect, selectedId }: AvatarSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const displayedAvatars = isExpanded ? AVATARS : AVATARS.slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <label className="text-sm md:text-xl font-black uppercase tracking-widest text-brand-gold/80 flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-brand-gold flex-shrink-0" /> 
          <span className="truncate">Identidad en la Mesa</span>
        </label>
        <span className="text-[9px] md:text-xs font-mono text-brand-gold bg-brand-gold/10 px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-brand-gold/30 font-bold whitespace-nowrap tracking-tight md:tracking-widest uppercase">
          REQUERIDO
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 transition-all duration-700">
        {displayedAvatars.map((avatar, index) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            onMouseEnter={() => setHovered(avatar.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`group relative flex flex-col items-center p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${
              selectedId === avatar.id
                ? 'bg-gradient-to-b from-brand-gold/10 to-brand-gold-dark/10 border-2 md:border-4 border-brand-gold shadow-[0_0_40px_rgba(202,171,114,0.3)] ring-1 ring-white/10 scale-[1.02] md:scale-105'
                : 'bg-black/40 border-2 border-white/10 hover:border-brand-gold/50 hover:bg-white/5'
            }`}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mb-3 transition-transform duration-500 group-hover:scale-110 group-active:scale-95">
              {avatar.svg}
            </div>
            <span className={`text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-tighter text-center leading-tight ${
              selectedId === avatar.id ? 'text-brand-gold drop-shadow-md' : 'text-text-secondary group-hover:text-text-premium'
            }`}>
              {avatar.name}
            </span>
            
            {/* Hover Tooltip */}
            <div className={`absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 border-2 border-brand-gold/30 backdrop-blur-md text-text-premium text-xs font-bold rounded-xl whitespace-nowrap shadow-2xl pointer-events-none transition-all duration-300 z-50 ${
              hovered === avatar.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}>
              {avatar.description}
              <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-r-2 border-b-2 border-brand-gold/30 rotate-45" />
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-6 py-2.5 bg-black/40 hover:bg-white/5 border border-white/10 hover:border-brand-gold/50 rounded-full text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-brand-gold transition-all active:scale-95"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" /> Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" /> Ver más identidades
            </>
          )}
        </button>
      </div>
    </div>
  )
}
