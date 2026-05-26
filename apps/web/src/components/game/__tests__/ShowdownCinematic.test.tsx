import { fireEvent, render, screen } from '@testing-library/react'
import { ShowdownCinematic } from '../ShowdownCinematic'
import gsap from 'gsap'

let useGSAPCallback: (() => void) | null = null

jest.mock('@gsap/react', () => ({
  useGSAP: (callback: () => void) => {
    useGSAPCallback = callback
  },
}))

type TimelineMock = { fromTo: jest.Mock<TimelineMock> }
const timelineApi = {} as TimelineMock
timelineApi.fromTo = jest.fn(() => timelineApi)

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    matchMedia: jest.fn(() => ({ add: jest.fn((_, callback) => callback()) })),
    timeline: jest.fn(() => timelineApi),
    set: jest.fn(),
  },
}))

jest.mock('../ManoIcon', () => ({
  ManoIcon: () => <span data-testid="mano-icon">MANO</span>,
}))

jest.mock('@/utils/handEvaluation', () => ({
  evaluateHand: jest.fn((cards: string) => {
    if (cards.includes('7-Oros')) return { type: 'PRIMERA', points: 7 }
    if (cards.includes('12-Espadas')) return { type: 'CHIVO', points: 2 }
    if (cards.includes('1-Copas')) return { type: 'NINGUNA', points: 29 }
    return { type: 'NINGUNA', points: 1 }
  }),
}))

describe('ShowdownCinematic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useGSAPCallback = null
  })

  it('no renderiza si no hay jugadores activos con cartas reveladas', () => {
    const { container } = render(
      <ShowdownCinematic
        players={[{ id: 'p1', nickname: 'Ana', revealedCards: '', isFolded: false }]}
        pot={1000}
        piquePot={0}
        dealerId="p1"
      />
    )

    expect(container).toBeEmptyDOMElement()
    expect(gsap.timeline).not.toHaveBeenCalled()
  })

  it('ordena jugadores, muestra ganador por ranking de mano y permite cerrar', () => {
    const onDismiss = jest.fn()
    render(
      <ShowdownCinematic
        players={[
          { id: 'p2', nickname: 'Luis', revealedCards: '1-Copas,2-Copas', isFolded: false, turnOrder: 2 },
          { id: 'p1', nickname: 'Ana', revealedCards: '7-Oros,6-Oros', isFolded: false, turnOrder: 1 },
          { id: 'folded', nickname: 'Fuera', revealedCards: '12-Espadas', isFolded: true, turnOrder: 3 },
        ]}
        pot={100000}
        piquePot={50000}
        dealerId="p2"
        onDismiss={onDismiss}
      />
    )

    expect(screen.getByText('Mostrando Cartas')).toBeInTheDocument()
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Luis').length).toBeGreaterThan(0)
    expect(screen.queryByText('Fuera')).not.toBeInTheDocument()
    expect(screen.getByAltText('7 de Oros')).toHaveAttribute('src', '/cards/07-oros.png?v=3')
    expect(screen.getByAltText('1 de Copas')).toHaveAttribute('src', '/cards/01-copas.png?v=3')
    expect(screen.getByText(/PRIMERA · 7 pts/)).toBeInTheDocument()
    expect(screen.getByText(/GANADOR/)).toBeInTheDocument()
    expect(screen.getByText('Pique')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cerrar'))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('usa bono de la mano para desempatar por puntos y oculta pique si no existe', () => {
    render(
      <ShowdownCinematic
        players={[
          { id: 'p1', nickname: 'Ana', revealedCards: '1-Copas,2-Copas', isFolded: false, turnOrder: 1 },
          { id: 'p2', nickname: 'Luis', revealedCards: '3-Bastos,4-Bastos', isFolded: false, turnOrder: 2 },
        ]}
        pot={250000}
        piquePot={0}
        dealerId="p1"
      />
    )

    expect(screen.getAllByTestId('mano-icon')).toHaveLength(2)
    expect(screen.getByText(/NINGUNA · 30 pts/)).toBeInTheDocument()
    expect(screen.queryByText('Pique')).not.toBeInTheDocument()
    expect(screen.queryByText('Cerrar')).not.toBeInTheDocument()
  })

  it('configura animaciones normal y reduced-motion cuando el contenedor existe', () => {
    render(
      <ShowdownCinematic
        players={[{ id: 'p1', nickname: 'Ana', revealedCards: '7-Oros,6-Oros', isFolded: false }]}
        pot={100000}
        piquePot={0}
        dealerId="p1"
      />
    )

    useGSAPCallback?.()

    expect(gsap.matchMedia).toHaveBeenCalled()
    expect(gsap.timeline).toHaveBeenCalledWith({ defaults: { ease: 'power2.out' } })
    expect(timelineApi.fromTo).toHaveBeenCalled()
    expect(gsap.set).toHaveBeenCalled()
  })
})
