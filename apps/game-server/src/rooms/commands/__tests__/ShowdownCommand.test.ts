import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleDismissReveal,
  handleJuegoValidationResponse,
  handleLlevoJuego,
  handlePasoJuegoResponse,
} from '../ShowdownCommand';

vi.mock('../../../services/SupabaseService', () => ({
  SupabaseService: {
    awardPot: vi.fn().mockResolvedValue(undefined),
  },
}));

function player(overrides: Record<string, any> = {}) {
  return {
    id: 'p1',
    nickname: 'P1',
    cards: '1O,2O,3O,4O',
    chips: 1000,
    connected: true,
    isFolded: false,
    hasActed: false,
    passedWithJuego: false,
    revealedCards: '',
    supabaseUserId: 'user-1',
    ...overrides,
  };
}

function room(overrides: Record<string, any> = {}) {
  const players = new Map<string, any>();
  players.set('p1', player());
  players.set('p2', player({ id: 'p2', nickname: 'P2', cards: '5O,6O,7O,10O' }));

  return {
    state: {
      phase: 'DESCARTE',
      turnPlayerId: 'p1',
      activeManoId: 'p1',
      pot: 0,
      piquePot: 1000,
      minPique: 200,
      lastAction: '',
      players,
    },
    deck: [] as string[],
    seatOrder: ['p1', 'p2'],
    currentGameId: 'game-1',
    clearTurnTimer: vi.fn(),
    getRngState: vi.fn(() => 'rng-state'),
    recordEvent: vi.fn(),
    broadcast: vi.fn(),
    setPlayerCards: vi.fn((id: string, cards: string) => {
      players.get(id).cards = cards;
    }),
    collectPlayerCards: vi.fn(),
    attemptManoRotation: vi.fn(),
    transferMano: vi.fn(),
    advanceTurnPhaseDescarte: vi.fn(),
    advanceTurnPhase2: vi.fn(),
    advanceTurnBetting: vi.fn(),
    getNextPhaseCallback: vi.fn((phase: string) => `callback:${phase}`),
    cleanupRound: vi.fn(),
    clock: {
      setTimeout: vi.fn((callback: () => void) => callback()),
    },
    juegoValidationCallerId: '',
    juegoValidationEffectiveBet: 0,
    juegoValidationPendingIds: new Set<string>(),
    juegoValidationPlayersWithJuego: [] as string[],
    juegoValidationResponses: new Map<string, any>(),
    pendingPiqueWinnerId: '',
    pendingLlevoJuegoPlayerId: '',
    pendingPasoJuegoPlayerId: '',
    pendingPasoJuegoPhase: '',
    phaseBeforePiqueReveal: '',
    resolveJuegoValidation: vi.fn(),
    ...overrides,
  };
}

function client(sessionId = 'p1') {
  return { sessionId } as any;
}

describe('ShowdownCommand branch behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('dismiss-reveal returns caller with juego to APUESTA_4_CARTAS when multiple players remain', () => {
    const r = room({
      state: { ...room().state, phase: 'PIQUE_REVEAL', pot: 1000 },
      juegoValidationCallerId: 'p1',
      juegoValidationEffectiveBet: 500,
      pendingPiqueWinnerId: 'p1',
    });
    r.state.players.get('p1').revealedCards = '1O,2O,3O,4O';

    handleDismissReveal(r as any, client());

    expect(r.juegoValidationCallerId).toBe('');
    expect(r.juegoValidationEffectiveBet).toBe(0);
    expect(r.pendingPiqueWinnerId).toBe('');
    expect(r.state.players.get('p1').revealedCards).toBe('');
    expect(r.state.phase).toBe('APUESTA_4_CARTAS');
    expect(r.advanceTurnBetting).toHaveBeenCalledWith(undefined, 'callback:APUESTA_4_CARTAS');
  });

  it('dismiss-reveal refunds the only remaining caller after juego validation', () => {
    const r = room({ state: { ...room().state, phase: 'PIQUE_REVEAL', pot: 1200 } });
    r.juegoValidationCallerId = 'p1';
    r.state.players.get('p2').isFolded = true;

    handleDismissReveal(r as any, client());

    expect(r.state.players.get('p1').chips).toBe(2200);
    expect(r.state.pot).toBe(0);
    expect(r.cleanupRound).toHaveBeenCalled();
  });

  it('llevo-juego in DESCARTE reveals cards and moves to PIQUE_REVEAL', () => {
    const r = room();
    r.state.players.get('p1').passedWithJuego = true;

    handleLlevoJuego(r as any, client('p1'));

    expect(r.state.players.get('p1').hasActed).toBe(true);
    expect(r.state.players.get('p1').revealedCards).toBe('1O,2O,3O,4O');
    expect(r.pendingLlevoJuegoPlayerId).toBe('p1');
    expect(r.phaseBeforePiqueReveal).toBe('DESCARTE');
    expect(r.state.phase).toBe('PIQUE_REVEAL');
    expect(r.broadcast).toHaveBeenCalledWith('pique-fold-reveal', {
      playerId: 'p1',
      llevaJuego: true,
      cards: '1O,2O,3O,4O',
    });
  });

  it('paso-juego-response folds and advances betting when server detects no juego', () => {
    const r = room({ state: { ...room().state, phase: 'APUESTA_4_CARTAS', activeManoId: 'p1' } });
    r.state.players.get('p1').cards = '1-O,2-O,3-C,4-C';
    r.pendingPasoJuegoPlayerId = 'p1';
    r.pendingPasoJuegoPhase = 'APUESTA_4_CARTAS';

    handlePasoJuegoResponse(r as any, client('p1'), { llevaJuego: true });

    expect(r.pendingPasoJuegoPlayerId).toBe('');
    expect(r.pendingPasoJuegoPhase).toBe('');
    expect(r.state.players.get('p1').isFolded).toBe(true);
    expect(r.collectPlayerCards).toHaveBeenCalledWith('p1', false);
    expect(r.transferMano).toHaveBeenCalled();
    expect(r.advanceTurnBetting).toHaveBeenCalledWith(undefined, 'callback:APUESTA_4_CARTAS');
    expect(r.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ serverOverride: true, action: 'no-llevo-juego' }));
  });

  it('juego-validation-response ignores invalid claims and resolves when all pending players respond', () => {
    const r = room({ state: { ...room().state, phase: 'JUEGO_VALIDACION' } });
    r.juegoValidationPendingIds = new Set(['p1']);
    r.juegoValidationPlayersWithJuego = ['p1'];

    handleJuegoValidationResponse(r as any, client('p2'), { action: 'pass' });
    handleJuegoValidationResponse(r as any, client('p1'), { action: 'call', amount: 100 });
    expect(r.juegoValidationPendingIds.has('p1')).toBe(true);

    handleJuegoValidationResponse(r as any, client('p1'), { action: 'claim-juego' });

    expect(r.juegoValidationResponses.get('p1')).toEqual({ action: 'claim-juego', amount: undefined });
    expect(r.juegoValidationPendingIds.size).toBe(0);
    expect(r.resolveJuegoValidation).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'p1' })]),
      [expect.objectContaining({ id: 'p1' })],
    );
  });
});
