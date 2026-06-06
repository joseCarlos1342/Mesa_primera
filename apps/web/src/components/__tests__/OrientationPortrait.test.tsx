import { render } from '@testing-library/react'

import { OrientationPortrait } from '../OrientationPortrait'

const originalUserAgent = navigator.userAgent
const originalMatchMedia = window.matchMedia
const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
const originalExitFullscreen = document.exitFullscreen

function setMobile(matches = true) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockReturnValue({ matches }),
  })
}

function setFullscreenElement(value: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => value,
  })
}

describe('OrientationPortrait', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (X11; Linux x86_64)',
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    })
    setFullscreenElement(null)
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent })
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia })
    if (originalFullscreenElement) {
      Object.defineProperty(document, 'fullscreenElement', originalFullscreenElement)
    }
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      writable: true,
      value: originalExitFullscreen,
    })
  })

  it('no desbloquea orientación en desktop', () => {
    const unlock = jest.fn()
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { unlock },
    })

    render(<OrientationPortrait />)

    expect(unlock).not.toHaveBeenCalled()
  })

  it('desbloquea orientación y sale de fullscreen en mobile', () => {
    setMobile()
    const unlock = jest.fn()
    const exitFullscreen = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { unlock },
    })
    setFullscreenElement(document.documentElement)
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    })

    render(<OrientationPortrait />)

    expect(unlock).toHaveBeenCalledTimes(1)
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('tolera errores de unlock y exitFullscreen', () => {
    setMobile()
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { unlock: jest.fn(() => { throw new Error('unsupported') }) },
    })
    setFullscreenElement(document.documentElement)
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: jest.fn().mockRejectedValue(new Error('blocked')),
    })

    expect(() => render(<OrientationPortrait />)).not.toThrow()
  })
})
