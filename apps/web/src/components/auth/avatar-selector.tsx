'use client'

import { useState } from 'react'
import { AVATARS } from '@/utils/avatars'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AvatarSelectorProps {
  onSelect: (id: string) => void
  selectedId?: string
}

export function AvatarSelector({ onSelect, selectedId }: AvatarSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const displayedAvatars = isExpanded ? AVATARS : AVATARS.slice(0, 4)

  return (
    <fieldset className="m-0 min-w-0 space-y-4 border-0 p-0">
      <legend className="flex w-full flex-wrap items-baseline justify-between gap-3 p-0">
        <span className="text-base font-semibold text-text-premium">Identidad en la mesa</span>
        <span className="text-sm text-[#bdb7a6]">Requerido</span>
      </legend>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {displayedAvatars.map((avatar) => {
          const selected = selectedId === avatar.id
          return (
            <button
              key={avatar.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(avatar.id)}
              onMouseEnter={() => setHovered(avatar.id)}
              onMouseLeave={() => setHovered(null)}
              className={`group relative flex min-w-0 flex-col items-center rounded-lg border p-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
                selected
                  ? 'border-brand-gold bg-[#0a2c20] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.7)]'
                  : 'border-[#8b6b2e]/60 bg-[#120806] hover:border-[#c5a059]'
              }`}
            >
              <div className="mb-2 h-20 w-20 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none sm:h-[4.5rem] sm:w-[4.5rem]">
                {avatar.svg}
              </div>
              <span
                className={`text-center text-sm leading-tight ${
                  selected ? 'font-semibold text-brand-gold-light' : 'text-[#d9d3bf] group-hover:text-text-premium'
                }`}
              >
                {avatar.name}
              </span>

              {/* Descripción al pasar el cursor */}
              <div
                className={`pointer-events-none absolute -top-14 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#8b6b2e]/70 bg-[#120806] px-3 py-2 text-sm text-text-premium shadow-[0_10px_24px_-8px_rgba(0,0,0,0.8)] transition-opacity duration-200 ${
                  hovered === avatar.id ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {avatar.description}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 transition-colors hover:decoration-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden="true" /> Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden="true" /> Ver más identidades
            </>
          )}
        </button>
      </div>
    </fieldset>
  )
}
