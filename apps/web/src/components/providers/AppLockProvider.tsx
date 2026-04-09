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

const APP_LOCK_KEY = 'mesa_primera_app_lock_enabled'
const CREDENTIAL_ID_KEY = 'mesa_primera_lock_credential_id'
const LAST_ACTIVE_KEY = 'mesa_primera_last_active'
const INACTIVITY_MS = 5 * 60 * 1000 // 5 minutes
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

interface AppLockContextValue {
  isEnabled: boolean
  isLocked: boolean
  isSupported: boolean
  enroll: () => Promise<boolean>
  disable: () => void
}

const AppLockContext = createContext<AppLockContextValue>({
  isEnabled: false,
  isLocked: false,
  isSupported: false,
  enroll: async () => false,
  disable: () => {},
})

export const useAppLock = () => useContext(AppLockContext)

// ─── Helpers ────────────────────────────────────────────────────────────────

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
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
 * Verification: uses navigator.credentials.get() with the stored credential.
 * Shows a simple biometric prompt on mobile (no passkey-creation sheet).
 */
async function verifyWithCredential(credentialIdB64: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: base64ToBuffer(credentialIdB64),
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!assertion
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

  // ── Init: check support, lock on open if enabled ──
  useEffect(() => {
    isPlatformAuthenticatorAvailable().then((supported) => {
      setIsSupported(supported)
      const stored = localStorage.getItem(APP_LOCK_KEY) === 'true'
      setIsEnabled(stored)
      // Lock on app open: always lock when loading fresh, or if inactive > 5 min
      if (stored && supported) {
        setIsLocked(true)
      }
      setReady(true)
    })
  }, [])

  // ── Visibility: lock when app comes back from background ──
  useEffect(() => {
    if (!isEnabled) return

    function handleVisibility() {
      if (isBiometricPromptActive.current) return
      if (document.hidden) {
        // Stamp current time when going to background
        stampActivity()
      } else {
        // Came back — always lock (user closed/minimized the app)
        setIsLocked(true)
      }
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
  const enroll = useCallback(async (): Promise<boolean> => {
    isBiometricPromptActive.current = true
    try {
      // 1. Try server-side WebAuthn registration (for Fast Login)
      const serverResult = await getPasskeyRegistrationOptions()
      if (serverResult.options) {
        try {
          const attestation = await startRegistration({ optionsJSON: serverResult.options })
          // Generate a stable device ID for this browser
          const deviceId = localStorage.getItem('mesa_primera_device_id') ?? crypto.randomUUID()
          localStorage.setItem('mesa_primera_device_id', deviceId)

          const verification = await verifyPasskeyRegistration(attestation, deviceId)
          if (verification.ok && verification.credentialId) {
            localStorage.setItem(APP_LOCK_KEY, 'true')
            localStorage.setItem(CREDENTIAL_ID_KEY, verification.credentialId)
            stampActivity()
            setIsEnabled(true)
            return true
          }
        } catch (e) {
          console.warn('[AppLock] Server-side registration failed, falling back to local:', e)
        }
      }

      // 2. Fallback to local-only enrollment (works offline, still provides app-lock)
      const credentialId = await enrollCredential()
      if (credentialId) {
        localStorage.setItem(APP_LOCK_KEY, 'true')
        localStorage.setItem(CREDENTIAL_ID_KEY, credentialId)
        stampActivity()
        setIsEnabled(true)
      }
      return !!credentialId
    } finally {
      isBiometricPromptActive.current = false
    }
  }, [])

  // ── Disable ──
  const disable = useCallback(() => {
    localStorage.removeItem(APP_LOCK_KEY)
    localStorage.removeItem(CREDENTIAL_ID_KEY)
    localStorage.removeItem(LAST_ACTIVE_KEY)
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    setIsEnabled(false)
    setIsLocked(false)
  }, [])

  // ── Unlock ──
  const handleUnlock = useCallback(async () => {
    isBiometricPromptActive.current = true
    try {
      const credentialId = localStorage.getItem(CREDENTIAL_ID_KEY)
      if (!credentialId) {
        // No stored credential — re-enroll silently
        const newId = await enrollCredential()
        if (newId) {
          localStorage.setItem(CREDENTIAL_ID_KEY, newId)
          stampActivity()
          setIsLocked(false)
          return true
        }
        return false
      }
      const ok = await verifyWithCredential(credentialId)
      if (ok) {
        stampActivity()
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
