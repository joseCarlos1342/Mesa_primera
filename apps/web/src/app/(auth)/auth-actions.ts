'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function loginWithPhone(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const phone = formData.get('phone') as string
  const fullName = formData.get('fullName') as string
  const nickname = formData.get('nickname') as string
  const avatarId = formData.get('avatarId') as string

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: true,
      data: {
        full_name: fullName,
        nickname: nickname,
        avatar_url: avatarId,
      }
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect(`/login/player/verify?phone=${encodeURIComponent(phone)}`)
}

export async function verifyOtp(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const phone = formData.get('phone') as string
  const token = formData.get('token') as string

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

export async function loginAdmin(prevState: unknown, formData: FormData) {
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

  // Verificar si el usuario tiene MFA TOTP configurado
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.[0]

  if (totpFactor) {
    // Tiene MFA activo → redirigir a pantalla de verificación TOTP
    redirect('/login/admin/mfa')
  }

  // Verificar que sea admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    console.error('Profile query error:', profileError)
    return { error: `Error de perfil: ${profileError.message} (code: ${profileError.code})` }
  }

  if (profile?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'No tienes permisos de administrador' }
  }

  redirect('/admin')
}

export async function verifyAdminTotp(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const code = formData.get('code') as string

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.[0]

  if (!totpFactor) {
    return { error: 'No hay factor TOTP configurado' }
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  })

  if (challengeError) {
    return { error: challengeError.message }
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.id,
    code,
  })

  if (verifyError) {
    return { error: verifyError.message }
  }

  redirect('/admin')
}

export async function enrollAdminTotp() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  })

  if (error) {
    return { error: error.message }
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login/player')
}
