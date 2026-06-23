import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'colyseus';
import { SupabaseService } from '../../../services/SupabaseService';
import { handleLookupPlayer } from '../LookupCommand';

vi.mock('../../../services/SupabaseService', () => ({
  SupabaseService: {
    lookupUserByPhone: vi.fn(),
  },
}));

type LookupRoom = Parameters<typeof handleLookupPlayer>[0];
type LookupPayload = Parameters<typeof handleLookupPlayer>[2];

interface TestClient {
  sessionId: string;
  send: ReturnType<typeof vi.fn>;
}

function client(sessionId = 'player-session'): TestClient {
  return { sessionId, send: vi.fn() };
}

function room(spectatorIds: string[] = []) {
  return { spectators: new Set(spectatorIds) };
}

async function lookup(r: ReturnType<typeof room>, c: TestClient, message: LookupPayload) {
  await handleLookupPlayer(r as unknown as LookupRoom, c as unknown as Client, message);
}

describe('LookupCommand branch behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(SupabaseService.lookupUserByPhone).mockReset();
  });

  it('ignora búsquedas enviadas por spectators', async () => {
    const c = client('admin-session');

    await lookup(room(['admin-session']), c, { phone: '3001234567' });

    expect(SupabaseService.lookupUserByPhone).not.toHaveBeenCalled();
    expect(c.send).not.toHaveBeenCalled();
  });

  it('rechaza mensaje ausente como número inválido', async () => {
    const c = client();

    await lookup(room(), c, undefined as unknown as LookupPayload);

    expect(SupabaseService.lookupUserByPhone).not.toHaveBeenCalled();
    expect(c.send).toHaveBeenCalledWith('lookup-result', {
      success: false,
      error: 'Número inválido',
    });
  });
});
