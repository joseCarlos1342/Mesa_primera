'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { enforceRateLimiting } from '@/app/actions/anti-fraud'
import { redis } from '@/utils/redis'
import {
  registerPlayerSchema,
  loginPlayerSchema,
  loginPlayerWithPinSchema,
  loginAdminSchema,
  adminRecoveryCodeSchema,
  otpTokenSchema,
  setPinSchema,
  pinSchema,
  flattenZodErrors,
} from '@/lib/validations'
import { hashAdminRecoveryCode } from '@/lib/admin-recovery-codes'
import crypto from 'crypto'
import { enforceSessionPolicy } from './auth-actions-helpers'
import { normalizePhone } from '@/lib/phone'
import { logAdminAction } from '@/app/actions/admin-audit'
import { verifyTurnstile } from '@/lib/security/turnstile'

const DEVICE_COOKIE_NAME = 'device_trusted_id'
const DEVICE_TRUST_DAYS = 30
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * DEVICE_TRUST_DAYS
const AUTH_BYPASS_COOKIE = 'mesa_primera_auth_bypass'

/**
 * Set a short-lived JS-readable cookie so the AppLockProvider on the client
 * knows this navigation comes right after a successful auth and should skip
 * the biometric prompt. The cookie lives 60 seconds — just enough for the
 * redirect + client hydration.
 */
async function setAppLockBypassCookie() {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_BYPASS_COOKIE, '1', {
    httpOnly: false, // must be JS-readable
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60,
  })
}

type ProfileSeedCandidate = {
  id: string
  username: string | null
  full_name?: string | null
  avatar_url?: string | null
  role?: string | null
  is_banned?: boolean | null
}

/**
 * Genera y persiste un device_trusted_id en cookie httpOnly (30 días)
 * y lo registra como dispositivo confiable en la BD.
 */
async function registerTrustedDevice(userId: string) {
  const deviceId = crypto.randomUUID()
  const cookieStore = await cookies()

  cookieStore.set(DEVICE_COOKIE_NAME, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_COOKIE_MAX_AGE,
  })

  const supabase = await createClient()
  await supabase.rpc('register_trusted_device', {
    p_device_id: deviceId,
    p_trust_days: DEVICE_TRUST_DAYS,
  })

  return deviceId
}

/**
 * Lee el device_trusted_id actual de la cookie.
 */
async function getDeviceCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(DEVICE_COOKIE_NAME)?.value ?? null
}



function isMissingPhoneAuthUser(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase()

  return normalized.includes('signups not allowed for otp') ||
    normalized.includes('user not found') ||
    normalized.includes('can only use shouldcreateuser: true')
}

/**
 * Detecta fallos de configuración de claves de Supabase: `Legacy API keys are
 * disabled` aparece cuando el proyecto deshabilitó las claves antiguas y el
 * deploy sigue usando `anon`/`service_role`. `Invalid API key` aparece cuando
 * la clave configurada no pertenece al proyecto. En ambos casos el usuario no
 * puede hacer nada: es un error de infraestructura que debemos mostrar con un
 * mensaje en español y registrar técnicamente para soporte.
 */
function isSupabaseLegacyKeyDisabled(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase()
  return (
    normalized.includes('legacy api keys are disabled') ||
    normalized.includes('invalid api key') ||
    normalized.includes('no api key found')
  )
}

const SUPABASE_KEY_OUTAGE_MESSAGE =
  'No pudimos contactar al servidor de autenticación. Inténtalo de nuevo en unos minutos o contacta soporte si el problema persiste.'

function isOtpProviderDisabled(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase()

  return normalized.includes('signups not allowed for otp') || normalized.includes('otp_disabled')
}

/**
 * Checks if a user has an active account-level sanction (full_suspension or permanent_ban).
 * If blocked, signs out the user and returns a Spanish error message.
 * Fail-open: if the RPC call fails, login proceeds normally.
 */
