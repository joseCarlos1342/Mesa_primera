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
    jest.useFakeTimers()
    jest.clearAllMocks()
    useGSAPCallback = null
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
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

    const resetConfig = timelineApi.set.mock.calls[0][1] as {
      y: (index: number) => number
      rotation: (index: number) => number
      zIndex: (index: number) => number
    }
    expect(resetConfig.y(4)).toBe(-2)
    expect(resetConfig.rotation(4)).toBeCloseTo(-0.175)
    expect(resetConfig.zIndex(4)).toBe(4)

    const squareUpCall = timelineApi.to.mock.calls.find((call) => Array.isArray(call[0]) && typeof call[1]?.y === 'function')
    const squareUpConfig = squareUpCall?.[1] as {
      y: (index: number) => number
      rotation: (index: number) => number
    }
    expect(squareUpConfig.y(6)).toBe(-3)
    expect(squareUpConfig.rotation(6)).toBeCloseTo(0.525)
  })

  it('reproduce sonido al iniciar cada ciclo de barajado', () => {
    const setOscillatorFrequency = jest.fn()
    const rampOscillatorFrequency = jest.fn()
    const startOscillator = jest.fn()
    const stopOscillator = jest.fn()
    const oscillator = {
      type: 'triangle',
      frequency: {
        setValueAtTime: setOscillatorFrequency,
        exponentialRampToValueAtTime: rampOscillatorFrequency,
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: startOscillator,
      stop: stopOscillator,
      onended: null as null | (() => void),
    }
    const startSource = jest.fn()
    const stopSource = jest.fn()
    const connectSource = jest.fn()
    const disconnectSource = jest.fn()
    const source = {
      buffer: null,
      connect: connectSource,
      disconnect: disconnectSource,
      start: startSource,
      stop: stopSource,
      onended: null as null | (() => void),
    }
    const setFilterFrequency = jest.fn()
    const filter = {
      type: 'bandpass',
      frequency: { setValueAtTime: setFilterFrequency },
      Q: { value: 0 },
      connect: jest.fn(),
      disconnect: jest.fn(),
    }
    const setGain = jest.fn()
    const rampGain = jest.fn()
    const gain = {
      gain: {
        setValueAtTime: setGain,
        exponentialRampToValueAtTime: rampGain,
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    }
    const createBuffer = jest.fn((_channels: number, frames: number) => ({
      getChannelData: jest.fn(() => new Float32Array(frames)),
    }))
    const createBufferSource = jest.fn(() => source)
    const createOscillator = jest.fn(() => oscillator)
    const createBiquadFilter = jest.fn(() => filter)
    const createGain = jest.fn(() => gain)
    const close = jest.fn(() => Promise.resolve())
    const audioContextMock = jest.fn(() => ({
      state: 'running',
      sampleRate: 48_000,
      currentTime: 0,
      destination: {},
      createBuffer,
      createBufferSource,
      createOscillator,
      createBiquadFilter,
      createGain,
      close,
    }))

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: audioContextMock,
    })

    const { unmount } = render(<ShuffleAnimation />)

    expect(audioContextMock).toHaveBeenCalledTimes(1)
    expect(createBuffer).toHaveBeenNthCalledWith(1, 1, 57_600, 48_000)
    expect(createBuffer).toHaveBeenNthCalledWith(2, 1, 33_600, 48_000)
    expect(createBufferSource).toHaveBeenCalledTimes(2)
    expect(createOscillator).toHaveBeenCalledTimes(1)
    expect(startSource).toHaveBeenCalledTimes(2)
    expect(stopSource).toHaveBeenCalledTimes(2)
    expect(startOscillator).toHaveBeenCalledTimes(1)
    expect(stopOscillator).toHaveBeenCalledTimes(1)
    expect(rampOscillatorFrequency).toHaveBeenCalled()
    expect(setFilterFrequency).toHaveBeenCalledWith(1350, 0)
    expect(setFilterFrequency).toHaveBeenCalledWith(760, 1.02)
    expect(rampGain).toHaveBeenCalledWith(0.2, 0.04)
    expect(rampGain).toHaveBeenCalledWith(0.08, 1.08)
    expect(rampGain).toHaveBeenCalledWith(0.075, 1.12)

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(createBufferSource).toHaveBeenCalledTimes(4)
    expect(createOscillator).toHaveBeenCalledTimes(2)
    expect(startSource).toHaveBeenCalledTimes(4)
    expect(stopSource).toHaveBeenCalledTimes(4)
    expect(startOscillator).toHaveBeenCalledTimes(2)
    expect(stopOscillator).toHaveBeenCalledTimes(2)

    unmount()

    expect(close).toHaveBeenCalledTimes(1)
  })

  it('desconecta nodos de audio cuando terminan oscillator y buffer sources', () => {
    const oscillator = {
      type: 'triangle',
      frequency: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null as null | (() => void),
    }
    const createdSources = [0, 1].map(() => ({
      buffer: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null as null | (() => void),
    }))
    const sourceQueue = [...createdSources]
    const filters = [0, 1, 2].map(() => ({
      type: 'bandpass',
      frequency: { setValueAtTime: jest.fn() },
      Q: { value: 0 },
      connect: jest.fn(),
      disconnect: jest.fn(),
    }))
    const gains = [0, 1, 2].map(() => ({
      gain: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    }))
    let filterIndex = 0
    let gainIndex = 0
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: jest.fn(() => ({
        sampleRate: 48_000,
        currentTime: 0,
        destination: {},
        createBuffer: jest.fn((_channels: number, frames: number) => ({
          getChannelData: jest.fn(() => new Float32Array(frames)),
        })),
        createBufferSource: jest.fn(() => sourceQueue.shift()),
        createOscillator: jest.fn(() => oscillator),
        createBiquadFilter: jest.fn(() => filters[filterIndex++]),
        createGain: jest.fn(() => gains[gainIndex++]),
        close: jest.fn(() => Promise.resolve()),
      })),
    })

    const { unmount } = render(<ShuffleAnimation />)
    oscillator.onended?.()
    createdSources[0]?.onended?.()
    createdSources[1]?.onended?.()

    expect(oscillator.disconnect).toHaveBeenCalledTimes(1)
    expect(filters[0].disconnect).toHaveBeenCalledTimes(1)
    expect(gains[0].disconnect).toHaveBeenCalledTimes(1)
    expect(filters[1].disconnect).toHaveBeenCalledTimes(1)
    expect(gains[1].disconnect).toHaveBeenCalledTimes(1)
    expect(filters[2].disconnect).toHaveBeenCalledTimes(1)
    expect(gains[2].disconnect).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('mantiene la animación si audio no está disponible o está bloqueado', () => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined })
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined })

    const unavailable = render(<ShuffleAnimation />)
    expect(screen.getByText(/Barajando/)).toBeInTheDocument()
    unavailable.unmount()

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: jest.fn(() => {
        throw new Error('blocked')
      }),
    })

    const blocked = render(<ShuffleAnimation />)
    expect(screen.getByText(/Barajando/)).toBeInTheDocument()
    blocked.unmount()
  })
})
