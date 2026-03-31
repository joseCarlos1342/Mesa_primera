const SUPABASE_PUBLIC_ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const SUPABASE_ADMIN_ENV_NAMES = [
  ...SUPABASE_PUBLIC_ENV_NAMES,
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

type EnvName = (typeof SUPABASE_ADMIN_ENV_NAMES)[number]

function getMissingEnv(names: readonly EnvName[]) {
  return names.filter((name) => !process.env[name]?.trim())
}

function buildMissingEnvMessage(missingEnv: readonly string[]) {
  return `Missing required Supabase environment variables: ${missingEnv.join(', ')}. Configure them in Vercel Project Settings -> Environment Variables and redeploy.`
}

function getRequiredEnv(name: EnvName) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(buildMissingEnvMessage([name]))
  }

  return value
}

export function getPublicSupabaseEnv() {
  return {
    url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  }
}

export function getAdminSupabaseEnv() {
  return {
    ...getPublicSupabaseEnv(),
    serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}

export function getSupabaseEnvErrorMessage(includeServiceRole = false) {
  const names = includeServiceRole ? SUPABASE_ADMIN_ENV_NAMES : SUPABASE_PUBLIC_ENV_NAMES
  const missingEnv = getMissingEnv(names)

  if (missingEnv.length === 0) {
    return null
  }

  return buildMissingEnvMessage(missingEnv)
}