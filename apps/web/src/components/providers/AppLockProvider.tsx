'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { PwaLockScreen } from '@/components/pwa-lock-screen'

const APP_LOCK_KEY = 'mesa_primera_app_lock_enabled'

interface AppLockContextValue {
  /** Whether the user has opted-in to biometric lock */
  isEnabled: boolean
  /** Whether the app is currently locked */
  isLocked: boolean
  /** Whether the device supports platform biometric/PIN */
  isSupported: boolean
  /** Test biometric and enable lock if successful */
  enroll: () => Promise<boolean>
  /** Disable the lock */
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
 * Request a device-level biometric/PIN verification.
 * We create a temporary credential and immediately verify it – this triggers
 * the native fingerprint / FaceID / PIN prompt without storing passkeys
 * in cloud keychain managers.
 *
 * Uses the same approach that banking apps use for "app lock".
 */
async function requestDeviceVerification(): Promise<boolean> {
  try {
    // Create a throw-away credential scoped to this origin
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
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged', // don't save as a passkey
        },
        timeout: 60000,
        excludeCredentials: [], // allow re-creation
      },
    })) as PublicKeyCredential | null

    return !!credential
  } catch {
    return false
  }
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

  // Check support & load preference on mount
  useEffect(() => {
    isPlatformAuthenticatorAvailable().then((supported) => {
      setIsSupported(supported)
      const stored = localStorage.getItem(APP_LOCK_KEY) === 'true'
      setIsEnabled(stored)
      // If biometric lock is enabled, lock immediately on page load
      if (stored && supported) {
        setIsLocked(true)
      }
      setReady(true)
    })
  }, [])

  // ── Visibility change: re-lock when app returns from background ──
  useEffect(() => {
    if (!isEnabled) return

    let hiddenSince: number | null = null

    function handleVisibility() {
      if (document.hidden) {
        hiddenSince = Date.now()
      } else if (hiddenSince !== null) {
        // Re-lock if the app was in background for more than 3 seconds
        // (avoids locking on quick tab switches)
        const elapsed = Date.now() - hiddenSince
        hiddenSince = null
        if (elapsed > 3000) {
          setIsLocked(true)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isEnabled])

  // ── Enroll: verify biometric works and enable lock ──
  const enroll = useCallback(async (): Promise<boolean> => {
    const ok = await requestDeviceVerification()
    if (ok) {
      localStorage.setItem(APP_LOCK_KEY, 'true')
      setIsEnabled(true)
    }
    return ok
  }, [])

  // ── Disable lock ──
  const disable = useCallback(() => {
    localStorage.removeItem(APP_LOCK_KEY)
    setIsEnabled(false)
    setIsLocked(false)
  }, [])

  // ── Handle unlock attempt from LockScreen ──
  const handleUnlock = useCallback(async () => {
    const ok = await requestDeviceVerification()
    if (ok) setIsLocked(false)
    return ok
  }, [])

  // Don't render anything until we've checked localStorage
  if (!ready) return null

  return (
    <AppLockContext.Provider value={{ isEnabled, isLocked, isSupported, enroll, disable }}>
      {isLocked && <PwaLockScreen onUnlock={handleUnlock} />}
      {children}
    </AppLockContext.Provider>
  )
}
