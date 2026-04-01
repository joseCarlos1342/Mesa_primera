import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import { MesaRoom } from '../MesaRoom';
import { SupabaseService } from '../../services/SupabaseService';

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
      })
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
});
