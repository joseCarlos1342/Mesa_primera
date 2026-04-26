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

  it('no filtra cartas privadas de frames futuros al frame inicial', () => {
    // Bug histórico: el controller construía un mapa global recorriendo todos
    // los frames, lo que hacía que el primer frame mostrara cartas reveladas
    // en SHOWDOWN. La fuente de verdad debe ser progresiva (0..index).
    const frame0 = baseFrame(0, 'BARAJANDO', 0);
    // limpia privateCards y cardCount para frame inicial
    frame0.players = frame0.players.map(p => ({ ...p, cardCount: 0, privateCards: undefined }));
    const frame3 = baseFrame(3, 'SHOWDOWN', 5000);
    frame3.players = [
      { ...frame3.players[0], privateCards: ['12-O', '11-C', '10-E', '01-B'] },
      { ...frame3.players[1], privateCards: ['07-O', '05-C', '03-E', '06-B'] },
    ];
    const frames: ReplayFrame[] = [frame0, baseFrame(1, 'PIQUE', 0), baseFrame(2, 'DESCARTE', 0), frame3];

    render(<ReplayController frames={frames} />);

    // Index 0 no debe pintar ninguna carta de frente.
    expect(document.querySelectorAll('[data-card-hidden="false"]').length).toBe(0);
  });

  it('no usa final_hands como fallback en pasos intermedios', () => {
    const frame0 = baseFrame(0, 'BARAJANDO', 0);
    frame0.players = frame0.players.map(p => ({ ...p, cardCount: 0, privateCards: undefined }));
    const frames: ReplayFrame[] = [frame0, baseFrame(1, 'PIQUE', 0)];
    const finalHands = {
      u1: { cards: '12-O,11-C,10-E,01-B', nickname: 'Alice' },
      u2: { cards: '07-O,05-C,03-E,06-B', nickname: 'Bob' },
    };

    render(<ReplayController frames={frames} finalHands={finalHands} />);

    expect(document.querySelectorAll('[data-card-hidden="false"]').length).toBe(0);
  });

  it('en móvil, pulsar play solicita fullscreen y muestra controles flotantes', async () => {
    const requestFullscreen = jest.fn().mockResolvedValue(undefined);
    // El fullscreen NO debe pedirse sobre documentElement (toda la app),
    // sino sobre el contenedor de la mesa. Mockeamos el prototipo de
    // HTMLDivElement para capturar la llamada del target específico.
    const originalProtoRfs = (HTMLElement.prototype as any).requestFullscreen;
    (HTMLElement.prototype as any).requestFullscreen = requestFullscreen;
    const originalMm = window.matchMedia;
    (window as any).matchMedia = jest.fn().mockImplementation((q: string) => ({
      matches: q.includes('max-width'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));

    try {
      render(<ReplayController frames={FRAMES} intervalMs={1000} />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('replay-play'));
      });
      expect(requestFullscreen).toHaveBeenCalled();
      // El primer argumento `this` (target) debe ser el wrapper, no el HTML root.
      const callTarget = requestFullscreen.mock.instances[0] as HTMLElement;
      expect(callTarget).not.toBe(document.documentElement);
      expect(callTarget?.getAttribute('data-testid')).toBe('replay-fullscreen-target');

      // Simula entrada en fullscreen para que aparezcan controles flotantes
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => callTarget,
      });
      await act(async () => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });
      expect(screen.getByTestId('replay-floating-controls')).toBeInTheDocument();
      expect(screen.getByTestId('replay-floating-exit')).toBeInTheDocument();
    } finally {
      (HTMLElement.prototype as any).requestFullscreen = originalProtoRfs;
      (window as any).matchMedia = originalMm;
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => null,
      });
    }
  });
});
