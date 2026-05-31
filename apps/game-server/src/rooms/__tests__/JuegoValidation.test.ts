import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import { MesaRoom } from '../MesaRoom';
import { createMesaTestContext, getAvailableTestPort } from './mesa-room-test-helpers';

// Mock Redis subscriber
vi.mock('../../services/redis', () => {
  const { EventEmitter } = require('events');
  return {
    redis: { on: vi.fn(), publish: vi.fn().mockResolvedValue(undefined), disconnect: vi.fn() },
    createRedisSubscriber: vi.fn(() => {
      const sub = new EventEmitter();
      (sub as any).subscribe = vi.fn().mockResolvedValue(undefined);
      (sub as any).unsubscribe = vi.fn().mockResolvedValue(undefined);
      (sub as any).disconnect = vi.fn();
      return sub;
    }),
  };
});

// Mock AlertService
vi.mock('../../services/AlertService', () => ({
  AlertService: {
    emit: vi.fn(),
    emitAsync: vi.fn().mockResolvedValue(undefined),
    refundFailed: vi.fn().mockResolvedValue(undefined),
    settlementFailed: vi.fn(),
    identity: vi.fn(),
  },
}));

// Mock Supabase service
vi.mock('../../services/SupabaseService', () => ({
  SupabaseService: {
    updatePlayerStats: vi.fn().mockResolvedValue(undefined),
    getSiteSettings: vi.fn().mockResolvedValue({
      min_bet: 10, max_bet: 100, rake_percentage: 5,
      turn_timeout_seconds: 30, starting_chips: 1000
    }),
    awardPot: vi.fn().mockResolvedValue({ success: true }),
    recordBet: vi.fn().mockResolvedValue({ success: true }),
    refundPlayer: vi.fn().mockResolvedValue({ success: true }),
    transferPiqueBanda: vi.fn().mockResolvedValue({ success: true }),
    transferBetweenPlayers: vi.fn().mockResolvedValue({ success: true, recipientName: 'Test' }),
    lookupUserByPhone: vi.fn().mockResolvedValue({ success: true, userId: 'u-found', name: 'Found User' }),
    saveReplay: vi.fn().mockResolvedValue(undefined),
    createGameSession: vi.fn().mockResolvedValue(undefined),
    validateSupervisionToken: vi.fn().mockResolvedValue({ valid: true, adminId: 'admin-1' }),
    checkTableAccess: vi.fn().mockResolvedValue({ blocked: false }),
  }
}));

