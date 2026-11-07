"use client"

import Link from 'next/link'
import { OFFICIAL_RULEBOOK_VERSION } from '@/lib/official-rulebook'
import { PlayerSheet } from '@/components/player/PlayerSheet'
import { PlayingCard } from '@/components/landing/PlayingCard'
import { CARD_POINTS, RANKS, TEACHING_HANDS, cardId, rankLabel } from '@/components/landing/primeraHands'
import { AuthButton } from '@/components/auth/AuthForm'

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PHASES = [
  { title: 'Pique', text: 'Dos cartas, La Mano abre y se disputa un pozo separado.' },
  { title: 'Completar y apostar', text: 'Se reciben dos cartas más y se apuesta al pozo principal.' },
  { title: 'Validar y descartar', text: 'Se confirma el juego, se descartan cartas y se reciben reposiciones.' },
  { title: 'Guerra y cánticos', text: 'Rondas adicionales con las cuatro cartas definitivas.' },
  { title: 'Declarar y showdown', text: 'Se comparan manos, pozos y posibles pozos secundarios.' },
] as const

const HAND_NOTES: Record<string, string> = {
  segunda: '4 cartas del mismo palo (ej. 4 Copas). Es imbatible.',
  chivo: 'Un As, un 6 y un 7 del mismo palo, más una cuarta carta. Gana contra Primera.',
  primera: '4 cartas, una de cada palo distinto (Oros, Copas, Espadas, Bastos).',
  puntos: 'Si no existe una combinación superior, gana la suma más alta de cartas del mismo palo. En Primera se suman las cuatro cartas, una por palo.',
}

const sectionTitle = 'border-b border-[#8b6b2e]/45 pb-2 font-display text-[1.375rem] font-bold leading-tight text-text-premium'

/** Reglamento rápido de la mesa: misma hoja que el resto de la app y las cartas reales del club. */
export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <PlayerSheet
      open={isOpen}
      onClose={onClose}
      title="Reglamento de Primera"
      description={`Resumen del reglamento oficial ${OFFICIAL_RULEBOOK_VERSION}.`}
      closeLabel="Cerrar"
      className="sm:max-w-2xl!"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/rules"
            target="_blank"
            className="inline-flex min-h-14 items-center justify-center rounded-lg border border-[#8b6b2e]/80 px-4 text-lg font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
          >
            Reglamento completo
          </Link>
          <AuthButton onClick={onClose}>Entendido</AuthButton>
        </div>
      }
    >
      <div className="space-y-8 pt-1 text-lg leading-relaxed text-[#d9d3bf]">
        <p>
          <strong className="font-semibold text-text-premium">Primera</strong> se juega con baraja española. El objetivo es formar la mejor combinación de 4 cartas y ganar los pozos correspondientes.
        </p>

        <section aria-labelledby="reglas-fases">
          <h3 id="reglas-fases" className={sectionTitle}>Las fases del juego</h3>
          <ol className="mt-2 divide-y divide-[#8b6b2e]/30">
            {PHASES.map((phase, i) => (
              <li key={phase.title} className="flex gap-3 py-3">
                <span className="w-6 shrink-0 font-mono text-base tabular-nums text-brand-gold-light">{i + 1}</span>
                <span>
                  <strong className="font-semibold text-text-premium">{phase.title}:</strong> {phase.text}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="reglas-manos">
          <h3 id="reglas-manos" className={sectionTitle}>Jerarquía de manos, de mayor a menor</h3>
          <ol className="mt-2 divide-y divide-[#8b6b2e]/30">
            {TEACHING_HANDS.map((hand, i) => (
              <li key={hand.kind} className="flex items-center gap-4 py-4">
                <span aria-hidden="true" className="flex shrink-0 pl-1">
                  {hand.cards.map((card, index) => (
                    <span key={cardId(card)} className="-ml-4 w-10 first:ml-0" style={{ transform: `rotate(${(index - 1.5) * 7}deg)` }}>
                      <PlayingCard card={card} sizes="40px" decorative />
                    </span>
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[1.25rem] font-bold leading-tight text-text-premium">
                    <span className="mr-1.5 font-mono text-base text-brand-gold-light">{i + 1}.</span>
                    {hand.title}
                  </span>
                  <span className="block text-base leading-snug text-[#bdb7a6]">{HAND_NOTES[hand.kind] ?? hand.rule}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-3 rounded-lg border border-[#8b6b2e]/60 bg-[#0a0a0a]/50 px-4 py-3">
            <p className="text-base font-semibold text-text-premium">Valores de las cartas</p>
            <dl className="mt-2 grid grid-cols-4 gap-x-3 gap-y-1 sm:grid-cols-7">
              {[...RANKS].sort((a, b) => CARD_POINTS[b] - CARD_POINTS[a]).map((rank) => (
                <div key={rank} className="text-center">
                  <dt className="text-sm text-[#bdb7a6]">{rankLabel(rank)}</dt>
                  <dd className="font-mono text-lg tabular-nums text-text-premium">{CARD_POINTS[rank]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="reglas-desconexion">
          <h3 id="reglas-desconexion" className={sectionTitle}>Reglas de desconexión</h3>
          <p className="mt-3">
            Si pierdes la conexión en medio de la partida, conservas tu asiento y estado durante exactamente{' '}
            <strong className="font-semibold text-text-premium">60 segundos</strong>. Si regresas dentro de ese plazo, recuperas tu mano y turno; después, el servidor libera el asiento y aplica la resolución de la fase.
          </p>
        </section>

        <section aria-labelledby="reglas-fondo">
          <h3 id="reglas-fondo" className={sectionTitle}>Carta del fondo</h3>
          <p className="mt-3">La carta revelada al terminar la reposición es informativa. No modifica puntaje, apuestas, jerarquía ni ganador.</p>
        </section>
      </div>
    </PlayerSheet>
  )
}
