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

const APP_LOCK_KEY = 'mesa_primera_app_lock_enabled'
const CREDENTIAL_ID_KEY = 'mesa_primera_credential_id'

interface AppLockContextValue {
  /** Whether the user has opted-in to biometric lock */
  isEnabled: boolean
  /** Whether the app is currently locked */
  isLocked: boolean
  /** Whether the device supports WebAuthn */
  isSupported: boolean
  /** Enroll: register a new credential (fingerprint / face / PIN) */
  enroll: () => Promise<boolean>
  /** Remove the stored credential and disable lock */
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

function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  )
}

async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/** Generate a random challenge */
function randomChallenge(): ArrayBuffer {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return arr.buffer as ArrayBuffer
}

/** Convert ArrayBuffer to base64 string for storage */
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

/** Convert base64 string back to ArrayBuffer */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function AppLockProvider({
  userId,
  children,
}: {
  userId: string
  children: ReactNode
}) {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const wasHidden = useRef(false)

  // Check support & load preference on mount
  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setIsSupported)
    const stored = localStorage.getItem(APP_LOCK_KEY)
    setIsEnabled(stored === 'true')
  }, [])

  // ── Visibility change: lock when app goes to background, unlock when returns ──
  useEffect(() => {
    if (!isEnabled) return

    function handleVisibility() {
      if (document.hidden) {
        wasHidden.current = true
      } else if (wasHidden.current) {
        wasHidden.current = false
        setIsLocked(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isEnabled])

  // ── Enroll: create a platform credential ──
  const enroll = useCallback(async (): Promise<boolean> => {
    try {
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: randomChallenge(),
          rp: {
            name: 'Mesa Primera',
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: `player-${userId.slice(0, 8)}`,
            displayName: 'Mesa Primera Player',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // force biometric / device PIN
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null

      if (!credential) return false

      localStorage.setItem(CREDENTIAL_ID_KEY, bufferToBase64(credential.rawId))
      localStorage.setItem(APP_LOCK_KEY, 'true')
      setIsEnabled(true)
      return true
    } catch {
      return false
    }
  }, [userId])

  // ── Verify: request the platform authenticator ──
  const verify = useCallback(async (): Promise<boolean> => {
    const storedId = localStorage.getItem(CREDENTIAL_ID_KEY)
    if (!storedId) return false

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomChallenge(),
          allowCredentials: [
            {
              id: base64ToBuffer(storedId),
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      })

      return !!assertion
    } catch {
      return false
    }
  }, [])

  // ── Disable lock ──
  const disable = useCallback(() => {
    localStorage.removeItem(APP_LOCK_KEY)
    localStorage.removeItem(CREDENTIAL_ID_KEY)
    setIsEnabled(false)
    setIsLocked(false)
  }, [])

  // ── Handle unlock attempt from LockScreen ──
  const handleUnlock = useCallback(async () => {
    const ok = await verify()
    if (ok) setIsLocked(false)
    return ok
  }, [verify])

  return (
    <AppLockContext.Provider value={{ isEnabled, isLocked, isSupported, enroll, disable }}>
      {isLocked && <PwaLockScreen onUnlock={handleUnlock} />}
      {children}
    </AppLockContext.Provider>
  )
}
