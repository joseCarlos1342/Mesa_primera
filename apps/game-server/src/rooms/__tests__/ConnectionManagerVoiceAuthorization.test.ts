import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'colyseus';
import type { MesaRoom } from '../MesaRoom';
import { handleConnectionJoin, handleConnectionLeave } from '../core/ConnectionManager';
import { SupabaseService } from '../../services/SupabaseService';

vi.mock('../../services/SupabaseService', () => ({
  SupabaseService: {
    validateSupervisionToken: vi.fn(),
  },
}));

describe('ConnectionManager spectator voice authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra la identidad del admin al consumir un token de supervisión', async () => {
    vi.mocked(SupabaseService.validateSupervisionToken).mockResolvedValue({
      valid: true,
      adminId: 'admin-1',
    });
    const roomData = {
      roomId: 'room-1',
      spectators: new Map(),
      spectatorAdminIds: new Map(),
      state: { phase: 'LOBBY', players: new Map() },
      broadcast: vi.fn(),
    };
    const room = roomData as unknown as MesaRoom;
    const client = { sessionId: 'session-1', send: vi.fn() } as unknown as Client;

    await handleConnectionJoin(room, client, {
      spectator: true,
      supervisionToken: 'token-1',
    });

    expect(roomData.spectatorAdminIds.get('session-1')).toBe('admin-1');
  });

  it('elimina la identidad del admin al desconectar el espectador', async () => {
    const roomData = {
      roomId: 'room-1',
      spectators: new Map([['session-1', {}]]),
      spectatorAdminIds: new Map([['session-1', 'admin-1']]),
      broadcast: vi.fn(),
    };
    const room = roomData as unknown as MesaRoom;
    const client = { sessionId: 'session-1' } as unknown as Client;

    await handleConnectionLeave(room, client);

    expect(roomData.spectatorAdminIds.has('session-1')).toBe(false);
  });
});