async function checkAccountSanction(
  supabase: any,
  userId: string
): Promise<{ blocked: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_account_eligibility', {
      p_user_id: userId,
    })
    if (error) throw error
    if (data && data.blocked) {
      await supabase.auth.signOut()
      const expiresAt = data.expires_at
        ? new Date(data.expires_at).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : null
      const msg = expiresAt
        ? `Tu cuenta está suspendida hasta ${expiresAt}. Motivo: ${data.reason || 'sanción administrativa'}`
        : `Tu cuenta ha sido suspendida permanentemente. Motivo: ${data.reason || 'sanción administrativa'}`
      return { blocked: true, error: msg }
    }
    return { blocked: false }
  } catch {
    // Fail-open: don't block login on DB errors
    return { blocked: false }
  }
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
  const turnstile = await verifyTurnstile(formData)
  if (!turnstile.success) return { error: turnstile.error }

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

    if (isSupabaseLegacyKeyDisabled(error.message)) {
      return { error: SUPABASE_KEY_OUTAGE_MESSAGE }
    }

    if (isOtpProviderDisabled(error.message)) {
      return { error: 'El servicio de SMS no está disponible en este momento. Por favor, inténtalo más tarde.' }
    }

    if (error.message.includes('saving new user')) {
      return { error: 'Error al crear el perfil. Es posible que el nombre de usuario (apodo) o el teléfono ya estén registrados por otra persona.' }
    }
    return { error: error.message }
  }

  redirect(`/register/player/verify?phone=${encodeURIComponent(phone)}`)
}

/**
 * Inicia el proceso de LOGIN para un jugador existente (modelo híbrido PIN + dispositivo).
 *
 * 1. Valida teléfono + PIN con signInWithPassword.
 * 2. Si el dispositivo es conocido (cookie válida en BD), completa el login.
 * 3. Si el dispositivo es desconocido, cierra la sesión parcial y envía OTP para 2FA.
 */
export async function loginWithPin(prevState: unknown, formData: FormData) {
  const turnstile = await verifyTurnstile(formData)
  if (!turnstile.success) return { error: turnstile.error }

  const rl = await enforceRateLimiting('login_player', 5, 60)
  if (!rl.success) return { error: rl.error }

  const rawPhone = (formData.get('phone') as string ?? '').trim()
  const rawPin = (formData.get('pin') as string ?? '').trim()

  const parsed = loginPlayerWithPinSchema.safeParse({ phone: rawPhone, pin: rawPin })
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const phone = normalizePhone(parsed.data.phone)

  // Authenticate with password (PIN)
  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password: parsed.data.pin,
  })

  if (error) {
    console.error('[AUTH_ERROR] Error en login PIN (%s): %s', phone, error.message)
    if (isSupabaseLegacyKeyDisabled(error.message)) {
      return { error: SUPABASE_KEY_OUTAGE_MESSAGE }
    }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: 'Número o clave incorrectos. Verifica tus datos.' }
    }
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Error al iniciar sesión. Intenta de nuevo.' }
  }

  // Check if device is trusted
  const deviceCookie = await getDeviceCookie()

  if (deviceCookie) {
    const { data: isTrusted } = await supabase.rpc('is_device_trusted', {
      p_phone: phone,
      p_device_id: deviceCookie,
    })

    if (isTrusted) {
      // Known device — update last_login_at and complete login
      await supabase
        .from('user_devices')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', data.user.id)
        .eq('device_id', deviceCookie)

      // Check for account-level sanctions before completing login
      const sanction = await checkAccountSanction(supabase, data.user.id)
      if (sanction.blocked) return { error: sanction.error }

      await enforceSessionPolicy(data.user.id)
      await setAppLockBypassCookie()
      redirect('/')
    }
  }

  // Unknown device — sign out the partial session and trigger 2FA via OTP
  await supabase.auth.signOut()

  // Send OTP for device verification
  const { error: otpError } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  })

  if (otpError) {
    console.error('[AUTH_ERROR] Error enviando OTP para 2FA (%s): %s', phone, otpError.message)

    if (isSupabaseLegacyKeyDisabled(otpError.message)) {
      return { error: SUPABASE_KEY_OUTAGE_MESSAGE }
    }
    if (isOtpProviderDisabled(otpError.message)) {
      return { error: 'El servicio de SMS no está disponible. Inténtalo más tarde.' }
    }
    return { error: 'No pudimos enviar el código de verificación. Inténtalo de nuevo.' }
  }

  redirect(`/login/player/device-verify?phone=${encodeURIComponent(phone)}`)
}

