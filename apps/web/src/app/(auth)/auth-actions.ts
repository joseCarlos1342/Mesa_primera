'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { enforceRateLimiting } from '@/app/actions/anti-fraud'

// Whitelist eliminada por petición del usuario para permitir más registros
/*
const TEST_PHONES = [
  '+573001112233',
  '+573104445566',
  '+573207778899',
  '+573150001122'
]
*/

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

/**
 * Inicia el proceso de REGISTRO para un nuevo jugador.
 */
export async function registerPlayer(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('register_player', 3, 300)
  if (!rl.success) return { error: rl.error }
  
  const supabase = await createClient()
  const rawPhone = formData.get('phone') as string
  const phone = normalizePhone(rawPhone)
  
  /* 
  if (!TEST_PHONES.includes(phone)) {
    return { error: 'Acceso restringido: Solo los números de prueba autorizados pueden ingresar en este momento.' }
  }
  */

  const fullName = formData.get('fullName') as string
  const nickname = formData.get('nickname') as string
  const avatarId = formData.get('avatarId') as string

  // DEV BYPASS: Saltarse confirmaciones OTP (Twilio) temporalmente a petición del usuario
  // Si es un usuario de prueba, redirigimos a verificar con una pista de que el código es 123456
  if (process.env.NODE_ENV === 'development') {
    console.log(`Dev Bypass: Registrando usuario de prueba ${phone}`);
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: true,
      data: {
        full_name: fullName,
        username: nickname,
        avatar_url: avatarId,
        role: 'player'
      }
    },
  })

  if (error) {
    console.error(`[AUTH_ERROR] Error en registro (${phone}):`, error.message, error)
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

  const supabase = await createClient()
  const rawPhone = formData.get('phone') as string
  const phone = normalizePhone(rawPhone)
  
  /*
  if (!TEST_PHONES.includes(phone)) {
    return { error: 'Acceso restringido: Solo los números de prueba autorizados pueden ingresar en este momento.' }
  }
  */

  // DEV BYPASS: Saltarse confirmaciones OTP (Twilio) temporalmente a petición del usuario
  if (process.env.NODE_ENV === 'development') {
    console.log(`Dev Bypass: Login de usuario de prueba ${phone}`);
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: false // No crear usuario aquí, forzar registro para nuevos
    }
  })

  if (error) {
    console.error(`[AUTH_ERROR] Error en login (${phone}):`, error.message)
    if (error.message.includes('User not found') || error.message.includes('can only use shouldCreateUser: true')) {
      return { error: 'Usuario no encontrado. Por favor, regístrate primero.' }
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

  const supabase = await createClient()
  const phone = formData.get('phone') as string
  const token = formData.get('token') as string

  // DEV BYPASS: Allow '123456' in development for test phones
  if (process.env.NODE_ENV === 'development' && token === '123456') {
     const TEST_PHONES = ['+573001112233', '+573104445566', '+573207778899', '+573150001122'];
     if (TEST_PHONES.includes(phone)) {
        console.log(`[AUTH_BYPASS] Activating dev session for ${phone}`);
        const cookieStore = await cookies();
        cookieStore.set('mesa_dev_bypass', phone, { 
          maxAge: 60 * 60 * 24, // 1 day
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
        redirect('/');
     }
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

/**
 * Login para administradores existentes.
 */
export async function loginAdmin(prevState: unknown, formData: FormData) {
  const rl = await enforceRateLimiting('login_admin', 5, 300)
  if (!rl.success) return { error: rl.error }

  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
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

  // Verificar que sea admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'Acceso denegado: Se requiere rol de administrador' }
  }

  redirect('/admin')
}

/**
 * Registro para nuevos administradores (opcional para el flujo actual).
 */
export async function registerAdmin(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const { data, error } = await supabase.auth.signUp({
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

  redirect('/admin')
}

export async function enrollAdminTotp() {
  const supabase = await createClient()
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

export async function signOut(redirectTo: string = '/login/player') {
  const supabase = await createClient()
  await supabase.auth.signOut()

  if (process.env.NODE_ENV === 'development') {
    const cookieStore = await cookies();
    cookieStore.delete('mesa_dev_bypass');
  }

  redirect(redirectTo)
}
