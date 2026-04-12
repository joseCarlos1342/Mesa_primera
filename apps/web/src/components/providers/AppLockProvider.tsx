'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { PwaLockScreen } from '@/components/pwa-lock-screen'
import { startRegistration } from '@simplewebauthn/browser'
import {
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
} from '@/app/(auth)/passkey-actions'
import {
  isSessionValidated,
  markSessionValidated,
  clearSessionValidated,
  consumeAuthBypass,
} from '@/lib/app-lock-session'

const APP_LOCK_KEY = 'mesa_primera_app_lock_enabled'
const CREDENTIAL_ID_KEY = 'mesa_primera_lock_credential_id'
const LAST_ACTIVE_KEY = 'mesa_primera_last_active'
const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

interface EnrollResult {
  ok: boolean
  error?: string
}

interface AppLockContextValue {
  isEnabled: boolean
  isLocked: boolean
  isSupported: boolean
  enroll: () => Promise<EnrollResult>
  disable: () => void
}

const AppLockContext = createContext<AppLockContextValue>({
  isEnabled: false,
  isLocked: false,
  isSupported: false,
  enroll: async () => ({ ok: false }),
  disable: () => {},
})

export const useAppLock = () => useContext(AppLockContext)

// ─── Helpers ────────────────────────────────────────────────────────────────

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    return false
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Enrollment: creates a new platform credential and returns its rawId (base64).
 * Only called once when enabling biometric lock.
 */
async function enrollCredential(): Promise<string | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        rp: { name: 'Mesa Primera Lock', id: window.location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'lock-check',
          displayName: 'Verificación',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256 (fallback for some Android devices)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60000,
        excludeCredentials: [],
      },
    })) as PublicKeyCredential | null
    if (!credential) return null
    return bufferToBase64(credential.rawId)
  } catch {
    return null
  }
}

/**
 * Quick device-level biometric/PIN verification.
 * Creates a throw-away credential to trigger the native fingerprint/FaceID prompt.
 * This is more reliable than credentials.get() because it doesn't depend on
 * a previously stored credential matching exactly.
 */
async function requestDeviceVerification(): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        rp: { name: 'Mesa Primera Lock', id: window.location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'lock-check',
          displayName: 'Verificación',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60000,
        excludeCredentials: [],
      },
    })) as PublicKeyCredential | null
    return !!credential
  } catch {
    return false
  }
}

function stampActivity() {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()))
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function AppLockProvider({
  children,
}: {
  userId: string
  children: ReactNode
}) {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [ready, setReady] = useState(false)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Suppresses visibilitychange-based locking while the OS biometric prompt is open */
  const isBiometricPromptActive = useRef(false)

  // ── Init: check support, lock only on cold open (no session marker) ──
  useEffect(() => {
    isPlatformAuthenticatorAvailable().then((supported) => {
      setIsSupported(supported)
      const stored = localStorage.getItem(APP_LOCK_KEY) === 'true'
      setIsEnabled(stored)

      if (stored && supported) {
        // Check for one-time auth bypass (set by login/register flows)
        if (consumeAuthBypass()) {
          // Just logged in — skip lock and mark session as validated
          markSessionValidated()
          setIsLocked(false)
        } else if (isSessionValidated()) {
          // Same session (reload / navigation) — already validated, don't lock
          setIsLocked(false)
        } else {
          // Cold open (new tab / app reopened after full close) — lock
          setIsLocked(true)
        }
      }
      setReady(true)
    })
  }, [])

  // ── Visibility: stamp activity when going to background (no lock on return) ──
  useEffect(() => {
    if (!isEnabled) return

    function handleVisibility() {
      if (document.hidden) {
        stampActivity()
      }
      // Returning from background does NOT lock — only inactivity timer does
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isEnabled])

  // ── Inactivity timer: lock after 5 min without interaction ──
  useEffect(() => {
    if (!isEnabled || isLocked) return

    function resetTimer() {
      stampActivity()
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(() => {
        setIsLocked(true)
      }, INACTIVITY_MS)
    }

    // Start initial timer
    resetTimer()

    // Reset on any user interaction
    for (const evt of INTERACTION_EVENTS) {
      document.addEventListener(evt, resetTimer, { passive: true })
    }

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      for (const evt of INTERACTION_EVENTS) {
        document.removeEventListener(evt, resetTimer)
      }
    }
  }, [isEnabled, isLocked])

  // ── Enroll ──
  // IMPORTANT: Call navigator.credentials.create() IMMEDIATELY on user gesture.
  // Any async server call before it will consume the transient activation on mobile,
  // causing NotAllowedError. Server-side passkey registration runs AFTER local enroll.
  const enroll = useCallback(async (): Promise<EnrollResult> => {
    isBiometricPromptActive.current = true
    try {
      // 1. Local biometric enrollment FIRST (preserves user gesture / transient activation)
      const credentialId = await enrollCredential()
      if (!credentialId) {
        return { ok: false, error: 'Tu dispositivo no completó la verificación biométrica.' }
      }

      // Activate lock immediately
      localStorage.setItem(APP_LOCK_KEY, 'true')
      localStorage.setItem(CREDENTIAL_ID_KEY, credentialId)
      stampActivity()
      markSessionValidated()
      setIsEnabled(true)

      // 2. Try server-side passkey registration in background (for Fast Login)
      // This doesn't need user gesture — it reuses the credential already created
      try {
        const serverResult = await getPasskeyRegistrationOptions()
        if (serverResult.options) {
          const attestation = await startRegistration({ optionsJSON: serverResult.options })
          const deviceId = localStorage.getItem('mesa_primera_device_id') ?? crypto.randomUUID()
          localStorage.setItem('mesa_primera_device_id', deviceId)
          const verification = await verifyPasskeyRegistration(attestation, deviceId)
          if (verification.ok && verification.credentialId) {
            // Update stored credential to server-verified one
            localStorage.setItem(CREDENTIAL_ID_KEY, verification.credentialId)
          }
        }
      } catch (e) {
        // Server passkey registration is optional — app lock already works locally
        console.warn('[AppLock] Server-side passkey registration skipped:', e)
      }

      return { ok: true }
    } catch (e: any) {
      console.error('[AppLock] Unexpected enroll error:', e)
      return { ok: false, error: e?.message || 'Error inesperado.' }
    } finally {
      isBiometricPromptActive.current = false
    }
  }, [])

  // ── Disable ──
  const disable = useCallback(() => {
    localStorage.removeItem(APP_LOCK_KEY)
    localStorage.removeItem(CREDENTIAL_ID_KEY)
    localStorage.removeItem(LAST_ACTIVE_KEY)
    clearSessionValidated()
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    setIsEnabled(false)
    setIsLocked(false)
  }, [])

  // ── Unlock ──
  const handleUnlock = useCallback(async () => {
    isBiometricPromptActive.current = true
    try {
      const ok = await requestDeviceVerification()
      if (ok) {
        stampActivity()
        markSessionValidated()
        setIsLocked(false)
      }
      return ok
    } finally {
      isBiometricPromptActive.current = false
    }
  }, [])

  if (!ready) return null

  return (
    <AppLockContext.Provider value={{ isEnabled, isLocked, isSupported, enroll, disable }}>
      {isLocked && <PwaLockScreen onUnlock={handleUnlock} />}
      {children}
    </AppLockContext.Provider>
  )
}
