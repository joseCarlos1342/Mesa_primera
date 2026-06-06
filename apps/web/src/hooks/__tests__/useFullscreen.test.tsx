import { act, renderHook } from '@testing-library/react'
import { createRef } from 'react'

import { useFullscreen } from '../useFullscreen'

const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
const originalRequestFullscreen = document.documentElement.requestFullscreen
const originalWebkitRequestFullscreen = (document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen
const originalExitFullscreen = document.exitFullscreen
const originalWebkitExitFullscreen = (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen

function setFullscreenElement(value: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => value,
  })
}

describe('useFullscreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setFullscreenElement(null)
  })

  afterEach(() => {
    if (originalFullscreenElement) {
      Object.defineProperty(document, 'fullscreenElement', originalFullscreenElement)
    }
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      writable: true,
      value: originalRequestFullscreen,
    })
    Object.defineProperty(document.documentElement, 'webkitRequestFullscreen', {
      configurable: true,
      writable: true,
      value: originalWebkitRequestFullscreen,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      writable: true,
      value: originalExitFullscreen,
    })
    Object.defineProperty(document, 'webkitExitFullscreen', {
      configurable: true,
      writable: true,
      value: originalWebkitExitFullscreen,
    })
  })

  it('solicita fullscreen sobre el target y sincroniza el estado con fullscreenchange', async () => {
    const target = document.createElement('section')
    const requestFullscreen = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(target, 'requestFullscreen', { configurable: true, value: requestFullscreen })
    const targetRef = createRef<HTMLElement>()
    targetRef.current = target

    const { result } = renderHook(() => useFullscreen(targetRef))

    await act(async () => {
      await result.current.toggle()
    })
    expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' })

    setFullscreenElement(target)
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(true)
  })

  it('usa fallbacks webkit para entrar y salir de fullscreen', async () => {
    const webkitRequestFullscreen = jest.fn().mockResolvedValue(undefined)
    const webkitExitFullscreen = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: undefined })
    Object.defineProperty(document.documentElement, 'webkitRequestFullscreen', { configurable: true, value: webkitRequestFullscreen })
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: undefined })
    Object.defineProperty(document, 'webkitExitFullscreen', { configurable: true, value: webkitExitFullscreen })

    const { result } = renderHook(() => useFullscreen())

    await act(async () => {
      await result.current.toggle()
    })
    expect(webkitRequestFullscreen).toHaveBeenCalledTimes(1)

    setFullscreenElement(document.documentElement)
    await act(async () => {
      await result.current.toggle()
    })
    expect(webkitExitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('sale de fullscreen con la API estándar cuando ya hay un elemento activo', async () => {
    const exitFullscreen = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen })
    setFullscreenElement(document.documentElement)

    const { result } = renderHook(() => useFullscreen())

    await act(async () => {
      await result.current.toggle()
    })

    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('ignora rechazos del navegador y limpia listeners al desmontar', async () => {
    const requestFullscreen = jest.fn().mockRejectedValue(new Error('denied'))
    const addSpy = jest.spyOn(document, 'addEventListener')
    const removeSpy = jest.spyOn(document, 'removeEventListener')
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: requestFullscreen })

    const { result, unmount } = renderHook(() => useFullscreen())


    await act(async () => {
      await expect(result.current.toggle()).resolves.toBeUndefined()
    })
    unmount()

    expect(addSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('webkitfullscreenchange', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('webkitfullscreenchange', expect.any(Function))
  })
})
