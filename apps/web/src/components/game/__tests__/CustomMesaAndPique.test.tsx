import { fireEvent, render, screen } from '@testing-library/react'
import { CustomMesaModal } from '../CustomMesaModal'
import { PiqueRevealOverlay } from '../PiqueRevealOverlay'
import gsap from 'gsap'

let mockUseGSAPCallback: (() => void) | null = null

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@gsap/react', () => ({
  useGSAP: (callback: () => void) => {
    mockUseGSAPCallback = callback
  },
}))

type GsapTimelineMock = { fromTo: jest.Mock<GsapTimelineMock> }
const timelineApi = {} as GsapTimelineMock
timelineApi.fromTo = jest.fn(() => timelineApi)

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    matchMedia: jest.fn(() => ({ add: jest.fn((_, callback) => callback()) })),
    timeline: jest.fn(() => timelineApi),
    set: jest.fn(),
  },
}))

describe('CustomMesaModal', () => {
  it('no renderiza nada cuando esta cerrado', () => {
    render(<CustomMesaModal isOpen={false} onClose={jest.fn()} onCreateMesa={jest.fn()} creating={false} />)

    expect(screen.queryByText('Mesa Personalizada')).not.toBeInTheDocument()
  })

  it('bloquea submit sin nombre y muestra estado creating', () => {
    render(<CustomMesaModal isOpen onClose={jest.fn()} onCreateMesa={jest.fn()} creating />)

    expect(screen.getByText('CREANDO...')).toBeDisabled()
  })

  it('crea una mesa con opciones seleccionadas y nombre normalizado', () => {
    const onCreateMesa = jest.fn()
    render(<CustomMesaModal isOpen onClose={jest.fn()} onCreateMesa={onCreateMesa} creating={false} />)

    fireEvent.change(screen.getByPlaceholderText('Ej: VIP Diamante, Mesa Alta...'), {
      target: { value: '  VIP Diamante  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: '$100,000' }))
    fireEvent.click(screen.getByRole('button', { name: '$20,000' }))
    fireEvent.click(screen.getByRole('button', { name: '$1k ✓' }))
    fireEvent.click(screen.getByRole('button', { name: 'CREAR MESA PERSONALIZADA' }))

    expect(onCreateMesa).toHaveBeenCalledWith({
      tableName: 'VIP Diamante',
      maxPlayers: 5,
      minEntry: 10_000_000,
      minPique: 2_000_000,
      disabledChips: [100_000],
      isCustom: true,
    })
  })

  it('impide crear si todas las fichas quedan deshabilitadas', () => {
    const onCreateMesa = jest.fn()
    render(<CustomMesaModal isOpen onClose={jest.fn()} onCreateMesa={onCreateMesa} creating={false} />)

    fireEvent.change(screen.getByPlaceholderText('Ej: VIP Diamante, Mesa Alta...'), {
      target: { value: 'Mesa sin fichas' },
    })
    for (const chipLabel of ['$1k ✓', '$2k ✓', '$5k ✓', '$10k ✓', '$20k ✓', '$50k ✓']) {
      fireEvent.click(screen.getByRole('button', { name: chipLabel }))
    }

    expect(screen.getByText('Debe haber al menos 1 ficha habilitada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CREAR MESA PERSONALIZADA' })).toBeDisabled()
  })

  it('cierra al hacer click en el backdrop', () => {
    const onClose = jest.fn()
    const { container } = render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={jest.fn()} creating={false} />)

    fireEvent.click(container.firstElementChild!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('PiqueRevealOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGSAPCallback = null
  })

  it('no renderiza si no hay jugador revelado', () => {
    const { container } = render(
      <PiqueRevealOverlay room={{ send: jest.fn() } as any} players={[{ id: 'p1', nickname: 'Ana', revealedCards: '', isFolded: false }]} />
    )

    expect(container).toBeEmptyDOMElement()
    expect(gsap.timeline).not.toHaveBeenCalled()
  })

  it('muestra cartas reveladas por fold y permite continuar', () => {
    const send = jest.fn()
    render(
      <PiqueRevealOverlay
        room={{ send } as any}
        players={[{ id: 'p1', nickname: 'Ana', revealedCards: '1-Oros,7-Copas', isFolded: true }]}
      />
    )

    expect(screen.getByText('Muestra de Juego')).toBeInTheDocument()
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
    expect(screen.getByAltText('1 de Oros')).toHaveAttribute('src', '/cards/01-oros.png?v=3')
    expect(screen.getByAltText('7 de Copas')).toHaveAttribute('src', '/cards/07-copas.png?v=3')
    expect(screen.getByText('2 cartas del mismo palo')).toBeInTheDocument()

    mockUseGSAPCallback?.()
    fireEvent.click(screen.getByText('Continuar'))

    expect(send).toHaveBeenCalledWith('dismiss-reveal')
    expect(gsap.matchMedia).toHaveBeenCalled()
  })

  it('tambien revela cuando el jugador paso con juego', () => {
    render(
      <PiqueRevealOverlay
        room={{ send: jest.fn() } as any}
        players={[{ id: 'p2', nickname: 'Luis', revealedCards: '12-E', isFolded: false, passedWithJuego: true }]}
      />
    )

    expect(screen.getByAltText('12 de E')).toHaveAttribute('src', '/cards/12-espadas.png?v=3')
    mockUseGSAPCallback?.()
    expect(gsap.set).toHaveBeenCalled()
  })
})
