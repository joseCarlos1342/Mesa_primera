import { renderHook, act, waitFor } from '@testing-library/react'

import { useGamePermissions } from '../useGamePermissions'

const originalNotification = global.Notification
const originalPermissions = navigator.permissions
const originalMediaDevices = navigator.mediaDevices
const originalMatchMedia = window.matchMedia
const originalIsSecureContext = window.isSecureContext

describe('useGamePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: false })),
    })
  })

  afterEach(() => {
    // @ts-expect-error restoring test globals
    global.Notification = originalNotification
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: originalPermissions })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices })
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia })
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: originalIsSecureContext })
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
})
