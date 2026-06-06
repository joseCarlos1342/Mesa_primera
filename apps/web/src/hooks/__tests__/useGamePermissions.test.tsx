import { renderHook, act, waitFor } from '@testing-library/react'

import { useGamePermissions } from '../useGamePermissions'

const originalNotification = global.Notification
const originalPermissions = navigator.permissions
const originalMediaDevices = navigator.mediaDevices
const originalMatchMedia = window.matchMedia
const originalIsSecureContext = window.isSecureContext
const originalUserAgent = navigator.userAgent

describe('useGamePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: false })),
    })
  })

  afterEach(() => {
    global.Notification = originalNotification
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: originalPermissions })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices })
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia })
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: originalIsSecureContext })
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent })
    delete window.ontouchstart
  })

  it('marca unavailable cuando Notification no existe y el contexto no es seguro', async () => {
    // @ts-expect-error test global mutation
    delete global.Notification
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined })

    const { result } = renderHook(() => useGamePermissions())

    await waitFor(() => {
      expect(result.current.notifications).toBe('unavailable')
      expect(result.current.microphone).toBe('unavailable')
      expect(result.current.allGranted).toBe(true)
    })
  })

  it('detecta granted inicial y requestAll concede micrófono', async () => {
    const permissionChange = jest.fn()
    // @ts-expect-error test global mutation
    global.Notification = {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    }
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: jest.fn().mockResolvedValue({
          state: 'granted',
          addEventListener: permissionChange,
        }),
      },
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
    })

    const { result } = renderHook(() => useGamePermissions())

    await waitFor(() => {
      expect(result.current.notifications).toBe('granted')
      expect(result.current.microphone).toBe('granted')
    })

    await act(async () => {
      await result.current.requestAll()
    })

    expect(result.current.allGranted).toBe(true)
  })

  it('requestAll marca denied cuando fallan notification o microphone', async () => {
    // @ts-expect-error test global mutation
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('denied'),
    }
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockRejectedValue(new Error('blocked')),
      },
    })

    const { result } = renderHook(() => useGamePermissions())

    await act(async () => {
      await result.current.requestAll()
    })

    expect(result.current.notifications).toBe('denied')
    expect(result.current.microphone).toBe('denied')
  })

  it('refleja permisos iniciales denied y cambios posteriores de micrófono', async () => {
    let changeListener: (() => void) | undefined
    const permissionResult = {
      state: 'prompt' as PermissionState,
      addEventListener: jest.fn((_event: string, listener: () => void) => {
        changeListener = listener
      }),
    }
    // @ts-expect-error test global mutation
    global.Notification = {
      permission: 'denied',
      requestPermission: jest.fn(),
    }
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: jest.fn().mockResolvedValue(permissionResult) },
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn() },
    })

    const { result } = renderHook(() => useGamePermissions())

    await waitFor(() => {
      expect(result.current.notifications).toBe('denied')
      expect(permissionResult.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    await act(async () => {
      permissionResult.state = 'denied'
      changeListener?.()
    })
    expect(result.current.microphone).toBe('denied')

    await act(async () => {
      permissionResult.state = 'granted'
      changeListener?.()
    })
    expect(result.current.microphone).toBe('granted')
  })

  it('detecta mobile por user agent o pantalla táctil y omite micrófono sin getUserMedia', async () => {
    // @ts-expect-error test global mutation
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockRejectedValue(new Error('blocked')),
    }
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone)' })
    Object.defineProperty(window, 'ontouchstart', { configurable: true, value: null })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({ matches: true }),
    })
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: jest.fn().mockRejectedValue(new Error('unsupported')) },
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {},
    })

    const { result } = renderHook(() => useGamePermissions())

    expect(result.current.isMobile).toBe(true)

    await act(async () => {
      await result.current.requestAll()
    })

    expect(result.current.notifications).toBe('denied')
    expect(result.current.microphone).toBe('unavailable')
  })
})
