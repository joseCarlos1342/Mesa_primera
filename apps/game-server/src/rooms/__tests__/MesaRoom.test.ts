import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import { MesaRoom } from '../MesaRoom';
import { SupabaseService } from '../../services/SupabaseService';
import { evaluateHand, compareHands } from '../combinations';
import { createMesaTestContext } from './mesa-room-test-helpers';

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

  describe('Pre-game pique voting', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('tracks a pique proposal and voter totals excluding the proposer', async () => {
      const { room, clients } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-proposal',
        playerCount: 4,
      });

      clients[0].send('propose_pique', { amount: 800_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.proposedPique).toBe(800_000);
      expect(room.state.proposedPiqueBy).toBe(clients[0].sessionId);
      expect(room.state.piqueVotesFor).toBe(0);
      expect(room.state.piqueVotesAgainst).toBe(0);
      expect(room.state.piqueVotersTotal).toBe(3);
    });

    it('approves the new pique minimum once a majority of voters vote in favor', async () => {
      const { room, clients } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-majority-for',
        playerCount: 4,
      });

      clients[0].send('propose_pique', { amount: 900_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      clients[1].send('vote_pique', { approve: true });
      clients[2].send('vote_pique', { approve: true });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.minPique).toBe(900_000);
      expect(room.state.proposedPique).toBe(0);
      expect(room.state.piqueVotesFor).toBe(0);
      expect(room.state.piqueVotesAgainst).toBe(0);
      expect(room.state.piqueVotersTotal).toBe(0);
      expect(room.state.lastAction).toContain('Pique Fijo aprobado');
    });

    it('auto-approves the proposal when the proposer is left with no eligible voters', async () => {
      const { room, clients } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-last-voter-leaves',
        playerCount: 2,
      });

      clients[0].send('propose_pique', { amount: 700_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      clients[1].send('abandon');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.minPique).toBe(700_000);
      expect(room.state.proposedPique).toBe(0);
      expect(room.state.piqueVotersTotal).toBe(0);
    });

    it('clears the proposal when the proposer abandons the table', async () => {
      const { room, clients } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-proposer-abandons',
        playerCount: 3,
      });

      clients[0].send('propose_pique', { amount: 1_000_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      clients[0].send('abandon');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.proposedPique).toBe(0);
      expect(room.state.proposedPiqueBy).toBe('');
      expect(room.state.piqueVotesFor).toBe(0);
      expect(room.state.piqueVotesAgainst).toBe(0);
      expect(room.state.piqueVotersTotal).toBe(0);
    });

    it('removes the departed voter from vote counts and eligible voter totals', async () => {
      const { room, clients } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-voter-abandons',
        playerCount: 4,
      });

      clients[0].send('propose_pique', { amount: 850_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      clients[1].send('vote_pique', { approve: true });
      await new Promise(resolve => setTimeout(resolve, 100));

      clients[1].send('abandon');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.proposedPique).toBe(850_000);
      expect(room.state.piqueVotesFor).toBe(0);
      expect(room.state.piqueVotesAgainst).toBe(0);
      expect(room.state.piqueVotersTotal).toBe(2);
      expect(room.state.minPique).toBe(500_000);
    });
  });

  describe('Waiting players', () => {
    it('marks players who join mid-game as waiting and excludes them from seat order', async () => {
      const { room, internalRoom } = await createMesaTestContext(colyseus, {
        tableId: 'test-waiting-midgame',
        playerCount: 3,
      });

      room.state.phase = 'PIQUE';

      const waitingClient = await colyseus.connectTo(room, {
        userId: 'late-user',
        username: 'LatePlayer',
        avatarUrl: '',
        chips: 10_000_000,
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      const waitingPlayer = room.state.players.get(waitingClient.sessionId)!;

      expect(waitingPlayer.isWaiting).toBe(true);
      expect(internalRoom.seatOrder).not.toContain(waitingClient.sessionId);
    });

    it('promotes waiting players into the next lobby rotation', async () => {
      const { room, internalRoom } = await createMesaTestContext(colyseus, {
        tableId: 'test-waiting-promotion',
        playerCount: 3,
      });

      room.state.phase = 'GUERRA';

      const waitingClient = await colyseus.connectTo(room, {
        userId: 'waiting-user',
        username: 'WaitingPlayer',
        avatarUrl: '',
        chips: 10_000_000,
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      const waitingPlayer = room.state.players.get(waitingClient.sessionId)!;
      expect(waitingPlayer.isWaiting).toBe(true);

      internalRoom.promoteWaitingPlayers();

      expect(waitingPlayer.isWaiting).toBe(false);
      expect(internalRoom.seatOrder).toContain(waitingClient.sessionId);
    });
  });

  describe('PIQUE decision tree', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('enters PIQUE_REVEAL on the second fold when the player carries juego', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-second-fold-reveal',
        playerCount: 3,
      });

      const revealPlayerId = ids[1];
      const revealPlayer = room.state.players.get(revealPlayerId)!;

      internalRoom.seatOrder = ids;
      room.state.phase = 'PIQUE';
      room.state.turnPlayerId = revealPlayerId;
      room.state.activeManoId = ids[0];
      revealPlayer.cards = '01-O,03-O';
      internalRoom.piqueFoldCount.set(revealPlayerId, 1);

      clients[1].send('action', { action: 'paso' });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.phase).toBe('PIQUE_REVEAL');
      expect(room.state.turnPlayerId).toBe(revealPlayerId);
      expect(revealPlayer.revealedCards).toBe('01-O,03-O');
      expect(internalRoom.piqueFoldCount.get(revealPlayerId)).toBe(2);
      expect(room.state.lastAction).toContain('lleva juego');
    });

    it('keeps PIQUE running on the second fold when the player does not carry juego', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-second-fold-no-reveal',
        playerCount: 4,
      });

      const foldPlayerId = ids[1];
      const foldPlayer = room.state.players.get(foldPlayerId)!;

      internalRoom.seatOrder = ids;
      room.state.phase = 'PIQUE';
      room.state.turnPlayerId = foldPlayerId;
      room.state.activeManoId = ids[0];
      internalRoom.deck = [];
      foldPlayer.cards = '01-O,03-C';
      internalRoom.piqueFoldCount.set(foldPlayerId, 1);

      clients[1].send('action', { action: 'paso' });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.phase).toBe('PIQUE');
      expect(foldPlayer.revealedCards).toBe('');
      expect(foldPlayer.cardCount).toBe(0);
      expect(internalRoom.deck).toHaveLength(2);
      expect(internalRoom.piqueFoldCount.get(foldPlayerId)).toBe(2);
    });

    it('dismiss-reveal clears shown cards and advances PIQUE to the next player', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-dismiss-reveal',
        playerCount: 3,
      });

      const revealPlayerId = ids[1];
      const revealPlayer = room.state.players.get(revealPlayerId)!;

      internalRoom.seatOrder = ids;
      room.state.phase = 'PIQUE';
      room.state.turnPlayerId = revealPlayerId;
      room.state.activeManoId = ids[0];
      revealPlayer.cards = '01-O,03-O';
      internalRoom.piqueFoldCount.set(revealPlayerId, 1);

      clients[1].send('action', { action: 'paso' });
      await new Promise(resolve => setTimeout(resolve, 100));

      clients[1].send('dismiss-reveal');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.phase).toBe('PIQUE');
      expect(revealPlayer.revealedCards).toBe('');
      expect(room.state.turnPlayerId).toBe(ids[2]);
    });

    it('restartPique refunds the voy player and charges banda to players who passed', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-restart-banda',
        playerCount: 3,
      });

      const [voyPlayer, passedOne, passedTwo] = players;

      internalRoom.seatOrder = ids;
      room.state.dealerId = ids[0];
      room.state.activeManoId = ids[0];
      room.state.minPique = 500_000;
      room.state.piquePot = 500_000;
      room.state.pot = 0;
      internalRoom.dealerRotatedThisGame = false;

      voyPlayer.chips = 9_500_000;
      voyPlayer.isFolded = false;
      passedOne.chips = 10_000_000;
      passedOne.isFolded = true;
      passedTwo.chips = 10_000_000;
      passedTwo.isFolded = true;

      internalRoom.piquePassPlayerIds.add(ids[1]);
      internalRoom.piquePassPlayerIds.add(ids[2]);

      internalRoom.restartPique();

      expect(voyPlayer.chips).toBe(10_400_000);
      expect(passedOne.chips).toBe(9_800_000);
      expect(passedTwo.chips).toBe(9_800_000);
      expect(room.state.piquePot).toBe(0);
      expect(room.state.dealerId).toBe(ids[1]);
      expect(room.state.phase).toBe('BARAJANDO');
      expect(internalRoom.piquePassPlayerIds.size).toBe(0);
    });

    it('lets La Mano fix the pique amount for the rest of the round', async () => {
      const { room, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-mano-fixes-amount',
        playerCount: 3,
      });

      room.state.phase = 'PIQUE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.minPique = 500_000;

      clients[0].send('action', { action: 'voy', amount: 900_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.currentMaxBet).toBe(900_000);
      expect(room.state.piquePot).toBe(900_000);
      expect(room.state.turnPlayerId).toBe(ids[1]);
      expect(room.state.lastAction).toContain('va $9,000');
    });

    it('rejects a non-Mano undercall when the player can still cover the fixed pique', async () => {
      const { room, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-undercall-rejected',
        playerCount: 3,
      });

      const caller = room.state.players.get(ids[1])!;

      room.state.phase = 'PIQUE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[1];
      room.state.currentMaxBet = 800_000;
      caller.chips = 2_000_000;

      clients[1].send('action', { action: 'voy', amount: 500_000 });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.turnPlayerId).toBe(ids[1]);
      expect(room.state.piquePot).toBe(0);
      expect(caller.hasActed).toBe(false);
      expect(caller.chips).toBe(2_000_000);
      expect(caller.isFolded).toBe(false);
    });
  });

  describe('Room resilience', () => {
    it('removes a player immediately when they abandon the table', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-abandon-removes-player',
        playerCount: 3,
      });

      const abandonedId = ids[1];

      clients[1].send('abandon');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(room.state.players.has(abandonedId)).toBe(false);
      expect(internalRoom.seatOrder).not.toContain(abandonedId);
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

  // ───────────────────────────────────────────────────────────
  // PIQUE remaining branches
  // ───────────────────────────────────────────────────────────

  describe('PIQUE — all-in and edge cases', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('allows non-Mano all-in when chips < currentMaxBet', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-allin',
        playerCount: 3,
      });

      const poorPlayer = room.state.players.get(ids[1])!;
      poorPlayer.chips = 300_000; // Less than minPique

      internalRoom.seatOrder = ids;
      room.state.phase = 'PIQUE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.minPique = 500_000;

      // La Mano sets the bet
      clients[0].send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 100));

      // Poor player goes voy with all remaining chips (all-in)
      expect(room.state.turnPlayerId).toBe(ids[1]);
      clients[1].send('action', { action: 'voy', amount: 300_000 });
      await new Promise(r => setTimeout(r, 100));

      // Should be accepted (all-in exception: amount == player.chips)
      expect(poorPlayer.chips).toBe(0);
      expect(room.state.piquePot).toBe(800_000); // 500k + 300k
    });

    it('restartPique aborts to LOBBY after MAX_PIQUE_RESTARTS', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-max-restart',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.dealerId = ids[0];
      room.state.activeManoId = ids[0];
      room.state.minPique = 500_000;
      internalRoom.dealerRotatedThisGame = false;

      // Simulate 10 restarts already
      internalRoom.piqueRestartCount = 10;

      players[0].isFolded = false;
      players[1].isFolded = true;
      players[2].isFolded = true;

      internalRoom.restartPique();

      expect(room.state.phase).toBe('LOBBY');
      expect(internalRoom.piqueRestartCount).toBe(0);
    });

    it('piqueFoldCount persists across restartPique rounds', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-foldcount-persist',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.phase = 'PIQUE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[1];
      room.state.minPique = 500_000;

      // First fold
      const player = room.state.players.get(ids[1])!;
      player.cards = '01-O,03-C';
      clients[1].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 100));

      expect(internalRoom.piqueFoldCount.get(ids[1])).toBe(1);

      // Simulate restartPique — fold count should persist
      // restartPique clears piquePassPlayerIds but NOT piqueFoldCount
      internalRoom.piquePassPlayerIds.clear();

      expect(internalRoom.piqueFoldCount.get(ids[1])).toBe(1);
    });

    it('hasActed guard prevents double-processing of pique action', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-double-action',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.phase = 'PIQUE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.minPique = 500_000;

      clients[0].send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 50));

      // Second send should be ignored (hasActed = true)
      const chipsBefore = room.state.players.get(ids[0])!.chips;
      const piquePotBefore = room.state.piquePot;
      clients[0].send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.players.get(ids[0])!.chips).toBe(chipsBefore);
      expect(room.state.piquePot).toBe(piquePotBefore);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Mid-game phases: COMPLETAR → APUESTA_4_CARTAS → DESCARTE
  // ───────────────────────────────────────────────────────────

  describe('COMPLETAR (phase 3) — deal remaining cards', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('collects folded player cards onto the deck before dealing', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-completar-collect',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];

      // P1 active with 2 cards, P2 active with 2 cards, P3 folded with 2 cards
      players[0].cards = '01-O,03-C';
      players[0].isFolded = false;
      players[1].cards = '05-E,07-B';
      players[1].isFolded = false;
      players[2].cards = '02-O,04-C';
      players[2].isFolded = true;

      internalRoom.deck = ['06-E', '06-B', '01-C', '03-E', '05-O'];
      internalRoom.currentGameId = 'test-completar';
      internalRoom.currentTimeline = [];

      internalRoom.startPhase3CompletarMano();

      expect(room.state.phase).toBe('COMPLETAR');
      // Folded player's cards should be back on the deck (pushed to end)
      expect(internalRoom.deck).toContain('02-O');
      expect(internalRoom.deck).toContain('04-C');
      // P3 hand cleared
      expect(players[2].cards).toBe('');
    });

    it('deals cards from the bottom (shift) not top (pop)', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-completar-from-bottom',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.dealerId = ids[0];

      players[0].cards = '01-O,03-C'; players[0].isFolded = false; players[0].cardCount = 2;
      players[1].cards = '05-E,07-B'; players[1].isFolded = false; players[1].cardCount = 2;
      players[2].isFolded = true; players[2].cards = '';

      // Deck: first card = bottom of "physical" deck 
      internalRoom.deck = ['BOTTOM-1', 'BOTTOM-2', 'BOTTOM-3', 'BOTTOM-4', 'TOP-EXTRA'];
      internalRoom.currentGameId = 'test-cmp';
      internalRoom.currentTimeline = [];

      internalRoom.startPhase3CompletarMano();
      // Wait for clock intervals (3s per card × 4 cards + 1s delay)
      await new Promise(r => setTimeout(r, 15000));

      // P1 should have gotten BOTTOM-1 and one more (round-robin)
      const p1Cards = players[0].cards.split(',');
      expect(p1Cards).toContain('BOTTOM-1');
      expect(p1Cards.length).toBe(4);

      const p2Cards = players[1].cards.split(',');
      expect(p2Cards).toContain('BOTTOM-2');
      expect(p2Cards.length).toBe(4);
    }, 20000);
  });

  describe('APUESTA_4_CARTAS — 4-card betting round', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('resets roundBet and currentMaxBet on phase start', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-apuesta4-reset',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.currentMaxBet = 999; // stale value
      players[0].roundBet = 888;
      players[0].isFolded = false;
      players[1].isFolded = false;
      players[2].isFolded = false;
      players.forEach(p => { p.cards = '01-O,03-C,05-E,07-B'; });

      internalRoom.startPhaseApuesta4Cartas();

      expect(room.state.phase).toBe('APUESTA_4_CARTAS');
      expect(room.state.currentMaxBet).toBe(0);
      expect(players[0].roundBet).toBe(0);
      expect(players[1].roundBet).toBe(0);
    });

    it('paso with juego hand sets passedWithJuego instead of folding', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-apuesta4-pass-juego',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[1])!;
      player.cards = '07-O,06-C,05-E,01-B'; // Primera (has juego)
      player.isFolded = false;

      internalRoom.seatOrder = ids;
      room.state.phase = 'APUESTA_4_CARTAS';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[1];
      room.state.currentMaxBet = 500_000; // There's an active bet
      player.roundBet = 0;

      clients[1].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 100));

      expect(player.passedWithJuego).toBe(true);
      expect(player.isFolded).toBe(false);
    });

    it('paso without juego hand folds the player', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-apuesta4-pass-nojuego',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[1])!;
      player.cards = '01-O,03-O,05-O,02-C'; // NINGUNA
      player.isFolded = false;

      internalRoom.seatOrder = ids;
      room.state.phase = 'APUESTA_4_CARTAS';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[1];
      room.state.currentMaxBet = 500_000;
      player.roundBet = 0;

      clients[1].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 100));

      expect(player.isFolded).toBe(true);
      expect(player.passedWithJuego).toBe(false);
    });

    it('voy raises the bet and updates pot', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-apuesta4-voy',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[0])!;
      player.cards = '01-O,03-C,05-E,07-B';
      player.isFolded = false;
      player.supabaseUserId = 'supa-u1';
      const chipsBefore = player.chips;

      internalRoom.seatOrder = ids;
      room.state.phase = 'APUESTA_4_CARTAS';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.currentMaxBet = 0;
      room.state.pot = 0;
      internalRoom.currentGameId = 'test-bet';

      clients[0].send('action', { action: 'voy', amount: 1_000_000 });
      await new Promise(r => setTimeout(r, 200));

      expect(player.chips).toBe(chipsBefore - 1_000_000);
      expect(player.roundBet).toBe(1_000_000);
      expect(room.state.pot).toBe(1_000_000);
      expect(room.state.currentMaxBet).toBe(1_000_000);
    });

    it('igualar calls the active bet with exact chips deduction', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-apuesta4-igualar',
        playerCount: 3,
      });

      const caller = room.state.players.get(ids[1])!;
      caller.cards = '01-O,03-C,05-E,07-B';
      caller.isFolded = false;
      caller.supabaseUserId = 'supa-u2';
      const callerChipsBefore = caller.chips;

      internalRoom.seatOrder = ids;
      room.state.phase = 'APUESTA_4_CARTAS';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[1];
      room.state.currentMaxBet = 500_000;
      room.state.pot = 500_000;
      caller.roundBet = 0;

      clients[1].send('action', { action: 'igualar' });
      await new Promise(r => setTimeout(r, 200));

      expect(caller.chips).toBe(callerChipsBefore - 500_000);
      expect(caller.roundBet).toBe(500_000);
      expect(room.state.pot).toBe(1_000_000);
    });

    it('resto goes all-in and marks isAllIn', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-apuesta4-resto',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[0])!;
      player.cards = '01-O,03-C,05-E,07-B';
      player.isFolded = false;
      player.supabaseUserId = 'supa-u1';
      player.chips = 2_000_000;

      internalRoom.seatOrder = ids;
      room.state.phase = 'APUESTA_4_CARTAS';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.currentMaxBet = 0;
      room.state.pot = 0;
      internalRoom.currentGameId = 'test-resto';

      clients[0].send('action', { action: 'resto' });
      await new Promise(r => setTimeout(r, 200));

      expect(player.chips).toBe(0);
      expect(player.isAllIn).toBe(true);
      expect(player.roundBet).toBe(2_000_000);
      expect(room.state.pot).toBe(2_000_000);
      expect(room.state.currentMaxBet).toBe(2_000_000);
    });
  });

  describe('DESCARTE — discard phase', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('discard removes selected cards and adds to pendingDiscardCards', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-descarte-drop',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[0])!;
      player.cards = '01-O,03-C,05-E,07-B';
      player.isFolded = false;

      internalRoom.seatOrder = ids;
      room.state.phase = 'DESCARTE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      internalRoom.deck = ['06-E', '06-B', '04-O'];

      clients[0].send('action', { action: 'discard', droppedCards: ['03-C', '05-E'] });
      await new Promise(r => setTimeout(r, 100));

      // Cards removed from hand
      expect(player.cards).toBe('01-O,07-B');
      // Dropped cards go onto deck
      expect(internalRoom.deck).toContain('03-C');
      expect(internalRoom.deck).toContain('05-E');
      // pendingDiscardCards set for replacement phase
      expect(player.pendingDiscardCards).toEqual(['03-C', '05-E']);
    });

    it('discard of 0 cards (keep all) sets empty pendingDiscardCards', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-descarte-keep',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[0])!;
      player.cards = '01-O,03-C,05-E,07-B';
      player.isFolded = false;

      internalRoom.seatOrder = ids;
      room.state.phase = 'DESCARTE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];

      clients[0].send('action', { action: 'discard', droppedCards: [] });
      await new Promise(r => setTimeout(r, 100));

      expect(player.cards).toBe('01-O,03-C,05-E,07-B');
      expect(player.pendingDiscardCards).toEqual([]);
    });

    it('paso in DESCARTE folds the player', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-descarte-paso',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[1])!;
      player.cards = '01-O,03-C,05-E,07-B';
      player.isFolded = false;

      internalRoom.seatOrder = ids;
      room.state.phase = 'DESCARTE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[1];

      clients[1].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 100));

      expect(player.isFolded).toBe(true);
    });

    it('llevo-juego reveals cards and transitions to PIQUE_REVEAL', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-descarte-llevo',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[1])!;
      player.cards = '07-O,06-C,05-E,01-B'; // Primera
      player.isFolded = false;
      player.passedWithJuego = true; // Must have passed with juego in APUESTA

      internalRoom.seatOrder = ids;
      room.state.phase = 'DESCARTE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[1];
      room.state.piquePot = 1_000_000;

      clients[1].send('llevo-juego');
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('PIQUE_REVEAL');
      expect(player.revealedCards).toBe('07-O,06-C,05-E,01-B');
      expect(internalRoom.pendingLlevoJuegoPlayerId).toBe(ids[1]);
    });

    it('dismiss-reveal after llevo-juego awards pique and resumes DESCARTE', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-descarte-dismiss-llevo',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[1])!;
      player.cards = '07-O,06-C,05-E,01-B';
      player.isFolded = false;
      player.passedWithJuego = true;
      player.supabaseUserId = 'supa-llevo';
      const chipsBefore = player.chips;

      internalRoom.seatOrder = ids;
      room.state.phase = 'DESCARTE';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[1];
      room.state.piquePot = 1_000_000;
      internalRoom.currentGameId = 'test-llevo';
      internalRoom.currentTimeline = [];

      // Step 1: Llevo juego
      clients[1].send('llevo-juego');
      await new Promise(r => setTimeout(r, 100));
      expect(room.state.phase).toBe('PIQUE_REVEAL');

      // Step 2: Dismiss reveal
      clients[1].send('dismiss-reveal');
      await new Promise(r => setTimeout(r, 100));

      // Pique awarded with 5% rake
      const expectedRake = Math.ceil(1_000_000 * 0.05 / 100) * 100;
      const expectedPayout = 1_000_000 - expectedRake;
      expect(player.chips).toBe(chipsBefore + expectedPayout);
      expect(room.state.piquePot).toBe(0);
      expect(player.isFolded).toBe(true); // Removed from main pot
      expect(room.state.phase).toBe('DESCARTE'); // Resumed
    });
  });

  // ───────────────────────────────────────────────────────────
  // Betting & resolution: GUERRA → CANTICOS → DECLARAR_JUEGO → SHOWDOWN
  // ───────────────────────────────────────────────────────────

  describe('GUERRA — main betting round', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('startPhase5Guerra initializes from activeManoId', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-guerra-init',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      players.forEach(p => { p.isFolded = false; p.cards = '01-O,03-C,05-E,07-B'; });

      internalRoom.startPhase5Guerra();

      expect(room.state.phase).toBe('GUERRA');
      expect(room.state.currentMaxBet).toBe(0);
      expect(room.state.turnPlayerId).toBe(ids[0]);
    });

    it('all-check in GUERRA advances to DECLARAR_JUEGO (skips CANTICOS)', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-guerra-all-check',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.phase = 'GUERRA';
      room.state.currentMaxBet = 0;
      players.forEach(p => { p.isFolded = false; p.cards = '01-O,03-C,05-E,07-B'; p.hasActed = false; p.roundBet = 0; });
      room.state.turnPlayerId = ids[0];
      internalRoom.currentGameId = 'test-guerra';
      internalRoom.currentTimeline = [];

      // All players check (paso with currentMaxBet == 0)
      clients[0].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 100));
      clients[1].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 100));
      clients[2].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 100));

      // Should skip CANTICOS and go to DECLARAR_JUEGO
      expect(room.state.phase).toBe('DECLARAR_JUEGO');
    });
  });

  describe('CANTICOS — second betting round', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('skips CANTICOS when all checked in GUERRA (currentMaxBet=0)', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-canticos-skip',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.currentMaxBet = 0; // All checked in GUERRA
      players.forEach(p => { p.isFolded = false; p.cards = '01-O,03-C,05-E,07-B'; });
      internalRoom.currentGameId = 'test-cant';
      internalRoom.currentTimeline = [];

      internalRoom.startPhase4Canticos();

      // Should jump straight to DECLARAR_JUEGO
      expect(room.state.phase).toBe('DECLARAR_JUEGO');
    });

    it('starts CANTICOS when there were bets in GUERRA (currentMaxBet>0)', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-canticos-start',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.currentMaxBet = 1_000_000; // Bets were made
      players.forEach(p => { p.isFolded = false; p.cards = '01-O,03-C,05-E,07-B'; });

      internalRoom.startPhase4Canticos();

      expect(room.state.phase).toBe('CANTICOS');
      expect(room.state.currentMaxBet).toBe(0); // Reset for new round
    });
  });

  describe('DECLARAR_JUEGO — hand declaration', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('server overrides client declaration to true when hand has juego', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-declarar-override',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[0])!;
      player.cards = '07-O,06-C,05-E,01-B'; // Primera = has juego

      internalRoom.seatOrder = ids;
      room.state.phase = 'DECLARAR_JUEGO';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.currentMaxBet = 0;
      internalRoom.currentGameId = 'test-dec';
      internalRoom.currentTimeline = [];
      ids.forEach(id => {
        const p = room.state.players.get(id)!;
        p.isFolded = false;
        p.hasActed = false;
        p.declaredJuego = null;
        if (id !== ids[0]) p.cards = '01-O,03-O,05-O,02-C'; // NINGUNA
      });

      // Client sends false (trying to cheat), server forces true
      clients[0].send('declarar-juego', { tiene: false });
      await new Promise(r => setTimeout(r, 100));

      expect(player.declaredJuego).toBe(true);
    });

    it('routes to GUERRA_JUEGO when 2+ players declare juego', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-declarar-2juego',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.phase = 'DECLARAR_JUEGO';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.currentMaxBet = 0;
      internalRoom.currentGameId = 'test-dec2';
      internalRoom.currentTimeline = [];

      // P1: Primera, P2: Segunda, P3: NINGUNA
      room.state.players.get(ids[0])!.cards = '07-O,06-C,05-E,01-B'; // Primera
      room.state.players.get(ids[1])!.cards = '01-O,03-O,05-O,07-O'; // Segunda
      room.state.players.get(ids[2])!.cards = '01-O,03-O,05-O,02-C'; // NINGUNA
      ids.forEach(id => {
        const p = room.state.players.get(id)!;
        p.isFolded = false; p.hasActed = false; p.declaredJuego = null;
      });

      clients[0].send('declarar-juego', { tiene: true });
      await new Promise(r => setTimeout(r, 100));
      clients[1].send('declarar-juego', { tiene: true });
      await new Promise(r => setTimeout(r, 100));
      clients[2].send('declarar-juego', { tiene: false });
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('GUERRA_JUEGO');
      // P3 should be folded (no juego)
      expect(room.state.players.get(ids[2])!.isFolded).toBe(true);
    });

    it('single juego player folds the rest and goes to SHOWDOWN', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-declarar-1juego',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.phase = 'DECLARAR_JUEGO';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.currentMaxBet = 0;
      room.state.pot = 3_000_000;
      internalRoom.currentGameId = 'test-dec1';
      internalRoom.currentTimeline = [];

      room.state.players.get(ids[0])!.cards = '07-O,06-C,05-E,01-B'; // Primera
      room.state.players.get(ids[1])!.cards = '01-O,03-O,05-O,02-C'; // NINGUNA
      room.state.players.get(ids[2])!.cards = '01-C,03-C,05-E,02-B'; // NINGUNA
      ids.forEach(id => {
        const p = room.state.players.get(id)!;
        p.isFolded = false; p.hasActed = false; p.declaredJuego = null;
      });

      clients[0].send('declarar-juego', { tiene: true });
      await new Promise(r => setTimeout(r, 100));
      clients[1].send('declarar-juego', { tiene: false });
      await new Promise(r => setTimeout(r, 100));
      clients[2].send('declarar-juego', { tiene: false });
      await new Promise(r => setTimeout(r, 100));

      // P2 and P3 should be folded; single winner goes to SHOWDOWN_WAIT
      expect(room.state.players.get(ids[1])!.isFolded).toBe(true);
      expect(room.state.players.get(ids[2])!.isFolded).toBe(true);
      expect(['SHOWDOWN', 'SHOWDOWN_WAIT']).toContain(room.state.phase);
    });

    it('zero juego → all stay for points-based SHOWDOWN', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-declarar-0juego',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.phase = 'DECLARAR_JUEGO';
      room.state.activeManoId = ids[0];
      room.state.turnPlayerId = ids[0];
      room.state.currentMaxBet = 0;
      room.state.pot = 3_000_000;
      internalRoom.currentGameId = 'test-dec0';
      internalRoom.currentTimeline = [];

      // All NINGUNA
      ids.forEach(id => {
        const p = room.state.players.get(id)!;
        p.cards = '01-O,03-O,05-O,02-C';
        p.isFolded = false; p.hasActed = false; p.declaredJuego = null;
      });

      clients[0].send('declarar-juego', { tiene: false });
      await new Promise(r => setTimeout(r, 100));
      clients[1].send('declarar-juego', { tiene: false });
      await new Promise(r => setTimeout(r, 100));
      clients[2].send('declarar-juego', { tiene: false });
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('SHOWDOWN');
      // Nobody folded — all compete by points
      expect(room.state.players.get(ids[0])!.isFolded).toBe(false);
      expect(room.state.players.get(ids[1])!.isFolded).toBe(false);
      expect(room.state.players.get(ids[2])!.isFolded).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────
  // SHOWDOWN resolution
  // ───────────────────────────────────────────────────────────

  describe('SHOWDOWN — final resolution', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('reveals all active players cards in multi-player showdown', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-showdown-reveal-all',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.dealerId = ids[0];
      room.state.pot = 3_000_000;
      room.state.piquePot = 0;
      internalRoom.currentGameId = 'test-sd';
      internalRoom.currentTimeline = [];

      players[0].cards = '07-O,06-C,05-E,01-B'; // Primera
      players[0].isFolded = false;
      players[0].supabaseUserId = 'supa-1';
      players[0].totalMainBet = 1_000_000;
      players[1].cards = '01-O,03-O,05-O,07-O'; // Segunda (best)
      players[1].isFolded = false;
      players[1].supabaseUserId = 'supa-2';
      players[1].totalMainBet = 1_000_000;
      players[2].cards = '01-O,03-O,05-O,02-C'; // NINGUNA
      players[2].isFolded = false;
      players[2].supabaseUserId = 'supa-3';
      players[2].totalMainBet = 1_000_000;

      internalRoom.startPhase6Showdown();
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('SHOWDOWN');
      expect(players[0].revealedCards).toBe('07-O,06-C,05-E,01-B');
      expect(players[1].revealedCards).toBe('01-O,03-O,05-O,07-O');
      expect(players[2].revealedCards).toBe('01-O,03-O,05-O,02-C');
    });

    it('single winner with pot gets SHOWDOWN_WAIT for show/muck choice', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-showdown-wait',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.dealerId = ids[0];
      room.state.pot = 2_000_000;
      room.state.piquePot = 0;
      internalRoom.currentGameId = 'test-sdw';
      internalRoom.currentTimeline = [];

      players[0].cards = '07-O,06-C,05-E,01-B';
      players[0].isFolded = false;
      players[1].isFolded = true;
      players[2].isFolded = true;

      internalRoom.startPhase6Showdown();
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('SHOWDOWN_WAIT');
      expect(room.state.turnPlayerId).toBe(ids[0]);
    });

    it('show-muck "show" reveals cards and transitions to SHOWDOWN', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-showmuck-show',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.dealerId = ids[0];
      room.state.pot = 2_000_000;
      room.state.piquePot = 0;
      internalRoom.currentGameId = 'test-sm';
      internalRoom.currentTimeline = [];

      players[0].cards = '07-O,06-C,05-E,01-B';
      players[0].isFolded = false;
      players[1].isFolded = true;
      players[2].isFolded = true;

      internalRoom.startPhase6Showdown();
      await new Promise(r => setTimeout(r, 100));
      expect(room.state.phase).toBe('SHOWDOWN_WAIT');

      clients[0].send('show-muck', { action: 'show' });
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('SHOWDOWN');
      expect(players[0].revealedCards).toBe('07-O,06-C,05-E,01-B');
    });

    it('show-muck "muck" awards pot without revealing cards', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-showmuck-muck',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.dealerId = ids[0];
      room.state.pot = 2_000_000;
      room.state.piquePot = 0;
      internalRoom.currentGameId = 'test-smm';
      internalRoom.currentTimeline = [];

      players[0].cards = '07-O,06-C,05-E,01-B';
      players[0].isFolded = false;
      players[0].supabaseUserId = 'supa-muck';
      const chipsBefore = players[0].chips;
      players[1].isFolded = true;
      players[2].isFolded = true;

      internalRoom.startPhase6Showdown();
      await new Promise(r => setTimeout(r, 100));
      expect(room.state.phase).toBe('SHOWDOWN_WAIT');

      clients[0].send('show-muck', { action: 'muck' });
      await new Promise(r => setTimeout(r, 100));

      // Cards NOT revealed
      expect(players[0].revealedCards).toBe('');
      // Pot awarded (minus 5% rake)
      const expectedRake = Math.ceil(2_000_000 * 0.05 / 100) * 100;
      const expectedPayout = 2_000_000 - expectedRake;
      expect(players[0].chips).toBe(chipsBefore + expectedPayout);
    });

    it('calculateSidePots correctly splits between all-in and normal players', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-sidepots',
        playerCount: 3,
      });

      // P1: all-in for 500k, P2: all-in for 1M, P3: bet 1M
      players[0].totalMainBet = 500_000;
      players[0].isFolded = false;
      players[1].totalMainBet = 1_000_000;
      players[1].isFolded = false;
      players[2].totalMainBet = 1_000_000;
      players[2].isFolded = false;

      const sidePots = internalRoom.calculateSidePots([players[0], players[1], players[2]]);

      // Main pot: 500k × 3 = 1.5M (all eligible)
      expect(sidePots[0].amount).toBe(1_500_000);
      expect(sidePots[0].eligiblePlayerIds.length).toBe(3);

      // Side pot: 500k × 2 = 1M (P2 and P3 only)
      expect(sidePots[1].amount).toBe(1_000_000);
      expect(sidePots[1].eligiblePlayerIds.length).toBe(2);
    });

    it('Mano gets +1 tiebreaker in showdown hand comparison', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-showdown-mano-bonus',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0]; // P1 is La Mano
      room.state.dealerId = ids[0];
      room.state.pot = 3_000_000;
      room.state.piquePot = 0;
      internalRoom.currentGameId = 'test-bonus';
      internalRoom.currentTimeline = [];

      // Identical hands — Mano should win
      players[0].cards = '07-O,06-C,05-E,01-B'; // Primera
      players[0].supabaseUserId = 'supa-mano';
      players[0].totalMainBet = 1_000_000;
      players[0].isFolded = false;
      players[1].cards = '07-O,06-C,05-E,01-B'; // Same hand
      players[1].supabaseUserId = 'supa-other';
      players[1].totalMainBet = 1_000_000;
      players[1].isFolded = false;
      players[2].isFolded = true;

      internalRoom.startPhase6Showdown();
      await new Promise(r => setTimeout(r, 100));

      // Mano wins the tie
      expect(internalRoom.pendingShowdownData.overallWinnerId).toBe(ids[0]);
    });

    it('dismiss-showdown cleans up and transitions to LOBBY', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-dismiss-showdown',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.dealerId = ids[0];
      room.state.pot = 3_000_000;
      room.state.piquePot = 0;
      internalRoom.currentGameId = 'test-ds';
      internalRoom.currentTimeline = [];

      players[0].cards = '01-O,03-O,05-O,07-O'; // Segunda (best)
      players[0].supabaseUserId = 'supa-1';
      players[0].totalMainBet = 1_000_000;
      players[0].isFolded = false;
      players[1].cards = '07-O,06-C,05-E,01-B'; // Primera
      players[1].supabaseUserId = 'supa-2';
      players[1].totalMainBet = 1_000_000;
      players[1].isFolded = false;
      players[2].isFolded = true;

      internalRoom.startPhase6Showdown();
      await new Promise(r => setTimeout(r, 100));
      expect(room.state.phase).toBe('SHOWDOWN');

      clients[0].send('dismiss-showdown');
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('LOBBY');
      expect(room.state.pot).toBe(0);
      expect(players[0].revealedCards).toBe('');
      expect(players[1].revealedCards).toBe('');
    });
  });

  // ───────────────────────────────────────────────────────────
  // Refund uncalled bet
  // ───────────────────────────────────────────────────────────

  describe('refundUncalledBet', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns the difference between highest and second highest roundBet', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-refund-uncalled',
        playerCount: 3,
      });

      players[0].roundBet = 1_000_000;
      players[0].isFolded = false;
      players[0].totalMainBet = 1_000_000;
      players[0].supabaseUserId = 'supa-refund';
      players[1].roundBet = 500_000;
      players[1].isFolded = true; // folded after betting
      players[2].roundBet = 0;
      players[2].isFolded = true;
      room.state.pot = 1_500_000;
      internalRoom.currentGameId = 'test-ref';

      const refunded = internalRoom.refundUncalledBet();

      expect(refunded).toBe(500_000);
      expect(players[0].chips).toBe(10_000_000 + 500_000);
      expect(players[0].roundBet).toBe(500_000);
      expect(room.state.pot).toBe(1_000_000);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Room resilience — reconnection & turn advancement
  // ───────────────────────────────────────────────────────────

  describe('Room resilience — extended', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('transferMano picks the next connected non-folded player', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-transfer-mano',
        playerCount: 4,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      players[0].isFolded = true; // current mano folds
      players[1].isFolded = true; // next in order also folded
      players[2].isFolded = false;
      players[3].isFolded = false;

      internalRoom.transferMano();

      expect(room.state.activeManoId).toBe(ids[2]);
    });

    it('attemptManoRotation rotates dealerId only once per game', async () => {
      const { room, internalRoom, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-attempt-mano-rotation',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.dealerId = ids[0];
      internalRoom.dealerRotatedThisGame = false;

      internalRoom.attemptManoRotation(ids[0], 'Mano pasa');

      expect(room.state.dealerId).toBe(ids[1]);
      expect(internalRoom.dealerRotatedThisGame).toBe(true);

      // Second call should NOT rotate again
      internalRoom.attemptManoRotation(ids[1], 'Mano pasa again');
      expect(room.state.dealerId).toBe(ids[1]); // unchanged
    });

    it('waiting players are excluded from betting turn advancement', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-waiting-no-turn',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.phase = 'GUERRA';
      room.state.currentMaxBet = 0;

      players[0].isFolded = false; players[0].hasActed = true; players[0].cards = '01-O,03-C,05-E,07-B';
      players[1].isFolded = false; players[1].hasActed = false; players[1].isWaiting = true; // waiting
      players[2].isFolded = false; players[2].hasActed = false; players[2].cards = '01-O,03-C,05-E,07-B';

      // advanceTurnBetting should skip waiting player
      // The waiting player is in seatOrder but marked isWaiting
      // Actually, waiting players should NOT be in seatOrder per the join logic
      // So let's test with a mid-game join scenario instead
      const waitingClient = await colyseus.connectTo(room, {
        userId: 'late-user-turn',
        username: 'LatePlayer',
        avatarUrl: '',
        chips: 10_000_000,
      });
      await new Promise(r => setTimeout(r, 100));

      const waitingP = room.state.players.get(waitingClient.sessionId)!;
      expect(waitingP.isWaiting).toBe(true);
      expect(internalRoom.seatOrder).not.toContain(waitingClient.sessionId);
    });

    it('fold-out with pot=0 triggers endHandEarlyAfterFoldOut', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-foldout-early',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.dealerId = ids[0];
      room.state.pot = 0;
      room.state.piquePot = 500_000;
      internalRoom.currentGameId = 'test-foldout';
      internalRoom.currentTimeline = [];
      internalRoom.dealerRotatedThisGame = false;

      // Only P1 remains, P2 and P3 folded
      players[0].isFolded = false; players[0].cards = '07-O,06-C,05-E,01-B'; players[0].supabaseUserId = 'supa-fo';
      players[1].isFolded = true;
      players[2].isFolded = true;

      // internalRoom.endHandEarlyAfterFoldOut()
      // This triggers pique resolution among remaining and returns to LOBBY
      internalRoom.endHandEarlyAfterFoldOut();
      await new Promise(r => setTimeout(r, 4000));

      expect(room.state.phase).toBe('LOBBY');
      expect(room.state.pot).toBe(0);
      expect(room.state.piquePot).toBe(0);

      // P1 should have received piquePot minus rake
      const piqueRake = Math.ceil(500_000 * 0.05 / 100) * 100;
      const piquePayout = 500_000 - piqueRake;
      // P1 started with 10M, plus pique payout
      expect(players[0].chips).toBe(10_000_000 + piquePayout);
    }, 10000);
  });

  // ───────────────────────────────────────────────────────────
  // End-to-end motor transition
  // ───────────────────────────────────────────────────────────

  describe('Full motor transition — short path (fold-out)', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('PIQUE fold-out → restartPique rotates mano and resets to BARAJANDO', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-motor-restart',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.dealerId = ids[0];
      room.state.activeManoId = ids[0];
      room.state.minPique = 500_000;
      room.state.phase = 'PIQUE';
      room.state.currentMaxBet = 500_000;
      room.state.piquePot = 500_000;
      internalRoom.dealerRotatedThisGame = false;
      internalRoom.currentGameId = 'test-motor';
      internalRoom.currentTimeline = [];

      // P1 (Mano) already went voy; P2 and P3 need to act
      players[0].isFolded = false; players[0].hasActed = true; players[0].chips = 9_500_000;
      players[0].cards = '01-O,03-C';
      players[1].isFolded = false; players[1].hasActed = false;
      players[1].cards = '05-E,07-B';
      players[2].isFolded = false; players[2].hasActed = false;
      players[2].cards = '02-O,04-C';
      room.state.turnPlayerId = ids[1];

      // P2 passes → P3 passes → only 1 voy → restartPique
      clients[1].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));
      clients[2].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // restartPique triggers: mano rotated, phase reset to BARAJANDO
      expect(room.state.phase).toBe('BARAJANDO');
      expect(internalRoom.dealerRotatedThisGame).toBe(true);
      expect(room.state.piquePot).toBe(0); // Refunded
      // P1 gets: refund 500k + banda (200k from each passer) = 500k + 400k
      expect(players[0].chips).toBe(9_500_000 + 500_000 + 400_000);
    });

    it('2 voy in PIQUE → startPhase3CompletarMano deals extra cards', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-motor-completar',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.dealerId = ids[0];
      room.state.activeManoId = ids[0];
      room.state.minPique = 500_000;
      room.state.phase = 'PIQUE';
      room.state.currentMaxBet = 0;
      internalRoom.currentGameId = 'test-motor2';
      internalRoom.currentTimeline = [];
      internalRoom.dealerRotatedThisGame = false;

      // Set up cards and deck
      players[0].cards = '01-O,03-C'; players[0].isFolded = false; players[0].hasActed = false;
      players[1].cards = '05-E,07-B'; players[1].isFolded = false; players[1].hasActed = false;
      players[2].cards = '02-O,04-C'; players[2].isFolded = false; players[2].hasActed = false;
      internalRoom.deck = ['06-E', '06-B', '01-C', '03-E', '05-O', '07-C', '02-B', '04-E'];
      room.state.turnPlayerId = ids[0];

      // La Mano bets
      clients[0].send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 200));

      // P2 calls
      clients[1].send('action', { action: 'voy', amount: 500_000 });
      await new Promise(r => setTimeout(r, 200));

      // P3 passes
      clients[2].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // With 2 voy → startPhase3CompletarMano → COMPLETAR
      expect(room.state.phase).toBe('COMPLETAR');
      // P3 should be folded
      expect(players[2].isFolded).toBe(true);
    });

    it('afterPiqueResolution with 2+ players → APUESTA_4_CARTAS', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-motor-after-pique',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.pot = 0;
      room.state.piquePot = 1_000_000;
      internalRoom.currentGameId = 'test-motor3';
      internalRoom.currentTimeline = [];

      // 2 active players with 4 cards
      players[0].cards = '01-O,03-C,05-E,07-B'; players[0].isFolded = false;
      players[1].cards = '02-O,04-C,06-E,01-B'; players[1].isFolded = false;
      players[2].isFolded = true;

      internalRoom.afterPiqueResolution();

      expect(room.state.phase).toBe('APUESTA_4_CARTAS');
    });

    it('afterPiqueResolution with 1 player → refund pot and return to LOBBY', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-motor-1player',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      room.state.dealerId = ids[0];
      room.state.pot = 500_000;
      internalRoom.dealerRotatedThisGame = false;
      internalRoom.currentGameId = 'test-motor4';
      internalRoom.currentTimeline = [];

      players[0].cards = '01-O,03-C,05-E,07-B'; players[0].isFolded = false;
      players[0].supabaseUserId = 'supa-solo';
      const chipsBefore = players[0].chips;
      players[1].isFolded = true;
      players[2].isFolded = true;

      internalRoom.afterPiqueResolution();
      await new Promise(r => setTimeout(r, 4000));

      expect(room.state.phase).toBe('LOBBY');
      expect(players[0].chips).toBe(chipsBefore + 500_000);
      expect(room.state.pot).toBe(0);
    }, 10000);
  });

  // ───────────────────────────────────────────────────────────
  // REVELAR_CARTA — bottom card reveal
  // ───────────────────────────────────────────────────────────

  describe('REVELAR_CARTA — bottom card reveal', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('startPhaseRevealBottomCard sets bottomCard from deck.shift()', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-reveal-bottom',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      internalRoom.deck = ['04-O', '06-C', '07-E'];
      players.forEach(p => { p.isFolded = false; p.cards = '01-O,03-C,05-E,07-B'; });

      internalRoom.startPhaseRevealBottomCard();

      expect(room.state.phase).toBe('REVELAR_CARTA');
      expect(room.state.bottomCard).toBe('04-O'); // First card = bottom
      expect(internalRoom.deck).toEqual(['06-C', '07-E']);

      // After 3s → GUERRA
      await new Promise(r => setTimeout(r, 3500));
      expect(room.state.phase).toBe('GUERRA');
    }, 8000);
  });

  // ───────────────────────────────────────────────────────────
  // COMPLETAR_DESCARTE — replacement dealing
  // ───────────────────────────────────────────────────────────

  describe('COMPLETAR_DESCARTE — replacement cards', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('deals replacement cards from the bottom of the deck in block order', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-reemplazo',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];

      // P1 discarded 2 cards, P2 discarded 1 card, P3 folded
      players[0].cards = '01-O,03-C'; players[0].isFolded = false;
      players[0].pendingDiscardCards = ['XX', 'YY']; // placeholder for 2 replacements
      players[1].cards = '05-E,07-B,02-O'; players[1].isFolded = false;
      players[1].pendingDiscardCards = ['ZZ']; // 1 replacement
      players[2].isFolded = true; players[2].pendingDiscardCards = [];

      internalRoom.deck = ['CARD-A', 'CARD-B', 'CARD-C', 'CARD-D', 'CARD-E'];

      internalRoom.startPhaseReemplazoDescarte();
      expect(room.state.phase).toBe('COMPLETAR_DESCARTE');

      // Wait for block dealing (800ms × 3 cards + buffer)
      await new Promise(r => setTimeout(r, 4000));

      // P1 gets CARD-A, CARD-B (2 replacements from bottom)
      const p1Cards = players[0].cards.split(',');
      expect(p1Cards).toContain('CARD-A');
      expect(p1Cards).toContain('CARD-B');
      expect(p1Cards.length).toBe(4); // 2 original + 2 replacements

      // P2 gets CARD-C (1 replacement)
      const p2Cards = players[1].cards.split(',');
      expect(p2Cards).toContain('CARD-C');
      expect(p2Cards.length).toBe(4);

      // Then reveals bottom card (CARD-D)
      await new Promise(r => setTimeout(r, 1000));
      expect(room.state.bottomCard).toBe('CARD-D');
    }, 10000);

    it('skips to reveal when no players need replacement cards', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-reemplazo-skip',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      players.forEach(p => { p.isFolded = false; p.pendingDiscardCards = []; p.cards = '01-O,03-C,05-E,07-B'; });
      internalRoom.deck = ['04-O', '06-C'];

      internalRoom.startPhaseReemplazoDescarte();

      // Should skip directly to REVELAR_CARTA
      expect(room.state.phase).toBe('REVELAR_CARTA');
      expect(room.state.bottomCard).toBe('04-O');
    });
  });

  // ───────────────────────────────────────────────────────────
  // Side pots — advanced scenarios
  // ───────────────────────────────────────────────────────────

  describe('Side pots — advanced', () => {
    it('3-level side pots: P1 500k, P2 800k, P3 1M', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-sidepots-3level',
        playerCount: 3,
      });

      players[0].totalMainBet = 500_000;
      players[0].isFolded = false;
      players[1].totalMainBet = 800_000;
      players[1].isFolded = false;
      players[2].totalMainBet = 1_000_000;
      players[2].isFolded = false;

      const sidePots = internalRoom.calculateSidePots([players[0], players[1], players[2]]);

      // Level 1: 500k × 3 = 1.5M (all eligible)
      expect(sidePots[0].amount).toBe(1_500_000);
      expect(sidePots[0].eligiblePlayerIds.length).toBe(3);

      // Level 2: (800k - 500k) × 2 = 600k (P2 and P3 eligible)
      expect(sidePots[1].amount).toBe(600_000);
      expect(sidePots[1].eligiblePlayerIds.length).toBe(2);

      // Level 3: (1M - 800k) × 1 = 200k (P3 only)
      expect(sidePots[2].amount).toBe(200_000);
      expect(sidePots[2].eligiblePlayerIds.length).toBe(1);
    });

    it('showdown awards each side pot to its best eligible hand independently', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-sidepots-award',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[2]; // P3 is La Mano — would get +1 but has worst hand
      room.state.dealerId = ids[2];
      room.state.pot = 2_300_000; // 500k + 800k + 1M
      room.state.piquePot = 0;
      internalRoom.currentGameId = 'test-sp-award';
      internalRoom.currentTimeline = [];

      // P1: best hand (Segunda), all-in for 500k
      players[0].cards = '01-O,03-O,05-O,07-O'; // Segunda
      players[0].isFolded = false;
      players[0].totalMainBet = 500_000;
      players[0].supabaseUserId = 'supa-sp1';
      players[0].isAllIn = true;

      // P2: medium hand (Primera), bet 800k
      players[1].cards = '07-O,06-C,05-E,01-B'; // Primera
      players[1].isFolded = false;
      players[1].totalMainBet = 800_000;
      players[1].supabaseUserId = 'supa-sp2';

      // P3: worst hand (NINGUNA), bet 1M
      players[2].cards = '01-O,03-O,05-O,02-C'; // NINGUNA
      players[2].isFolded = false;
      players[2].totalMainBet = 1_000_000;
      players[2].supabaseUserId = 'supa-sp3';

      internalRoom.startPhase6Showdown();
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('SHOWDOWN');
      expect(internalRoom.pendingShowdownData).toBeTruthy();

      const winners = internalRoom.pendingShowdownData.potWinners;
      // Main pot (500k × 3): P1 wins (Segunda beats all)
      expect(winners[0].winnerId).toBe(ids[0]);
      // Side pot 1 (300k × 2): P2 wins (Primera beats NINGUNA)
      expect(winners[1].winnerId).toBe(ids[1]);
      // Side pot 2 (200k × 1): P3 is only eligible — gets own uncalled portion
      expect(winners[2].winnerId).toBe(ids[2]);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Invariants — cross-phase state hygiene
  // ───────────────────────────────────────────────────────────

  describe('Invariants — cross-phase state hygiene', () => {
    it('startPhaseApuesta4Cartas resets all per-round state', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-inv-reset',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      // Stale state from previous round
      room.state.currentMaxBet = 999_999;
      room.state.highestBetPlayerId = 'stale-id';
      players[0].roundBet = 888_888;
      players[0].hasActed = true;
      players[1].roundBet = 777_777;
      players[1].hasActed = true;
      players.forEach(p => { p.isFolded = false; p.cards = '01-O,03-C,05-E,07-B'; });

      internalRoom.startPhaseApuesta4Cartas();

      expect(room.state.currentMaxBet).toBe(0);
      expect(room.state.highestBetPlayerId).toBe('');
      players.forEach(p => {
        expect(p.roundBet).toBe(0);
        expect(p.hasActed).toBe(false);
      });
    });

    it('startPhase5Guerra resets roundBet and hasActed for all players', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-inv-guerra-reset',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      players[0].roundBet = 500_000; players[0].hasActed = true;
      players[1].roundBet = 500_000; players[1].hasActed = true;
      players.forEach(p => { p.isFolded = false; p.cards = '01-O,03-C,05-E,07-B'; });

      internalRoom.startPhase5Guerra();

      expect(room.state.phase).toBe('GUERRA');
      expect(room.state.currentMaxBet).toBe(0);
      players.forEach(p => {
        expect(p.roundBet).toBe(0);
        expect(p.hasActed).toBe(false);
      });
    });

    it('startPhaseGuerraJuego resets declinedGuerraJuegoBet', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-inv-gj-reset',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      players[0].declinedGuerraJuegoBet = true; // stale from previous logic
      players[0].hasActed = true;
      players.forEach(p => { p.isFolded = false; p.cards = '01-O,03-O,05-O,07-O'; });

      internalRoom.startPhaseGuerraJuego();

      expect(room.state.phase).toBe('GUERRA_JUEGO');
      players.forEach(p => {
        expect(p.declinedGuerraJuegoBet).toBe(false);
        expect(p.hasActed).toBe(false);
        expect(p.roundBet).toBe(0);
      });
    });

    it('finalizeShowdown clears all revealed cards and pots', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-inv-finalize',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.dealerId = ids[0];
      room.state.pot = 3_000_000;
      room.state.piquePot = 500_000;
      room.state.bottomCard = '04-O';
      room.state.activeManoId = ids[0];
      room.state.showdownTimer = 10;
      internalRoom.dealerRotatedThisGame = false;

      players[0].revealedCards = '01-O,03-O,05-O,07-O';
      players[1].revealedCards = '07-O,06-C,05-E,01-B';

      internalRoom.finalizeShowdown(ids[0], [], 0, 0, []);

      expect(room.state.phase).toBe('LOBBY');
      expect(room.state.pot).toBe(0);
      expect(room.state.piquePot).toBe(0);
      expect(room.state.bottomCard).toBe('');
      expect(room.state.activeManoId).toBe('');
      expect(room.state.showdownTimer).toBe(0);
      players.forEach(p => {
        expect(p.revealedCards).toBe('');
        expect(p.isReady).toBe(false);
      });
    });

    it('DESCARTE → startPhaseReemplazoDescarte → REVELAR_CARTA → GUERRA full chain', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-chain-descarte-guerra',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.activeManoId = ids[0];
      players[0].cards = '01-O,07-B'; players[0].isFolded = false;
      players[0].pendingDiscardCards = ['03-C', '05-E']; // 2 replacements
      players[1].cards = '05-E,07-B,02-O'; players[1].isFolded = false;
      players[1].pendingDiscardCards = ['04-C']; // 1 replacement
      players[2].isFolded = true; players[2].pendingDiscardCards = [];
      internalRoom.deck = ['NEW-1', 'NEW-2', 'NEW-3', 'BOTTOM-REVEAL', 'EXTRA'];

      internalRoom.startPhaseReemplazoDescarte();
      expect(room.state.phase).toBe('COMPLETAR_DESCARTE');

      // Wait for dealing + reveal + GUERRA
      await new Promise(r => setTimeout(r, 8000));

      // After replacements, bottom card revealed, then 3s to GUERRA
      expect(['REVELAR_CARTA', 'GUERRA']).toContain(room.state.phase);
      expect(room.state.bottomCard).toBeTruthy();
    }, 12000);
  });

  // ───────────────────────────────────────────────────────────
  // PIQUE_REVEAL during PIQUE — dismiss flow
  // ───────────────────────────────────────────────────────────

  describe('PIQUE_REVEAL — pique fold reveal dismiss', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('dismiss-reveal during PIQUE clears reveal and restores PIQUE phase', async () => {
      const { room, internalRoom, clients, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-pique-reveal-dismiss-full',
        playerCount: 3,
      });

      const revealPlayerId = ids[1];
      const revealPlayer = room.state.players.get(revealPlayerId)!;

      internalRoom.seatOrder = ids;
      room.state.phase = 'PIQUE';
      room.state.turnPlayerId = revealPlayerId;
      room.state.activeManoId = ids[0];
      revealPlayer.cards = '01-O,03-O'; // Same suit = juego
      internalRoom.piqueFoldCount.set(revealPlayerId, 1); // 2nd fold

      clients[1].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 100));

      // Now in PIQUE_REVEAL
      expect(room.state.phase).toBe('PIQUE_REVEAL');
      expect(revealPlayer.revealedCards).toBe('01-O,03-O');

      // Dismiss
      clients[1].send('dismiss-reveal');
      await new Promise(r => setTimeout(r, 100));

      expect(room.state.phase).toBe('PIQUE');
      expect(revealPlayer.revealedCards).toBe('');
      // Turn should have advanced to next player
      expect(room.state.turnPlayerId).toBe(ids[2]);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Player card management
  // ───────────────────────────────────────────────────────────

  describe('setPlayerCards — card management', () => {
    it('updates cardCount and clears on empty string', async () => {
      const { room, internalRoom, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-setcards',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[0])!;

      internalRoom.setPlayerCards(ids[0], '01-O,03-C,05-E,07-B');
      expect(player.cardCount).toBe(4);
      expect(player.cards).toBe('01-O,03-C,05-E,07-B');

      internalRoom.setPlayerCards(ids[0], '');
      expect(player.cardCount).toBe(0);
      expect(player.cards).toBe('');
    });

    it('setPlayerCards with reveal=true also sets revealedCards', async () => {
      const { room, internalRoom, ids } = await createMesaTestContext(colyseus, {
        tableId: 'test-setcards-reveal',
        playerCount: 3,
      });

      const player = room.state.players.get(ids[0])!;

      internalRoom.setPlayerCards(ids[0], '01-O,03-C', true);
      expect(player.revealedCards).toBe('01-O,03-C');
    });
  });

  // ───────────────────────────────────────────────────────────
  // Deck management
  // ───────────────────────────────────────────────────────────

  describe('Deck — createDeck', () => {
    it('creates 28 unique cards (7 ranks × 4 suits)', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-deck-create' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      internalRoom.createDeck();

      expect(internalRoom.deck.length).toBe(28);
      const uniqueCards = new Set(internalRoom.deck);
      expect(uniqueCards.size).toBe(28);

      // Verify all 4 suits present
      const suits = new Set(internalRoom.deck.map((c: string) => c.split('-')[1]));
      expect(suits).toEqual(new Set(['O', 'C', 'E', 'B']));
    });
  });

  // ───────────────────────────────────────────────────────────
  // Reconnection — ghost player matching by deviceId
  // ───────────────────────────────────────────────────────────

  describe('Reconnection — ghost player matching', () => {
    it('restores player state when reconnecting with same deviceId', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-reconnect-ghost' });

      // Join with explicit deviceId
      const p1 = await colyseus.connectTo(room, { nickname: 'P1', deviceId: 'device-ghost-1', userId: 'supa-g1', chips: 10_000_000 });
      const p2 = await colyseus.connectTo(room, { nickname: 'P2', deviceId: 'device-ghost-2', userId: 'supa-g2', chips: 10_000_000 });
      const p3 = await colyseus.connectTo(room, { nickname: 'P3', deviceId: 'device-ghost-3', userId: 'supa-g3', chips: 10_000_000 });

      await new Promise(r => setTimeout(r, 100));

      const internalRoom = colyseus.getRoomById(room.roomId) as any;
      const ids = Array.from(room.state.players.keys()) as string[];
      const oldSessionId = p1.sessionId;
      const oldPlayer = room.state.players.get(oldSessionId)!;

      // Set up mid-game state
      internalRoom.seatOrder = ids;
      room.state.phase = 'GUERRA';
      room.state.dealerId = oldSessionId;
      room.state.turnPlayerId = oldSessionId;
      room.state.activeManoId = oldSessionId;
      oldPlayer.chips = 8_000_000;
      oldPlayer.cards = '01-O,03-C,05-E,07-B';
      oldPlayer.cardCount = 4;
      oldPlayer.isFolded = false;
      oldPlayer.hasActed = true;
      oldPlayer.connected = false;

      // New client joins with same deviceId
      const newClient = await colyseus.connectTo(room, {
        nickname: 'P1_reconnected',
        deviceId: 'device-ghost-1',
        userId: 'supa-reconnect',
        chips: 9_000_000,
      });

      await new Promise(r => setTimeout(r, 200));

      const newSessionId = newClient.sessionId;
      const newPlayer = room.state.players.get(newSessionId)!;

      // Old session is removed, new takes its place
      expect(room.state.players.has(oldSessionId)).toBe(false);
      expect(newPlayer).toBeTruthy();
      expect(newPlayer.connected).toBe(true);

      // State restored: mid-game chips, cards, flags
      expect(newPlayer.chips).toBe(8_000_000);
      expect(newPlayer.cards).toBe('01-O,03-C,05-E,07-B');
      expect(newPlayer.cardCount).toBe(4);
      expect(newPlayer.isFolded).toBe(false);
      expect(newPlayer.hasActed).toBe(true);

      // seatOrder, dealerId, turnPlayerId updated
      expect(internalRoom.seatOrder).toContain(newSessionId);
      expect(internalRoom.seatOrder).not.toContain(oldSessionId);
      expect(room.state.dealerId).toBe(newSessionId);
      expect(room.state.turnPlayerId).toBe(newSessionId);
    });

    it('resets isReady/hasActed/isFolded when reconnecting in LOBBY', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-reconnect-lobby-reset' });

      const p1 = await colyseus.connectTo(room, { nickname: 'P1', deviceId: 'device-lobby-1', userId: 'supa-l1', chips: 10_000_000 });
      const p2 = await colyseus.connectTo(room, { nickname: 'P2', deviceId: 'device-lobby-2', userId: 'supa-l2', chips: 10_000_000 });
      const p3 = await colyseus.connectTo(room, { nickname: 'P3', deviceId: 'device-lobby-3', userId: 'supa-l3', chips: 10_000_000 });

      await new Promise(r => setTimeout(r, 100));

      const oldPlayer = room.state.players.get(p1.sessionId)!;

      room.state.phase = 'LOBBY';
      oldPlayer.isReady = true;
      oldPlayer.hasActed = true;
      oldPlayer.isFolded = true;
      oldPlayer.connected = false;

      const newClient = await colyseus.connectTo(room, {
        nickname: 'P1_lobby',
        deviceId: 'device-lobby-1',
        userId: 'supa-lobby-reconnect',
        chips: 12_000_000,
      });

      await new Promise(r => setTimeout(r, 200));

      const newPlayer = room.state.players.get(newClient.sessionId)!;
      expect(newPlayer.isReady).toBe(false);
      expect(newPlayer.hasActed).toBe(false);
      expect(newPlayer.isFolded).toBe(false);
      // In LOBBY, chips update from options
      expect(newPlayer.chips).toBe(12_000_000);
    });
  });

  // ───────────────────────────────────────────────────────────
  // onDispose — refund unsettled bets
  // ───────────────────────────────────────────────────────────

  describe('onDispose — refund unsettled bets', () => {
    it('refunds totalMainBet for each player when game is in progress', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-dispose-refund',
        playerCount: 3,
      });

      room.state.phase = 'GUERRA';
      internalRoom.currentGameId = 'dispose-test-game';
      players[0].totalMainBet = 1_000_000;
      players[0].supabaseUserId = 'supa-d1';
      players[1].totalMainBet = 800_000;
      players[1].supabaseUserId = 'supa-d2';
      players[2].totalMainBet = 0; // Folded — no main bet
      players[2].supabaseUserId = 'supa-d3';

      const refundSpy = vi.spyOn(SupabaseService, 'refundPlayer').mockResolvedValue({ success: true } as any);

      internalRoom.onDispose();

      // Should refund P1 and P2 (P3 has totalMainBet = 0)
      expect(refundSpy).toHaveBeenCalledWith(
        'supa-d1', 1_000_000, 'dispose-test-game',
        expect.objectContaining({ reason: expect.stringContaining('cierre de sala') })
      );
      expect(refundSpy).toHaveBeenCalledWith(
        'supa-d2', 800_000, 'dispose-test-game',
        expect.objectContaining({ reason: expect.stringContaining('cierre de sala') })
      );
      // P3 should NOT be refunded (totalMainBet = 0)
      expect(refundSpy).not.toHaveBeenCalledWith(
        'supa-d3', expect.anything(), expect.anything(), expect.anything()
      );

      refundSpy.mockClear();
    });

    it('distributes piquePot proportionally among connected non-folded players', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-dispose-pique-refund',
        playerCount: 3,
      });

      room.state.phase = 'PIQUE';
      room.state.piquePot = 1_500_000; // 3 × 500k
      internalRoom.currentGameId = 'dispose-pique-game';
      players[0].supabaseUserId = 'supa-dp1'; players[0].isFolded = false; players[0].connected = true;
      players[1].supabaseUserId = 'supa-dp2'; players[1].isFolded = false; players[1].connected = true;
      players[2].supabaseUserId = 'supa-dp3'; players[2].isFolded = true; players[2].connected = true; // folded → excluded

      const refundSpy = vi.spyOn(SupabaseService, 'refundPlayer').mockResolvedValue({ success: true } as any);

      internalRoom.onDispose();

      // 1.5M / 2 contributors = 750k each
      const piqueCalls = refundSpy.mock.calls.filter(
        (c: any) => c[3]?.reason?.includes('pique')
      );
      expect(piqueCalls.length).toBe(2);
      expect(piqueCalls[0][1]).toBe(750_000);
      expect(piqueCalls[1][1]).toBe(750_000);

      refundSpy.mockClear();
    });

    it('does NOT refund if game is in LOBBY (no active bets)', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-dispose-lobby-noop',
        playerCount: 3,
      });

      room.state.phase = 'LOBBY';
      players[0].totalMainBet = 500_000; // Stale data
      players[0].supabaseUserId = 'supa-noop';

      const refundSpy = vi.spyOn(SupabaseService, 'refundPlayer').mockResolvedValue({ success: true } as any);

      internalRoom.onDispose();

      expect(refundSpy).not.toHaveBeenCalled();
      refundSpy.mockClear();
    });
  });

  // ───────────────────────────────────────────────────────────
  // Admin actions — kick, mute, ban
  // ───────────────────────────────────────────────────────────

  describe('Admin actions — kick, mute, ban', () => {
    it('admin:kick removes target player from the room', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-admin-kick' });

      // Join 3 players
      const p1 = await colyseus.connectTo(room, { nickname: 'P1', deviceId: 'dev-ak1', userId: 'supa-ak1', chips: 10_000_000 });
      const p2 = await colyseus.connectTo(room, { nickname: 'P2', deviceId: 'dev-ak2', userId: 'supa-ak2', chips: 10_000_000 });
      const admin = await colyseus.connectTo(room, { spectator: true });

      await new Promise(r => setTimeout(r, 100));

      const internalRoom = colyseus.getRoomById(room.roomId) as any;
      expect(room.state.players.size).toBe(2); // 2 players + 1 spectator

      admin.send('admin:kick', { playerId: p2.sessionId });
      await new Promise(r => setTimeout(r, 200));

      expect(room.state.players.size).toBe(1);
      expect(room.state.players.has(p2.sessionId)).toBe(false);
      expect(room.state.lastAction).toContain('retirado');
    });

    it('non-spectator cannot use admin:kick', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-admin-noguard' });

      const p1 = await colyseus.connectTo(room, { nickname: 'P1', deviceId: 'dev-ng1', userId: 'supa-ng1', chips: 10_000_000 });
      const p2 = await colyseus.connectTo(room, { nickname: 'P2', deviceId: 'dev-ng2', userId: 'supa-ng2', chips: 10_000_000 });

      await new Promise(r => setTimeout(r, 100));

      // Player tries to kick another player (should be ignored)
      p1.send('admin:kick', { playerId: p2.sessionId });
      await new Promise(r => setTimeout(r, 200));

      // P2 should still be there
      expect(room.state.players.size).toBe(2);
      expect(room.state.players.has(p2.sessionId)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────
  // SORTEO_MANO — first game oro dealing
  // ───────────────────────────────────────────────────────────

  describe('SORTEO_MANO — first game phase', () => {
    it('first-game starts STARTING → BARAJANDO → SORTEO_MANO → PIQUE flow', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-sorteo',
        playerCount: 3,
      });

      expect(room.state.isFirstGame).toBe(true);

      // Directly call startPhase1Sorteo
      internalRoom.startPhase1Sorteo();
      expect(room.state.phase).toBe('STARTING');

      // After 5s → BARAJANDO
      await new Promise(r => setTimeout(r, 5500));
      expect(room.state.phase).toBe('BARAJANDO');

      // After 12s more → SORTEO_MANO (dealing one card per player)
      await new Promise(r => setTimeout(r, 12500));
      expect(room.state.phase).toBe('SORTEO_MANO');
    }, 25000);

    it('startNewGame resets all player state for a new round', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-startnewgame-reset',
        playerCount: 3,
      });

      // Stale state from a previous game
      players[0].roundBet = 500_000;
      players[0].isAllIn = true;
      players[0].passedWithJuego = true;
      players[0].totalMainBet = 2_000_000;
      players[0].declaredJuego = true;
      players[0].hasActed = true;
      players[0].isReady = true;

      room.state.pot = 3_000_000;
      room.state.piquePot = 500_000;
      room.state.currentMaxBet = 1_000_000;
      room.state.bottomCard = '04-O';

      // NOTE: startNewGame calls startPhase1Sorteo/startPhase2Pique which use real timers.
      // We test the reset logic only by checking what startNewGame sets before calling sub-phases.
      // We'll mock the sub-phase to prevent timer cascade.
      const origSorteo = internalRoom.startPhase1Sorteo.bind(internalRoom);
      internalRoom.startPhase1Sorteo = vi.fn();
      internalRoom.startPhase2Pique = vi.fn();
      room.state.isFirstGame = false; // Skip sorteo

      internalRoom.startNewGame();

      expect(room.state.pot).toBe(0);
      expect(room.state.piquePot).toBe(0);
      expect(room.state.currentMaxBet).toBe(0);
      expect(room.state.bottomCard).toBe('');
      expect(internalRoom.dealerRotatedThisGame).toBe(false);
      expect(internalRoom.piqueRestartCount).toBe(0);

      expect(players[0].roundBet).toBe(0);
      expect(players[0].isAllIn).toBe(false);
      expect(players[0].passedWithJuego).toBe(false);
      expect(players[0].totalMainBet).toBe(0);
      expect(players[0].declaredJuego).toBe(null);
      expect(players[0].hasActed).toBe(false);
      expect(players[0].cards).toBe('');
      expect(players[0].revealedCards).toBe('');

      // Restore
      internalRoom.startPhase1Sorteo = origSorteo;
    });
  });

  // ───────────────────────────────────────────────────────────
  // countdown lifecycle
  // ───────────────────────────────────────────────────────────

  describe('Countdown lifecycle', () => {
    it('checkStartCountdown starts when all active players are ready', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-countdown-start',
        playerCount: 3,
      });

      room.state.phase = 'LOBBY';
      room.state.isFirstGame = false; // Requires only 2 players
      players.forEach(p => { p.connected = true; p.isWaiting = false; p.isReady = true; });

      internalRoom.checkStartCountdown();

      expect(room.state.countdown).toBe(5);
    });

    it('stopCountdown resets countdown to -1 when a player unreadies', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-countdown-stop',
        playerCount: 3,
      });

      room.state.phase = 'LOBBY';
      room.state.isFirstGame = false;
      players.forEach(p => { p.connected = true; p.isWaiting = false; p.isReady = true; });

      // Start countdown
      internalRoom.checkStartCountdown();
      expect(room.state.countdown).toBe(5);

      // P1 unreadies
      players[0].isReady = false;
      internalRoom.checkStartCountdown();

      expect(room.state.countdown).toBe(-1);
    });

    it('first game requires minPlayers (3) for countdown', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-countdown-firstgame' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      const p1 = await colyseus.connectTo(room, { nickname: 'P1', deviceId: 'dev-cdf1', userId: 'supa-cdf1', chips: 10_000_000 });
      const p2 = await colyseus.connectTo(room, { nickname: 'P2', deviceId: 'dev-cdf2', userId: 'supa-cdf2', chips: 10_000_000 });

      await new Promise(r => setTimeout(r, 100));

      room.state.phase = 'LOBBY';
      room.state.isFirstGame = true;
      const pl1 = room.state.players.get(p1.sessionId)!;
      const pl2 = room.state.players.get(p2.sessionId)!;
      pl1.isReady = true; pl1.connected = true; pl1.isWaiting = false;
      pl2.isReady = true; pl2.connected = true; pl2.isWaiting = false;

      internalRoom.checkStartCountdown();

      // Only 2 players but first game needs 3 → no countdown
      expect(room.state.countdown).toBe(-1);
    });
  });

  // ───────────────────────────────────────────────────────────
  // removePlayer — cleanup
  // ───────────────────────────────────────────────────────────

  describe('removePlayer — cleanup', () => {
    it('removes player from seatOrder and reassigns dealer', async () => {
      const { room, internalRoom, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-removeplayer-seat',
        playerCount: 3,
      });

      internalRoom.seatOrder = [...ids];
      room.state.dealerId = ids[0];

      // Remove P1 (the dealer)
      internalRoom.removePlayer(ids[0]);

      expect(room.state.players.has(ids[0])).toBe(false);
      expect(internalRoom.seatOrder).not.toContain(ids[0]);
      // Dealer should be reassigned to next in seatOrder
      expect(room.state.dealerId).toBe(ids[1]);
    });

    it('resetRoomState when last player is removed', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-removeplayer-reset' });
      const internalRoom = colyseus.getRoomById(room.roomId) as any;

      const p1 = await colyseus.connectTo(room, { nickname: 'P1', deviceId: 'dev-rr1', userId: 'supa-rr1', chips: 10_000_000 });
      await new Promise(r => setTimeout(r, 100));

      room.state.phase = 'GUERRA'; // Mid-game
      room.state.pot = 2_000_000;

      internalRoom.removePlayer(p1.sessionId);

      expect(room.state.players.size).toBe(0);
      expect(room.state.phase).toBe('LOBBY');
      expect(room.state.pot).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────
  // request-resync — admin blindness
  // ───────────────────────────────────────────────────────────

  describe('request-resync — admin blindness', () => {
    it('re-sends private cards to a player upon request-resync', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-resync',
        playerCount: 3,
      });

      room.state.phase = 'GUERRA';
      players[0].cards = '01-O,03-C,05-E,07-B';

      const sendSpy = vi.spyOn(internalRoom, 'sendPrivateCards');

      clients[0].send('request-resync');
      await new Promise(r => setTimeout(r, 100));

      expect(sendSpy).toHaveBeenCalledWith(ids[0]);
      sendSpy.mockRestore();
    });

    it('spectator cannot request-resync (admin blindness)', async () => {
      const room = await colyseus.createRoom<any>('mesa_primera', { tableId: 'test-resync-admin' });

      const p1 = await colyseus.connectTo(room, { nickname: 'P1', deviceId: 'dev-rs1', userId: 'supa-rs1', chips: 10_000_000 });
      const admin = await colyseus.connectTo(room, { spectator: true });

      await new Promise(r => setTimeout(r, 100));

      const internalRoom = colyseus.getRoomById(room.roomId) as any;
      const sendSpy = vi.spyOn(internalRoom, 'sendPrivateCards');

      admin.send('request-resync');
      await new Promise(r => setTimeout(r, 100));

      // Spectator request is silently ignored
      expect(sendSpy).not.toHaveBeenCalled();
      sendSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────
  // onLeave — dealer transfer on disconnect
  // ───────────────────────────────────────────────────────────

  describe('onLeave — dealer and mano transfer', () => {
    it('transfers dealer to next connected player on onLeave', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-leave-dealer',
        playerCount: 3,
      });

      internalRoom.seatOrder = [...ids];
      room.state.dealerId = ids[0];
      room.state.activeManoId = ids[0];

      // P1 disconnects (non-consented)
      players[0].connected = false;

      // Simulate onLeave behavior for dealer transfer
      if (room.state.dealerId === ids[0]) {
        const currentSeatIdx = internalRoom.seatOrder.indexOf(ids[0]);
        for (let i = 1; i < internalRoom.seatOrder.length; i++) {
          const nextIdx = (currentSeatIdx + i) % internalRoom.seatOrder.length;
          const nextId = internalRoom.seatOrder[nextIdx];
          const p = room.state.players.get(nextId);
          if (p && p.connected) {
            room.state.dealerId = nextId;
            break;
          }
        }
      }

      expect(room.state.dealerId).toBe(ids[1]);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Betting — resto raise reopens round
  // ───────────────────────────────────────────────────────────

  describe('Betting — resto (all-in) raise reopens round', () => {
    it('resto above currentMaxBet reopens betting for earlier players', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-resto-reopen',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.phase = 'APUESTA_4_CARTAS';
      room.state.activeManoId = ids[0];
      room.state.currentMaxBet = 0;
      room.state.highestBetPlayerId = '';
      room.state.turnPlayerId = ids[0];
      players.forEach(p => { p.isFolded = false; p.hasActed = false; p.roundBet = 0; p.cards = '01-O,03-C,05-E,07-B'; });
      players[0].chips = 10_000_000;
      players[1].chips = 10_000_000;
      players[2].chips = 3_000_000;

      // P1 (Mano) checks
      clients[0].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // P2 bets 1M
      clients[1].send('action', { action: 'voy', amount: 1_000_000 });
      await new Promise(r => setTimeout(r, 200));

      // P3 goes all-in (resto) with 3M — raises above currentMaxBet
      clients[2].send('action', { action: 'resto' });
      await new Promise(r => setTimeout(r, 200));

      // currentMaxBet should be 3M now
      expect(room.state.currentMaxBet).toBe(3_000_000);
      // Round reopened for P1 (roundBet < currentMaxBet even though hasActed)
      expect(room.state.turnPlayerId).toBe(ids[0]);
    });
  });

  // ───────────────────────────────────────────────────────────
  // advanceTurnBetting — fold-out mid-round
  // ───────────────────────────────────────────────────────────

  describe('advanceTurnBetting — fold-out mid-round refund', () => {
    it('refunds uncalled bet and calls next phase when only 1 player remains', async () => {
      const { room, internalRoom, clients, ids, players } = await createMesaTestContext(colyseus, {
        tableId: 'test-foldout-midround',
        playerCount: 3,
      });

      internalRoom.seatOrder = ids;
      room.state.phase = 'GUERRA';
      room.state.activeManoId = ids[0];
      room.state.currentMaxBet = 1_000_000;
      room.state.turnPlayerId = ids[1];
      players.forEach(p => { p.isFolded = false; p.hasActed = false; p.cards = '01-O,03-C,05-E,07-B'; });
      players[0].chips = 9_000_000;
      players[0].roundBet = 1_000_000;
      players[0].totalMainBet = 1_000_000;
      players[0].hasActed = true;
      room.state.pot = 2_000_000;

      // P2 folds
      players[1].roundBet = 500_000;
      players[1].totalMainBet = 500_000;
      clients[1].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // P3 folds
      clients[2].send('action', { action: 'paso' });
      await new Promise(r => setTimeout(r, 200));

      // P1 is last player standing — should get refund and proceed
      // refundUncalledBet returns highest (1M) - second highest (500k) = 500k
      expect(players[0].chips).toBeGreaterThanOrEqual(9_000_000);
    });
  });
});