'use server'

import crypto from 'crypto'
import { headers } from 'next/headers'
import { createAdminClient, createClient } from '@/utils/supabase/server'
import {
  adminEmailChangeSchema,
  adminEmailSchema,
  adminPasswordResetSchema,
  adminTotpVerificationSchema,
  flattenZodErrors,
} from '@/lib/validations'
import {
  RECOVERY_CODE_COUNT,
  generateAdminRecoveryCodes,
  hashAdminRecoveryCode,
} from '@/lib/admin-recovery-codes'
import { logAdminAction } from './admin-audit'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type AdminSecurityActionState = {
  success?: string
  error?: string
  fieldErrors?: Record<string, string>
  redirectTo?: string
  recoveryCodes?: string[]
}

export type AdminSecuritySnapshot = {
  email: string
  hasTotpFactor: boolean
  currentAal: string | null
  nextAal: string | null
  activeRecoveryCodes: number
}

type AuthenticatedAdmin = {
  user: {
    id: string
    email?: string | null
  }
}

function hasAuthenticatedAdmin(
  value: AuthenticatedAdmin | AdminSecurityActionState,
): value is AuthenticatedAdmin {
  return 'user' in value
}

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '')
}

function isLocalHost(host: string) {
  return /^localhost(?::\d+)?$/i.test(host)
    || /^127(?:\.\d{1,3}){3}(?::\d+)?$/.test(host)
    || /^\[::1\](?::\d+)?$/i.test(host)
}

async function getRequestOrigin() {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const protocol = headerList.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const requestOrigin = normalizeOrigin(`${protocol}://${host}`)
  const appUrl = process.env.APP_URL?.trim()

  if (isLocalHost(host)) {
    return requestOrigin
  }

  if (appUrl) {
    return normalizeOrigin(appUrl)
  }

  return requestOrigin
}

async function getAuthenticatedAdmin(supabase: SupabaseServerClient): Promise<AuthenticatedAdmin | AdminSecurityActionState> {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData?.user) {
    return { error: 'No autenticado' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Acceso denegado' }
  }

  return {
    user: {
      id: userData.user.id,
      email: userData.user.email ?? null,
    },
  }
}

async function getVerifiedTotpFactor(supabase: SupabaseServerClient) {
  const { data: factorData, error } = await supabase.auth.mfa.listFactors()

  if (error) {
    return { error: error.message }
  }

  const totpFactor = factorData?.totp?.find((factor) => factor.status === 'verified') ?? factorData?.totp?.[0]

  if (!totpFactor) {
    return { error: 'No hay factor TOTP configurado para esta cuenta.' }
  }

  return { factor: totpFactor }
}

async function verifyCurrentTotpCode(
  supabase: SupabaseServerClient,
  code: string,
) {
  const factorResult = await getVerifiedTotpFactor(supabase)

  if ('error' in factorResult) {
    return factorResult
  }

  const { factor } = factorResult
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
  })

  if (challengeError) {
    return { error: challengeError.message }
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  })

  if (verifyError) {
    return { error: 'Código TOTP inválido. Intenta de nuevo.' }
  }

  return { factor }
}

async function getActiveRecoveryCodeCount(
  supabase: SupabaseServerClient,
  adminId: string,
) {
  const { count, error } = await supabase
    .from('admin_mfa_recovery_codes')
    .select('id', { count: 'exact', head: true })
    .eq('admin_id', adminId)
    .is('consumed_at', null)

  if (error) {
    return 0
  }

  return count ?? 0
}

export async function getAdminSecuritySnapshot(): Promise<AdminSecuritySnapshot> {
  const supabase = await createClient()
  const admin = await getAuthenticatedAdmin(supabase)

  if (!hasAuthenticatedAdmin(admin)) {
    throw new Error(admin.error)
  }

  const [{ data: factorData }, { data: aalData }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ])

  return {
    email: admin.user.email ?? '',
    hasTotpFactor: Boolean(factorData?.totp?.some((factor) => factor.status === 'verified')),
    currentAal: aalData?.currentLevel ?? null,
    nextAal: aalData?.nextLevel ?? null,
    activeRecoveryCodes: await getActiveRecoveryCodeCount(supabase, admin.user.id),
  }
}

export async function requestAdminPasswordReset(
  _prevState: unknown,
  formData: FormData,
): Promise<AdminSecurityActionState> {
  const email = (formData.get('email') as string ?? '').trim()
  const parsed = adminEmailSchema.safeParse(email)

  if (!parsed.success) {
    return { fieldErrors: { email: parsed.error.issues?.[0]?.message ?? 'Correo inválido' } }
  }

  const supabase = await createClient()
  const origin = await getRequestOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/login/admin/password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Revisa tu correo para continuar el restablecimiento.' }
}

