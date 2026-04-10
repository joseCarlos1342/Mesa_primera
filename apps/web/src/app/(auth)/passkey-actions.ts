'use server'

import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { enforceRateLimiting } from '@/app/actions/anti-fraud'
import { enforceSessionPolicy } from './auth-actions-helpers'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server'
import { normalizePhone } from '@/lib/phone'

// ─── Constants ──────────────────────────────────────────────────────────────

const RP_NAME = 'Mesa Primera'
const CHALLENGE_COOKIE = 'webauthn_challenge'
const CHALLENGE_MAX_AGE = 120 // 2 minutes

function getRpId(): string {
  return (process.env.WEBAUTHN_RP_ID ?? 'localhost').trim()
}

function getExpectedOrigins(): string[] {
  const origins = process.env.WEBAUTHN_ORIGINS
  if (origins) return origins.split(',').map(o => o.trim()).filter(Boolean)
  return ['http://localhost:3000', 'https://localhost:3000']
}



/** Store a challenge in an httpOnly cookie for later verification */
async function storeChallenge(challenge: string) {
  const cookieStore = await cookies()
  cookieStore.set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: CHALLENGE_MAX_AGE,
  })
}

/** Retrieve and consume the stored challenge */
async function consumeChallenge(): Promise<string | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(CHALLENGE_COOKIE)?.value ?? null
  if (value) {
    cookieStore.delete(CHALLENGE_COOKIE)
  }
  return value
}

// ─── 1. Registration: generate options ─────────────────────────────────────

export async function getPasskeyRegistrationOptions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userName: user.user_metadata?.username ?? user.phone ?? user.id,
    userDisplayName: user.user_metadata?.full_name ?? 'Jugador',
    userID: new TextEncoder().encode(user.id),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'discouraged',
    },
    timeout: 60000,
  })

  await storeChallenge(options.challenge)

  return { options }
}

// ─── 2. Registration: verify response ──────────────────────────────────────

export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  deviceId: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const expectedChallenge = await consumeChallenge()
  if (!expectedChallenge) return { error: 'Challenge expirado. Intenta de nuevo.' }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    })
  } catch (e) {
    console.error('[PASSKEY] Registration verification failed:', (e as Error).message)
    return { error: 'La verificación biométrica falló.' }
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: 'La verificación biométrica falló.' }
  }

  const { credential, credentialBackedUp } = verification.registrationInfo

  const adminSupabase = await createAdminClient()
  const { error: dbError } = await adminSupabase
    .from('user_devices')
    .upsert(
      {
        user_id: user.id,
        device_id: deviceId,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64'),
        sign_count: credential.counter,
        transports: credential.transports ?? ['internal'],
        is_trusted: true,
        fingerprint: { backed_up: credentialBackedUp, registered_at: new Date().toISOString() },
        last_login_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_id' },
    )

  if (dbError) {
    console.error('[PASSKEY] DB upsert failed:', dbError.message)
    return { error: 'No se pudo guardar la credencial.' }
  }

  return { ok: true, credentialId: credential.id }
}

// ─── 3. Authentication (Fast Login): generate options ──────────────────────

export async function getPasskeyLoginOptions(phone: string) {
  const rl = await enforceRateLimiting('passkey_login_options', 10, 60)
  if (!rl.success) return { error: rl.error }

  const normalized = normalizePhone(phone)

  const adminSupabase = await createAdminClient()

  // Find user by phone
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('phone', normalized)
    .maybeSingle()

  if (!profile) return { available: false }

  // Find trusted passkey devices for this user
  const { data: devices, error } = await adminSupabase
    .from('user_devices')
    .select('credential_id, transports')
    .eq('user_id', profile.id)
    .eq('is_trusted', true)
    .not('credential_id', 'is', null)
    .not('public_key', 'is', null)

  if (error || !devices?.length) {
    return { available: false }
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    allowCredentials: devices.map(d => ({
      id: d.credential_id!,
      transports: (d.transports as AuthenticatorTransport[] | undefined) ?? ['internal'],
    })),
    userVerification: 'required',
    timeout: 60000,
  })

  await storeChallenge(options.challenge)

  return { available: true, options }
}

// ─── 4. Authentication (Fast Login): verify assertion ──────────────────────

export async function verifyPasskeyLogin(
  phone: string,
  response: AuthenticationResponseJSON,
) {
  const rl = await enforceRateLimiting('passkey_login_verify', 5, 60)
  if (!rl.success) return { error: rl.error }

  const expectedChallenge = await consumeChallenge()
  if (!expectedChallenge) return { error: 'Challenge expirado. Intenta de nuevo.' }

  const normalized = normalizePhone(phone)
  const adminSupabase = await createAdminClient()

  // Find the specific credential used
  const { data: device } = await adminSupabase
    .from('user_devices')
    .select('user_id, credential_id, public_key, sign_count')
    .eq('credential_id', response.id)
    .eq('is_trusted', true)
    .maybeSingle()

  if (!device?.public_key) {
    return { error: 'Dispositivo no reconocido.' }
  }

  // Verify the user matches the phone
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('id, phone')
    .eq('id', device.user_id)
    .eq('phone', normalized)
    .maybeSingle()

  if (!profile) {
    return { error: 'Dispositivo no coincide con el teléfono.' }
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
      credential: {
        id: device.credential_id!,
        publicKey: Buffer.from(device.public_key, 'base64'),
        counter: Number(device.sign_count ?? 0),
        transports: ['internal'],
      },
    })
  } catch (e) {
    console.error('[PASSKEY] Authentication verification failed:', (e as Error).message)
    return { error: 'La verificación biométrica falló.' }
  }

  if (!verification.verified) {
    return { error: 'La verificación biométrica falló.' }
  }

  // Update sign count to prevent replay attacks
  await adminSupabase
    .from('user_devices')
    .update({
      sign_count: verification.authenticationInfo.newCounter,
      last_login_at: new Date().toISOString(),
    })
    .eq('credential_id', device.credential_id!)

  // ── Mint session ──
  // Ensure the user has a proxy email for magic link generation
  const proxyEmail = `player-${device.user_id}@passkey.mesa-primera.internal`

  // Cast admin API for methods not fully typed in @supabase/supabase-js
  const adminAuth = adminSupabase.auth.admin as typeof adminSupabase.auth.admin & {
    updateUser: (uid: string, attrs: Record<string, unknown>) => Promise<{
      data: { user?: unknown } | null
      error: { message: string } | null
    }>
    generateLink: (params: { type: string; email: string }) => Promise<{
      data: { properties?: { hashed_token?: string } } | null
      error: { message: string } | null
    }>
  }

  // Set email on the auth user (idempotent) so generateLink works
  await adminAuth.updateUser(device.user_id, {
    email: proxyEmail,
    email_confirm: true,
  })

  // Generate a magic link — returns a hashed_token we can verify server-side
  const { data: linkData, error: linkError } = await adminAuth.generateLink({
    type: 'magiclink',
    email: proxyEmail,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('[PASSKEY] generateLink failed:', linkError?.message)
    return { error: 'Error al crear sesión. Intenta con SMS.' }
  }

  // Exchange the hashed token for a real session (sets cookies via SSR client)
  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError) {
    console.error('[PASSKEY] Token exchange failed:', verifyError.message)
    return { error: 'Error al crear sesión. Intenta con SMS.' }
  }

  await enforceSessionPolicy(device.user_id)

  return { ok: true }
}
