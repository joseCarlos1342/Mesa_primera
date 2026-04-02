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
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
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
    const ok = await requestDeviceVerification()
    if (ok) {
      localStorage.setItem(APP_LOCK_KEY, 'true')
      stampActivity()
      setIsEnabled(true)
    }
    return ok
  }, [])

  // ── Disable ──
  const disable = useCallback(() => {
    localStorage.removeItem(APP_LOCK_KEY)
    localStorage.removeItem(LAST_ACTIVE_KEY)
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    setIsEnabled(false)
    setIsLocked(false)
  }, [])

  // ── Unlock ──
  const handleUnlock = useCallback(async () => {
    const ok = await requestDeviceVerification()
    if (ok) {
      stampActivity()
      setIsLocked(false)
    }
    return ok
  }, [])

  if (!ready) return null

  return (
    <AppLockContext.Provider value={{ isEnabled, isLocked, isSupported, enroll, disable }}>
      {isLocked && <PwaLockScreen onUnlock={handleUnlock} />}
      {children}
    </AppLockContext.Provider>
  )
}
