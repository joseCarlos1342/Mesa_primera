import { describe, expect, it, vi } from 'vitest';
import { revealBottomCardPhase } from '../RevealBottomCardPhase';

type PhaseRoom = Parameters<typeof revealBottomCardPhase.enter>[0];

interface TestRoom {
  deck: string[];
  state: {
    phase: string;
    bottomCard: string;
  };
  clearTurnTimer: ReturnType<typeof vi.fn>;
  clock: {
    setTimeout: ReturnType<typeof vi.fn>;
  };
  startPhase5Guerra: ReturnType<typeof vi.fn>;
}

function room(deck: string[]): TestRoom {
  return {
    deck,
    state: {
      phase: 'COMPLETAR_DESCARTE',
      bottomCard: 'previous-bottom',
    },
    clearTurnTimer: vi.fn(),
    clock: {
      setTimeout: vi.fn((callback: () => void) => callback()),
    },
    startPhase5Guerra: vi.fn(),
  };
}

function enter(r: TestRoom) {
  revealBottomCardPhase.enter(r as unknown as PhaseRoom);
}

describe('RevealBottomCardPhase', () => {
  it('mantiene la carta inferior previa cuando el mazo está vacío y agenda guerra', () => {
    const r = room([]);

    enter(r);

    expect(r.clearTurnTimer).toHaveBeenCalledTimes(1);
    expect(r.state.phase).toBe('REVELAR_CARTA');
    expect(r.state.bottomCard).toBe('previous-bottom');
    expect(r.clock.setTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
    expect(r.startPhase5Guerra).toHaveBeenCalledTimes(1);
  });
});
