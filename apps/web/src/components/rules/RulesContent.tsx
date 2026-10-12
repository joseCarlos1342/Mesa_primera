import Link from 'next/link'
import { Clock3, Coins, RotateCcw } from 'lucide-react'
import { PageNav } from '@/components/landing/PageNav'
import { PlayingCard } from '@/components/landing/PlayingCard'
import { DeckBoardGrid } from '@/components/landing/sections/DeckBoard'
import { ClosingTable, LandingFooter } from '@/components/landing/sections/ClosingFooter'
import { LOCAL_LOCATION } from '@/components/landing/landingLocation'
import { TEACHING_HANDS, cardId, handPoints, type Card } from '@/components/landing/primeraHands'
import styles from '@/components/landing/landing.module.css'
import { OFFICIAL_RULEBOOK_EFFECTIVE_DATE, OFFICIAL_RULEBOOK_VERSION } from '@/lib/official-rulebook'
import { HandTimeline } from './HandTimeline'
import { RulebookAccordion } from './RulebookAccordion'
import { KEY_FACTS, TIE_BREAK_EXAMPLE, chapterNumber } from './rulesGuide'

/** Una Primera (una carta de cada palo): el cierre de la página ya muestra los 4 ases. */
const HERO_HAND: readonly Card[] = TEACHING_HANDS.find((hand) => hand.kind === 'primera')!.cards

const HAND_CARD_SIZES = '(min-width: 640px) 110px, 21vw'

const eyebrow = 'text-sm font-bold uppercase tracking-[0.1em] text-[#c5a059]'
const sectionTitle = 'font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-text-premium md:text-5xl'
const lead = 'mt-4 max-w-[46ch] text-lg leading-relaxed text-[#d9d3bf]'
const officialLink =
  'inline-flex min-h-11 items-center text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 hover:decoration-brand-gold'

