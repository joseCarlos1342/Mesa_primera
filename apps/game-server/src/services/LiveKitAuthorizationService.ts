import type { RequestHandler } from 'express';
import { matchMaker } from 'colyseus';
import type { MesaRoom } from '../rooms/MesaRoom';
import { resolveVoiceAuthorization, type VoiceAuthorizationResult } from '../rooms/voice-authorization';
import { isInternalRequest } from './internal-api';

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

function isValidRequestValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

function isVoiceAuthorizationResult(value: unknown): value is VoiceAuthorizationResult {
  if (!value || typeof value !== 'object' || !('authorized' in value)) return false;
  const result = value as { authorized?: unknown; role?: unknown };
  if (result.authorized === false) return true;
  return result.authorized === true
    && (result.role === 'player' || result.role === 'admin_spectator');
}

export async function authorizeRoomVoice(
  roomId: string,
  userId: string,
): Promise<VoiceAuthorizationResult> {
  if (!ROOM_ID_PATTERN.test(roomId) || !isValidRequestValue(userId)) {
    throw new Error('Invalid voice authorization request');
  }

  const result = await matchMaker.remoteRoomCall<MesaRoom>(
    roomId,
    'authorizeVoiceParticipant',
    [userId],
  );
  if (!isVoiceAuthorizationResult(result)) {
    throw new Error('Invalid voice authorization response');
  }
  return result;
}

type AuthorizationHandler = (roomId: string, userId: string) => Promise<VoiceAuthorizationResult>;

export function createLiveKitAuthorizationHandler(
  authorize: AuthorizationHandler = authorizeRoomVoice,
): RequestHandler {
  return async (req, res) => {
    if (!isInternalRequest(req.headers['x-internal-secret'], process.env.INTERNAL_API_SECRET)) {
      res.status(403).json({ ok: false, error: 'Forbidden' });
      return;
    }

    const body = req.body as { roomId?: unknown; userId?: unknown } | undefined;
    if (!body || !ROOM_ID_PATTERN.test(String(body.roomId ?? '')) || !isValidRequestValue(body.userId)) {
      res.status(400).json({ ok: false, error: 'Invalid request' });
      return;
    }

    try {
      const result = await authorize(String(body.roomId), body.userId);
      if (!result.authorized) {
        res.status(403).json({ ok: false, authorized: false });
        return;
      }
      res.json({ ok: true, ...result });
    } catch {
      res.status(503).json({ ok: false, error: 'Authorization unavailable' });
    }
  };
}
