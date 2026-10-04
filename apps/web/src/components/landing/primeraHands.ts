/**
 * Datos de la baraja y de las manos que enseña la landing.
 * Fuente de verdad: reglamento oficial (`src/lib/official-rulebook.ts`, v4.0.0),
 * secciones "Valores de las cartas" y "Jerarquía y valoración".
 */

export const SUITS = ['oros', 'copas', 'espadas', 'bastos'] as const
export type Suit = (typeof SUITS)[number]

export const RANKS = [1, 2, 3, 4, 5, 6, 7] as const
export type Rank = (typeof RANKS)[number]

export interface Card {
  readonly rank: Rank
  readonly suit: Suit
}

export const SUIT_LABEL: Record<Suit, string> = {
  oros: 'Oros',
  copas: 'Copas',
  espadas: 'Espadas',
  bastos: 'Bastos',
}

/** Puntos oficiales por carta. El As vale 16, no 1. */
export const CARD_POINTS: Record<Rank, number> = {
  1: 16,
  2: 12,
  3: 13,
  4: 14,
  5: 15,
  6: 18,
  7: 21,
}

export function rankLabel(rank: Rank): string {
  return rank === 1 ? 'As' : String(rank)
}

export function cardId(card: Card): string {
  return `${String(card.rank).padStart(2, '0')}-${card.suit}`
}

export function cardImage(card: Card): string {
  return `/cards/${cardId(card)}.png`
}

export function cardName(card: Card): string {
  return `${rankLabel(card.rank)} de ${SUIT_LABEL[card.suit]}`
}

/** Las 28 cartas en orden de tablero: una fila por palo, del As al 7. */
export const DECK: readonly Card[] = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))

export type HandKind = 'segunda' | 'chivo' | 'primera' | 'puntos'

/** Suma más alta dentro de un mismo palo. */
export function handPoints(cards: readonly Card[]): number {
  const bySuit = new Map<Suit, number>()
  for (const card of cards) {
    bySuit.set(card.suit, (bySuit.get(card.suit) ?? 0) + CARD_POINTS[card.rank])
  }
  return Math.max(0, ...bySuit.values())
}

/** Clasifica una mano de cuatro cartas según la jerarquía oficial. */
export function classifyHand(cards: readonly Card[]): HandKind {
  const suits = new Set(cards.map((card) => card.suit))
  if (suits.size === 1) return 'segunda'

  const hasChivo = SUITS.some((suit) =>
    [1, 6, 7].every((rank) => cards.some((card) => card.suit === suit && card.rank === rank)),
  )
  if (hasChivo) return 'chivo'

  if (suits.size === SUITS.length) return 'primera'
  return 'puntos'
}

export interface TeachingHand {
  readonly kind: HandKind
  readonly title: string
  readonly rule: string
  readonly example: string
  readonly cards: readonly Card[]
}

export const TEACHING_HANDS: readonly TeachingHand[] = [
  {
    kind: 'segunda',
    title: 'Segunda',
    rule: 'Las cuatro cartas son del mismo palo.',
    example: 'As, 5, 6 y 7 de Copas: 70 puntos.',
    cards: [
      { rank: 1, suit: 'copas' },
      { rank: 5, suit: 'copas' },
      { rank: 6, suit: 'copas' },
      { rank: 7, suit: 'copas' },
    ],
  },
  {
    kind: 'chivo',
    title: 'Chivo',
    rule: 'As, 6 y 7 del mismo palo, más una cuarta carta.',
    example: 'As, 6 y 7 de Oros con el 3 de Bastos.',
    cards: [
      { rank: 1, suit: 'oros' },
      { rank: 6, suit: 'oros' },
      { rank: 7, suit: 'oros' },
      { rank: 3, suit: 'bastos' },
    ],
  },
  {
    kind: 'primera',
    title: 'Primera',
    rule: 'Una carta de cada palo.',
    example: '7 de Oros, 6 de Copas, As de Espadas y 5 de Bastos.',
    cards: [
      { rank: 7, suit: 'oros' },
      { rank: 6, suit: 'copas' },
      { rank: 1, suit: 'espadas' },
      { rank: 5, suit: 'bastos' },
    ],
  },
  {
    kind: 'puntos',
    title: 'Puntos',
    rule: 'Sin combinación superior, cuenta la suma más alta dentro de un mismo palo.',
    example: '7 y 6 de Espadas suman 39 puntos.',
    cards: [
      { rank: 7, suit: 'espadas' },
      { rank: 6, suit: 'espadas' },
      { rank: 4, suit: 'oros' },
      { rank: 2, suit: 'bastos' },
    ],
  },
]
