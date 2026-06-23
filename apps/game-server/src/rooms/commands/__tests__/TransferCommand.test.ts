import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'colyseus';
import { SupabaseService } from '../../../services/SupabaseService';
import { handleTransfer } from '../TransferCommand';

vi.mock('../../../services/SupabaseService', () => ({
  SupabaseService: {
    transferBetweenPlayers: vi.fn(),
  },
}));

type TransferRoom = Parameters<typeof handleTransfer>[0];
type TransferPayload = Parameters<typeof handleTransfer>[2];

interface TestClient {
  sessionId: string;
  send: ReturnType<typeof vi.fn>;
}

interface TestPlayer {
  nickname: string;
  chips: number;
  supabaseUserId: string;
}

interface TestRoom {
  roomId: string;
  spectators: Set<string>;
  state: {
    players: Map<string, TestPlayer>;
  };
  clientMap: Map<string, TestClient>;
}

function player(overrides: Partial<TestPlayer> = {}): TestPlayer {
  return {
    nickname: 'Sender',
    chips: 500_000,
    supabaseUserId: 'sender-user',
    ...overrides,
  };
}

function client(sessionId = 'sender-session'): TestClient {
  return { sessionId, send: vi.fn() };
}

function room(overrides: Partial<TestRoom> = {}): TestRoom {
  const sender = player();
  const players = new Map<string, TestPlayer>([['sender-session', sender]]);

  return {
    roomId: 'room-1',
    spectators: new Set<string>(),
    state: { players },
    clientMap: new Map<string, TestClient>(),
    ...overrides,
  };
}

async function transfer(r: TestRoom, c: TestClient, message: TransferPayload) {
  await handleTransfer(r as unknown as TransferRoom, c as unknown as Client, message);
}

describe('TransferCommand branch behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(SupabaseService.transferBetweenPlayers).mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('ignora transferencias enviadas por spectators', async () => {
    const r = room({ spectators: new Set(['admin-session']) });
    const c = client('admin-session');

    await transfer(r, c, { recipientUserId: 'recipient-user', amountCents: 100_000 });

    expect(SupabaseService.transferBetweenPlayers).not.toHaveBeenCalled();
    expect(c.send).not.toHaveBeenCalled();
  });

  it('usa error genérico cuando el RPC falla sin mensaje explícito', async () => {
    const r = room();
    const c = client();
    vi.mocked(SupabaseService.transferBetweenPlayers).mockResolvedValue({ success: false });

    await transfer(r, c, { recipientUserId: 'recipient-user', amountCents: 100_000 });

    expect(c.send).toHaveBeenCalledWith('transfer-result', {
      success: false,
      error: 'Error en la transferencia',
    });
    expect(r.state.players.get('sender-session')!.chips).toBe(500_000);
  });

  it('confirma transferencia aunque el receptor no esté en la sala', async () => {
    const r = room();
    const c = client();
    vi.mocked(SupabaseService.transferBetweenPlayers).mockResolvedValue({
      success: true,
      recipientName: 'Recipient',
    });

    await transfer(r, c, { recipientUserId: 'recipient-user', amountCents: 100_000 });

    expect(r.state.players.get('sender-session')!.chips).toBe(400_000);
    expect(c.send).toHaveBeenCalledWith('transfer-result', {
      success: true,
      recipientName: 'Recipient',
      amountCents: 100_000,
      newBalance: 400_000,
    });
  });

  it('actualiza chips del receptor en sala aunque no tenga cliente conectado', async () => {
    const recipient = player({ nickname: 'Recipient', chips: 20_000, supabaseUserId: 'recipient-user' });
    const players = new Map<string, TestPlayer>([
      ['sender-session', player()],
      ['recipient-session', recipient],
    ]);
    const r = room({ state: { players }, clientMap: new Map() });
    const c = client();
    vi.mocked(SupabaseService.transferBetweenPlayers).mockResolvedValue({
      success: true,
      recipientName: 'Recipient',
    });

    await transfer(r, c, { recipientUserId: 'recipient-user', amountCents: 100_000 });

    expect(players.get('sender-session')!.chips).toBe(400_000);
    expect(players.get('recipient-session')!.chips).toBe(120_000);
    expect(c.send).toHaveBeenCalledWith('transfer-result', expect.objectContaining({ success: true }));
  });
});
