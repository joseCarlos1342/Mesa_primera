/**
 * AppLockProvider — Reduced-sensitivity biometric lock policy tests.
 *
 * New policy:
 *  - Do NOT lock on page reload if session was already validated.
 *  - Do NOT lock on visibilitychange (background → foreground).
 *  - DO lock on cold open (new browser session, no sessionStorage marker).
 *  - DO lock after 30 min inactivity in foreground.
 *  - Clearing / disabling cleans up all state.
 *  - After successful auth redirect, do NOT prompt immediately.
 */

import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock PwaLockScreen so we can detect when it renders
jest.mock('@/components/pwa-lock-screen', () => ({
  PwaLockScreen: ({ onUnlock }: { onUnlock: () => Promise<boolean> }) => (
    <div data-testid="lock-screen">
      <button data-testid="unlock-btn" onClick={() => onUnlock()}>
        Unlock
      </button>
    </div>
  ),
}))

// Mock passkey server actions — not under test here
jest.mock('@/app/(auth)/passkey-actions', () => ({
  getPasskeyRegistrationOptions: jest.fn().mockResolvedValue({}),
  verifyPasskeyRegistration: jest.fn().mockResolvedValue({ ok: false }),
}))

// Mock @simplewebauthn/browser
jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn().mockResolvedValue({}),
}))

// ─── Helpers ────────────────────────────────────────────────────────────────

// We need to control what isPlatformAuthenticatorAvailable returns
let platformAuthAvailable = true

beforeAll(() => {
  // Stub PublicKeyCredential
  Object.defineProperty(window, 'PublicKeyCredential', {
    value: {
      isUserVerifyingPlatformAuthenticatorAvailable: () =>
        Promise.resolve(platformAuthAvailable),
    },
    writable: true,
    configurable: true,
  })
})

beforeEach(() => {
  jest.useFakeTimers()
  localStorage.clear()
  sessionStorage.clear()
  platformAuthAvailable = true
  // Reset document visibility
  Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true })
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

// Import AFTER mocks are set up
import { AppLockProvider, useAppLock } from '../AppLockProvider'

// A helper consumer to inspect the context
function LockStatus() {
  const { isEnabled, isLocked, isSupported } = useAppLock()
  return (
    <div>
      <span data-testid="enabled">{String(isEnabled)}</span>
      <span data-testid="locked">{String(isLocked)}</span>
      <span data-testid="supported">{String(isSupported)}</span>
    </div>
  )
}