/**
 * Login legacy con solo teléfono (para usuarios que aún no tienen PIN configurado).
 * Envía un OTP para autenticarse y después lo redirige a configurar su PIN.
 */
export async function loginWithPhone(prevState: unknown, formData: FormData) {
  const turnstile = await verifyTurnstile(formData)
  if (!turnstile.success) return { error: turnstile.error }

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
      shouldCreateUser: false
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

    if (isSupabaseLegacyKeyDisabled(error.message)) {
      return { error: SUPABASE_KEY_OUTAGE_MESSAGE }
    }

    if (isMissingPhoneAuthUser(error.message)) {
      return { error: 'Si el número está registrado, recibirás un SMS. De lo contrario, regístrate primero.' }
    }
    if (error.message.includes('saving new user')) {
      return { error: 'Error interno del servidor de base de datos. Por favor contacta soporte.' }
    }
    return { error: error.message }
  }

  redirect(`/login/player/verify?phone=${encodeURIComponent(phone)}&flow=login-set-pin`)
}

/**
 * Verifica el código OTP enviado por SMS al jugador.
 * Soporta múltiples flujos: register, login, recovery, device-verify.
 */
export async function verifyOtp(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('verify_otp', 5, 60)
  if (!rl.success) return { error: rl.error }

  const phone = (formData.get('phone') as string ?? '').trim()
  const token = (formData.get('token') as string ?? '').trim()
  const flow = (formData.get('flow') as string ?? 'login').trim()

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

  if (!data.user) {
    return { error: 'Error de verificación. Intenta de nuevo.' }
  }

  // Route based on flow
  switch (flow) {
    case 'register': {
      // Phone verified — save it to profiles now (use user's own client; RLS allows self-update)
      const { error: phoneErr } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', data.user.id)
      if (phoneErr) {
        console.error('[VERIFY_OTP] Error saving phone to profile for %s: code=%s message=%s', data.user.id, phoneErr.code, phoneErr.message)
      }
      // Confirm phone in auth.users (admin API — needs service_role)
      const { createAdminClient } = await import('@/utils/supabase/server')
      const adminSupabase = await createAdminClient()
      await adminSupabase.auth.admin.updateUserById(data.user.id, {
        phone_confirm: true,
      })
      redirect(`/register/player/pin`)
    }

    case 'device-verify': {
      // User verified new device during login — register device + complete login
      const dvSanction = await checkAccountSanction(supabase, data.user.id)
      if (dvSanction.blocked) return { error: dvSanction.error }
      await registerTrustedDevice(data.user.id)
      await enforceSessionPolicy(data.user.id)
      await setAppLockBypassCookie()
      redirect('/')
    }

    case 'recovery':
      // User verified for PIN recovery — redirect to set new PIN
      redirect(`/recovery/pin`)

    case 'login-set-pin':
      // Legacy user without PIN — verified via OTP, now redirect to set PIN
      redirect(`/register/player/pin`)

    default: {
      // Legacy login flow (backwards compat)
      const defSanction = await checkAccountSanction(supabase, data.user.id)
      if (defSanction.blocked) return { error: defSanction.error }
      await enforceSessionPolicy(data.user.id)
      await setAppLockBypassCookie()
      redirect('/')
    }
  }
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
    console.error('[AUTH_ERROR] Error en login admin (%s): %s', parsed.data.email, error.message)
    if (isSupabaseLegacyKeyDisabled(error.message)) {
      return { error: SUPABASE_KEY_OUTAGE_MESSAGE }
    }
    return { error: error.message }
  }

  // Verificar que sea admin ANTES de decidir MFA/setup
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'Acceso denegado: Se requiere rol de administrador' }
  }

  // Verificar MFA TOTP
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.find((f) => f.status === 'verified') ?? factors?.totp?.[0]

  if (totpFactor) {
    // Do NOT enforceSessionPolicy here — defer until MFA is verified
    redirect('/login/admin/mfa')
  }

  // Admin sin TOTP configurado → forzar configuración de 2FA
  // Do NOT enforceSessionPolicy here — defer until setup is verified
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
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const code = formData.get('code') as string

  if (userError || !user) {
    return { error: 'Sesión inválida. Inicia sesión de nuevo.' }
  }

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.find((f) => f.status === 'verified') ?? factors?.totp?.[0]

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
  await enforceSessionPolicy(user.id)

  redirect('/admin')
}