describe('JUEGO_VALIDACION Phase', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    const testPort = process.env.COLYSEUS_TEST_PORT
      ? Number(process.env.COLYSEUS_TEST_PORT)
      : await getAvailableTestPort();
    colyseus = await boot({
      initializeGameServer: (gameServer) => {
        gameServer.define('mesa_primera', MesaRoom);
      }
    }, testPort);
  }, 30_000);

  afterAll(async () => {
    await colyseus.cleanup();
  }, 30_000);

  it('should enter JUEGO_VALIDACION when all pass and a player has juego', async () => {
    const { internalRoom, ids, players } = await createMesaTestContext(colyseus, {
      tableId: 'juego-validation-test',
      playerCount: 3,
      chips: 100_000_000,
    });

    // Set dealer/manually
    internalRoom.seatOrder = [...ids];
    internalRoom.state.dealerId = ids[0];
    internalRoom.state.activeManoId = ids[0];

    // Mark all as connected and not folded
    for (const p of players) {
      p.connected = true;
      p.isFolded = false;
      p.isReady = true;
      p.hasActed = true;
      p.roundBet = 0;
    }

    // P1 (Mano): NINGUNA
    // P2: SEGUNDA (juego)
    // P3: NINGUNA
    internalRoom.setPlayerCards(ids[0], '1-O,2-O,3-O,5-C'); // NINGUNA
    internalRoom.setPlayerCards(ids[1], '1-E,3-E,5-E,7-E'); // SEGUNDA
    internalRoom.setPlayerCards(ids[2], '1-B,2-B,4-B,6-B'); // SEGUNDA

    internalRoom.state.phase = 'APUESTA_4_CARTAS';
    internalRoom.state.currentMaxBet = 0;
    internalRoom.state.piquePot = 1_000_000;
    internalRoom.state.minPique = 500_000;

    // Call resolveAndStartDescarte
    internalRoom.resolveAndStartDescarte();

    // Should enter JUEGO_VALIDACION
    expect(internalRoom.state.phase).toBe('JUEGO_VALIDACION');
    expect(internalRoom.juegoValidationPlayersWithJuego).toContain(ids[1]);
    expect(internalRoom.juegoValidationPlayersWithJuego).toContain(ids[2]);
    expect(internalRoom.juegoValidationPlayersWithJuego).not.toContain(ids[0]);
  });

  it('should go directly to DESCARTE when all pass and no one has juego', async () => {
    const { internalRoom, ids, players } = await createMesaTestContext(colyseus, {
      tableId: 'juego-validation-test-2',
      playerCount: 3,
      chips: 100_000_000,
    });

    internalRoom.seatOrder = [...ids];
    internalRoom.state.dealerId = ids[0];
    internalRoom.state.activeManoId = ids[0];

    for (const p of players) {
      p.connected = true;
      p.isFolded = false;
      p.isReady = true;
      p.hasActed = true;
      p.roundBet = 0;
    }

    // All NINGUNA
    internalRoom.setPlayerCards(ids[0], '1-O,2-O,3-O,5-C');
    internalRoom.setPlayerCards(ids[1], '1-E,2-E,3-C,5-B');
    internalRoom.setPlayerCards(ids[2], '1-B,2-B,4-O,6-C');

    internalRoom.state.phase = 'APUESTA_4_CARTAS';
    internalRoom.state.currentMaxBet = 0;
    internalRoom.state.piquePot = 1_000_000;

    internalRoom.resolveAndStartDescarte();

    // Should go to DESCARTE
    expect(internalRoom.state.phase).toBe('DESCARTE');
  });

  it('reveals claimant with callers before reopening the main bet', async () => {
    const { internalRoom, ids, players } = await createMesaTestContext(colyseus, {
      tableId: 'juego-validation-test-3',
      playerCount: 3,
      chips: 100_000_000,
    });

    internalRoom.seatOrder = [...ids];
    internalRoom.state.dealerId = ids[0];
    internalRoom.state.activeManoId = ids[0];

    for (const p of players) {
      p.connected = true;
      p.isFolded = false;
      p.isReady = true;
      p.hasActed = true;
      p.roundBet = 0;
    }

    // P1 (Mano): NINGUNA, P2: CHIVO (juego), P3: NINGUNA
    internalRoom.setPlayerCards(ids[0], '1-O,2-O,3-O,5-C'); // NINGUNA
    internalRoom.setPlayerCards(ids[1], '1-E,6-E,7-E,3-O'); // CHIVO (As,6,7 Espadas)
    internalRoom.setPlayerCards(ids[2], '1-B,2-B,4-O,6-C'); // NINGUNA

    internalRoom.state.phase = 'APUESTA_4_CARTAS';
    internalRoom.state.currentMaxBet = 0;
    internalRoom.state.piquePot = 1_000_000;
    internalRoom.state.minPique = 500_000;

    // Trigger JUEGO_VALIDACION
    internalRoom.resolveAndStartDescarte();
    expect(internalRoom.state.phase).toBe('JUEGO_VALIDACION');

    // Simulate: P1 calls 2M, P2 claims juego, P3 passes
    internalRoom.juegoValidationResponses.set(ids[0], { action: 'call', amount: 2_000_000 });
    internalRoom.juegoValidationResponses.set(ids[1], { action: 'claim-juego' });
    internalRoom.juegoValidationResponses.set(ids[2], { action: 'pass' });
    internalRoom.juegoValidationPendingIds.clear();

    // Resolve
    const activePlayers = Array.from(internalRoom.state.players.values())
      .filter((p: any) => !p.isFolded && p.connected);
    const playersWithJuego = internalRoom.juegoValidationPlayersWithJuego
      .map((id: string) => internalRoom.state.players.get(id))
      .filter(Boolean);

    internalRoom.resolveJuegoValidation(activePlayers, playersWithJuego);

    // Antes de reabrir la apuesta principal, debe mostrarse la mano del claimant
    const p2 = internalRoom.state.players.get(ids[1]);
    expect(internalRoom.state.phase).toBe('SHOWDOWN');
    expect(internalRoom.state.piquePot).toBe(1_000_000);
    expect(p2.revealedCards).toBe('1-E,6-E,7-E,3-O');
    expect(p2.passedWithJuego).toBe(true);
    expect(p2.isFolded).toBe(true);

    internalRoom.finalizeApuesta4PiqueShowdown();

    expect(internalRoom.state.piquePot).toBe(0); // Pique awarded after reveal closes
    expect(p2.revealedCards).toBe('');
    expect(p2.cards).toBe('');

    // P1 should have bet 2M
    const p1 = internalRoom.state.players.get(ids[0]);
    expect(p1.roundBet).toBe(2_000_000);

    // Phase should be APUESTA_4_CARTAS (reopened after reveal)
    expect(internalRoom.state.phase).toBe('APUESTA_4_CARTAS');
  });

  it('should handle Caso B: caller with juego, no opponents, returns excess without rake', async () => {
    const { internalRoom, ids, players } = await createMesaTestContext(colyseus, {
      tableId: 'juego-validation-test-4',
      playerCount: 3,
      chips: 100_000_000,
    });

    internalRoom.seatOrder = [...ids];
    internalRoom.state.dealerId = ids[0];
    internalRoom.state.activeManoId = ids[0];

    for (const p of players) {
      p.connected = true;
      p.isFolded = false;
      p.isReady = true;
      p.hasActed = true;
      p.roundBet = 0;
    }

    // P1: NINGUNA, P2: SEGUNDA (juego), P3: NINGUNA
    internalRoom.setPlayerCards(ids[0], '1-O,2-O,3-O,5-C');
    internalRoom.setPlayerCards(ids[1], '1-E,3-E,5-E,7-E'); // SEGUNDA
    internalRoom.setPlayerCards(ids[2], '1-B,2-B,4-O,6-C');

    internalRoom.state.phase = 'APUESTA_4_CARTAS';
    internalRoom.state.currentMaxBet = 0;
    internalRoom.state.piquePot = 1_000_000;
    internalRoom.state.minPique = 500_000;

    // Trigger JUEGO_VALIDACION
    internalRoom.resolveAndStartDescarte();
    expect(internalRoom.state.phase).toBe('JUEGO_VALIDACION');

    // Simulate: P1 passes, P2 calls 2M (has juego), P3 passes
    internalRoom.juegoValidationResponses.set(ids[0], { action: 'pass' });
    internalRoom.juegoValidationResponses.set(ids[1], { action: 'call', amount: 2_000_000 });
    internalRoom.juegoValidationResponses.set(ids[2], { action: 'pass' });
    internalRoom.juegoValidationPendingIds.clear();

    // Resolve
    const activePlayers = Array.from(internalRoom.state.players.values())
      .filter((p: any) => !p.isFolded && p.connected);
    const playersWithJuego = internalRoom.juegoValidationPlayersWithJuego
      .map((id: string) => internalRoom.state.players.get(id))
      .filter(Boolean);

    internalRoom.resolveJuegoValidation(activePlayers, playersWithJuego);

    // P2 should be in PIQUE_REVEAL
    expect(internalRoom.state.phase).toBe('PIQUE_REVEAL');

    // P2 won pique
    expect(internalRoom.state.piquePot).toBe(0);

    // P2's chips calculation:
    // Start: 100M
    // Win pique: +950,000 (1M - 50K rake)
    // Bet 2M: -2,000,000
    // Return excess 1.5M: +1,500,000
    // Total: 100,000,000 + 950,000 - 2,000,000 + 1,500,000 = 100,450,000
    const p2 = internalRoom.state.players.get(ids[1]);
    expect(p2.chips).toBe(100_450_000);

    // Effective bet in pot = 500_000 (minPique = 2M - 1.5M excess)
    expect(internalRoom.state.pot).toBe(500_000);
  });

  it('reveals claimant hand before collecting cards when everyone else passed', async () => {
    const { internalRoom, ids, players } = await createMesaTestContext(colyseus, {
      tableId: 'juego-validation-reveal-before-collect',
      playerCount: 3,
      chips: 100_000_000,
    });

    internalRoom.seatOrder = [...ids];
    internalRoom.state.dealerId = ids[0];
    internalRoom.state.activeManoId = ids[0];

    for (const p of players) {
      p.connected = true;
      p.isFolded = false;
      p.isReady = true;
      p.hasActed = true;
      p.roundBet = 0;
    }

    internalRoom.setPlayerCards(ids[0], '1-O,2-O,3-O,5-C');
    internalRoom.setPlayerCards(ids[1], '1-E,2-E,3-C,5-B');
    internalRoom.setPlayerCards(ids[2], '1-B,6-B,7-B,3-C'); // CHIVO

    internalRoom.state.phase = 'APUESTA_4_CARTAS';
    internalRoom.state.currentMaxBet = 0;
    internalRoom.state.piquePot = 1_000_000;

    internalRoom.resolveAndStartDescarte();
    expect(internalRoom.state.phase).toBe('JUEGO_VALIDACION');

    internalRoom.juegoValidationResponses.set(ids[0], { action: 'pass' });
    internalRoom.juegoValidationResponses.set(ids[1], { action: 'pass' });
    internalRoom.juegoValidationResponses.set(ids[2], { action: 'claim-juego' });
    internalRoom.juegoValidationPendingIds.clear();

    const activePlayers = Array.from(internalRoom.state.players.values())
      .filter((p: any) => !p.isFolded && p.connected);
    const playersWithJuego = internalRoom.juegoValidationPlayersWithJuego
      .map((id: string) => internalRoom.state.players.get(id))
      .filter(Boolean);

    internalRoom.resolveJuegoValidation(activePlayers, playersWithJuego);

    const claimant = internalRoom.state.players.get(ids[2]);
    expect(internalRoom.state.phase).toBe('SHOWDOWN');
    expect(internalRoom.state.piquePot).toBe(1_000_000);
    expect(claimant.revealedCards).toBe('1-B,6-B,7-B,3-C');
    expect(claimant.cards).toBe('1-B,6-B,7-B,3-C');

    internalRoom.finalizeApuesta4PiqueShowdown();

    expect(internalRoom.state.piquePot).toBe(0);
    expect(claimant.revealedCards).toBe('');
    expect(claimant.cards).toBe('');
    expect(internalRoom.state.phase).toBe('DESCARTE');
  });

  it('refunds the lone remaining player after claimant reveal resolves', async () => {
    const { internalRoom, ids, players } = await createMesaTestContext(colyseus, {
      tableId: 'juego-validation-lone-refund',
      playerCount: 3,
      chips: 100_000_000,
    });

    internalRoom.seatOrder = [...ids];
    internalRoom.state.dealerId = ids[0];
    internalRoom.state.activeManoId = ids[0];

    for (const p of players) {
      p.connected = true;
      p.isFolded = false;
      p.isReady = true;
      p.hasActed = true;
      p.roundBet = 0;
    }

    players[1].isFolded = true; // Solo P1 queda para la apuesta principal
    players[0].roundBet = 500_000;
    players[0].totalMainBet = 500_000;
    players[0].chips -= 500_000;
    players[0].supabaseUserId = 'supa-p1';

    internalRoom.setPlayerCards(ids[0], '1-O,2-O,3-O,5-C');
    internalRoom.setPlayerCards(ids[1], '1-E,2-E,3-C,5-B');
    internalRoom.setPlayerCards(ids[2], '1-B,6-B,7-B,3-C'); // CHIVO

    internalRoom.state.phase = 'JUEGO_VALIDACION';
    internalRoom.state.piquePot = 1_000_000;
    internalRoom.state.pot = 500_000;

    internalRoom.juegoValidationPlayersWithJuego = [ids[2]];
    internalRoom.juegoValidationResponses.set(ids[0], { action: 'pass' });
    internalRoom.juegoValidationResponses.set(ids[2], { action: 'claim-juego' });

    const activePlayers = Array.from(internalRoom.state.players.values())
      .filter((p: any) => !p.isFolded && p.connected);

    internalRoom.resolveJuegoValidation(activePlayers, [internalRoom.state.players.get(ids[2])]);

    const p1 = internalRoom.state.players.get(ids[0]);
    expect(internalRoom.state.phase).toBe('SHOWDOWN');

    internalRoom.finalizeApuesta4PiqueShowdown();

    expect(internalRoom.state.pot).toBe(0);
    expect(p1.chips).toBe(100_000_000);
  });
})
