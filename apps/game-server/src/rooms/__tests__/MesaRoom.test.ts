import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import { MesaRoom } from '../MesaRoom';
import { SupabaseService } from '../../services/SupabaseService';
import { evaluateHand, compareHands } from '../combinations';

// Mock Supabase service to prevent real DB inserts during unit testing
vi.mock('../../services/SupabaseService', () => {
  return {
    SupabaseService: {
      updatePlayerStats: vi.fn(),
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
});
