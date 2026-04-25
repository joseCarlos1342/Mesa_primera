/**
 * Resolución central de variables de Supabase para la web app.
 *
 * Admite el esquema nuevo de claves de Supabase (`publishable` / `secret`) y
 * mantiene compatibilidad con los nombres legacy (`ANON_KEY` / `SERVICE_ROLE_KEY`).
 * Si ambos nombres conviven, se prefiere el nuevo. Esto permite migrar sin
 * riesgo cuando el proyecto Supabase deshabilita las legacy API keys.
 */

const SUPABASE_PUBLIC_KEY_NAMES = [
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const SUPABASE_SECRET_KEY_NAMES = [
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

type PublicKeyName = (typeof SUPABASE_PUBLIC_KEY_NAMES)[number]
type SecretKeyName = (typeof SUPABASE_SECRET_KEY_NAMES)[number]
type EnvName = 'NEXT_PUBLIC_SUPABASE_URL' | PublicKeyName | SecretKeyName
type RuntimePublicEnvName =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | PublicKeyName
  | 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'

declare global {
  interface Window {
    __MESA_PRIMERA_RUNTIME_ENV__?: Partial<Record<RuntimePublicEnvName, string>>
  }
}

const RUNTIME_PUBLIC_ENV_NAMES: ReadonlySet<string> = new Set<RuntimePublicEnvName>([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
])

function getEnvValue(name: EnvName): string | null {
  const processValue = process.env[name]?.trim()
  if (processValue) return processValue

  if (typeof window === 'undefined') return null
  if (!RUNTIME_PUBLIC_ENV_NAMES.has(name)) return null

  return (
    window.__MESA_PRIMERA_RUNTIME_ENV__?.[name as RuntimePublicEnvName]?.trim() ?? null
  )
}

function resolveFirst(names: readonly EnvName[]): string | null {
  for (const name of names) {
    const value = getEnvValue(name)
    if (value) return value
  }
  return null
}

function buildMissingEnvMessage(missingEnv: readonly string[]) {
  return `Missing required Supabase environment variables: ${missingEnv.join(', ')}. Configure them in Vercel Project Settings -> Environment Variables and redeploy.`
}

export function getPublicSupabaseEnv() {
  const url = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = resolveFirst(SUPABASE_PUBLIC_KEY_NAMES)

  const missing: string[] = []
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) missing.push(SUPABASE_PUBLIC_KEY_NAMES[0])

  if (missing.length > 0) {
    throw new Error(buildMissingEnvMessage(missing))
  }

  return {
    url: url as string,
    anonKey: anonKey as string,
  }
}

export function getAdminSupabaseEnv() {
  const base = getPublicSupabaseEnv()
  const serviceRoleKey = resolveFirst(SUPABASE_SECRET_KEY_NAMES)

  if (!serviceRoleKey) {
    throw new Error(buildMissingEnvMessage([SUPABASE_SECRET_KEY_NAMES[0]]))
  }

  return {
    ...base,
    serviceRoleKey,
  }
}

export function getSupabaseEnvErrorMessage(includeServiceRole = false) {
  const missing: string[] = []
  if (!getEnvValue('NEXT_PUBLIC_SUPABASE_URL')) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!resolveFirst(SUPABASE_PUBLIC_KEY_NAMES)) missing.push(SUPABASE_PUBLIC_KEY_NAMES[0])
  if (includeServiceRole && !resolveFirst(SUPABASE_SECRET_KEY_NAMES)) {
    missing.push(SUPABASE_SECRET_KEY_NAMES[0])
  }

  if (missing.length === 0) return null
  return buildMissingEnvMessage(missing)
}