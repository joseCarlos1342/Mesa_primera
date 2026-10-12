'use client'

import { useEffect, useRef, useState } from 'react'
import { HAND_TIMELINE, chapterNumber } from './rulesGuide'

/** Paso de la mano que cruza el centro de la pantalla (igual que el tablero de la landing). */
function useActiveIndex(rootRef: React.RefObject<HTMLElement | null>): number {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-step-index]'))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.stepIndex))
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [rootRef])

  return active
}

export function HandTimeline() {
  const rootRef = useRef<HTMLOListElement>(null)
  const active = useActiveIndex(rootRef)
  const total = HAND_TIMELINE.length
  const current = HAND_TIMELINE[active]

  return (
    <div className="grid gap-x-16 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
      {/* Contador fijo en escritorio: muestra en qué momento de la mano va la lectura. */}
      <div className="hidden lg:block" aria-hidden="true">
        <div className="sticky top-28">
          <p className="font-display text-[7rem] font-bold italic leading-none text-[#c5a059]">
            {active + 1}
            <span className="text-4xl text-[#8b6b2e]"> / {total}</span>
          </p>
          <p className="mt-4 max-w-[18ch] font-display text-3xl font-bold text-text-premium">{current.title}</p>
          <div className="mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#8b6b2e]/30">
            <div
              className="h-full rounded-full bg-brand-gold transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${((active + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ol ref={rootRef} className="m-0 list-none p-0">
        {HAND_TIMELINE.map((step, index) => (
          <li
            key={step.id}
            id={step.id}
            data-step-index={index}
            aria-current={index === active ? 'step' : undefined}
            className="relative scroll-mt-28 border-l-2 border-[#8b6b2e]/45 pb-12 pl-8 last:pb-0 sm:pl-10 lg:min-h-[42svh]"
          >
            <span
              aria-hidden="true"
              className={`absolute -left-[1.15rem] top-0 flex h-9 w-9 items-center justify-center rounded-full border-2 font-mono text-base font-bold transition-colors duration-300 motion-reduce:transition-none ${
                index === active
                  ? 'border-brand-gold bg-brand-gold text-[#0a0a0a]'
                  : 'border-[#8b6b2e] bg-[#0a0a0a] text-[#c5a059]'
              }`}
            >
              {index + 1}
            </span>
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#c5a059]">
              Paso {index + 1} de {total}
            </p>
            <h3 className="mt-2 font-display text-3xl font-bold text-text-premium">{step.title}</h3>
            <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-[#d9d3bf]">{step.text}</p>

            {step.actions && (
              <ul className="mt-4 flex list-none flex-wrap gap-2 p-0" aria-label="Acciones posibles">
                {step.actions.map((action) => (
                  <li
                    key={action}
                    className="rounded-md border border-[#c5a059]/60 bg-[#0a2c20] px-3 py-1.5 text-base font-semibold text-brand-gold-light"
                  >
                    {action}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
              {step.refs.map((ref) => (
                <a
                  key={ref}
                  href={`#${ref}`}
                  className="inline-flex min-h-11 items-center text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 hover:decoration-brand-gold"
                >
                  Leer regla oficial §{chapterNumber(ref)}
                </a>
              ))}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
