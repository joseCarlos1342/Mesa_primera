import { describe, expect, it, vi } from 'vitest';
import { Player } from '../../../schemas/GameState';
import { reemplazoDescartePhase } from '../ReemplazoDescartePhase';

type PhaseRoom = Parameters<typeof reemplazoDescartePhase.enter>[0];

interface IntervalHandle {
  clear: ReturnType<typeof vi.fn>;
}

interface TestRoom {
  state: {
    phase: string;
    activeManoId: string;
    players: Map<string, Player>;
  };
  seatOrder: string[];
  deck: string[];
  clock: {
    setInterval: ReturnType<typeof vi.fn>;
  };
  setPlayerCards: ReturnType<typeof vi.fn>;
  startPhaseRevealBottomCard: ReturnType<typeof vi.fn>;
  intervalHandle: IntervalHandle;
  intervalTick?: () => void;
}

function makePlayer(id: string, pendingDiscardCards: string[], cards = '') {
  const p = new Player();
  p.id = id;
  p.connected = true;
  p.isFolded = false;
  p.cards = cards;
  p.pendingDiscardCards = pendingDiscardCards;
  return p;
}

function room(players: Map<string, Player>, deck: string[] = ['7-O']): TestRoom {
  const intervalHandle = { clear: vi.fn() };
  const r: TestRoom = {
    state: {
      phase: 'DESCARTE',
      activeManoId: 'p1',
      players,
    },
    seatOrder: Array.from(players.keys()),
    deck,
    clock: {
      setInterval: vi.fn((tick: () => void) => {
        r.intervalTick = tick;
        return intervalHandle;
      }),
    },
    setPlayerCards: vi.fn((sessionId: string, cards: string) => {
      players.get(sessionId)!.cards = cards;
    }),
    startPhaseRevealBottomCard: vi.fn(),
    intervalHandle,
  };

  return r;
}

function enter(r: TestRoom) {
  reemplazoDescartePhase.enter(r as unknown as PhaseRoom);
}

describe('ReemplazoDescartePhase', () => {
  it('protege el intervalo si vuelve a ejecutarse después de completar el reparto', () => {
    const players = new Map([['p1', makePlayer('p1', ['old-card'], '1-O')]]);
    const r = room(players, ['7-O']);

    enter(r);
    r.intervalTick!();
    r.intervalTick!();

    expect(r.setPlayerCards).toHaveBeenCalledWith('p1', '1-O,7-O');
    expect(players.get('p1')!.pendingDiscardCards).toEqual([]);
    expect(r.intervalHandle.clear).toHaveBeenCalledTimes(2);
    expect(r.startPhaseRevealBottomCard).toHaveBeenCalledTimes(2);
  });

  it('salta un jugador si ya no tiene cartas pendientes al ejecutarse su tick', () => {
    const p1 = makePlayer('p1', ['old-card'], '1-O');
    const players = new Map([['p1', p1]]);
    const r = room(players, ['7-O']);

    enter(r);
    p1.pendingDiscardCards = [];
    r.intervalTick!();

    expect(r.setPlayerCards).not.toHaveBeenCalled();
    expect(r.intervalHandle.clear).toHaveBeenCalledTimes(1);
    expect(r.startPhaseRevealBottomCard).toHaveBeenCalledTimes(1);
  });
});
