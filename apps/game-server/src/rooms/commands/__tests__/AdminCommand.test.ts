import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'colyseus';
import { handleAdminBan, handleAdminKick, handleAdminMute } from '../AdminCommand';

vi.mock('../../../services/redis', () => ({
  redis: { setex: vi.fn().mockResolvedValue('OK'), del: vi.fn().mockResolvedValue(1) },
}));

type AdminRoom = Parameters<typeof handleAdminKick>[0];
type AdminPayload = Parameters<typeof handleAdminKick>[2];

interface TestClient {
  sessionId: string;
  leave: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

interface TestRoom {
  spectators: Set<string>;
  state: {
    players: Map<string, ReturnType<typeof player>>;
    lastAction: string;
  };
  clients: TestClient[];
  clientMap: Map<string, TestClient>;
  mutedPlayerIds: Set<string>;
  removePlayer: ReturnType<typeof vi.fn>;
  targetClient: TestClient;
}

function player(id: string, nickname: string) {
  return { id, nickname, supabaseUserId: `user-${id}` };
}

function client(sessionId: string, overrides: Partial<TestClient> = {}): TestClient {
  return {
    sessionId,
    leave: vi.fn(),
    send: vi.fn(),
    ...overrides,
  };
}

function room(overrides: Partial<TestRoom> = {}): TestRoom {
  const target = player('p1', 'Player 1');
  const players = new Map<string, ReturnType<typeof player>>([['p1', target]]);
  const targetClient = client('p1');

  return {
    spectators: new Set<string>(['admin-session']),
    state: {
      players,
      lastAction: '',
    },
    clients: [targetClient],
    clientMap: new Map<string, ReturnType<typeof client>>([['p1', targetClient]]),
    mutedPlayerIds: new Set<string>(),
    removePlayer: vi.fn(),
    targetClient,
    ...overrides,
  };
}

function kick(r: TestRoom, c: TestClient, message: AdminPayload) {
  handleAdminKick(r as unknown as AdminRoom, c as unknown as Client, message);
}

async function mute(r: TestRoom, c: TestClient, message: AdminPayload) {
  await handleAdminMute(r as unknown as AdminRoom, c as unknown as Client, message);
}

function ban(r: TestRoom, c: TestClient, message: AdminPayload) {
  handleAdminBan(r as unknown as AdminRoom, c as unknown as Client, message);
}

describe('AdminCommand moderation guards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.REDIS_URL = 'redis://test';
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('ignora kick si el cliente no es admin', () => {
    const r = room();

    kick(r, client('player-session'), { playerId: 'p1' });

    expect(r.targetClient.leave).not.toHaveBeenCalled();
    expect(r.removePlayer).not.toHaveBeenCalled();
    expect(r.state.lastAction).toBe('');
  });

  it('ignora kick si falta playerId o el jugador objetivo no existe', () => {
    const r = room();
    const admin = client('admin-session');

    kick(r, admin, {});
    kick(r, admin, { playerId: 'missing-player' });

    expect(r.targetClient.leave).not.toHaveBeenCalled();
    expect(r.removePlayer).not.toHaveBeenCalled();
    expect(r.state.lastAction).toBe('');
  });

  it('kick elimina al jugador aunque no exista cliente conectado', () => {
    const r = room({ clients: [] });

    kick(r, client('admin-session'), { playerId: 'p1' });

    expect(r.targetClient.leave).not.toHaveBeenCalled();
    expect(r.removePlayer).toHaveBeenCalledWith('p1');
    expect(r.state.lastAction).toBe('Player 1 fue retirado por el admin');
  });

  it('mute usa la razón por defecto cuando el admin no envía una', async () => {
    const r = room();

    await mute(r, client('admin-session'), { playerId: 'p1' });

    expect(r.targetClient.send).toHaveBeenCalledWith('admin:muted', {
      reason: 'Silenciado por admin',
      muted: true,
    });
    expect(r.mutedPlayerIds).toEqual(new Set(['user-p1']));
  });

  it('ignora mute si falta playerId o el jugador objetivo no existe', async () => {
    const r = room();
    const admin = client('admin-session');

    await mute(r, admin, {});
    await mute(r, admin, { playerId: 'missing-player', reason: 'spam' });

    expect(r.targetClient.send).not.toHaveBeenCalled();
  });

  it('mute no falla si el jugador no tiene cliente conectado', async () => {
    const r = room({ clientMap: new Map() });

    await mute(r, client('admin-session'), { playerId: 'p1', reason: 'spam' });

    expect(r.targetClient.send).not.toHaveBeenCalled();
  });

  it('ignora ban si falta playerId o el jugador objetivo no existe', () => {
    const r = room();
    const admin = client('admin-session');

    ban(r, admin, {});
    ban(r, admin, { playerId: 'missing-player' });

    expect(r.targetClient.leave).not.toHaveBeenCalled();
    expect(r.removePlayer).not.toHaveBeenCalled();
    expect(r.state.lastAction).toBe('');
  });

  it('ban elimina al jugador aunque no exista cliente conectado', () => {
    const r = room({ clients: [] });

    ban(r, client('admin-session'), { playerId: 'p1' });

    expect(r.targetClient.leave).not.toHaveBeenCalled();
    expect(r.removePlayer).toHaveBeenCalledWith('p1');
    expect(r.state.lastAction).toBe('Player 1 fue baneado de la mesa');
  });
});