function renderProvider() {
  return render(
    <AppLockProvider userId="test-user">
      <LockStatus />
    </AppLockProvider>,
  )
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AppLockProvider — new reduced-sensitivity policy', () => {
  describe('Cold open (new session)', () => {
    it('should lock on cold open when biometric lock is enabled and no session marker exists', async () => {
      // Simulate: lock enabled in localStorage, but sessionStorage is empty (new session)
      localStorage.setItem('mesa_primera_app_lock_enabled', 'true')

      await act(async () => {
        renderProvider()
      })

      // Should show the lock screen
      expect(screen.getByTestId('lock-screen')).toBeInTheDocument()
      expect(screen.getByTestId('locked').textContent).toBe('true')
    })

    it('should NOT lock on cold open when biometric lock is disabled', async () => {
      // localStorage has no lock enabled
      await act(async () => {
        renderProvider()
      })

      expect(screen.queryByTestId('lock-screen')).not.toBeInTheDocument()
      expect(screen.getByTestId('locked').textContent).toBe('false')
    })
  })

  describe('Page reload (same session)', () => {
    it('should NOT lock on reload if session was already validated', async () => {
      // Simulate: lock enabled AND session already validated
      localStorage.setItem('mesa_primera_app_lock_enabled', 'true')
      sessionStorage.setItem('mesa_primera_session_validated', 'true')

      await act(async () => {
        renderProvider()
      })

      // Should NOT show the lock screen after reload
      expect(screen.queryByTestId('lock-screen')).not.toBeInTheDocument()
      expect(screen.getByTestId('locked').textContent).toBe('false')
    })
  })

  describe('Visibility change (background → foreground)', () => {
    it('should NOT lock when returning from background', async () => {
      localStorage.setItem('mesa_primera_app_lock_enabled', 'true')
      sessionStorage.setItem('mesa_primera_session_validated', 'true')

      await act(async () => {
        renderProvider()
      })

      // Simulate going to background
      await act(async () => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true })
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          configurable: true,
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Simulate coming back to foreground
      await act(async () => {
        Object.defineProperty(document, 'hidden', { value: false, configurable: true })
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Should NOT be locked
      expect(screen.queryByTestId('lock-screen')).not.toBeInTheDocument()
      expect(screen.getByTestId('locked').textContent).toBe('false')
    })
  })

  describe('Inactivity (30 min in foreground)', () => {
    it('should lock after 30 minutes of inactivity', async () => {
      localStorage.setItem('mesa_primera_app_lock_enabled', 'true')
      sessionStorage.setItem('mesa_primera_session_validated', 'true')

      await act(async () => {
        renderProvider()
      })

      expect(screen.getByTestId('locked').textContent).toBe('false')

      // Fast-forward 30 minutes
      await act(async () => {
        jest.advanceTimersByTime(30 * 60 * 1000)
      })

      expect(screen.getByTestId('locked').textContent).toBe('true')
      expect(screen.getByTestId('lock-screen')).toBeInTheDocument()
    })

    it('should NOT lock if user interacts within the 30-minute window', async () => {
      localStorage.setItem('mesa_primera_app_lock_enabled', 'true')
      sessionStorage.setItem('mesa_primera_session_validated', 'true')

      await act(async () => {
        renderProvider()
      })

      // Wait 20 minutes, then interact
      await act(async () => {
        jest.advanceTimersByTime(20 * 60 * 1000)
      })

      await act(async () => {
        document.dispatchEvent(new Event('pointerdown'))
      })

      // Wait another 20 minutes (total 40 but only 20 since last interaction)
      await act(async () => {
        jest.advanceTimersByTime(20 * 60 * 1000)
      })

      expect(screen.getByTestId('locked').textContent).toBe('false')

      // Wait the remaining 10 minutes to hit 30 min from last interaction
      await act(async () => {
        jest.advanceTimersByTime(10 * 60 * 1000)
      })

      expect(screen.getByTestId('locked').textContent).toBe('true')
    })
  })

  describe('Auth bypass', () => {
    it('should NOT lock immediately after auth redirect (bypass cookie consumed)', async () => {
      // Simulate: lock is enabled AND there's a fresh auth bypass marker
      localStorage.setItem('mesa_primera_app_lock_enabled', 'true')
      // No session_validated yet, but there IS a bypass cookie
      // The provider should detect the cookie/marker from auth, consume it, and skip the lock
      sessionStorage.setItem('mesa_primera_auth_bypass', 'true')

      await act(async () => {
        renderProvider()
      })

      // Should NOT show lock even though it's a "cold" sessionStorage scenario
      expect(screen.queryByTestId('lock-screen')).not.toBeInTheDocument()
      expect(screen.getByTestId('locked').textContent).toBe('false')

      // The bypass should have been consumed (one-time use)
      expect(sessionStorage.getItem('mesa_primera_auth_bypass')).toBeNull()
    })
  })

  describe('Disable', () => {
    it('should clear all lock state including session marker when disabled', async () => {
      localStorage.setItem('mesa_primera_app_lock_enabled', 'true')
      sessionStorage.setItem('mesa_primera_session_validated', 'true')

      let disableFn: (() => void) | null = null

      function DisableConsumer() {
        const { disable } = useAppLock()
        disableFn = disable
        return null
      }

      await act(async () => {
        render(
          <AppLockProvider userId="test-user">
            <LockStatus />
            <DisableConsumer />
          </AppLockProvider>,
        )
      })

      // Disable lock
      await act(async () => {
        disableFn!()
      })

      expect(screen.getByTestId('enabled').textContent).toBe('false')
      expect(screen.getByTestId('locked').textContent).toBe('false')
      expect(localStorage.getItem('mesa_primera_app_lock_enabled')).toBeNull()
      expect(sessionStorage.getItem('mesa_primera_session_validated')).toBeNull()
    })
  })
})
