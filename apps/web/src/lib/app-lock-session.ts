/**
 * Session-scoped helpers for biometric App Lock.
 *
 * sessionStorage survives reloads but is cleared when the tab/browser session
 * ends (i.e., the app is fully closed from multitask or the tab is closed).
 * This makes it a reliable proxy for "same session" vs "cold open".
 *
 * The auth-bypass has two paths:
 *  1. Client-side auth flows (passkey login, biometric setup) write to sessionStorage.
 *  2. Server-side auth flows (PIN login with redirect, OTP verify) write a short-lived
 *     JS-readable cookie that the provider consumes on first mount.
 */

const SESSION_VALIDATED_KEY = 'mesa_primera_session_validated'
const AUTH_BYPASS_KEY = 'mesa_primera_auth_bypass'
const AUTH_BYPASS_COOKIE = 'mesa_primera_auth_bypass'

/** Mark the current browser session as already validated (biometric passed). */
export function markSessionValidated(): void {
  try {
    sessionStorage.setItem(SESSION_VALIDATED_KEY, 'true')
  } catch { /* quota / security errors in exotic envs */ }
}

/** Check whether this browser session has already been validated. */
export function isSessionValidated(): boolean {
  try {
    return sessionStorage.getItem(SESSION_VALIDATED_KEY) === 'true'
  } catch {
    return false
  }
}

/** Clear the session-validated marker (e.g. on logout). */
export function clearSessionValidated(): void {
  try {
    sessionStorage.removeItem(SESSION_VALIDATED_KEY)
  } catch { /* ignore */ }
}

/**
 * Set the one-time auth bypass flag (client-side path).
 * Called by client-side auth flows right before navigating to the player area.
 */
export function setAuthBypass(): void {
  try {
    sessionStorage.setItem(AUTH_BYPASS_KEY, 'true')
  } catch { /* ignore */ }
}

/**
 * Consume and return the auth bypass flag. Checks both sessionStorage
 * (client-side auth) and a JS-readable cookie (server-side auth redirect).
 * Returns true only once — reading it immediately removes it.
 */
export function consumeAuthBypass(): boolean {
  // 1. Check sessionStorage (client-side path)
  try {
    const ssValue = sessionStorage.getItem(AUTH_BYPASS_KEY)
    if (ssValue === 'true') {
      sessionStorage.removeItem(AUTH_BYPASS_KEY)
      return true
    }
  } catch { /* ignore */ }

  // 2. Check cookie (server-side redirect path)
  try {
    const cookieStr = document.cookie
    const match = cookieStr.split('; ').find(c => c.startsWith(`${AUTH_BYPASS_COOKIE}=`))
    if (match) {
      // Consume by expiring the cookie immediately
      document.cookie = `${AUTH_BYPASS_COOKIE}=; path=/; max-age=0; SameSite=Lax`
      return true
    }
  } catch { /* ignore */ }

  return false
}
