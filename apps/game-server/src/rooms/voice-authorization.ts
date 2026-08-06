export interface VoiceAuthorizationPlayer {
  connected: boolean;
  supabaseUserId?: string | null;
}

export type VoiceAuthorizationResult =
  | { authorized: true; role: 'player' | 'admin_spectator' }
  | { authorized: false };

export function resolveVoiceAuthorization(
  players: Iterable<VoiceAuthorizationPlayer>,
  activeAdminIds: Iterable<string>,
  userId: string,
): VoiceAuthorizationResult {
  const connectedPlayer = Array.from(players).some(
    (player) => player.connected && player.supabaseUserId === userId,
  );
  if (connectedPlayer) return { authorized: true, role: 'player' };

  if (Array.from(activeAdminIds).includes(userId)) {
    return { authorized: true, role: 'admin_spectator' };
  }

  return { authorized: false };
}