export async function redeemAdminRecoveryCode(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('admin_recovery_code', 5, 300)
  if (!rl.success) return { error: rl.error }

  const code = (formData.get('code') as string ?? '').trim()
  const parsed = adminRecoveryCodeSchema.safeParse(code)

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  await supabase.auth.getUser()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesión inválida. Inicia sesión de nuevo para usar un código de recuperación.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Acceso denegado.' }
  }

  const codeHash = hashAdminRecoveryCode(parsed.data)
  const { data: recoveryCode, error: recoveryCodeError } = await supabase
    .from('admin_mfa_recovery_codes')
    .select('id')
    .eq('admin_id', user.id)
    .eq('code_hash', codeHash)
    .is('consumed_at', null)
    .maybeSingle()

  if (recoveryCodeError || !recoveryCode) {
    return { error: 'Código de recuperación inválido o ya utilizado.' }
  }

  const { error: consumeError } = await supabase
    .from('admin_mfa_recovery_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', recoveryCode.id)

  if (consumeError) {
    return { error: 'No se pudo consumir el código de recuperación.' }
  }

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.find((factor) => factor.status === 'verified') ?? factors?.totp?.[0]

  if (totpFactor) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: totpFactor.id,
    })

    if (unenrollError) {
      return { error: unenrollError.message }
    }
  }

  await logAdminAction(
    user.id,
    'admin_mfa_recovery_code_redeemed',
    'admin_security',
    user.id,
    {
      factor_id: totpFactor?.id ?? null,
      recovery_code_id: recoveryCode.id,
    },
    { context: 'security' }
  )

  redirect('/login/admin/mfa/setup?recovery=1')
}

export async function enrollAdminTotp() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Sesión expirada. Inicia sesión de nuevo.', sessionExpired: true }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Mesa Primera',
    friendlyName: 'Mesa Primera Admin',
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
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Sesión expirada. Inicia sesión de nuevo.' }
  }

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
  await enforceSessionPolicy(user.id)

  redirect('/admin')
}

export async function signOut(redirectTo: string = '/login/player') {
  const supabase = await createClient()
  await supabase.auth.signOut()

  redirect(redirectTo)
}

// ─── PIN Setup & Recovery ────────────────────────────────────────────────────

/**
 * Establece o actualiza el PIN de 6 dígitos para el jugador autenticado.
 * Se usa tanto en el registro como en la recuperación de PIN.
 */