function Hero() {
  return (
    <header className={`${styles.felt} ${styles.rim} px-5 pb-16 pt-14 sm:px-8 md:pb-24 md:pt-20 lg:px-14`}>
      <div className="mx-auto grid max-w-[90rem] items-center gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <p className={eyebrow}>
            Reglamento oficial · versión {OFFICIAL_RULEBOOK_VERSION} · vigente desde {OFFICIAL_RULEBOOK_EFFECTIVE_DATE}
          </p>
          <h1 className="mt-4 font-display font-bold leading-[0.95] tracking-[-0.02em] text-text-premium [font-size:clamp(2.6rem,7vw,5.5rem)]">
            Reglas de la Primera
            <span className="mt-1 block italic text-brand-gold-light">fáciles de entender</span>
          </h1>
          <p className="mt-6 max-w-[40ch] text-lg leading-relaxed text-[#d9d3bf] md:text-xl">
            Primero aprende a jugar con cartas y ejemplos. Abajo está el reglamento completo, capítulo por capítulo.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            <a href="#como-se-juega" className={officialLink}>
              Ver cómo se juega una mano
            </a>
            <a href="#reglamento" className={officialLink}>
              Ir al reglamento completo
            </a>
          </div>
        </div>
        <div className={`${styles.fan} py-6`} aria-hidden="true">
          {HERO_HAND.map((card) => (
            <PlayingCard key={cardId(card)} card={card} sizes="(min-width: 768px) 140px, 18vw" decorative loading="eager" />
          ))}
        </div>
      </div>

      <dl className="mx-auto mt-14 grid max-w-[90rem] grid-cols-2 gap-x-6 gap-y-8 border-t border-[#8b6b2e]/50 pt-8 sm:grid-cols-3 lg:grid-cols-5">
        {KEY_FACTS.map((fact) => (
          <div key={fact.label}>
            <dt className="sr-only">{fact.label}</dt>
            <dd className="m-0">
              <span className="block font-display text-5xl font-bold italic leading-none text-brand-gold-light">{fact.value}</span>
              <span className="mt-2 block text-base text-[#d9d3bf]" aria-hidden="true">
                {fact.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </header>
  )
}

function CardValues() {
  return (
    <section id="cartas" aria-labelledby="cartas-title" className="bg-[#0a0a0a] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
      <div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-center">
        <div>
          <p className={eyebrow}>La baraja</p>
          <h2 id="cartas-title" className={`mt-3 ${sectionTitle}`}>
            Las cartas y <span className="italic text-brand-gold-light">sus puntos</span>
          </h2>
          <p className={lead}>
            Se juega con 28 cartas: del As al 7 en Oros, Copas, Espadas y Bastos. Cada carta vale lo que dice arriba de su
            columna.
          </p>
          <p className="mt-6 rounded-lg border border-brand-gold/60 bg-[#0a2c20] px-5 py-4 text-xl font-bold text-text-premium">
            El As vale <span className="text-brand-gold-light">16 puntos</span>, no 1.
          </p>
          <a href="#valores" className={`mt-4 ${officialLink}`}>
            Leer regla oficial §{chapterNumber('valores')}
          </a>
        </div>
        <div className={`${styles.felt} ${styles.rim} rounded-xl p-4 sm:p-8`}>
          <DeckBoardGrid step="deal" />
        </div>
      </div>
    </section>
  )
}

function HandRanking() {
  return (
    <section id="que-mano-gana" aria-labelledby="que-mano-gana-title" className={`${styles.felt} ${styles.rim} px-5 py-20 sm:px-8 md:py-28 lg:px-14`}>
      <div className="mx-auto max-w-[90rem]">
        <p className={eyebrow}>De la más fuerte a la más débil</p>
        <h2 id="que-mano-gana-title" className={`mt-3 ${sectionTitle}`}>
          Qué mano <span className="italic text-brand-gold-light">gana</span>
        </h2>
        <p className={lead}>
          Primero se compara el tipo de mano. Solo si dos jugadores tienen el mismo tipo, gana el que suma más puntos.
        </p>

        <ol className="mt-12 grid list-none gap-x-10 gap-y-14 p-0 md:grid-cols-2">
          {TEACHING_HANDS.map((hand, index) => (
            <li key={hand.kind}>
              <article aria-labelledby={`ranking-${hand.kind}`} className="flex gap-5">
                <span className="font-display text-6xl font-bold italic leading-none text-[#c5a059]" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 id={`ranking-${hand.kind}`} className="font-display text-3xl font-bold text-text-premium">
                    {hand.title}
                  </h3>
                  <p className="mt-2 text-xl leading-snug text-text-premium">{hand.rule}</p>
                  <p className="mt-1 text-base text-[#bdb7a6]">{hand.example}</p>
                  <div className="mt-5 flex gap-2 sm:gap-3">
                    {hand.cards.map((card) => (
                      <PlayingCard key={cardId(card)} card={card} sizes={HAND_CARD_SIZES} className="w-[23%] max-w-[6.5rem]" />
                    ))}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
        <a href="#jerarquia" className={`mt-10 ${officialLink}`}>
          Leer regla oficial §{chapterNumber('jerarquia')}
        </a>
      </div>
    </section>
  )
}

function HowToPlay() {
  return (
    <section id="como-se-juega" aria-labelledby="como-se-juega-title" className="bg-[#0a0a0a] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[90rem]">
        <p className={eyebrow}>De principio a fin</p>
        <h2 id="como-se-juega-title" className={`mt-3 ${sectionTitle}`}>
          Una mano, <span className="italic text-brand-gold-light">paso a paso</span>
        </h2>
        <p className={`${lead} mb-14`}>Así avanza cada mano en la mesa. El servidor controla las cartas, los turnos y los pagos.</p>
        <HandTimeline />
      </div>
    </section>
  )
}

function HandOfCards({ cards, label }: { cards: readonly Card[]; label: string }) {
  return (
    <div className="flex gap-2" role="img" aria-label={label}>
      {cards.map((card) => (
        <PlayingCard key={cardId(card)} card={card} sizes={HAND_CARD_SIZES} decorative className="w-[23%] max-w-[5.5rem]" />
      ))}
    </div>
  )
}

function TieBreak() {
  const manoPoints = handPoints(TIE_BREAK_EXAMPLE.mano)
  const rivalPoints = handPoints(TIE_BREAK_EXAMPLE.rival)

  return (
    <section id="empates" aria-labelledby="empates-title" className={`${styles.felt} ${styles.rim} px-5 py-20 sm:px-8 md:py-28 lg:px-14`}>
      <div className="mx-auto max-w-[90rem]">
        <p className={eyebrow}>Cuando las manos se parecen</p>
        <h2 id="empates-title" className={`mt-3 ${sectionTitle}`}>
          Así se <span className="italic text-brand-gold-light">desempata</span>
        </h2>
        <p className={lead}>
          La Mano suma un punto extra solo para desempatar. Si después de ese punto siguen iguales, el pozo se divide.
        </p>

        <div className="mt-12 grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-xl border border-[#8b6b2e]/60 bg-black/25 p-5 sm:p-6">
            <h3 className="text-xl font-bold text-text-premium">La Mano: Segunda de {manoPoints}</h3>
            <div className="mt-4">
              <HandOfCards cards={TIE_BREAK_EXAMPLE.mano} label={`Segunda de Bastos: As, 4, 3 y 2, ${manoPoints} puntos`} />
            </div>
            <p className="mt-4 text-lg text-[#d9d3bf]">
              {manoPoints} + 1 por ser La Mano = <strong className="text-brand-gold-light">{manoPoints + 1}</strong>
            </p>
          </div>
          <p className="text-center font-display text-3xl font-bold italic text-[#c5a059]" aria-hidden="true">
            vs
          </p>
          <div className="rounded-xl border border-[#8b6b2e]/60 bg-black/25 p-5 sm:p-6">
            <h3 className="text-xl font-bold text-text-premium">Rival: Segunda de {rivalPoints}</h3>
            <div className="mt-4">
              <HandOfCards cards={TIE_BREAK_EXAMPLE.rival} label={`Segunda de Espadas: As, 5, 3 y 2, ${rivalPoints} puntos`} />
            </div>
            <p className="mt-4 text-lg text-[#d9d3bf]">
              Se queda en <strong className="text-brand-gold-light">{rivalPoints}</strong>
            </p>
          </div>
        </div>

        <p className="mt-8 rounded-lg border border-brand-gold/60 bg-[#0a2c20] px-5 py-4 text-xl font-bold text-text-premium">
          {manoPoints + 1} contra {rivalPoints}: empate exacto, el pozo se divide entre los dos.
        </p>
        <a href="#desempates" className={`mt-4 ${officialLink}`}>
          Leer regla oficial §{chapterNumber('desempates')}
        </a>
      </div>
    </section>
  )
}

const MONEY_CARDS = [
  {
    icon: Clock3,
    title: 'Tiempos',
    lines: ['120 segundos para cada turno.', '30 segundos para decidir si llevas juego.', '60 segundos para volver si se cae tu conexión.'],
    ref: 'tiempos',
  },
  {
    icon: Coins,
    title: 'Rake del 5%',
    lines: [
      'El club cobra el 5% de cada pozo que se entrega.',
      'Pozo de $100.000: $5.000 de rake y $95.000 para quien gana.',
      'Si hay empate, primero se descuenta el 5% y luego se divide.',
    ],
    ref: 'rake',
  },
  {
    icon: RotateCcw,
    title: 'Devoluciones',
    lines: [
      'La apuesta que nadie iguala se te devuelve, sin comisión.',
      'Reiniciar el pique no cobra una entrada nueva.',
      'Si una mano se cancela por una falla, se devuelve lo que corresponda.',
    ],
    ref: 'economia',
  },
] as const

function TimeAndMoney() {
  return (
    <section id="tiempo-y-dinero" aria-labelledby="tiempo-y-dinero-title" className="bg-[#0a0a0a] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[90rem]">
        <p className={eyebrow}>Lo que debes saber</p>
        <h2 id="tiempo-y-dinero-title" className={`mt-3 ${sectionTitle}`}>
          Tiempo y <span className="italic text-brand-gold-light">dinero</span>
        </h2>
        <ul className="mt-12 grid list-none gap-0 p-0 md:grid-cols-3">
          {MONEY_CARDS.map(({ icon: Icon, title, lines, ref }) => (
            <li
              key={title}
              className="border-t border-[#8b6b2e]/45 py-8 md:border-l md:border-t-0 md:px-8 md:py-2 md:first:border-l-0 md:first:pl-0"
            >
              <Icon className="h-8 w-8 text-brand-gold" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-4 text-2xl font-bold text-text-premium">{title}</h3>
              <ul className="mt-3 space-y-2 pl-5 text-lg leading-relaxed text-[#d9d3bf] marker:text-brand-gold">
                {lines.map((line) => (
                  <li key={line} className="list-disc pl-1">
                    {line}
                  </li>
                ))}
              </ul>
              <a href={`#${ref}`} className={`mt-3 ${officialLink}`}>
                Leer regla oficial §{chapterNumber(ref)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function FullRulebook() {
  return (
    <section id="reglamento" aria-labelledby="reglamento-title" className="border-t border-[#8b6b2e]/45 bg-[#0a0a0a] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[90rem]">
        <p className={eyebrow}>Texto oficial · versión {OFFICIAL_RULEBOOK_VERSION}</p>
        <h2 id="reglamento-title" className={`mt-3 ${sectionTitle}`}>
          Reglamento <span className="italic text-brand-gold-light">completo</span>
        </h2>
        <p className={`${lead} mb-12`}>
          Estas son las reglas que aplica el servidor en cada mano. Toca un capítulo para leerlo. Las reglas del juego y los{' '}
          <Link href="/terms" className="text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4">
            términos y condiciones
          </Link>{' '}
          se leen juntos.
        </p>
        <RulebookAccordion />
      </div>
    </section>
  )
}

export function RulesContent() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-text-premium selection:bg-brand-gold/30">
      <PageNav />
      <main>
        <Hero />
        <CardValues />
        <HandRanking />
        <HowToPlay />
        <TieBreak />
        <TimeAndMoney />
        <FullRulebook />
        <ClosingTable />
      </main>
      <LandingFooter address={LOCAL_LOCATION.address} />
    </div>
  )
}
