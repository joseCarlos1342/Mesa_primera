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
        <label className="text-sm md:text-xl font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 flex-shrink-0" /> 
          <span className="truncate">Identidad en la Mesa</span>
        </label>
        <span className="text-[9px] md:text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-indigo-400/20 font-bold whitespace-nowrap tracking-tight md:tracking-widest">
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
                ? 'bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border-2 md:border-4 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] ring-1 ring-white/20 scale-[1.02] md:scale-105'
                : 'bg-slate-900/40 border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mb-3 transition-transform duration-500 group-hover:scale-110 group-active:scale-95">
              {avatar.svg}
            </div>
            <span className={`text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-tighter text-center leading-tight ${
              selectedId === avatar.id ? 'text-indigo-300 drop-shadow-md' : 'text-slate-400 group-hover:text-slate-200'
            }`}>
              {avatar.name}
            </span>
            
            {/* Hover Tooltip */}
            <div className={`absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur-md text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-2xl border border-white/10 pointer-events-none transition-all duration-300 z-50 ${
              hovered === avatar.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}>
              {avatar.description}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800/90 border-r border-b border-white/10 rotate-45" />
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/50 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-all active:scale-95"
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
