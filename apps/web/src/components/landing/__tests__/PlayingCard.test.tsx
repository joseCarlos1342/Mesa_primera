import { render, screen } from '@testing-library/react'
import { OFFICIAL_RULEBOOK } from '@/lib/official-rulebook'
import { PlayingCard } from '../PlayingCard'
import {
  CARD_POINTS,
  DECK,
  TEACHING_HANDS,
  cardImage,
  cardName,
  classifyHand,
  handPoints,
  rankLabel,
} from '../primeraHands'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}))

describe('primeraHands', () => {
  it('usa los valores oficiales del reglamento', () => {
    const values = OFFICIAL_RULEBOOK.find((section) => section.id === 'valores')!
    for (const [rank, points] of Object.entries(CARD_POINTS)) {
      const label = rank === '1' ? 'As' : rank
      expect(values.bullets).toContain(`${label} = ${points} puntos`)
    }
  })

  it('arma la baraja de 28 cartas con imágenes reales', () => {
    expect(DECK).toHaveLength(28)
    expect(new Set(DECK.map(cardImage)).size).toBe(28)
    expect(cardImage({ rank: 1, suit: 'oros' })).toBe('/cards/01-oros.png')
    expect(cardName({ rank: 1, suit: 'espadas' })).toBe('As de Espadas')
    expect(rankLabel(7)).toBe('7')
  })

  it('sigue la jerarquía Segunda > Chivo > Primera > Puntos del reglamento', () => {
    const hierarchy = OFFICIAL_RULEBOOK.find((section) => section.id === 'jerarquia')
    const bullets = hierarchy?.bullets ?? OFFICIAL_RULEBOOK.flatMap((section) => section.bullets ?? [])
    const order = TEACHING_HANDS.map((hand) => hand.title)
    expect(order).toEqual(['Segunda', 'Chivo', 'Primera', 'Puntos'])
    order.forEach((title, index) => {
      expect(bullets.some((bullet) => bullet.startsWith(`${index + 1}. ${title}`))).toBe(true)
    })
  })

  it('cada mano de ejemplo es realmente la combinación que enseña', () => {
    for (const hand of TEACHING_HANDS) {
      expect(hand.cards).toHaveLength(4)
      expect(classifyHand(hand.cards)).toBe(hand.kind)
    }
  })

  it('calcula los puntos que anuncia cada ejemplo', () => {
    expect(handPoints(TEACHING_HANDS[0].cards)).toBe(70)
    expect(TEACHING_HANDS[0].example).toContain('70 puntos')
    expect(handPoints(TEACHING_HANDS[3].cards)).toBe(39)
    expect(TEACHING_HANDS[3].example).toContain('39 puntos')
    expect(handPoints([])).toBe(0)
  })
})

describe('PlayingCard', () => {
  it('describe la carta cuando no es decorativa', () => {
    render(<PlayingCard card={{ rank: 6, suit: 'copas' }} sizes="100px" lit />)

    const image = screen.getByRole('img', { name: '6 de Copas' })
    expect(image).toHaveAttribute('src', '/cards/06-copas.png')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image.closest('[data-card]')).toHaveAttribute('data-lit', 'true')
  })

  it('reparte boca abajo y se oculta a lectores cuando es decorativa', () => {
    const { container } = render(
      <PlayingCard card={{ rank: 1, suit: 'bastos' }} sizes="50px" decorative deal dealIndex={5} loading="eager" />,
    )

    const card = container.querySelector('[data-card="1-bastos"]') as HTMLElement
    expect(card).toHaveAttribute('aria-hidden', 'true')
    expect(card.style.getPropertyValue('--deal-i')).toBe('5')
    expect(card).not.toHaveAttribute('data-lit')
    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(2)
    expect(images[1]).toHaveAttribute('src', '/images/card-back-web.webp')
    expect(images[0]).toHaveAttribute('loading', 'eager')
  })
})
