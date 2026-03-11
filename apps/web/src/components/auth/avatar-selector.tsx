'use client'

import { useState } from 'react'

const AVATARS = [
  {
    id: 'as-oros',
    name: 'El As de Oro',
    description: 'La carta de la fortuna y el éxito.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f6d365" />
            <stop offset="100%" stopColor="#fda085" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="80" height="80" rx="12" fill="white" stroke="#e2b044" strokeWidth="2" />
        <circle cx="50" cy="50" r="25" fill="url(#gold-grad)" />
        <text x="50" y="65" fontSize="40" fontWeight="900" fill="white" textAnchor="middle" style={{ fontFamily: 'serif' }}>A</text>
        <path d="M20 20 L30 20 L25 30 Z" fill="#e2b044" />
        <path d="M80 80 L70 80 L75 70 Z" fill="#e2b044" />
      </svg>
    )
  },
  {
    id: 'rey-espadas',
    name: 'El Rey Guerrero',
    description: 'Estratega nato y protector de la mesa.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <rect x="10" y="10" width="80" height="80" rx="12" fill="#1a1a2e" stroke="#3498db" strokeWidth="2" />
        <path d="M30 70 L50 20 L70 70 Z" fill="#3498db" opacity="0.6" />
        <path d="M45 30 L55 30 L55 75 L45 75 Z" fill="#fff" />
        <rect x="35" y="60" width="30" height="5" rx="2" fill="#fff" />
        <circle cx="50" cy="20" r="5" fill="#e2b044" />
      </svg>
    )
  },
  {
    id: 'copas-luxury',
    name: 'Copa de Cristal',
    description: 'Para los que celebran cada jugada.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <rect x="10" y="10" width="80" height="80" rx="12" fill="#2d1b2d" stroke="#e74c3c" strokeWidth="2" />
        <path d="M30 30 Q50 20 70 30 L65 70 Q50 80 35 70 Z" fill="#e74c3c" opacity="0.8" />
        <path d="M40 70 L60 70 L55 85 L45 85 Z" fill="#e74c3c" />
        <circle cx="50" cy="45" r="8" fill="#fff" opacity="0.2" />
      </svg>
    )
  },
  {
    id: 'ficha-maestra',
    name: 'Ficha Legendaria',
    description: 'El símbolo del gran apostador.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <circle cx="50" cy="50" r="45" fill="#1a1a2e" stroke="#2ecc71" strokeWidth="6" strokeDasharray="15 5" />
        <circle cx="50" cy="50" r="35" fill="#2ecc71" stroke="#fff" strokeWidth="2" />
        <text x="50" y="62" fontSize="35" fontWeight="900" fill="white" textAnchor="middle" style={{ fontFamily: 'monospace' }}>$</text>
      </svg>
    )
  }
]

interface AvatarSelectorProps {
  onSelect: (id: string) => void
  selectedId?: string
}

export function AvatarSelector({ onSelect, selectedId }: AvatarSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-lg md:text-xl font-black uppercase tracking-widest text-slate-300 ml-1">
          Identidad en la Mesa
        </label>
        <span className="text-xs md:text-sm font-mono text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full border border-indigo-400/20 font-bold">
          R E Q U E R I D O
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {AVATARS.map((avatar, index) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            onMouseEnter={() => setHovered(avatar.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`group relative flex flex-col items-center p-6 rounded-[2rem] transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
              selectedId === avatar.id
                ? 'bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border-4 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] ring-2 ring-white/30 scale-105'
                : 'bg-slate-900/40 border-[3px] border-slate-700 hover:border-slate-500 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-28 h-28 md:w-32 md:h-32 mb-4 transition-transform duration-500 group-hover:scale-110 group-active:scale-95">
              {avatar.svg}
            </div>
            <span className={`text-sm md:text-lg font-black uppercase tracking-tighter text-center leading-5 ${
              selectedId === avatar.id ? 'text-indigo-300 drop-shadow-md' : 'text-slate-400 group-hover:text-slate-200'
            }`}>
              {avatar.name}
            </span>
            
            {/* Hover Tooltip - Discrete but informative */}
            <div className={`absolute -top-16 md:-top-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white text-sm md:text-base font-bold rounded-xl whitespace-nowrap shadow-2xl border-2 border-slate-600 pointer-events-none transition-all duration-300 z-50 ${
              hovered === avatar.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}>
              {avatar.description}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-r-2 border-b-2 border-slate-600 rotate-45" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