export async function setPlayerPin(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('set_pin', 5, 300)
  if (!rl.success) return { error: rl.error }

  const pin = (formData.get('pin') as string ?? '').trim()
  const pinConfirm = (formData.get('pinConfirm') as string ?? '').trim()
  const flow = (formData.get('flow') as string ?? 'register').trim()

  const parsed = setPinSchema.safeParse({ pin, pinConfirm })
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()

  // Ensure user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login/player')
  }

  // Set the password (PIN) on the auth user
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.pin,
  })

  if (error) {
    console.error('[AUTH_ERROR] Error al configurar PIN para %s: %s', user.id, error.message)
    return { error: 'No se pudo configurar la clave. Intenta de nuevo.' }
  }

  // Mark profile as having a PIN (user's own client — RLS allows self-update)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ has_pin: true })
    .eq('id', user.id)

  if (profileError) {
    console.error('[AUTH_ERROR] Error al marcar has_pin para %s: code=%s message=%s', user.id, profileError.code, profileError.message)
    // PIN was set but flag wasn't — don't block the user, just log it
  }

  // Register this device as trusted
  await registerTrustedDevice(user.id)

  // Enforce single-session policy
  await enforceSessionPolicy(user.id)

  // On first-time setup (register or legacy migration), offer biometric enrollment
  if (flow === 'register' || flow === 'login-set-pin') {
    await setAppLockBypassCookie()
    redirect('/register/player/biometric')
  }

  await setAppLockBypassCookie()
  redirect('/')
}

/**
 * Inicia la recuperación de PIN: valida que el teléfono exista y envía OTP.
 */
export async function startPinRecovery(prevState: unknown, formData: FormData) {
  const turnstile = await verifyTurnstile(formData)
  if (!turnstile.success) return { error: turnstile.error }

  const rl = await enforceRateLimiting('pin_recovery', 3, 300)
  if (!rl.success) return { error: rl.error }

  const rawPhone = (formData.get('phone') as string ?? '').trim()
  const parsed = loginPlayerSchema.safeParse({ phone: rawPhone })
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const phone = normalizePhone(parsed.data.phone)

  // Check if phone exists
  const { data: phoneExists } = await supabase.rpc('check_phone_exists', { p_phone: phone })
  if (!phoneExists) {
    return { error: 'No encontramos una cuenta con este número. ¿Deseas registrarte?' }
  }

  // Send OTP
  let { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  })

  if (error && isMissingPhoneAuthUser(error.message)) {
    const recovery = await provisionMissingPhoneAuthUser(phone)
    if (recovery.recovered) {
      const retry = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      })
      error = retry.error
    }
  }

  if (error) {
    if (isSupabaseLegacyKeyDisabled(error.message)) {
      return { error: SUPABASE_KEY_OUTAGE_MESSAGE }
    }
    if (isOtpProviderDisabled(error.message)) {
      return { error: 'El servicio de SMS no está disponible. Inténtalo más tarde.' }
    }
    return { error: error.message }
  }

  redirect(`/recovery/verify?phone=${encodeURIComponent(phone)}`)
}

/**
 * Comprueba si un teléfono tiene PIN configurado (usado por el UI de login).
 *
 * Devuelve:
 *  - `true`  → la cuenta tiene PIN y debe mostrarse el formulario de clave.
 *  - `false` → la cuenta existe pero aún no tiene PIN (flujo legacy por SMS).
 *  - `null`  → no fue posible determinarlo (RPC falló o backend caído). La UI
 *              debe tratar este caso como "desconocido" y mostrar el flujo de
 *              PIN por defecto, nunca afirmar que la cuenta no tiene clave.
 */
export async function checkPhoneHasPin(phone: string): Promise<boolean | null> {
  try {
    const supabase = await createClient()
    const normalized = normalizePhone(phone)
    const { data, error } = await supabase.rpc('user_has_pin', { p_phone: normalized })

    if (error) {
      console.error(
        '[AUTH_ERROR] user_has_pin RPC falló para %s: %s',
        normalized,
        error.message,
      )
      return null
    }

    return data === true
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[AUTH_ERROR] checkPhoneHasPin excepción: %s', message)
    return null
  }
}

// ─── Google OAuth: Complete Registration ─────────────────────────────────────

