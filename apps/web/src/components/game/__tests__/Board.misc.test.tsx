import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Board } from '../Board'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('../PlayerBadge', () => ({ PlayerBadge: ({ player }: { player: { nickname?: string } }) => <div data-testid="player-badge">{player?.nickname ?? 'VACÍO'}</div> }))
jest.mock('../ActionControls', () => ({
  ActionControls: ({ onBetConfirm, onBetClear, onClearSelection, totalBet, pasoJuegoChoice, onPasoJuegoResolved }: any) => (
    <div data-testid="action-controls">
      <span data-testid="total-bet">{totalBet}</span>
      <button type="button" onClick={onBetConfirm}>Confirmar apuesta</button>
      <button type="button" onClick={onBetClear}>Limpiar apuesta</button>
      <button type="button" onClick={onClearSelection}>Limpiar selección</button>
      {pasoJuegoChoice && <button type="button" onClick={onPasoJuegoResolved}>Resolver paso juego</button>}
    </div>
  ),
}))
jest.mock('../ChipSelector', () => ({
  ChipSelector: ({ onAdd, onRemove, totalBet, disabledChips }: any) => (
    <div data-testid="chip-selector">
      <span data-testid="chip-total">{totalBet}</span>
      <span data-testid="disabled-chips">{(disabledChips ?? []).join(',')}</span>
      <button type="button" onClick={() => onAdd(500000)}>Agregar chip</button>
      <button type="button" onClick={() => onRemove(500000)}>Quitar chip</button>
    </div>
  ),
}))
jest.mock('../GameAnnouncer', () => ({ GameAnnouncer: ({ customMessage }: { customMessage?: string | null }) => <div data-testid="game-announcer">{customMessage ?? 'announcer'}</div> }))
jest.mock('../Card', () => ({ Card: ({ value, suit, isHidden, className }: any) => <div data-testid="card" data-hidden={String(Boolean(isHidden))} className={className}>{value ? `${value}-${suit}` : 'back'}</div> }))
jest.mock('../ShowdownCinematic', () => ({ ShowdownCinematic: ({ onDismiss, pot, piquePot }: any) => <div data-testid="showdown">showdown:{pot}:{piquePot}<button type="button" onClick={onDismiss}>Dismiss showdown</button></div> }))
jest.mock('../PiqueRevealOverlay', () => ({ PiqueRevealOverlay: () => <div data-testid="pique-overlay" /> }))
jest.mock('../AnimationLayer', () => ({ AnimationLayer: () => <div data-testid="animation-layer" /> }))
jest.mock('../ShuffleAnimation', () => ({ ShuffleAnimation: () => <div data-testid="shuffle-animation" /> }))
jest.mock('../ManoIcon', () => ({ ManoIcon: () => <div data-testid="mano-icon" /> }))
jest.mock('@/hooks/useCardPreloader', () => ({ useCardPreloader: jest.fn() }))
jest.mock('@/utils/handEvaluation', () => ({ evaluateHand: jest.fn(() => ({ type: 'NINGUNA', points: 0 })) }))
jest.mock('@/utils/format', () => ({ formatCurrency: (value: number) => `$${value}` }))

function createRoom() {
  let adminStatusHandler: ((msg: { active: boolean }) => void) | null = null
  return {
    sessionId: 'player-1',
    state: {
      dealerId: 'player-1',
      phase: 'PIQUE',
      turnPlayerId: 'player-1',
      bottomCard: '07-O',
      lastAction: 'Ganador ocultando cartas',
    },
    send: jest.fn(),
    onMessage: jest.fn((type: string, handler: (msg: { active: boolean }) => void) => {
      if (type === 'admin:status') adminStatusHandler = handler
    }),
    emitAdminStatus(active: boolean) {
      adminStatusHandler?.({ active })
    },
  } as any
}

const players = [
  { id: 'player-1', nickname: 'Chepe', chips: 10000, connected: true, revealedCards: '', cardCount: 0, turnOrder: 1, isWaiting: false },
  { id: 'player-2', nickname: 'Ana', chips: 9000, connected: true, revealedCards: '', cardCount: 0, turnOrder: 2, isWaiting: false },
]

