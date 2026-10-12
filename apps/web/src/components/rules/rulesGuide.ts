/**
 * Guía visual de /rules: resumen en lenguaje sencillo del reglamento oficial.
 * El texto vinculante sigue siendo `src/lib/official-rulebook.ts`; cada paso enlaza
 * al capítulo oficial por su `id`.
 */
import { OFFICIAL_RULEBOOK, type RulebookSection } from '@/lib/official-rulebook'
import type { Card } from '@/components/landing/primeraHands'

/** Número de capítulo ("§7") de un id del reglamento. */
export function chapterNumber(id: string): number {
  const index = OFFICIAL_RULEBOOK.findIndex((section) => section.id === id)
  if (index === -1) throw new Error(`Capítulo inexistente en el reglamento: ${id}`)
  return index + 1
}

export const KEY_FACTS = [
  { value: '28', label: 'cartas en la baraja' },
  { value: '4', label: 'cartas por mano' },
  { value: '7', label: 'jugadores como máximo' },
  { value: '5%', label: 'de rake por pozo' },
  { value: '60 s', label: 'para reconectarte' },
] as const

export interface TimelineStep {
  readonly id: string
  readonly title: string
  readonly text: string
  readonly actions?: readonly string[]
  /** Capítulos oficiales que desarrollan este paso. */
  readonly refs: readonly string[]
}

export const HAND_TIMELINE: readonly TimelineStep[] = [
  {
    id: 'paso-mano',
    title: 'Se elige La Mano',
    text: 'En la primera mano se reparte una carta a cada jugador hasta que sale un Oro: quien lo recibe es La Mano. Después rota por los asientos. La Mano habla primero y tiene ventaja en los empates.',
    refs: ['inicio'],
  },
  {
    id: 'paso-pique',
    title: 'El pique, con dos cartas',
    text: 'Cada jugador recibe dos cartas. La Mano fija el precio del pique y cada uno decide si entra. Si solo una persona entra, se le devuelve su aporte y se reparte de nuevo.',
    actions: ['Voy', 'Paso'],
    refs: ['pique', 'banda'],
  },
  {
    id: 'paso-completar',
    title: 'Se completan cuatro cartas',
    text: 'Quienes siguen en juego reciben dos cartas más, una por ronda, hasta tener cuatro.',
    refs: ['completar'],
  },
  {
    id: 'paso-apuesta',
    title: 'Primera apuesta del pozo',
    text: 'Con las cuatro cartas se abre el pozo principal, empezando por La Mano. Puedes pasar, igualar, subir o apostar todo lo que tienes.',
    actions: ['Paso', 'Igualar', 'Subir', 'Resto'],
    refs: ['apuesta-cuatro'],
  },
  {
    id: 'paso-llevo',
    title: '¿Llevas juego?',
    text: 'Si pasas frente a una apuesta teniendo Segunda, Chivo o Primera, puedes decir Llevo Juego: sales del pozo principal pero sigues peleando el pique. Si todos pasan y alguien tiene juego, hay 30 segundos para decidir.',
    actions: ['Llevo Juego', 'No Llevo'],
    refs: ['llevo-juego', 'validacion'],
  },
  {
    id: 'paso-descarte',
    title: 'Descarte',
    text: 'Cambias las cartas que no te sirvan o te quedas con las cuatro. Las nuevas salen del fondo del mazo.',
    refs: ['descarte'],
  },
  {
    id: 'paso-fondo',
    title: 'Carta del fondo',
    text: 'Se muestra una carta del fondo durante unos segundos. Es solo informativa: no cambia puntos, apuestas ni ganador.',
    refs: ['carta-fondo'],
  },
  {
    id: 'paso-guerra',
    title: 'Guerra y Cánticos',
    text: 'Nueva ronda de apuestas con tus cartas definitivas. Si en Guerra alguien apostó, se juega una ronda más: Cánticos.',
    actions: ['Paso', 'Igualar', 'Voy', 'Resto'],
    refs: ['guerra', 'canticos'],
  },
  {
    id: 'paso-declarar',
    title: 'Se declara el juego',
    text: 'Si nadie tiene juego, gana quien tenga más puntos. Si lo tiene uno, gana y muestra sus cartas. Si son varios, apuestan entre ellos en la Guerra de Juego.',
    refs: ['declaracion', 'guerra-juego'],
  },
  {
    id: 'paso-showdown',
    title: 'Se muestran las cartas',
    text: 'Quienes siguen en juego muestran sus cartas y el servidor entrega cada pozo a la mejor mano. Si hay empate exacto, el pozo se divide.',
    refs: ['desempates', 'showdown', 'all-in'],
  },
]

/** Ejemplo oficial del capítulo de desempates: Segunda de 55 de La Mano contra Segunda de 56. */
export const TIE_BREAK_EXAMPLE: { readonly mano: readonly Card[]; readonly rival: readonly Card[] } = {
  mano: [
    { rank: 1, suit: 'bastos' },
    { rank: 4, suit: 'bastos' },
    { rank: 3, suit: 'bastos' },
    { rank: 2, suit: 'bastos' },
  ],
  rival: [
    { rank: 1, suit: 'espadas' },
    { rank: 5, suit: 'espadas' },
    { rank: 3, suit: 'espadas' },
    { rank: 2, suit: 'espadas' },
  ],
}

export interface RulebookGroup {
  readonly id: string
  readonly title: string
  readonly sections: readonly RulebookSection[]
}

const GROUP_RANGES = [
  { id: 'bloque-preparacion', title: 'Preparación', from: 1, to: 5 },
  { id: 'bloque-jugar', title: 'Jugar la mano', from: 6, to: 18 },
  { id: 'bloque-resolver', title: 'Resolver la mano', from: 19, to: 21 },
  { id: 'bloque-dinero', title: 'Dinero', from: 22, to: 23 },
  { id: 'bloque-conducta', title: 'Conducta y tiempos', from: 24, to: 27 },
] as const

/** Los capítulos oficiales agrupados por bloque, sin alterar su orden ni su texto. */
export const RULEBOOK_GROUPS: readonly RulebookGroup[] = GROUP_RANGES.map(({ id, title, from, to }) => ({
  id,
  title,
  sections: OFFICIAL_RULEBOOK.slice(from - 1, to),
}))

/**
 * Separa el párrafo del glosario ("Término: definición. Término: definición.") en pares,
 * sin cambiar ni una palabra.
 */
export function parseGlossary(paragraph: string): { term: string; definition: string }[] {
  return paragraph
    .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ][^:.]{0,30}:)/)
    .map((entry) => {
      const colon = entry.indexOf(':')
      return { term: entry.slice(0, colon).trim(), definition: entry.slice(colon + 1).trim() }
    })
}
