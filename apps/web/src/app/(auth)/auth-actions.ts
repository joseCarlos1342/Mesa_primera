'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { enforceRateLimiting } from '@/app/actions/anti-fraud'
import { redis } from '@/utils/redis'
import {
  registerPlayerSchema,
  loginPlayerSchema,
  loginAdminSchema,
  otpTokenSchema,
  flattenZodErrors,
} from '@/lib/validations'
import crypto from 'crypto'

type ProfileSeedCandidate = {
  id: string
  username: string | null
  full_name?: string | null
  avatar_url?: string | null
  role?: string | null
  is_banned?: boolean | null
}

/**
 * Genera un device ID seguro, lo guarda como cookie httpOnly,
 * actualiza profiles.last_device_id y publica un evento Redis
 * para forzar el logout de sesiones anteriores.
 */
async function enforceSessionPolicy(userId: string) {
  const deviceId = crypto.randomUUID()

  // 1. Set httpOnly cookie so middleware can compare later
  const cookieStore = await cookies()
  cookieStore.set('session_device_id', deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  // 2. Update DB with new device identifier
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ last_device_id: deviceId, is_online: true })
    .eq('id', userId)

  // 3. Publish kick event for old sessions (game-server subscribes)
  try {
    await redis.publish('session_kick', JSON.stringify({ userId, deviceId }))
  } catch (e) {
    // Non-critical: if Redis is down the middleware check still protects HTTP routes
    console.warn('[SESSION_POLICY] Redis publish failed:', (e as Error).message)
  }
}

function normalizePhone(phone: string): string {
  // Solo dígitos y el +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('57')) {
      return `+${cleaned}`
    }
    return `+57${cleaned}`
  }
  return cleaned
}

function isMissingPhoneAuthUser(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase()

  return normalized.includes('signups not allowed for otp') ||
    normalized.includes('user not found') ||
    normalized.includes('can only use shouldcreateuser: true')
}

function isOtpProviderDisabled(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase()

  return normalized.includes('signups not allowed for otp') || normalized.includes('otp_disabled')
}

async function getPhoneProfileCandidate(phone: string) {
  const { createAdminClient } = await import('@/utils/supabase/server')
  const adminSupabase = await createAdminClient()

  const { data, error } = await adminSupabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, phone')
    .eq('phone', phone)
    .maybeSingle()

  if (error) {
    console.error('[AUTH_RECOVERY] No fue posible consultar perfil por teléfono (%s): %s', phone, error.message)
    return null
  }

  return data as (ProfileSeedCandidate & { phone?: string | null }) | null
}

async function provisionMissingPhoneAuthUser(phone: string) {
  const { createAdminClient } = await import('@/utils/supabase/server')
  const adminSupabase = await createAdminClient()
  const profile = await getPhoneProfileCandidate(phone)

  if (!profile) {
    return { recovered: false as const, reason: 'profile_not_found' as const }
  }

  const candidate = profile as ProfileSeedCandidate

  if (candidate.is_banned) {
    return {
      recovered: false as const,
      reason: 'banned' as const,
      error: 'Tu cuenta se encuentra bloqueada. Contacta soporte.'
    }
  }

  const adminAuth = adminSupabase.auth.admin as typeof adminSupabase.auth.admin & {
    createUser: (params: {
      id: string
      phone: string
      phone_confirm: boolean
      user_metadata?: Record<string, unknown>
      app_metadata?: Record<string, unknown>
    }) => Promise<{
      data: { user?: { id: string } | null } | null
      error: { message: string } | null
    }>
  }

  const { error: createError } = await adminAuth.createUser({
    id: candidate.id,
    phone,
    phone_confirm: true,
    user_metadata: {
      username: candidate.username,
      full_name: candidate.full_name ?? null,
      avatar_url: candidate.avatar_url ?? null,
    },
    app_metadata: {
      role: candidate.role ?? 'player',
    },
  })

  if (createError) {
    const normalizedMessage = createError.message.toLowerCase()

    if (normalizedMessage.includes('already registered') || normalizedMessage.includes('already been registered')) {
      return { recovered: true as const, reason: 'already_exists' as const }
    }

    console.error('[AUTH_RECOVERY] No fue posible crear auth.user faltante para %s: %s', phone, createError.message)
    return { recovered: false as const, reason: 'create_failed' as const }
  }

  console.info('[AUTH_RECOVERY] Usuario auth restaurado para teléfono %s', phone)

  return { recovered: true as const, reason: 'created' as const }
}

/**
 * Inicia el proceso de REGISTRO para un nuevo jugador.
 */
export async function registerPlayer(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('register_player', 3, 300)
  if (!rl.success) return { error: rl.error }

  const rawPhone = (formData.get('phone') as string ?? '').trim()
  const fullName = (formData.get('fullName') as string ?? '').trim()
  const nickname = (formData.get('nickname') as string ?? '').trim()
  const avatarId = formData.get('avatarId') as string

  const parsed = registerPlayerSchema.safeParse({ phone: rawPhone, fullName, nickname })
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const phone = normalizePhone(parsed.data.phone)

  // Verificar si el teléfono ya está registrado antes de enviar OTP
  const { data: phoneExists } = await supabase.rpc('check_phone_exists', { p_phone: phone })
  if (phoneExists) {
    return { fieldErrors: { phone: ['Este número ya está registrado. Por favor, inicia sesión.'] } }
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: true,
      data: {
        full_name: parsed.data.fullName,
        username: parsed.data.nickname,
        avatar_url: avatarId,
        role: 'player'
      }
    },
  })

  if (error) {
    console.error('[AUTH_ERROR] Error en registro (%s): %s', phone, error.message, error)

    if (isOtpProviderDisabled(error.message)) {
      return { error: 'El servicio de SMS no está disponible en este momento. Por favor, inténtalo más tarde.' }
    }

    if (error.message.includes('saving new user')) {
      return { error: 'Error al crear el perfil. Es posible que el nombre de usuario (apodo) o el teléfono ya estén registrados por otra persona.' }
    }
    return { error: error.message }
  }

  redirect(`/login/player/verify?phone=${encodeURIComponent(phone)}`)
}