/**
 * Completa el registro de un usuario que se autenticó con Google.
 * El usuario ya tiene sesión activa (set por el callback), pero su perfil
 * está incompleto. Este action:
 * 1. Valida nickname, nombre, avatar y teléfono.
 * 2. Verifica que el teléfono no pertenezca a otra cuenta.
 * 3. Envía OTP al teléfono para verificarlo.
 * 4. Tras la verificación, actualiza el perfil y continúa al PIN setup.
 */
export async function completeGoogleRegistration(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('complete_google_reg', 3, 300)
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

  // Ensure user is authenticated (should be from the OAuth callback)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login/player')
  }

  // Check if this phone already belongs to another user
  const { data: phoneExists } = await supabase.rpc('check_phone_exists', { p_phone: phone })
  if (phoneExists) {
    // If the phone is on the current user (e.g. from a previous failed attempt), allow re-registration
    const userPhone = user.phone?.replace(/^\+/, '') ?? ''
    const cleanPhone = phone.replace(/^\+/, '')
    if (userPhone !== cleanPhone) {
      return {
        fieldErrors: {
          phone: ['Este número ya está registrado con otra cuenta. Inicia sesión con tu teléfono y vincula Google desde tu perfil.']
        }
      }
    }
  }

  // Update the user's metadata and profile via admin API
  const { createAdminClient } = await import('@/utils/supabase/server')
  const adminSupabase = await createAdminClient()

  // Update auth.users metadata (phone will be confirmed after OTP)
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    phone,
    phone_confirm: false, // Will be confirmed after OTP
    user_metadata: {
      ...user.user_metadata,
      full_name: parsed.data.fullName,
      username: parsed.data.nickname,
      avatar_url: avatarId,
      role: 'player',
    },
  })

  if (updateError) {
    console.error('[GOOGLE_REG] Error updating user metadata for %s: %s', user.id, updateError.message)
    if (updateError.message.includes('duplicate') || updateError.message.includes('unique')) {
      return { error: 'El apodo o teléfono ya están en uso por otra cuenta.' }
    }
    return { error: 'Error al actualizar tu perfil. Intenta de nuevo.' }
  }

  // Update the profiles table using the user's own session (RLS allows self-update).
  // Note: adminSupabase (createServerClient + cookies) sends the user's JWT for data ops,
  // so it runs as 'authenticated' not 'service_role'. Use the user's client directly.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      username: parsed.data.nickname,
      full_name: parsed.data.fullName,
      avatar_url: avatarId,
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('[GOOGLE_REG] Error updating profile for %s: code=%s message=%s details=%s hint=%s',
      user.id, profileError.code, profileError.message, profileError.details, profileError.hint)
    // Rollback auth.users metadata to avoid inconsistent state
    await adminSupabase.auth.admin.updateUserById(user.id, {
      phone: '',
      phone_confirm: false,
    }).catch(() => {})
    if (profileError.message.includes('duplicate') || profileError.message.includes('unique')) {
      return { error: 'El apodo ya está en uso. Elige uno diferente.' }
    }
    return { error: 'Error al guardar tu perfil. Intenta de nuevo.' }
  }

  // Send OTP to verify the phone
  const { error: otpError } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  })

  if (otpError) {
    console.error('[GOOGLE_REG] OTP send failed for %s: %s', phone, otpError.message)
    if (isOtpProviderDisabled(otpError.message)) {
      return { error: 'El servicio de SMS no está disponible. Inténtalo más tarde.' }
    }
    return { error: 'No pudimos enviar el código de verificación. Intenta de nuevo.' }
  }

  redirect(`/register/player/verify?phone=${encodeURIComponent(phone)}&flow=register`)
}

/**
 * Returns the Google profile data for the currently authenticated user.
 * Used to pre-fill the complete-registration form.
 */
export async function getGoogleUserData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return {
    fullName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
    email: user.email ?? '',
    avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? '',
  }
}
