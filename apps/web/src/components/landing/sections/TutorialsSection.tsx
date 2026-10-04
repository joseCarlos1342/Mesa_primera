'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { getTutorialDefinition, TUTORIAL_CATALOG, type TutorialKey, type TutorialPreviewTone } from '../tutorialCatalog'
import type { TutorialStep } from '../tutorials/TutorialWalkthrough'
import styles from '../landing.module.css'

const TutorialWalkthrough = dynamic(
  () => import('@/components/landing/tutorials/TutorialWalkthrough').then((m) => ({ default: m.TutorialWalkthrough })),
  { ssr: false },
)

const PREVIEW_GROUND: Record<TutorialPreviewTone, string> = {
  system: 'bg-[#16213e]',
  auth: 'bg-[#1a1a2e]',
  wallet: 'bg-[#35180f]',
  game: 'bg-[#0a2c20]',
  social: 'bg-[#16213e]',
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

function TutorialDialog({ tutorial, onClose }: { tutorial: TutorialKey; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [steps, setSteps] = useState<TutorialStep[] | null>(null)
  const [error, setError] = useState(false)
  const definition = getTutorialDefinition(tutorial)

  useEffect(() => {
    let current = true
    definition
      .loader()
      .then((loaded) => {
        if (current) setSteps(loaded)
      })
      .catch(() => {
        if (current) setError(true)
      })
    return () => {
      current = false
    }
  }, [definition])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const loading = !steps && !error

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-dialog-title"
      aria-busy={loading}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/85 p-4 py-8 md:items-center"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="relative flex w-full max-w-3xl flex-col items-center md:my-auto">
        <h2 id="tutorial-dialog-title" className="sr-only">
          {definition.title}
        </h2>
        {loading && (
          <div role="status" className="rounded-2xl border border-[#8b6b2e]/50 bg-[#120806] px-6 py-5 text-center text-[#d9d3bf]">
            Cargando tutorial…
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-2xl border border-[#e74c3c]/40 bg-[#120806] px-6 py-5 text-center text-[#d9d3bf]">
            <p>No se pudo cargar este tutorial.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-11 rounded-lg bg-brand-gold px-5 font-semibold text-[#0a0a0a] hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            >
              Volver a tutoriales
            </button>
          </div>
        )}
        {steps && (
          <TutorialWalkthrough
            key={tutorial}
            steps={steps}
            className="w-full"
            dialog={false}
            video={definition.video}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

export function TutorialsSection() {
  const railRef = useRef<HTMLUListElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [active, setActive] = useState<TutorialKey | null>(null)

  const open = useCallback((key: TutorialKey) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setActive(key)
  }, [])

  const close = useCallback(() => {
    setActive(null)
    queueMicrotask(() => returnFocusRef.current?.focus())
  }, [])

  const scrollRail = useCallback((direction: 1 | -1) => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  return (
    <section id="tutoriales" aria-labelledby="tutoriales-title" className="bg-[#0a0a0a] py-24 md:py-32">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2
              id="tutoriales-title"
              className="font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-text-premium md:text-5xl"
            >
              Cómo usar la <span className="italic text-brand-gold-light">plataforma</span>
            </h2>
            <p className="mt-4 max-w-[44ch] text-lg leading-relaxed text-[#d9d3bf]">
              Tutoriales interactivos para que aprendas a usar todas las funciones.
            </p>
          </div>
          <div className="hidden gap-3 sm:flex">
            <button
              type="button"
              onClick={() => scrollRail(-1)}
              aria-label="Tutoriales anteriores"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#8b6b2e]/70 text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollRail(1)}
              aria-label="Tutoriales siguientes"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#8b6b2e]/70 text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <ul
        ref={railRef}
        className={`${styles.rail} mt-12 flex list-none gap-5 overflow-x-auto px-5 pb-6 sm:px-8 lg:px-14 [scroll-padding-inline:1.25rem] sm:[scroll-padding-inline:2rem] lg:[scroll-padding-inline:3.5rem]`}
        aria-label="Tutoriales disponibles"
      >
        {TUTORIAL_CATALOG.map((tutorial) => (
          <li key={tutorial.key} className="w-[17rem] shrink-0 sm:w-[19rem]">
            <button
              type="button"
              id={tutorial.key === 'install' ? 'instalar-app' : undefined}
              onClick={() => open(tutorial.key)}
              aria-label={`Abrir tutorial: ${tutorial.title}`}
              data-testid="tutorial-card"
              className="group flex h-full w-full flex-col rounded-2xl border border-[#8b6b2e]/45 bg-[#120806] p-4 text-left transition-colors duration-300 hover:border-brand-gold/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            >
              <span className={`relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl ${PREVIEW_GROUND[tutorial.preview.tone]}`}>
                <span className="flex h-32 w-20 flex-col overflow-hidden rounded-2xl border border-[#c5a059]/40 bg-[#0a0a0a] shadow-[0_10px_24px_-6px_rgba(0,0,0,0.7)]" aria-hidden="true">
                  <span className="flex h-4 items-center justify-center">
                    <span className="h-1.5 w-6 rounded-full bg-white/15" />
                  </span>
                  <span className="flex flex-1 flex-col justify-between p-2">
                    <span>
                      <span className="block truncate text-[7px] font-bold uppercase tracking-[0.1em] text-[#c5a059]">
                        {tutorial.preview.eyebrow}
                      </span>
                      <span className="mt-2 block h-1.5 w-4/5 rounded-full bg-white/20" />
                      <span className="mt-1 block h-1 w-3/5 rounded-full bg-white/10" />
                    </span>
                    <span className="block truncate rounded-md bg-brand-gold px-1 py-1 text-center text-[7px] font-bold text-[#0a0a0a]">
                      {tutorial.preview.action}
                    </span>
                  </span>
                </span>
                <span className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-gold text-[#0a0a0a] shadow-[0_6px_16px_-4px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:scale-105" aria-hidden="true">
                  <Play className="ml-0.5 h-5 w-5" />
                </span>
                <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs tabular-nums text-text-premium">
                  {tutorial.stepCount} pasos
                </span>
              </span>
              <span className="mt-4 block text-xl font-bold text-text-premium">{tutorial.title}</span>
              <span className="mt-1 block text-base leading-relaxed text-[#bdb7a6]">{tutorial.description}</span>
            </button>
          </li>
        ))}
      </ul>

      {active && <TutorialDialog tutorial={active} onClose={close} />}
    </section>
  )
}
