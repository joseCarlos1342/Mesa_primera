import { render, screen } from '@testing-library/react'

import { Board } from '../Board'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('../PlayerBadge', () => ({ PlayerBadge: ({ player }: { player: { nickname?: string } }) => <div data-testid="player-badge">{player?.nickname ?? 'VACÍO'}</div> }))
jest.mock('../ActionControls', () => ({ ActionControls: () => <div data-testid="action-controls" /> }))
jest.mock('../ChipSelector', () => ({ ChipSelector: () => <div data-testid="chip-selector" /> }))
jest.mock('../GameAnnouncer', () => ({ GameAnnouncer: ({ customMessage }: { customMessage?: string | null }) => <div data-testid="game-announcer">{customMessage ?? 'announcer'}</div> }))
jest.mock('../Card', () => ({ Card: () => <div data-testid="card" /> }))
jest.mock('../ShowdownCinematic', () => ({ ShowdownCinematic: () => <div data-testid="showdown" /> }))
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

    room.emitAdminStatus(true)

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
})