describe('Board misc guards and banners', () => {
  it('retorna null cuando room es null', () => {
    const { container } = render(<Board room={null} phase="PIQUE" pot={0} piquePot={0} players={players} />)
    expect(container.firstChild).toBeNull()
  })

  it('muestra banner de admin observando cuando llega admin:status', async () => {
    const room = createRoom()
    render(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={players} />)

    act(() => {
      room.emitAdminStatus(true)
    })

    expect(await screen.findByText(/el equipo de soporte está observando la mesa/i)).toBeInTheDocument()
  })

  it('muestra estado waiting del jugador propio y CTA básicos del tablero', () => {
    const room = createRoom()
    const waitingPlayers = [{ ...players[0], isWaiting: true }, players[1]]
    render(<Board room={room} phase="PIQUE" pot={1000} piquePot={500} players={waitingPlayers} />)

    expect(screen.getByText(/esperando próxima partida/i)).toBeInTheDocument()
    expect(screen.getByText('$1000')).toBeInTheDocument()
    expect(screen.getByText('$500')).toBeInTheDocument()
  })

  it('muestra intro, shuffle y overlays de reveal/showdown según fase', () => {
    const room = createRoom()
    const { rerender } = render(<Board room={room} phase="STARTING" pot={0} piquePot={0} players={players} />)
    expect(screen.getByText(/primera rebirada/i)).toBeInTheDocument()

    rerender(<Board room={room} phase="BARAJANDO" pot={0} piquePot={0} players={players} />)
    expect(screen.getByTestId('shuffle-animation')).toBeInTheDocument()

    rerender(<Board room={room} phase="PIQUE_REVEAL" pot={0} piquePot={500} players={players} />)
    expect(screen.getByTestId('pique-overlay')).toBeInTheDocument()

    rerender(<Board room={room} phase="SHOWDOWN" pot={1000} piquePot={500} players={players} />)
    expect(screen.getByTestId('showdown')).toHaveTextContent('showdown:1000:500')
    fireEvent.click(screen.getByRole('button', { name: /dismiss showdown/i }))
    expect(room.send).toHaveBeenCalledWith('dismiss-showdown')
  })

  it('permite mostrar u ocultar cartas al ganador en SHOWDOWN_WAIT', () => {
    const room = createRoom()
    room.state.phase = 'SHOWDOWN_WAIT'
    room.state.turnPlayerId = 'player-1'

    render(<Board room={room} phase="SHOWDOWN_WAIT" pot={1000} piquePot={0} players={players} />)

    fireEvent.click(screen.getByRole('button', { name: /^mostrar$/i }))
    fireEvent.click(screen.getByRole('button', { name: /no mostrar/i }))

    expect(room.send).toHaveBeenCalledWith('show-muck', { action: 'show' })
    expect(room.send).toHaveBeenCalledWith('show-muck', { action: 'hide' })
  })

  it('muestra espera de decisión para no ganadores en SHOWDOWN_WAIT', () => {
    const room = createRoom()
    room.state.phase = 'SHOWDOWN_WAIT'
    room.state.turnPlayerId = 'player-2'

    render(<Board room={room} phase="SHOWDOWN_WAIT" pot={1000} piquePot={0} players={players} />)

    expect(screen.getByText(/esperando decisión del ganador/i)).toBeInTheDocument()
    expect(screen.getByText(/ganador ocultando cartas/i)).toBeInTheDocument()
  })

  it('permite seleccionar cartas en descarte y limpiar selección desde ActionControls', async () => {
    const room = createRoom()
    room.state.phase = 'DESCARTE'
    room.state.turnPlayerId = 'player-1'

    render(<Board room={room} phase="DESCARTE" pot={0} piquePot={0} players={players} myCards="01-O,02-C" />)

    expect(screen.getByText(/selecciona las cartas/i)).toBeInTheDocument()
    const firstCard = screen.getByText('1-O').closest('div')!
    fireEvent.click(firstCard)
    expect(screen.getByText('1-O')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /limpiar selección/i }))
  })

  it('suma fichas, confirma apuesta y limpia chipCounts', async () => {
    const room = createRoom()
    room.state.phase = 'PIQUE'
    room.state.turnPlayerId = 'player-1'

    const richPlayers = [{ ...players[0], chips: 1_000_000 }, players[1]]
    render(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={richPlayers} disabledChips={[1000]} />)

    expect(screen.getByTestId('disabled-chips')).toHaveTextContent('1000')
    fireEvent.click(screen.getByRole('button', { name: /agregar chip/i }))
    await waitFor(() => expect(screen.getByTestId('chip-total')).toHaveTextContent('500000'))

    fireEvent.click(screen.getByRole('button', { name: /confirmar apuesta/i }))
    expect(room.send).toHaveBeenCalledWith('action', { action: 'voy', amount: 500000 })
    await waitFor(() => expect(screen.getByTestId('chip-total')).toHaveTextContent('0'))
  })

  it('no permite agregar fichas por encima del saldo disponible', () => {
    const room = createRoom()
    room.state.phase = 'PIQUE'
    room.state.turnPlayerId = 'player-1'
    const lowChipPlayers = [{ ...players[0], chips: 100 }, players[1]]

    render(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={lowChipPlayers} />)

    fireEvent.click(screen.getByRole('button', { name: /agregar chip/i }))
    expect(screen.getByTestId('chip-total')).toHaveTextContent('0')
  })

  it('muestra prompt de paso-juego y ejecuta callback al resolverlo', () => {
    const room = createRoom()
    const onPasoJuegoResolved = jest.fn()

    render(
      <Board
        room={room}
        phase="PIQUE"
        pot={0}
        piquePot={0}
        players={players}
        pasoJuegoChoice={{ hasJuego: true, handType: 'TRIO' }}
        onPasoJuegoResolved={onPasoJuegoResolved}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /resolver paso juego/i }))
    expect(onPasoJuegoResolved).toHaveBeenCalled()
  })
})