export async function completeAdminPasswordReset(
  _prevState: unknown,
  formData: FormData,
): Promise<AdminSecurityActionState> {
  const password = formData.get('password') as string ?? ''
  const passwordConfirm = formData.get('passwordConfirm') as string ?? ''
  const parsed = adminPasswordResetSchema.safeParse({ password, passwordConfirm })

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const admin = await getAuthenticatedAdmin(supabase)

  if (!hasAuthenticatedAdmin(admin)) {
    return admin
  }

  const adminSupabase = await createAdminClient()
  const { error } = await adminSupabase.auth.admin.updateUserById(admin.user.id, {
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  await logAdminAction(
    admin.user.id,
    'admin_password_reset_completed',
    'admin_security',
    admin.user.id,
    { email: admin.user.email ?? null },
    { context: 'security' }
  )

  return { success: 'Contraseña actualizada. Ya puedes volver al panel.' }
}

export async function requestAdminEmailChange(
  _prevState: unknown,
  formData: FormData,
): Promise<AdminSecurityActionState> {
  const email = (formData.get('email') as string ?? '').trim()
  const code = (formData.get('code') as string ?? '').trim()
  const parsed = adminEmailChangeSchema.safeParse({ email, code })

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const admin = await getAuthenticatedAdmin(supabase)

    if (!hasAuthenticatedAdmin(admin)) {
    return admin
  }

  const verification = await verifyCurrentTotpCode(supabase, parsed.data.code)

  if ('error' in verification) {
    return { error: verification.error }
  }

  const origin = await getRequestOrigin()
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${origin}/api/auth/confirm?next=/admin/security` }
  )

  if (error) {
    return { error: error.message }
  }

  await logAdminAction(
    admin.user.id,
    'admin_email_change_requested',
    'admin_security',
    admin.user.id,
    {
      current_email: admin.user.email ?? null,
      requested_email: parsed.data.email,
    },
    { context: 'security' }
  )

  return { success: 'Confirma el cambio desde el correo para completar la actualización.' }
}

export async function resetAdminTotpFactor(
  _prevState: unknown,
  formData: FormData,
): Promise<AdminSecurityActionState> {
  const code = (formData.get('code') as string ?? '').trim()
  const parsed = adminTotpVerificationSchema.safeParse({ code })

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const admin = await getAuthenticatedAdmin(supabase)

    if (!hasAuthenticatedAdmin(admin)) {
    return admin
  }

  const verification = await verifyCurrentTotpCode(supabase, parsed.data.code)

  if ('error' in verification) {
    return { error: verification.error }
  }

  const { error } = await supabase.auth.mfa.unenroll({
    factorId: verification.factor.id,
  })

  if (error) {
    return { error: error.message }
  }

  await logAdminAction(
    admin.user.id,
    'admin_mfa_factor_removed',
    'admin_security',
    admin.user.id,
    { factor_id: verification.factor.id, factor_type: 'totp' },
    { context: 'security' }
  )

  return {
    success: 'Factor TOTP eliminado. Configúralo de nuevo para continuar.',
    redirectTo: '/login/admin/mfa/setup?reset=1',
  }
}

export async function rotateAdminRecoveryCodes(
  _prevState: unknown,
  formData: FormData,
): Promise<AdminSecurityActionState> {
  const code = (formData.get('code') as string ?? '').trim()
  const parsed = adminTotpVerificationSchema.safeParse({ code })

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = await createClient()
  const admin = await getAuthenticatedAdmin(supabase)

  if (!hasAuthenticatedAdmin(admin)) {
    return admin
  }

  const verification = await verifyCurrentTotpCode(supabase, parsed.data.code)

  if ('error' in verification) {
    return { error: verification.error }
  }

  const recoveryCodes = generateAdminRecoveryCodes()
  const batchId = crypto.randomUUID()
  const { error: deleteError } = await supabase
    .from('admin_mfa_recovery_codes')
    .delete()
    .eq('admin_id', admin.user.id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  const { error: insertError } = await supabase
    .from('admin_mfa_recovery_codes')
    .insert(
      recoveryCodes.map((recoveryCode) => ({
        admin_id: admin.user.id,
        batch_id: batchId,
        code_hash: hashAdminRecoveryCode(recoveryCode),
      }))
    )

  if (insertError) {
    return { error: insertError.message }
  }

  await logAdminAction(
    admin.user.id,
    'admin_mfa_recovery_codes_rotated',
    'admin_security',
    admin.user.id,
    { batch_id: batchId, count: RECOVERY_CODE_COUNT },
    { context: 'security' }
  )

  return {
    success: 'Códigos de recuperación regenerados. Guárdalos en un lugar seguro.',
    recoveryCodes,
  }
}

export async function revokeOtherAdminSessions(
  _prevState?: unknown,
  _formData?: FormData,
): Promise<AdminSecurityActionState> {
  const supabase = await createClient()
  const admin = await getAuthenticatedAdmin(supabase)

    if (!hasAuthenticatedAdmin(admin)) {
    return admin
  }

  const { error } = await supabase.auth.signOut({ scope: 'others' })

  if (error) {
    return { error: error.message }
  }

  await logAdminAction(
    admin.user.id,
    'admin_other_sessions_revoked',
    'admin_security',
    admin.user.id,
    { scope: 'others' },
    { context: 'security' }
  )

  return { success: 'Las demás sesiones fueron cerradas.' }
}

export async function signOutAllAdminSessions(
  _prevState?: unknown,
  _formData?: FormData,
): Promise<AdminSecurityActionState> {
  const supabase = await createClient()
  const admin = await getAuthenticatedAdmin(supabase)

    if (!hasAuthenticatedAdmin(admin)) {
    return admin
  }

  await logAdminAction(
    admin.user.id,
    'admin_all_sessions_revoked',
    'admin_security',
    admin.user.id,
    { scope: 'global' },
    { context: 'security' }
  )

  const { error } = await supabase.auth.signOut({ scope: 'global' })

  if (error) {
    return { error: error.message }
  }

  return {
    success: 'Todas las sesiones fueron cerradas.',
    redirectTo: '/login/admin?revoked=1',
  }
}