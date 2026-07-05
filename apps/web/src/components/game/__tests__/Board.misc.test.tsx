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
  ActionControls: ({ onBetConfirm, onBetClear, onClearSelection, selectedCards, totalBet, pasoJuegoChoice, onPasoJuegoResolved }: any) => (
    <div data-testid="action-controls">
      <span data-testid="total-bet">{totalBet}</span>
      <span data-testid="selected-count">{selectedCards.length}</span>
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

  it('usa fallback de palo para la carta inferior del mazo si el palo es desconocido', () => {
    const room = createRoom()
    room.state.bottomCard = '12-X'

    const { container } = render(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={players} />)

    const bottomCardImage = container.querySelector('img[src="/cards/12-x.png?v=3"]')
    expect(bottomCardImage).toBeInTheDocument()
  })

  it('muestra defaults del HUD y ordinal cuando el jugador local no es la mano', () => {
    const room = createRoom()
    room.state.dealerId = 'player-2'
    const playersWithoutChips = [{ ...players[0], chips: undefined, turnOrder: 2 }, players[1]]

    render(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={playersWithoutChips} myCards="01-O" />)

    expect(screen.getAllByText('$0').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('2ª')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: /agregar chip/i }))
    await waitFor(() => expect(screen.getByTestId('chip-total')).toHaveTextContent('1000000'))

    fireEvent.click(screen.getByRole('button', { name: /quitar chip/i }))
    await waitFor(() => expect(screen.getByTestId('chip-total')).toHaveTextContent('500000'))

    fireEvent.click(screen.getByRole('button', { name: /quitar chip/i }))
    await waitFor(() => expect(screen.getByTestId('chip-total')).toHaveTextContent('0'))

    fireEvent.click(screen.getByRole('button', { name: /agregar chip/i }))
    await waitFor(() => expect(screen.getByTestId('chip-total')).toHaveTextContent('500000'))

    fireEvent.click(screen.getByRole('button', { name: /confirmar apuesta/i }))
    expect(room.send).toHaveBeenCalledWith('action', { action: 'voy', amount: 500000 })
    await waitFor(() => expect(screen.getByTestId('chip-total')).toHaveTextContent('0'))
  })

  it('ignora quitar fichas cuando no hay conteo previo', () => {
    const room = createRoom()
    room.state.phase = 'PIQUE'
    room.state.turnPlayerId = 'player-1'

    render(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={players} />)

    fireEvent.click(screen.getByRole('button', { name: /quitar chip/i }))
    expect(screen.getByTestId('chip-total')).toHaveTextContent('0')
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

  it('no selecciona cartas si no es turno de descarte', () => {
    const room = createRoom()
    room.state.phase = 'PIQUE'
    room.state.turnPlayerId = 'player-1'

    render(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={players} myCards="01-O" />)

    fireEvent.click(screen.getByText('1-O').closest('div')!)

    expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
  })

  it('dispara animación de reparto para cartas privadas nuevas sin tratar hidratación inicial como deal', async () => {
    const room = createRoom()
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    room.state.phase = 'LOBBY'

    const { rerender } = render(<Board room={room} phase="LOBBY" pot={0} piquePot={0} players={players} myCards="" />)

    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'animate-deal' }))

    room.state.phase = 'PIQUE'
    rerender(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={players} myCards="01-O,02-C" />)

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'animate-deal',
        detail: { toPlayerId: 'player-1', cards: ['01-O', '02-C'], isFaceUp: true },
      }))
    })

    dispatchSpy.mockRestore()
  })

  it('dispara animación de descarte cuando desaparecen cartas privadas', async () => {
    const room = createRoom()
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    room.state.phase = 'LOBBY'

    const { rerender } = render(<Board room={room} phase="LOBBY" pot={0} piquePot={0} players={players} myCards="01-O,02-C" />)

    room.state.phase = 'DESCARTE'
    rerender(<Board room={room} phase="DESCARTE" pot={0} piquePot={0} players={players} myCards="02-C" />)

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'animate-discard',
        detail: { fromPlayerId: 'player-1', cards: ['01-O'] },
      }))
    })

    dispatchSpy.mockRestore()
  })

  it('anima cartas traseras de oponentes cuando aumenta cardCount fuera de reveal', async () => {
    const room = createRoom()
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    room.state.phase = 'LOBBY'
    const initialPlayers = [players[0], { ...players[1], cardCount: 0 }]

    const { rerender } = render(<Board room={room} phase="LOBBY" pot={0} piquePot={0} players={initialPlayers} />)

    room.state.phase = 'PIQUE'
    rerender(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={[players[0], { ...players[1], cardCount: 2 }]} />)

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'animate-deal',
        detail: expect.objectContaining({ toPlayerId: 'player-2', isFaceUp: false }),
      }))
    })
    const dealEvent = dispatchSpy.mock.calls.find(([event]) => event.type === 'animate-deal')?.[0] as CustomEvent
    expect(dealEvent.detail.cards).toHaveLength(2)
    expect(dealEvent.detail.cards[0]).toMatch(/^back-/)

    dispatchSpy.mockRestore()
  })

  it('anima cartas reveladas de oponentes durante showdown', async () => {
    const room = createRoom()
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    room.state.phase = 'LOBBY'
    const initialPlayers = [players[0], { ...players[1], revealedCards: '' }]

    const { rerender } = render(<Board room={room} phase="LOBBY" pot={0} piquePot={0} players={initialPlayers} />)

    room.state.phase = 'SHOWDOWN'
    rerender(<Board room={room} phase="SHOWDOWN" pot={0} piquePot={0} players={[players[0], { ...players[1], revealedCards: '03-E' }]} />)

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'animate-deal',
        detail: { toPlayerId: 'player-2', cards: ['03-E'], isFaceUp: true },
      }))
    })

    dispatchSpy.mockRestore()
  })

  it('representa stack plegado y cartas reveladas de oponentes según estado', () => {
    const room = createRoom()
    room.state.phase = 'PIQUE'

    const { rerender } = render(
      <Board room={room} phase="PIQUE" pot={0} piquePot={0} players={[players[0], { ...players[1], cardCount: 3, isFolded: true }]} />,
    )

    expect(screen.getAllByTestId('card').filter(card => card.dataset.hidden === 'true')).toHaveLength(2)

    rerender(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={[players[0], { ...players[1], revealedCards: '04-B', isFolded: true }]} />)

    expect(screen.getByText('4-B')).toBeInTheDocument()
    expect(screen.getByText('4-B').closest('[class*="grayscale"]')).toBeInTheDocument()
  })

  it('usa fallback centrado para transferencia de mano si los asientos no están en el DOM', () => {
    const room = createRoom()
    room.state.phase = 'PIQUE'
    const getElementByIdSpy = jest.spyOn(document, 'getElementById')
    getElementByIdSpy.mockReturnValue(null)

    const { rerender } = render(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={players} />)

    room.state.dealerId = 'player-2'
    rerender(<Board room={room} phase="PIQUE" pot={0} piquePot={0} players={players} />)

    expect(screen.getByText(/ana es la nueva mano/i)).toBeInTheDocument()
    expect(screen.getByTestId('mano-icon')).toBeInTheDocument()

    getElementByIdSpy.mockRestore()
  })
})