/**
 * Inicia el proceso de LOGIN para un jugador existente.
 */
export async function loginWithPhone(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('login_player', 5, 60)
  if (!rl.success) return { error: rl.error }

  const rawPhone = (formData.get('phone') as string ?? '').trim()
  const parsed = loginPlayerSchema.safeParse({ phone: rawPhone })
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const phone = normalizePhone(parsed.data.phone)

  let { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: false // No crear usuario aquí, forzar registro para nuevos
    }
  })

  if (error && isMissingPhoneAuthUser(error.message)) {
    const recovery = await provisionMissingPhoneAuthUser(phone)

    if (recovery.error) {
      return { error: recovery.error }
    }

    if (recovery.recovered) {
      const retry = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: false
        }
      })

      error = retry.error
    }
  }

  if (error && isOtpProviderDisabled(error.message)) {
    return { error: 'El servicio de SMS no está disponible en este momento. Por favor, inténtalo más tarde.' }
  }

  if (error) {
    console.error('[AUTH_ERROR] Error en login (%s): %s', phone, error.message)

    if (isMissingPhoneAuthUser(error.message)) {
      return { error: 'Si el número está registrado, recibirás un SMS. De lo contrario, regístrate primero.' }
    }
    if (error.message.includes('saving new user')) {
      return { error: 'Error interno del servidor de base de datos. Por favor contacta soporte.' }
    }
    return { error: error.message }
  }

  redirect(`/login/player/verify?phone=${encodeURIComponent(phone)}`)
}

/**
 * Verifica el código OTP enviado por SMS al jugador.
 */
export async function verifyOtp(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('verify_otp', 5, 60)
  if (!rl.success) return { error: rl.error }

  const phone = (formData.get('phone') as string ?? '').trim()
  const token = (formData.get('token') as string ?? '').trim()

  const tokenParsed = otpTokenSchema.safeParse(token)
  if (!tokenParsed.success) {
    return { fieldErrors: { token: tokenParsed.error.issues?.[0]?.message ?? 'Código inválido' } }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: tokenParsed.data,
    type: 'sms',
  })

  if (error) {
    return { error: error.message }
  }

  // Enforce single-session policy
  if (data.user) {
    await enforceSessionPolicy(data.user.id)
  }

  redirect('/')
}

/**
 * Login para administradores existentes.
 */
export async function loginAdmin(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('login_admin', 5, 300)
  if (!rl.success) return { error: rl.error }

  const email = (formData.get('email') as string ?? '').trim()
  const password = (formData.get('password') as string ?? '')

  const parsed = loginAdminSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  // Verificar MFA TOTP
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.[0]

  if (totpFactor) {
    redirect('/login/admin/mfa')
  }

  // Verificar que sea admin (antes de redirigir a MFA setup)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'Acceso denegado: Se requiere rol de administrador' }
  }

  // Enforce single-session policy for admins too
  await enforceSessionPolicy(data.user.id)

  // Admin sin TOTP configurado → forzar configuración de 2FA
  redirect('/login/admin/mfa/setup')
}

/**
 * Registro para nuevos administradores (opcional para el flujo actual).
 */
export async function registerAdmin(prevState: unknown, formData: FormData) {
  const inviteToken = (formData.get('inviteToken') as string ?? '').trim()
  const expectedToken = process.env.ADMIN_INVITE_TOKEN

  if (!expectedToken || inviteToken !== expectedToken) {
    return { error: 'Token de invitación inválido o no configurado.' }
  }

  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'admin'
      }
    }
  })

  if (error) return { error: error.message }
  
  redirect('/login/admin')
}

export async function verifyAdminTotp(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  // Hydrate session from cookies before MFA calls
  await supabase.auth.getUser()
  const code = formData.get('code') as string

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.[0]

  if (!totpFactor) return { error: 'No hay factor TOTP configurado' }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  })

  if (challengeError) return { error: challengeError.message }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.id,
    code,
  })

  if (verifyError) return { error: verifyError.message }

  // Enforce single-session policy after successful MFA
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await enforceSessionPolicy(user.id)
  }

  redirect('/admin')
}

export async function enrollAdminTotp() {
  const supabase = await createClient()
  // Hydrate session from cookies before MFA calls
  await supabase.auth.getUser()
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  })

  if (error) return { error: error.message }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

/**
 * Completa la configuración inicial de TOTP para un administrador.
 * Recibe el factorId y el código generado por la app autenticadora.
 */
export async function verifyAdminTotpSetup(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  // Hydrate session from cookies before MFA calls
  await supabase.auth.getUser()
  const factorId = formData.get('factorId') as string
  const code = formData.get('code') as string

  if (!factorId || !code) {
    return { error: 'Factor ID y código son requeridos.' }
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (challengeError) return { error: challengeError.message }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })

  if (verifyError) return { error: 'Código inválido. Asegúrate de ingresar el código actual de tu app.' }

  // Enforce single-session policy after successful MFA setup
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await enforceSessionPolicy(user.id)
  }

  redirect('/admin')
}

export async function signOut(redirectTo: string = '/login/player') {
  const supabase = await createClient()
  await supabase.auth.signOut()

  redirect(redirectTo)
}
