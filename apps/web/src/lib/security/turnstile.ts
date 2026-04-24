const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const SECRET_KEY = (process.env.TURNSTILE_SECRET_KEY ?? '').trim()

type TurnstileResult = { success: true } | { success: false; error: string }

export async function verifyTurnstile(formData: FormData): Promise<TurnstileResult> {
  // Skip verification in development or if secret key is not configured
  if (!SECRET_KEY) {
    return { success: true }
  }

  const token = formData.get('cf-turnstile-response')
  const normalizedToken = typeof token === 'string' ? token.trim() : ''

  if (!normalizedToken) {
    return { success: false, error: 'Verificación de seguridad requerida. Recarga la página e intenta de nuevo.' }
  }

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: SECRET_KEY,
      response: normalizedToken,
    }),
  })

  const outcome = await res.json() as { success: boolean; 'error-codes'?: string[] }

  if (!outcome.success) {
    console.warn('[TURNSTILE] Verification failed:', outcome['error-codes'])
    return { success: false, error: 'Verificación de seguridad fallida. Recarga la página e intenta de nuevo.' }
  }

  return { success: true }
}
