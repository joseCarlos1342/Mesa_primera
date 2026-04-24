import { render, screen } from '@testing-library/react';
import { ReplayBoard } from '../ReplayBoard';
import type { ReplayFrame } from '@/types/replay';

// Mock framer-motion para renderizado sincrónico
jest.mock('framer-motion', () => {
  const React = require('react');
  const passthrough = (tag: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ...props, ref }, children),
    );
  return {
    m: new Proxy({}, { get: (_t, prop: string) => passthrough(prop) }),
    motion: new Proxy({}, { get: (_t, prop: string) => passthrough(prop) }),
    AnimatePresence: ({ children }: any) => children,
    LazyMotion: ({ children }: any) => children,
    domAnimation: {},
    useReducedMotion: () => false,
  };
});

function makeFrame(overrides: Partial<ReplayFrame> = {}): ReplayFrame {
  return {
    seq: 0,
    ts: 1_700_000_000_000,
    eventIdx: 0,
    phase: 'PIQUE',
    dealerId: 'p1',
    activeManoId: 'p1',
    turnPlayerId: 'p2',
    pot: 500_000,
    piquePot: 100_000,
    currentMaxBet: 50_000,
    bottomCard: '07-O',
    countdown: 30,
    players: [
      {
        id: 'p1',
        userId: 'u1',
        nickname: 'Alice',
        avatarUrl: '',
        chips: 1_000_000,
        turnOrder: 1,
        roundBet: 50_000,
        cardCount: 4,
        revealedCards: [],
        isDealer: true,
        isFolded: false,
        isAllIn: false,
        isWaiting: false,
        isConnected: true,
        hasActed: true,
      },
      {
        id: 'p2',
        userId: 'u2',
        nickname: 'Bob',
        avatarUrl: '',
        chips: 800_000,
        turnOrder: 2,
        roundBet: 0,
        cardCount: 4,
        revealedCards: [],
        isDealer: false,
        isFolded: false,
        isAllIn: false,
        isWaiting: false,
        isConnected: true,
        hasActed: false,
      },
    ],
    ...overrides,
  };
}

describe('ReplayBoard', () => {
  it('renderiza nicknames de todos los jugadores del frame', () => {
    render(<ReplayBoard frame={makeFrame()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('muestra el bote principal y el bote de pique formateados', () => {
    render(<ReplayBoard frame={makeFrame()} />);
    expect(screen.getByTestId('replay-pot-main')).toHaveTextContent('5.000');
    expect(screen.getByTestId('replay-pot-pique')).toHaveTextContent('1.000');
  });

  it('muestra la fase actual en español', () => {
    render(<ReplayBoard frame={makeFrame({ phase: 'DESCARTE' })} />);
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/descarte/i);
  });

  it('marca al jugador de la mano (dealer) con indicador Mano', () => {
    render(<ReplayBoard frame={makeFrame()} />);
    const aliceCard = screen.getByTestId('replay-player-p1');
    expect(aliceCard).toHaveTextContent('Mano');
  });

  it('marca al jugador en turno con el atributo data-active="true"', () => {
    render(<ReplayBoard frame={makeFrame()} />);
    expect(screen.getByTestId('replay-player-p1')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('replay-player-p2')).toHaveAttribute('data-active', 'true');
  });

  it('renderiza cardCount dorsos cuando no hay cartas privadas', () => {
    render(<ReplayBoard frame={makeFrame()} />);
    const aliceCards = screen.getByTestId('replay-player-p1-cards');
    expect(aliceCards.querySelectorAll('[data-card-hidden="true"]').length).toBe(4);
    expect(aliceCards.querySelectorAll('[data-card-hidden="false"]').length).toBe(0);
  });

  it('revela cartas privadas en SHOWDOWN', () => {
    const frame = makeFrame({
      phase: 'SHOWDOWN',
      players: [
        { ...makeFrame().players[0], privateCards: ['12-O', '11-C', '10-E', '01-B'] },
        makeFrame().players[1],
      ],
    });
    render(<ReplayBoard frame={frame} />);
    const aliceCards = screen.getByTestId('replay-player-p1-cards');
    expect(aliceCards.querySelectorAll('[data-card-hidden="false"]').length).toBe(4);
  });

  it('muestra el jugador foldeado con data-folded="true"', () => {
    const frame = makeFrame();
    frame.players[1].isFolded = true;
    render(<ReplayBoard frame={frame} />);
    expect(screen.getByTestId('replay-player-p2')).toHaveAttribute('data-folded', 'true');
  });

  it('muestra el chip stack de cada jugador', () => {
    render(<ReplayBoard frame={makeFrame()} />);
    expect(screen.getByTestId('replay-player-p1-chips')).toHaveTextContent('10.000');
    expect(screen.getByTestId('replay-player-p2-chips')).toHaveTextContent('8.000');
  });
});
