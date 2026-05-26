import { act, render, screen } from '@testing-library/react'
import { AnimationLayer } from '../AnimationLayer'
import { ShuffleAnimation } from '../ShuffleAnimation'
import { gsap } from 'gsap'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
    span: ({ children, animate: _animate, transition: _transition, ...props }: React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>) => <span {...props}>{children}</span>,
  },
}))

jest.mock('../Card', () => ({
  Card: ({ suit, value, isHidden }: { suit: string; value: number; isHidden: boolean }) => (
    <div data-testid="card-face">{`${value}-${suit}-${isHidden ? 'hidden' : 'visible'}`}</div>
  ),
}))

let useGSAPCallback: (() => void) | null = null

jest.mock('@gsap/react', () => ({
  useGSAP: (callback: () => void) => {
    useGSAPCallback = callback
  },
}))

type TimelineMock = {
  addLabel: jest.Mock<TimelineMock>
  set: jest.Mock<TimelineMock>
  to: jest.Mock<TimelineMock>
}

const timelineApi = {} as TimelineMock
timelineApi.addLabel = jest.fn(() => timelineApi)
timelineApi.set = jest.fn(() => timelineApi)
timelineApi.to = jest.fn(() => timelineApi)

jest.mock('gsap', () => ({
  gsap: {
    matchMedia: jest.fn(() => ({ add: jest.fn((_, callback) => callback()) })),
    timeline: jest.fn(() => timelineApi),
  },
}))

function addAnchor(id: string, rect: Partial<DOMRect>) {
  const el = document.createElement('div')
  el.id = id
  el.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: jest.fn(),
    ...rect,
  } as DOMRect))
  document.body.appendChild(el)
  return el
}

describe('AnimationLayer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  it('no renderiza si no hay animaciones activas', () => {
    const { container } = render(<AnimationLayer />)

    expect(container).toBeEmptyDOMElement()
  })

  it('anima cartas repartidas boca abajo y las remueve al terminar', () => {
    addAnchor('deck-center', { left: 10, top: 20, width: 40, height: 40 })
    addAnchor('seat-player-1', { left: 200, top: 100, width: 80, height: 80 })

    const { container } = render(<AnimationLayer />)

    act(() => {
      window.dispatchEvent(new CustomEvent('animate-deal', {
        detail: { toPlayerId: 'player-1', cards: ['1-Oros', '7-Copas'] },
      }))
    })

    expect(container.innerHTML.match(/card-back-rooster/g)).toHaveLength(2)

    act(() => {
      jest.advanceTimersByTime(600)
    })

    expect(container).toBeEmptyDOMElement()
  })

  it('anima descartes boca arriba usando Card', () => {
    addAnchor('deck-center', { left: 10, top: 20, width: 40, height: 40 })
    addAnchor('seat-player-2', { left: 200, top: 100, width: 80, height: 80 })

    render(<AnimationLayer />)

    act(() => {
      window.dispatchEvent(new CustomEvent('animate-discard', {
        detail: { fromPlayerId: 'player-2', cards: ['12-Espadas'], isFaceUp: true },
      }))
    })

    expect(screen.getByTestId('card-face')).toHaveTextContent('12-Espadas-visible')
  })

  it('ignora eventos si faltan anclas DOM y limpia listeners al desmontar', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener')
    const { container, unmount } = render(<AnimationLayer />)

    act(() => {
      window.dispatchEvent(new CustomEvent('animate-deal', {
        detail: { toPlayerId: 'missing', cards: ['1-Oros'] },
      }))
    })

    expect(container).toBeEmptyDOMElement()

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('animate-deal', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('animate-discard', expect.any(Function))
  })
})

describe('ShuffleAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useGSAPCallback = null
  })

  it('renderiza banner y diez cartas de barajado', () => {
    const { container } = render(<ShuffleAnimation />)

    expect(screen.getByText('Preparando la partida')).toBeInTheDocument()
    expect(screen.getByText(/Barajando/)).toBeInTheDocument()
    expect(container.querySelectorAll('.sc')).toHaveLength(10)
  })

  it('configura la timeline GSAP cuando el deck esta disponible', () => {
    render(<ShuffleAnimation />)

    useGSAPCallback?.()

    expect(gsap.matchMedia).toHaveBeenCalled()
    expect(gsap.timeline).toHaveBeenCalledWith({ repeat: -1 })
    expect(timelineApi.addLabel).toHaveBeenCalledWith('c1', 0)
    expect(timelineApi.addLabel).toHaveBeenCalledWith('c2', 5)
    expect(timelineApi.addLabel).toHaveBeenCalledWith('end', 10)
    expect(timelineApi.set).toHaveBeenCalled()
    expect(timelineApi.to).toHaveBeenCalled()
  })
})
