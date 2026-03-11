import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (err) {
      // Ignore JSON parse errors for empty bodies
    }

    // In a real scenario we would check the session using Supabase auth to get user identity.
    const roomName = body.room || 'general-lobby';
    const participantName = body.username || `User-${Math.floor(Math.random() * 10000)}`;
    const participantIdentity = body.userId || participantName;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'Server misconfigured. LiveKit credentials are required.' },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      // TTL set to 2 hours
      ttl: '2h',
    });

    at.addGrant({ roomJoin: true, room: roomName });

    const token = await at.toJwt();

    return NextResponse.json({ token, url: wsUrl });
  } catch (e: any) {
    console.error('Error generating LiveKit token:', e);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
