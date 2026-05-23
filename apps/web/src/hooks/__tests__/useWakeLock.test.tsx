import { renderHook } from '@testing-library/react'

import { useWakeLock } from '../useWakeLock'

describe('useWakeLock', () => {
  const originalWakeLock = (navigator as Navigator & { wakeLock?: unknown }).wakeLock
  const originalVisibilityState = document.visibilityState

  afterEach(() => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: originalWakeLock })
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: originalVisibilityState })
    jest.restoreAllMocks()
  })

  it('solicita wake lock al montar y al volver a visible', async () => {
    const release = jest.fn().mockResolvedValue(undefined)
    const request = jest.fn().mockResolvedValue({ release })
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request },
    })

    const { unmount } = renderHook(() => useWakeLock())

    await Promise.resolve()
    expect(request).toHaveBeenCalledWith('screen')

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(2)

    unmount()
    await Promise.resolve()
    expect(release).toHaveBeenCalled()
  })

  it('tolera ausencia de wakeLock o errores al solicitarlo', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: jest.fn().mockRejectedValue(new Error('blocked')) },
    })

    renderHook(() => useWakeLock())
    await Promise.resolve()

    expect(warnSpy).toHaveBeenCalled()
  })
})
