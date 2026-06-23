import { describe, expect, it, vi } from 'vitest';
import { Player } from '../../../schemas/GameState';
import { piquePhase, sorteoPhase } from '../SorteoPhase';

type SorteoRoom = Parameters<typeof sorteoPhase.enter>[0];
type PiqueRoom = Parameters<typeof piquePhase.enter>[0];

interface IntervalHandle {
  clear: ReturnType<typeof vi.fn>;
}

interface TestRoom {
  deck: string[];
  seatOrder: string[];
  state: {
    phase: string;
    dealerId: string;
    activeManoId: string;
    lastAction: string;
    currentMaxBet: number;
    players: Map<string, Player>;
  };
  piquePassPlayerIds: Set<string>;
  piquePreBetPasserIds: Set<string>;
  piqueReopenActive: boolean;
  piqueReopenPendingIds: Set<string>;
  clearTurnTimer: ReturnType<typeof vi.fn>;
  createDeck: ReturnType<typeof vi.fn>;
  shuffleDeck: ReturnType<typeof vi.fn>;
  setPlayerCards: ReturnType<typeof vi.fn>;
  assignTurnOrders: ReturnType<typeof vi.fn>;
  transferMano: ReturnType<typeof vi.fn>;
  advanceTurnPhase2: ReturnType<typeof vi.fn>;
  clock: {
    setTimeout: ReturnType<typeof vi.fn>;
    setInterval: ReturnType<typeof vi.fn>;
  };
  timeouts: Array<() => void>;
  intervalTick?: () => void;
  intervalHandle: IntervalHandle;
}

function makePlayer(id: string, nickname: string) {
  const p = new Player();
  p.id = id;
  p.nickname = nickname;
  p.connected = true;
  p.isFolded = false;
  p.cards = '';
  p.revealedCards = 'visible';
  p.hasActed = true;
  return p;
}

function room(overrides: Partial<TestRoom> = {}): TestRoom {
  const players = new Map([
    ['p1', makePlayer('p1', 'Player 1')],
    ['p2', makePlayer('p2', 'Player 2')],
  ]);
  const intervalHandle = { clear: vi.fn() };
  const r: TestRoom = {
    deck: [],
    seatOrder: ['p1', 'p2'],
    state: {
      phase: 'LOBBY',
      dealerId: 'p1',
      activeManoId: '',
      lastAction: '',
      currentMaxBet: 500,
      players,
    },
    piquePassPlayerIds: new Set(['old-pass']),
    piquePreBetPasserIds: new Set(['old-pre-pass']),
    piqueReopenActive: true,
    piqueReopenPendingIds: new Set(['old-reopen']),
    clearTurnTimer: vi.fn(),
    createDeck: vi.fn(),
    shuffleDeck: vi.fn(),
    setPlayerCards: vi.fn((sessionId: string, cards: string) => {
      players.get(sessionId)!.cards = cards;
    }),
    assignTurnOrders: vi.fn(),
    transferMano: vi.fn(),
    advanceTurnPhase2: vi.fn(),
    timeouts: [],
    intervalHandle,
    clock: {
      setTimeout: vi.fn((callback: () => void) => {
        r.timeouts.push(callback);
        return { clear: vi.fn() };
      }),
      setInterval: vi.fn((callback: () => void) => {
        r.intervalTick = callback;
        return intervalHandle;
      }),
    },
    ...overrides,
  };

  return r;
}

function enterSorteo(r: TestRoom) {
  sorteoPhase.enter(r as unknown as SorteoRoom);
}

async function enterPique(r: TestRoom, opts?: { skipAnte?: boolean }) {
  await piquePhase.enter(r as unknown as PiqueRoom, opts);
}

describe('SorteoPhase branch behavior', () => {
  it('avanza al pique sin asignar nueva mano cuando el mazo se agota sin oro', () => {
    const r = room({ deck: ['7-C'] });

    enterSorteo(r);
    r.timeouts.shift()!();
    r.timeouts.shift()!();
    r.intervalTick!();
    r.intervalTick!();

    expect(r.setPlayerCards).toHaveBeenCalledWith('p1', '7-C', true);
    expect(r.assignTurnOrders).not.toHaveBeenCalled();
    expect(r.state.dealerId).toBe('p1');
    expect(r.intervalHandle.clear).toHaveBeenCalledTimes(1);
    expect(r.timeouts).toHaveLength(1);
  });

  it('asigna La Mano cuando un jugador saca oro', () => {
    const r = room({ deck: ['1-O'] });

    enterSorteo(r);
    r.timeouts.shift()!();
    r.timeouts.shift()!();
    r.intervalTick!();
    r.intervalTick!();

    expect(r.state.dealerId).toBe('p1');
    expect(r.state.lastAction).toBe('¡Player 1 sacó ORO y es La Mano!');
    expect(r.assignTurnOrders).toHaveBeenCalledTimes(1);
  });

  it('pique usa el primer asiento si la mano activa no está en seatOrder', async () => {
    const r = room({ deck: ['2-C', '3-E'], seatOrder: ['p1', 'p2'] });
    r.state.dealerId = 'missing-dealer';

    await enterPique(r, { skipAnte: true });
    r.timeouts.shift()!();
    r.intervalTick!();

    expect(r.state.activeManoId).toBe('missing-dealer');
    expect(r.setPlayerCards).toHaveBeenLastCalledWith('p1', '3-E,2-C');
    expect(r.state.lastAction).toBe('');
  });

  it('pique conserva la segunda carta si la primera extracción no devuelve carta', async () => {
    const r = room();
    const pop = vi.fn()
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('5-O');
    r.deck = { pop } as unknown as string[];

    await enterPique(r);
    r.timeouts.shift()!();
    r.intervalTick!();

    expect(r.setPlayerCards).toHaveBeenLastCalledWith('p1', '5-O');
    expect(r.state.lastAction).toBe('Nueva mano iniciada.');
  });
});
