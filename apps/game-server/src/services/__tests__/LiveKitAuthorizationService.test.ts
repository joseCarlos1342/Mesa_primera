import { beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { matchMaker } from 'colyseus';
import {
  createLiveKitAuthorizationHandler,
  authorizeRoomVoice,
} from '../LiveKitAuthorizationService';

vi.mock('colyseus', () => ({
  matchMaker: {
    remoteRoomCall: vi.fn(),
  },
}));

const remoteRoomCall = vi.mocked(matchMaker.remoteRoomCall);

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('LiveKitAuthorizationService', () => {
  const originalSecret = process.env.INTERNAL_API_SECRET;

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = 'internal-secret';
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.INTERNAL_API_SECRET;
    else process.env.INTERNAL_API_SECRET = originalSecret;
  });

  it('consulta la room real con la identidad del usuario', async () => {
    remoteRoomCall.mockResolvedValueOnce({ authorized: true, role: 'player' });

    await expect(authorizeRoomVoice('room-1', 'user-1')).resolves.toEqual({
      authorized: true,
      role: 'player',
    });
    expect(remoteRoomCall).toHaveBeenCalledWith(
      'room-1',
      'authorizeVoiceParticipant',
      ['user-1'],
    );
  });

  it('rechaza respuestas remotas malformadas en vez de autorizarlas', async () => {
    remoteRoomCall.mockResolvedValueOnce({ authorized: true });

    await expect(authorizeRoomVoice('room-1', 'user-1')).rejects.toThrow(
      'Invalid voice authorization response',
    );
  });

  it('devuelve 403 para secreto inválido sin consultar la room', async () => {
    const handler = createLiveKitAuthorizationHandler(async () => ({
      authorized: true,
      role: 'player',
    }));
    const response = createResponse();

    await handler(
      { headers: { 'x-internal-secret': 'wrong' }, body: { roomId: 'room-1', userId: 'user-1' } } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ ok: false, error: 'Forbidden' });
  });

  it('devuelve 400 para payload inválido', async () => {
    const authorize = vi.fn();
    const handler = createLiveKitAuthorizationHandler(authorize);
    const response = createResponse();

    await handler(
      { headers: { 'x-internal-secret': 'internal-secret' }, body: { roomId: '', userId: 4 } } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ ok: false, error: 'Invalid request' });
    expect(authorize).not.toHaveBeenCalled();
  });

  it('devuelve 503 cuando la room no puede ser consultada', async () => {
    const handler = createLiveKitAuthorizationHandler(async () => {
      throw new Error('room unavailable');
    });
    const response = createResponse();

    await handler(
      { headers: { 'x-internal-secret': 'internal-secret' }, body: { roomId: 'room-1', userId: 'user-1' } } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ ok: false, error: 'Authorization unavailable' });
  });

  it('devuelve la autorización mínima sin exponer estado de la room', async () => {
    const handler = createLiveKitAuthorizationHandler(async () => ({
      authorized: true,
      role: 'admin_spectator',
    }));
    const response = createResponse();

    await handler(
      { headers: { 'x-internal-secret': 'internal-secret' }, body: { roomId: 'room-1', userId: 'admin-1' } } as never,
      response as never,
    );

    expect(response.json).toHaveBeenCalledWith({
      ok: true,
      authorized: true,
      role: 'admin_spectator',
    });
  });

  it('devuelve 403 cuando la room rechaza la identidad', async () => {
    const handler = createLiveKitAuthorizationHandler(async () => ({ authorized: false }));
    const response = createResponse();

    await handler(
      { headers: { 'x-internal-secret': 'internal-secret' }, body: { roomId: 'room-1', userId: 'user-1' } } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ ok: false, authorized: false });
  });
});
