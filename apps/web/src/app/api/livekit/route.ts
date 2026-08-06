import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { checkDistributedRateLimit, getClientIp, redis } from '@/utils/redis';

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
    let body: LiveKitRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }

    const roomName = typeof body.room === 'string' ? body.room.trim() : '';
    if (!ROOM_NAME_PATTERN.test(roomName)) {
      return NextResponse.json({ error: 'Sala inválida' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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

    if (!process.env.REDIS_URL?.trim()) {
      return NextResponse.json({ error: 'No se pudo verificar el estado de moderación.' }, { status: 503 });
    }

    const gameServerUrl = process.env.GAME_SERVER_URL?.trim();
    const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
    if (!gameServerUrl || !internalSecret) {
      return NextResponse.json({ error: 'Server misconfigured. Internal authorization is required.' }, { status: 500 });
    }

    let ip: string;
    try {
      ip = await getClientIp();
      const userLimit = await checkDistributedRateLimit(`rate_limit:livekit:user:${user.id}`, 10, 60);
      if (!userLimit.success) {
        return NextResponse.json(
          { error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
          { status: 429, headers: { 'Retry-After': String(userLimit.reset), 'Cache-Control': 'no-store' } },
        );
      }
      const ipLimit = await checkDistributedRateLimit(`rate_limit:livekit:ip:${ip}`, 30, 60);
      if (!ipLimit.success) {
        return NextResponse.json(
          { error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
          { status: 429, headers: { 'Retry-After': String(ipLimit.reset), 'Cache-Control': 'no-store' } },
        );
      }
    } catch (error) {
      console.error('[LiveKit] Rate limiter unavailable:', error instanceof Error ? error.name : 'unknown');
      return NextResponse.json({ error: 'No se pudo verificar la disponibilidad del servicio.' }, { status: 503 });
    }

    let authorizationResponse: Response;
    try {
      authorizationResponse = await fetch(
        `${gameServerUrl.replace(/\/$/, '')}/api/internal/livekit/authorize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': internalSecret,
          },
          body: JSON.stringify({ roomId: roomName, userId: user.id }),
          signal: AbortSignal.timeout(5000),
        },
      );
    } catch (error) {
      console.error('[LiveKit] Internal authorization unavailable:', error instanceof Error ? error.name : 'unknown');
      return NextResponse.json({ error: 'No se pudo verificar la autorización de la sala.' }, { status: 503 });
    }

    if (authorizationResponse.status === 403 || authorizationResponse.status === 404) {
      return NextResponse.json({ error: 'No autorizado para esta sala.' }, { status: 403 });
    }
    if (!authorizationResponse.ok) {
      return NextResponse.json({ error: 'No se pudo verificar la autorización de la sala.' }, { status: 503 });
    }

    let authorization: { ok?: unknown; authorized?: unknown; role?: unknown };
    try {
      authorization = await authorizationResponse.json() as { ok?: unknown; authorized?: unknown; role?: unknown };
    } catch {
      return NextResponse.json({ error: 'No se pudo verificar la autorización de la sala.' }, { status: 503 });
    }
    const hasValidRole = authorization.role === 'player' || authorization.role === 'admin_spectator';
    if (authorization.ok !== true || authorization.authorized !== true || !hasValidRole) {
      return NextResponse.json({ error: 'No se pudo verificar la autorización de la sala.' }, { status: 503 });
    }

    let isMuted = false;
    try {
      isMuted = Boolean(await redis.get(`voice-muted:${roomName}:${user.id}`));
    } catch (error) {
      console.error('[LiveKit] No se pudo verificar el mute de voz:', error instanceof Error ? error.name : 'unknown');
      return NextResponse.json({ error: 'No se pudo verificar el estado de moderación.' }, { status: 503 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: participantName,
      // TTL set to 2 hours
      ttl: '2h',
    });

    at.addGrant({ roomJoin: true, room: roomName, canPublish: !isMuted });

    const token = await at.toJwt();

    return NextResponse.json({ token, url: wsUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    console.error('Error generating LiveKit token:', e);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
