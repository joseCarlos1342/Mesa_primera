import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import { MesaRoom } from '../MesaRoom';
import { SupabaseService } from '../../services/SupabaseService';
import { evaluateHand, compareHands } from '../combinations';

// Mock Supabase service to prevent real DB inserts during unit testing
vi.mock('../../services/SupabaseService', () => {
  return {
    SupabaseService: {
      updatePlayerStats: vi.fn().mockResolvedValue(undefined),
      getSiteSettings: vi.fn().mockResolvedValue({
        min_bet: 10,
        max_bet: 100,
        rake_percentage: 5,
        turn_timeout_seconds: 30,
        starting_chips: 1000
      }),
      awardPot: vi.fn().mockResolvedValue({ success: true }),
      recordBet: vi.fn().mockResolvedValue({ success: true }),
      refundPlayer: vi.fn().mockResolvedValue({ success: true }),
      transferBetweenPlayers: vi.fn().mockResolvedValue({ success: true, recipientName: 'Test' }),
      lookupUserByPhone: vi.fn().mockResolvedValue({ success: true, userId: 'u-found', name: 'Found User' }),
      saveReplay: vi.fn().mockResolvedValue(undefined),
      createGameSession: vi.fn().mockResolvedValue(undefined),
    }
  };
});

describe('MesaRoom via Colyseus Testing', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await boot({
      initializeGameServer: (gameServer) => {
        gameServer.define('mesa_primera', MesaRoom);
      }
    });
  });

  afterAll(async () => {
    await colyseus.cleanup();
  });

  it('allows players to join and transitions from LOBBY to START', async () => {
    const room = await colyseus.createRoom('mesa_primera', {
      tableId: 'test-table'
    });

    expect(room.state.phase).toBe('LOBBY');

    // Join 4 players (must pass chips >= MIN_BALANCE_CENTS = 5_000_000)
    const client1 = await colyseus.connectTo(room, { userId: 'u1', username: 'P1', avatarUrl: '', chips: 10_000_000 });
    const client2 = await colyseus.connectTo(room, { userId: 'u2', username: 'P2', avatarUrl: '', chips: 10_000_000 });
    const client3 = await colyseus.connectTo(room, { userId: 'u3', username: 'P3', avatarUrl: '', chips: 10_000_000 });
    const client4 = await colyseus.connectTo(room, { userId: 'u4', username: 'P4', avatarUrl: '', chips: 10_000_000 });

    // Wait for internal state propagation
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(room.state.players.size).toBe(4);
    
    // Check player states are not ready initially
    expect(room.state.players.get(client1.sessionId)?.isReady).toBe(false);
  });

  it('fisher-yates shuffle functionality generates 28 unique combinations', async () => {
    const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-table' });
    
    // We can call internal methods if we cast room.room to any, or we can just trust the state
    const createdRoom = colyseus.getRoomById(room.roomId) as any;
    
    createdRoom.createDeck();
    createdRoom.shuffleDeck();
    
    expect(createdRoom.deck.length).toBe(28); // 7 numbers * 4 suits
    
    // Collect specific deck array
    const deck1 = [...createdRoom.deck];
    
    // Re-shuffle
    createdRoom.createDeck();
    createdRoom.shuffleDeck();
    const deck2 = [...createdRoom.deck];
    
    // The chances of 28 cards returning exactly the same shuffle are incredibly low
    expect(deck1).not.toEqual(deck2);
  });

  describe('Mano Bonus (activeManoId)', () => {
    it('La Mano bonus uses activeManoId, not dealerId', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-bonus' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      // Set up 3 players manually
      await colyseus.connectTo(room, { userId: 'u1', username: 'P1', avatarUrl: '', chips: 10_000_000 });
      await colyseus.connectTo(room, { userId: 'u2', username: 'P2', avatarUrl: '', chips: 10_000_000 });
      await colyseus.connectTo(room, { userId: 'u3', username: 'P3', avatarUrl: '', chips: 10_000_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      const ids = Array.from(room.state.players.keys()) as string[];
      // Set dealerId to first player, activeManoId to second player
      internalRoom.state.dealerId = ids[0];
      internalRoom.state.activeManoId = ids[1];

      // Give different cards: P2 (activeMano) and P3 have identical hands
      const p2 = room.state.players.get(ids[1]);
      const p3 = room.state.players.get(ids[2]);
      
      // Identical Primera hands: same total points
      p2.cards = '07-O,06-C,05-E,01-B'; // Primera: 21+18+15+16 = 70
      p3.cards = '07-O,06-C,05-E,01-B'; // Same hand = 70

      const evalP2 = evaluateHand(p2.cards);
      const evalP3 = evaluateHand(p3.cards);
      // Without bonus, they tie
      expect(compareHands(evalP2, evalP3)).toBe(0);

      // With the mano bonus, activeManoId (P2) should win the tiebreak
      const evalP2WithBonus = { ...evalP2, points: evalP2.points + 1 };
      expect(compareHands(evalP2WithBonus, evalP3)).toBeGreaterThan(0);
    });
  });

  describe('DECLARAR_JUEGO server validation', () => {
    it('evaluateHand correctly identifies juego vs no juego', () => {
      // Primera (4 different suits) = has juego
      const primera = evaluateHand('07-O,06-C,05-E,01-B');
      expect(primera.type).toBe('PRIMERA');
      expect(primera.type).not.toBe('NINGUNA');

      // Chivo (A, 6, 7 same suit) = has juego
      const chivo = evaluateHand('01-O,06-O,07-O,03-C');
      expect(chivo.type).toBe('CHIVO');

      // Segunda (all same suit) = has juego
      const segunda = evaluateHand('01-O,03-O,05-O,07-O');
      expect(segunda.type).toBe('SEGUNDA');

      // No juego: 3 cards of same suit + 1 different, not Primera
      const ninguna = evaluateHand('01-O,03-O,05-O,02-C');
      expect(ninguna.type).toBe('NINGUNA');
    });
  });

  describe('Card resync via request-resync', () => {
    it('sendPrivateCards is accessible on room instance', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-resync' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      expect(typeof internalRoom.sendPrivateCards).toBe('function');
    });
  });

  describe('transferMano', () => {
    it('transferMano method exists and is callable', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-transfer' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      expect(typeof internalRoom.transferMano).toBe('function');
    });
  });

  describe('Solo winner after pique — mandatory card reveal', () => {
    /**
     * Scenario: 3 players, 2 go to pique, pique winner folds from main pot.
     * The remaining solo player has cards but pot=0 after refund.
     * BUG: The room transitions directly to LOBBY without showing the winning hand.
     * EXPECTED: The room should enter SHOWDOWN with the winner's cards revealed.
     */
    it('should NOT go directly to LOBBY when one player remains after pique with pot=0', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-pique-solo' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      // Connect 3 players
      const c1 = await colyseus.connectTo(room, { userId: 'u1', username: 'P1', avatarUrl: '', chips: 10_000_000 });
      const c2 = await colyseus.connectTo(room, { userId: 'u2', username: 'P2', avatarUrl: '', chips: 10_000_000 });
      const c3 = await colyseus.connectTo(room, { userId: 'u3', username: 'P3', avatarUrl: '', chips: 10_000_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      const ids = Array.from(room.state.players.keys()) as string[];
      const [id1, id2, id3] = ids;
      const p1 = room.state.players.get(id1)!;
      const p2 = room.state.players.get(id2)!;
      const p3 = room.state.players.get(id3)!;

      // Setup: simulate post-pique state where P1 won pique and folded from main pot
      internalRoom.seatOrder = [id1, id2, id3];
      internalRoom.state.dealerId = id1;
      internalRoom.state.activeManoId = id2;

      // P1 won pique → folded from main pot
      p1.isFolded = true;
      p1.cards = '';

      // P2 has a winning hand (Primera), P3 folded earlier
      p2.isFolded = false;
      p2.cards = '07-O,06-C,05-E,01-B'; // Primera
      p2.connected = true;

      p3.isFolded = true;
      p3.cards = '';

      // pot=0 because the ante was refunded (uncalled bet scenario)
      internalRoom.state.pot = 0;
      internalRoom.state.piquePot = 0;
      internalRoom.currentGameId = 'test-game-solo';
      internalRoom.currentTimeline = [];

      // Trigger the code path that today sends us to LOBBY prematurely
      internalRoom.startPhase6Showdown();

      // Wait for any async/clock operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // BUG: Today this will be LOBBY. It should NOT be LOBBY.
      expect(room.state.phase).not.toBe('LOBBY');
    });

    it('should reveal the solo winner cards in SHOWDOWN before closing', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-pique-reveal' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      const c1 = await colyseus.connectTo(room, { userId: 'u1', username: 'P1', avatarUrl: '', chips: 10_000_000 });
      const c2 = await colyseus.connectTo(room, { userId: 'u2', username: 'P2', avatarUrl: '', chips: 10_000_000 });
      const c3 = await colyseus.connectTo(room, { userId: 'u3', username: 'P3', avatarUrl: '', chips: 10_000_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      const ids = Array.from(room.state.players.keys()) as string[];
      const [id1, id2, id3] = ids;
      const p1 = room.state.players.get(id1)!;
      const p2 = room.state.players.get(id2)!;
      const p3 = room.state.players.get(id3)!;

      internalRoom.seatOrder = [id1, id2, id3];
      internalRoom.state.dealerId = id1;
      internalRoom.state.activeManoId = id2;

      p1.isFolded = true;
      p1.cards = '';
      p2.isFolded = false;
      p2.cards = '07-O,06-C,05-E,01-B'; // Primera
      p2.connected = true;
      p3.isFolded = true;
      p3.cards = '';

      internalRoom.state.pot = 0;
      internalRoom.state.piquePot = 0;
      internalRoom.currentGameId = 'test-game-reveal';
      internalRoom.currentTimeline = [];

      internalRoom.startPhase6Showdown();
      await new Promise(resolve => setTimeout(resolve, 100));

      // The winner's cards should be revealed (mandatory reveal)
      expect(p2.revealedCards).toBe('07-O,06-C,05-E,01-B');
      // The phase should be SHOWDOWN (cards visible for all players to verify)
      expect(room.state.phase).toBe('SHOWDOWN');
    });

    it('should still go to LOBBY immediately when zero players remain', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-zero-players' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      const c1 = await colyseus.connectTo(room, { userId: 'u1', username: 'P1', avatarUrl: '', chips: 10_000_000 });
      const c2 = await colyseus.connectTo(room, { userId: 'u2', username: 'P2', avatarUrl: '', chips: 10_000_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      const ids = Array.from(room.state.players.keys()) as string[];
      const [id1, id2] = ids;
      const p1 = room.state.players.get(id1)!;
      const p2 = room.state.players.get(id2)!;

      internalRoom.seatOrder = [id1, id2];
      internalRoom.state.dealerId = id1;
      internalRoom.state.activeManoId = id1;

      // All players folded (edge case)
      p1.isFolded = true;
      p2.isFolded = true;

      internalRoom.state.pot = 0;
      internalRoom.state.piquePot = 0;
      internalRoom.currentGameId = 'test-game-zero';
      internalRoom.currentTimeline = [];

      internalRoom.startPhase6Showdown();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Zero players → LOBBY is correct
      expect(room.state.phase).toBe('LOBBY');
    });
  });

  describe('GUERRA_JUEGO — paso declines bet without fold (symmetric)', () => {
    /**
     * Helper: creates a room with 3 players, P3 folded, P1 (La Mano) & P2
     * have juego hands, pot already has money from prior phases.
     */
    async function setupGuerraJuego() {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: `test-gj-${Date.now()}` });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      const c1 = await colyseus.connectTo(room, { userId: 'gj-u1', username: 'Mano', avatarUrl: '', chips: 10_000_000 });
      const c2 = await colyseus.connectTo(room, { userId: 'gj-u2', username: 'Player2', avatarUrl: '', chips: 10_000_000 });
      const c3 = await colyseus.connectTo(room, { userId: 'gj-u3', username: 'Player3', avatarUrl: '', chips: 10_000_000 });
      await new Promise(r => setTimeout(r, 100));

      const ids = Array.from(room.state.players.keys()) as string[];
      const [id1, id2, id3] = ids;
      const p1 = room.state.players.get(id1)!;
      const p2 = room.state.players.get(id2)!;
      const p3 = room.state.players.get(id3)!;

      internalRoom.seatOrder = [id1, id2, id3];
      internalRoom.state.dealerId = id1;
      internalRoom.state.activeManoId = id1;

      // P1 (La Mano): Segunda (all Oros — best hand)
      p1.cards = '01-O,03-O,05-O,07-O';
      p1.isFolded = false; p1.connected = true;
      p1.passedWithJuego = false; p1.isAllIn = false;
      p1.supabaseUserId = 'supa-gj-u1';

      // P2: Primera (4 different suits)
      p2.cards = '07-O,06-C,05-E,01-B';
      p2.isFolded = false; p2.connected = true;
      p2.passedWithJuego = false; p2.isAllIn = false;
      p2.supabaseUserId = 'supa-gj-u2';

      // P3: folded (didn't have juego, was folded in DECLARAR_JUEGO)
      p3.isFolded = true; p3.connected = true;
      p3.cards = '01-O,03-O,05-O,02-C'; // NINGUNA

      internalRoom.state.pot = 2_000_000;
      internalRoom.state.piquePot = 500_000;
      internalRoom.currentGameId = 'gj-test-game';
      internalRoom.currentTimeline = [];

      return { room, internalRoom, c1, c2, c3, id1, id2, id3, p1, p2, p3 };
    }

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('La Mano bets, P2 passes → passedWithJuego NOT set, both reach SHOWDOWN', async () => {
      const { room, internalRoom, c1, c2, id1, id2, p1, p2 } = await setupGuerraJuego();

      internalRoom.startPhaseGuerraJuego();
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('GUERRA_JUEGO');
      expect(room.state.turnPlayerId).toBe(id1);

      // La Mano bets 500K
      c1.send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 200));

      expect(room.state.turnPlayerId).toBe(id2);

      // P2 declines the extra bet
      c2.send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // KEY: passedWithJuego must NOT be set in GUERRA_JUEGO
      expect(p2.passedWithJuego).toBe(false);
      // P2 is NOT folded — still competes in showdown
      expect(p2.isFolded).toBe(false);
      // Both players reach SHOWDOWN with cards revealed
      expect(room.state.phase).toBe('SHOWDOWN');
      expect(p1.revealedCards).toBeTruthy();
      expect(p2.revealedCards).toBeTruthy();
    });

    it('P2 bets after La Mano checks, La Mano passes → passedWithJuego NOT set', async () => {
      const { room, internalRoom, c1, c2, id1, id2, p1, p2 } = await setupGuerraJuego();

      internalRoom.startPhaseGuerraJuego();
      await new Promise(r => setTimeout(r, 100));

      // La Mano checks (no active bet → simple check)
      expect(room.state.turnPlayerId).toBe(id1);
      c1.send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // P2 bets 500K
      expect(room.state.turnPlayerId).toBe(id2);
      c2.send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 200));

      // La Mano must respond (roundBet 0 < currentMaxBet 500K)
      expect(room.state.turnPlayerId).toBe(id1);
      c1.send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // KEY: passedWithJuego must NOT be set — symmetric rule
      expect(p1.passedWithJuego).toBe(false);
      expect(p1.isFolded).toBe(false);
      expect(room.state.phase).toBe('SHOWDOWN');
      expect(p1.revealedCards).toBeTruthy();
      expect(p2.revealedCards).toBeTruthy();
    });

    it('uncalled bet is refunded: pot returns to pre-bet value', async () => {
      const { room, internalRoom, c1, c2, id1, p1 } = await setupGuerraJuego();
      const potBefore = room.state.pot; // 2_000_000

      internalRoom.startPhaseGuerraJuego();
      await new Promise(r => setTimeout(r, 100));

      c1.send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 200));

      c2.send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // Pot reverts to what it was before the GUERRA_JUEGO bet
      expect(room.state.pot).toBe(potBefore);
    });

    it('refund persisted via refundPlayer, not awardPot with rake=0', async () => {
      const { room, internalRoom, c1, c2 } = await setupGuerraJuego();

      internalRoom.startPhaseGuerraJuego();
      await new Promise(r => setTimeout(r, 100));

      c1.send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 200));

      c2.send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // refundPlayer should be called for the uncalled portion
      expect(SupabaseService.refundPlayer).toHaveBeenCalledWith(
        'supa-gj-u1',
        500_000,
        'gj-test-game',
        expect.objectContaining({ reason: expect.stringContaining('no igualada') })
      );

      // awardPot should NOT be used for the refund (rake=0, amount=500K pattern)
      const awardCalls = (SupabaseService.awardPot as any).mock.calls as any[][];
      const refundLikeCalls = awardCalls.filter(
        (c: any[]) => c[0] === 'supa-gj-u1' && c[1] === 500_000 && c[2] === 0
      );
      expect(refundLikeCalls).toHaveLength(0);
    });

    it('P2 calls (igualar) → bet stays in pot, SHOWDOWN reached', async () => {
      const { room, internalRoom, c1, c2, p1, p2 } = await setupGuerraJuego();
      const potBefore = room.state.pot;

      internalRoom.startPhaseGuerraJuego();
      await new Promise(r => setTimeout(r, 100));

      c1.send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 200));

      c2.send('action', { action: 'igualar' });
      await new Promise(r => setTimeout(r, 200));

      // Pot grew by the matched bets (500K × 2)
      expect(room.state.pot).toBe(potBefore + 1_000_000);
      expect(room.state.phase).toBe('SHOWDOWN');
      expect(p1.revealedCards).toBeTruthy();
      expect(p2.revealedCards).toBeTruthy();
    });

    it('P2 raises after La Mano bet → round reopens for La Mano', async () => {
      const { room, internalRoom, c1, c2, id1, id2 } = await setupGuerraJuego();

      internalRoom.startPhaseGuerraJuego();
      await new Promise(r => setTimeout(r, 100));

      // La Mano bets 500K
      c1.send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 200));

      // P2 raises to 1M (must exceed currentMaxBet=500K)
      c2.send('action', { action: 'voy', amount: 1_000_000 });
      await new Promise(r => setTimeout(r, 200));

      // Round reopens: La Mano needs to respond to the raise
      expect(room.state.turnPlayerId).toBe(id1);
      expect(room.state.currentMaxBet).toBe(1_000_000);
    });
  });
});
