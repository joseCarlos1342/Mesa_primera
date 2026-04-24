import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReplayController } from '../ReplayController';
import type { ReplayFrame } from '@/types/replay';

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

function baseFrame(seq: number, phase: string, pot: number): ReplayFrame {
  return {
    seq,
    ts: 1_700_000_000_000 + seq * 1000,
    eventIdx: seq,
    phase,
    dealerId: 'p1',
    activeManoId: 'p1',
    turnPlayerId: 'p2',
    pot,
    piquePot: 0,
    currentMaxBet: 500,
    bottomCard: '07-O',
    countdown: 30,
    players: [
      {
        id: 'p1', userId: 'u1', nickname: 'Alice', avatarUrl: '',
        chips: 10000, turnOrder: 1, roundBet: 0, cardCount: 4,
        revealedCards: [], isDealer: true, isFolded: false, isAllIn: false,
        isWaiting: false, isConnected: true, hasActed: false,
      },
      {
        id: 'p2', userId: 'u2', nickname: 'Bob', avatarUrl: '',
        chips: 8000, turnOrder: 2, roundBet: 0, cardCount: 4,
        revealedCards: [], isDealer: false, isFolded: false, isAllIn: false,
        isWaiting: false, isConnected: true, hasActed: false,
      },
    ],
  };
}

const FRAMES: ReplayFrame[] = [
  baseFrame(0, 'PIQUE', 0),
  baseFrame(1, 'DESCARTE', 1000),
  baseFrame(2, 'APUESTA_4_CARTAS', 3000),
  baseFrame(3, 'SHOWDOWN', 5000),
];

describe('ReplayController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renderiza el primer frame por defecto', () => {
    render(<ReplayController frames={FRAMES} />);
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/pique/i);
  });

  it('avanza al siguiente frame al pulsar el botón siguiente', () => {
    render(<ReplayController frames={FRAMES} />);
    fireEvent.click(screen.getByTestId('replay-next'));
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/descarte/i);
  });

  it('retrocede al frame previo', () => {
    render(<ReplayController frames={FRAMES} initialIndex={2} />);
    fireEvent.click(screen.getByTestId('replay-prev'));
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/descarte/i);
  });

  it('no retrocede por debajo de 0', () => {
    render(<ReplayController frames={FRAMES} />);
    fireEvent.click(screen.getByTestId('replay-prev'));
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/pique/i);
  });

  it('no avanza más allá del último frame', () => {
    render(<ReplayController frames={FRAMES} initialIndex={FRAMES.length - 1} />);
    fireEvent.click(screen.getByTestId('replay-next'));
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/showdown/i);
  });

  it('muestra el contador de frames "N / total"', () => {
    render(<ReplayController frames={FRAMES} initialIndex={1} />);
    expect(screen.getByTestId('replay-counter')).toHaveTextContent('2 / 4');
  });

  it('play autoavanza frames en intervalos', () => {
    render(<ReplayController frames={FRAMES} intervalMs={1000} />);
    fireEvent.click(screen.getByTestId('replay-play'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/descarte/i);
  });

  it('pausa el autoavance', () => {
    render(<ReplayController frames={FRAMES} intervalMs={1000} />);
    fireEvent.click(screen.getByTestId('replay-play'));
    fireEvent.click(screen.getByTestId('replay-play'));
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/pique/i);
  });

  it('detiene autoplay en el último frame', () => {
    render(<ReplayController frames={FRAMES} intervalMs={500} />);
    fireEvent.click(screen.getByTestId('replay-play'));
    act(() => { jest.advanceTimersByTime(10_000); });
    expect(screen.getByTestId('replay-counter')).toHaveTextContent('4 / 4');
  });

  it('permite cambiar velocidad y la expone en el data-speed', () => {
    render(<ReplayController frames={FRAMES} intervalMs={1000} />);
    const speed2 = screen.getByTestId('replay-speed-2');
    fireEvent.click(speed2);
    expect(screen.getByTestId('replay-root')).toHaveAttribute('data-speed', '2');
  });

  it('flechas del teclado navegan entre frames', () => {
    render(<ReplayController frames={FRAMES} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/descarte/i);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('replay-phase')).toHaveTextContent(/pique/i);
  });

  it('muestra mensaje degradado si no hay frames', () => {
    render(<ReplayController frames={[]} />);
    expect(screen.getByTestId('replay-empty')).toBeInTheDocument();
  });
});
