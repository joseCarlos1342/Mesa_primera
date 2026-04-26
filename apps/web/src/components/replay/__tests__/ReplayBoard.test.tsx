import { render, screen } from '@testing-library/react';
import { ReplayBoard } from '../ReplayBoard';
import { parseCard } from '@/types/replay';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type ReplayFrame } from '@/types/replay';

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

  it('renderiza hasta 7 asientos cuando el frame tiene 7 jugadores', () => {
    const base = makeFrame();
    const players = Array.from({ length: 7 }).map((_, i) => ({
      ...base.players[0],
      id: `p${i + 1}`,
      userId: `u${i + 1}`,
      nickname: `P${i + 1}`,
      turnOrder: i + 1,
      isDealer: i === 0,
    }));
    render(<ReplayBoard frame={{ ...base, players }} />);
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByTestId(`replay-player-p${i}`)).toBeInTheDocument();
    }
  });

  it('renderiza correctamente solo 3 asientos cuando hay 3 jugadores (sin pintar slots vacíos)', () => {
    const base = makeFrame();
    const players = base.players.slice(0, 1).concat([
      { ...base.players[1], id: 'p3', userId: 'u3', nickname: 'Carla', turnOrder: 3 },
      { ...base.players[1], id: 'p4', userId: 'u4', nickname: 'Dani', turnOrder: 4 },
    ]);
    render(<ReplayBoard frame={{ ...base, players }} />);
    expect(screen.getByTestId('replay-player-p1')).toBeInTheDocument();
    expect(screen.getByTestId('replay-player-p3')).toBeInTheDocument();
    expect(screen.getByTestId('replay-player-p4')).toBeInTheDocument();
    // No debería aparecer ningún slot vacío visible
    expect(screen.queryByText('VACÍO')).not.toBeInTheDocument();
  });

  describe('formato de cartas tolerante (replay v2 retrocompatible)', () => {
    it('parseCard acepta el formato canónico "valor-Palo" (1-O, 7-B)', () => {
      expect(parseCard('1-O')).toEqual({ value: 1, suit: 'Oros' });
      expect(parseCard('7-B')).toEqual({ value: 7, suit: 'Bastos' });
      expect(parseCard('12-Copas')).toEqual({ value: 12, suit: 'Copas' });
    });

    it('parseCard acepta el formato compacto histórico (3O, 7B)', () => {
      expect(parseCard('3O')).toEqual({ value: 3, suit: 'Oros' });
      expect(parseCard('7B')).toEqual({ value: 7, suit: 'Bastos' });
      expect(parseCard('5C')).toEqual({ value: 5, suit: 'Copas' });
      expect(parseCard('2E')).toEqual({ value: 2, suit: 'Espadas' });
    });

    it('parseCard devuelve null para cadenas vacías o inválidas', () => {
      expect(parseCard('')).toBeNull();
      expect(parseCard('XX')).toBeNull();
      expect(parseCard('-O')).toBeNull();
    });

    it('renderiza cartas privadas de frente cuando vienen en formato compacto', () => {
      const base = makeFrame();
      const frame = makeFrame({
        phase: 'SHOWDOWN',
        players: [
          { ...base.players[0], privateCards: ['3O', '5C', '7B', '2E'] },
          base.players[1],
        ],
      });
      render(<ReplayBoard frame={frame} />);
      const aliceCards = screen.getByTestId('replay-player-p1-cards');
      expect(aliceCards.querySelectorAll('[data-card-hidden="false"]').length).toBe(4);
      expect(aliceCards.querySelectorAll('[data-card-hidden="true"]').length).toBe(0);
    });
  });

  describe('showdown sin ghosting de cartas reveladas', () => {
    it('jugador foldeado en SHOWDOWN con privateCards no aplica grayscale', () => {
      const base = makeFrame();
      const frame = makeFrame({
        phase: 'SHOWDOWN',
        players: [
          {
            ...base.players[0],
            isFolded: true,
            privateCards: ['1-O', '2-C', '3-E', '4-B'],
          },
          base.players[1],
        ],
      });
      render(<ReplayBoard frame={frame} />);
      const aliceCards = screen.getByTestId('replay-player-p1-cards');
      const cardWrappers = aliceCards.querySelectorAll('[data-card-hidden="false"]');
      expect(cardWrappers.length).toBe(4);
      cardWrappers.forEach(el => {
        expect(el.className).not.toMatch(/grayscale/);
      });
    });

    it('jugador foldeado en SHOWDOWN_WAIT con revealedCards mantiene cartas opacas', () => {
      const base = makeFrame();
      const frame = makeFrame({
        phase: 'SHOWDOWN_WAIT',
        players: [
          {
            ...base.players[0],
            isFolded: true,
            revealedCards: ['1-O', '2-C', '3-E', '4-B'],
          },
          base.players[1],
        ],
      });
      render(<ReplayBoard frame={frame} />);
      const aliceCards = screen.getByTestId('replay-player-p1-cards');
      const cardWrappers = aliceCards.querySelectorAll('[data-card-hidden="false"]');
      expect(cardWrappers.length).toBe(4);
      cardWrappers.forEach(el => {
        expect(el.className).not.toMatch(/grayscale/);
      });
    });

    it('jugador foldeado fuera de showdown sí mantiene tratamiento atenuado', () => {
      const base = makeFrame();
      const frame = makeFrame({
        phase: 'PIQUE',
        players: [
          { ...base.players[0], isFolded: true },
          base.players[1],
        ],
      });
      render(<ReplayBoard frame={frame} />);
      const seat = screen.getByTestId('replay-player-p1');
      expect(seat).toHaveAttribute('data-folded', 'true');
    });
  });

  describe('layout móvil 7 jugadores con anclas separadas', () => {
    function build7PlayerFrame(): ReplayFrame {
      const base = makeFrame();
      const players = Array.from({ length: 7 }).map((_, i) => ({
        ...base.players[0],
        id: `p${i + 1}`,
        userId: `u${i + 1}`,
        nickname: `P${i + 1}`,
        turnOrder: i + 1,
        isDealer: i === 0,
      }));
      return { ...base, players };
    }

    it('cada asiento tiene un ancla de avatar y un ancla de cartas separadas', () => {
      render(<ReplayBoard frame={build7PlayerFrame()} />);
      for (let i = 1; i <= 7; i++) {
        const seat = screen.getByTestId(`replay-player-p${i}`);
        expect(seat.querySelector('[data-seat-zone="avatar"]')).toBeTruthy();
        expect(seat.querySelector('[data-seat-zone="cards"]')).toBeTruthy();
      }
    });

    it('el clúster central queda anclado a la zona inferior (no centrado vertical)', () => {
      render(<ReplayBoard frame={build7PlayerFrame()} />);
      const center = screen.getByTestId('replay-center-cluster');
      // No debe usar items-center (centrado vertical) que arrastra hacia el medio
      expect(center.className).not.toMatch(/\bitems-center\b/);
      // Debe tener algún anclaje inferior explícito (bottom-... o pb-...)
      expect(center.className).toMatch(/\b(bottom-|pb-)/);
    });
  });
});
