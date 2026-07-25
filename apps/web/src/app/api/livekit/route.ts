import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { redis } from '@/utils/redis';

type LiveKitRequestBody = {
  room?: unknown;
};

const ROOM_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

function sanitizeParticipantName(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const cleaned = Array.from(value.trim())
    .filter((char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('');
  return cleaned ? cleaned.slice(0, 80) : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    let body: LiveKitRequestBody = {};
    try {
      body = await request.json();
    } catch {
      // Ignore JSON parse errors for empty bodies
    }

    const roomName = typeof body.room === 'string' ? body.room.trim() : 'general-lobby';
    if (!ROOM_NAME_PATTERN.test(roomName)) {
      return NextResponse.json({ error: 'Sala inválida' }, { status: 400 });
    }

    const participantName = sanitizeParticipantName(
      user.user_metadata?.username ?? user.user_metadata?.full_name,
      user.email?.split('@')[0] ?? user.id
    );

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'Server misconfigured. LiveKit credentials are required.' },
        { status: 500 }
      );
    }

    let isMuted = false;
    if (process.env.REDIS_URL) {
      try {
        isMuted = Boolean(await redis.get(`voice-muted:${roomName}:${user.id}`));
      } catch (error) {
        console.error('[LiveKit] No se pudo verificar el mute de voz:', error instanceof Error ? error.name : 'unknown');
        return NextResponse.json({ error: 'No se pudo verificar el estado de moderación.' }, { status: 503 });
      }
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: participantName,
      // TTL set to 2 hours
      ttl: '2h',
    });

    at.addGrant({ roomJoin: true, room: roomName, canPublish: !isMuted });

    const token = await at.toJwt();

    return NextResponse.json({ token, url: wsUrl });
  } catch (e: unknown) {
    console.error('Error generating LiveKit token:', e);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
