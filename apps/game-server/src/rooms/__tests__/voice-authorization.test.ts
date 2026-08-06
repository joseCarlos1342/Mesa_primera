import { describe, expect, it } from 'vitest';
import { resolveVoiceAuthorization, type VoiceAuthorizationPlayer } from '../voice-authorization';

describe('resolveVoiceAuthorization', () => {
  const players: VoiceAuthorizationPlayer[] = [
    { connected: true, supabaseUserId: 'player-connected' },
    { connected: false, supabaseUserId: 'player-disconnected' },
  ];

  it('autoriza a un jugador conectado por su identidad Supabase', () => {
    expect(resolveVoiceAuthorization(players, [], 'player-connected')).toEqual({
      authorized: true,
      role: 'player',
    });
  });

  it('rechaza jugadores desconectados aunque conserven el asiento', () => {
    expect(resolveVoiceAuthorization(players, [], 'player-disconnected')).toEqual({
      authorized: false,
    });
  });

  it('rechaza cuando el session id coincide pero la identidad Supabase no', () => {
    expect(resolveVoiceAuthorization(
      [{ connected: true, supabaseUserId: 'real-user' }],
      [],
      'session-id',
    )).toEqual({ authorized: false });
  });

  it('autoriza a un administrador solo con supervisión activa en la room', () => {
    expect(resolveVoiceAuthorization(players, ['admin-active'], 'admin-active')).toEqual({
      authorized: true,
      role: 'admin_spectator',
    });
  });

  it('rechaza a un administrador que no tiene una sesión de supervisión activa', () => {
    expect(resolveVoiceAuthorization(players, [], 'admin-without-supervision')).toEqual({
      authorized: false,
    });
  });
});
