'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Smartphone } from 'lucide-react'
import { PlayingCard } from '../PlayingCard'
import {
  CARD_POINTS,
  DECK,
  RANKS,
  SUITS,
  SUIT_LABEL,
  TEACHING_HANDS,
  cardId,
  rankLabel,
  type HandKind,
} from '../primeraHands'
import styles from '../landing.module.css'

export type BoardStep = 'deal' | HandKind

const BOARD_CARD_SIZES = '(min-width: 1024px) 7vw, 12vw'
const HAND_CARD_SIZES = '(min-width: 640px) 120px, 22vw'

/**
 * Observa los bloques con `data-board-step` y devuelve el que cruza el centro
 * de la pantalla. Así el tablero fijo muestra la mano que se está leyendo.
 */
function useActiveStep(rootRef: React.RefObject<HTMLElement | null>): BoardStep {
  const [step, setStep] = useState<BoardStep>('deal')

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-board-step]'))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStep((entry.target as HTMLElement).dataset.boardStep as BoardStep)
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [rootRef])

  return step
}

function litCards(step: BoardStep): Set<string> {
  const hand = TEACHING_HANDS.find((item) => item.kind === step)
  return new Set(hand ? hand.cards.map(cardId) : [])
}

function DeckBoardGrid({ step }: { step: BoardStep }) {
  const lit = litCards(step)
  const litRanks = new Set(DECK.filter((card) => lit.has(cardId(card))).map((card) => card.rank))
  const litSuits = new Set(DECK.filter((card) => lit.has(cardId(card))).map((card) => card.suit))
  const active = TEACHING_HANDS.find((item) => item.kind === step)

  return (
    <figure
      className={`${styles.board} m-0 w-full`}
      data-step={step}
      aria-label="Baraja española de 28 cartas: cuatro palos del As al 7 con sus puntos oficiales"
    >
      <div className="grid grid-cols-[3.1rem_repeat(7,minmax(0,1fr))] gap-x-1 gap-y-2 sm:grid-cols-[4rem_repeat(7,minmax(0,1fr))] sm:gap-x-2 lg:gap-x-2.5 lg:gap-y-3">
        <span aria-hidden="true" />
        {RANKS.map((rank) => (
          <span
            key={rank}
            aria-hidden="true"
            data-lit={litRanks.has(rank) || undefined}
            className={`${styles.colHead} flex flex-col items-center leading-none text-[#c5a059]`}
          >
            <span className="font-display text-sm font-bold sm:text-base">{rankLabel(rank)}</span>
            <span className="mt-1 font-mono text-xs tabular-nums text-text-secondary sm:text-[0.8rem]">{CARD_POINTS[rank]}</span>
          </span>
        ))}

        {SUITS.map((suit, row) => (
          <div key={suit} className="contents">
            <span
              aria-hidden="true"
              data-lit={litSuits.has(suit) || undefined}
              className={`${styles.rowHead} self-center text-[0.68rem] font-bold text-[#c5a059] sm:text-xs sm:uppercase sm:tracking-[0.08em]`}
            >
              {SUIT_LABEL[suit]}
            </span>
            {RANKS.map((rank, col) => {
              const card = { rank, suit }
              return (
                <PlayingCard
                  key={rank}
                  card={card}
                  sizes={BOARD_CARD_SIZES}
                  decorative
                  deal
                  dealIndex={row * 7 + col}
                  loading="eager"
                  lit={lit.has(cardId(card))}
                />
              )
            })}
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        {active ? `Ejemplo de ${active.title}: ${active.example}` : 'Baraja completa repartida sobre la mesa.'}
      </figcaption>
    </figure>
  )
}

function InstallHint({ onClick, className }: { onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full max-w-sm items-center gap-4 rounded-sm border-t border-[#8b6b2e]/50 pt-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${className}`}
    >
      <Smartphone className="h-7 w-7 shrink-0 text-brand-gold" strokeWidth={1.5} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-text-premium transition-colors group-hover:text-brand-gold-light">
          Disponible como app.
        </span>
        <span className="mt-0.5 block text-sm text-[#bdb7a6]">Ver tutorial de instalación para navegador</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#bdb7a6] transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </button>
  )
}

interface DeckBoardProps {
  readonly onInstallHint: () => void
}

export function DeckBoard({ onInstallHint }: DeckBoardProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const step = useActiveStep(rootRef)

  return (
    <div ref={rootRef} className={`${styles.felt} ${styles.rim} relative`}>
      <div className="mx-auto grid max-w-[90rem] grid-cols-1 gap-x-12 px-5 pb-16 pt-20 sm:px-8 sm:pt-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-14 lg:pb-0 lg:pt-0 xl:gap-x-20">
        {/* ═══ Hero ═══ */}
        <section
          id="inicio"
          data-board-step="deal"
          aria-labelledby="hero-title"
          className="flex flex-col justify-center lg:col-start-1 lg:row-start-1 lg:min-h-[100svh] lg:pt-20"
        >
          <h1
            id="hero-title"
            className="font-display font-bold leading-[0.95] tracking-[-0.02em] text-text-premium [font-size:clamp(2.6rem,7.4vw,6rem)]"
          >
            Primera Riverada
            <span className="mt-1 block italic text-brand-gold-light">los 4 Ases</span>
          </h1>

          <p className="mt-5 max-w-[34ch] text-base leading-relaxed text-[#d9d3bf] sm:text-lg md:mt-6 md:text-xl">
            La Primera Riverada de Neiva, ahora en tu celular. Juega en tiempo real con las reglas oficiales del club o
            visítanos en la Cra. 7.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 md:mt-9">
            <Link
              href="/register/player"
              className="group inline-flex min-h-[3.25rem] items-center gap-2.5 rounded-lg bg-brand-gold px-6 text-lg font-bold sm:px-7 text-[#0a0a0a] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)] transition-colors duration-200 hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2c20]"
            >
              Crear cuenta gratis
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/login/player"
              className="inline-flex min-h-11 items-center text-lg font-semibold text-text-premium underline decoration-brand-gold/50 underline-offset-[6px] transition-colors hover:text-brand-gold-light hover:decoration-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light rounded"
            >
              Iniciar sesión
            </Link>
          </div>

          <InstallHint onClick={onInstallHint} className="mt-10 hidden lg:flex" />
        </section>

        {/* ═══ Tablero (fijo en desktop mientras se leen las manos) ═══ */}
        <div className="mt-9 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <div className="lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:items-center lg:pt-16">
            <div className="mx-auto w-full lg:max-w-[calc((100svh-9rem)*1.18)]">
              <DeckBoardGrid step={step} />
            </div>
          </div>
          <InstallHint onClick={onInstallHint} className="mt-10 flex lg:hidden" />
        </div>

        {/* ═══ Cómo se gana ═══ */}
        <section
          id="como-se-gana"
          aria-labelledby="como-se-gana-title"
          className="mt-20 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:pb-[14svh]"
        >
          <h2
            id="como-se-gana-title"
            className="font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-text-premium md:text-5xl"
          >
            Cómo se <span className="italic text-brand-gold-light">gana</span>
          </h2>
          <p className="mt-4 max-w-[38ch] text-lg leading-relaxed text-[#d9d3bf]">
            Cada jugador arma una mano de cuatro cartas. Primero se compara la combinación; solo entre manos del mismo tipo
            se comparan los puntos.
          </p>

          <ol className="mt-10 list-none space-y-14 p-0 lg:mt-0 lg:space-y-0">
            {TEACHING_HANDS.map((hand, index) => (
              <li
                key={hand.kind}
                data-board-step={hand.kind}
                className="lg:flex lg:min-h-[78svh] lg:flex-col lg:justify-center"
              >
                <article aria-labelledby={`mano-${hand.kind}`}>
                  <p className="flex items-baseline gap-3 text-sm font-bold uppercase tracking-[0.1em] text-[#c5a059]">
                    <span>Mano {index + 1} de 4</span>
                    <span className="h-px flex-1 bg-[#8b6b2e]/50" aria-hidden="true" />
                  </p>
                  <h3
                    id={`mano-${hand.kind}`}
                    className="mt-3 font-display text-4xl font-bold text-text-premium md:text-[2.75rem]"
                  >
                    {hand.title}
                  </h3>
                  <p className="mt-3 max-w-[36ch] text-xl leading-snug text-text-premium">{hand.rule}</p>
                  <p className="mt-2 text-base text-[#bdb7a6]">{hand.example}</p>

                  {/* En móvil cada mano lleva sus propias cartas; en desktop las muestra el tablero. */}
                  <div className="mt-6 flex gap-2 sm:gap-3 lg:hidden">
                    {hand.cards.map((card) => (
                      <PlayingCard
                        key={cardId(card)}
                        card={card}
                        sizes={HAND_CARD_SIZES}
                        className="w-[22%] max-w-[7.5rem]"
                      />
                    ))}
                  </div>
                </article>
              </li>
            ))}
          </ol>

          <p className="mt-14 text-base text-[#d9d3bf] lg:mt-0">
            ¿Empates, apuestas y pozos?{' '}
            <Link
              href="/rules"
              className="font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 hover:decoration-brand-gold"
            >
              Lee el reglamento completo
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
