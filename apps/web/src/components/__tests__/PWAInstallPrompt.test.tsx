import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { PWAInstallPrompt } from '../PWAInstallPrompt'

const originalMatchMedia = window.matchMedia
const originalUserAgent = navigator.userAgent
const originalStandalone = (navigator as Navigator & { standalone?: boolean }).standalone

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    localStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: false })),
    })
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14)',
    })
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: undefined,
    })
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia })
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: originalUserAgent })
    Object.defineProperty(window.navigator, 'standalone', { configurable: true, value: originalStandalone })
  })

  it('permanece oculto en modo standalone', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({ matches: true })),
    })

    const { container } = render(<PWAInstallPrompt />)
    expect(container.firstChild).toBeNull()
  })

  it('permanece oculto si navigator.standalone está activo o si fue descartado recientemente', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: true,
    })
    const standalone = render(<PWAInstallPrompt />)
    expect(standalone.container.firstChild).toBeNull()
    standalone.unmount()

    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: undefined,
    })
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    const dismissed = render(<PWAInstallPrompt />)
    expect(dismissed.container.firstChild).toBeNull()
  })

  it('muestra banner cuando recibe beforeinstallprompt y permite instalar', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: typeof prompt
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
      preventDefault: jest.Mock
    }
    event.prompt = prompt
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    event.preventDefault = jest.fn()

    render(<PWAInstallPrompt />)
    fireEvent(window, event)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(await screen.findByText(/instalar 4 ases/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /instalar app/i }))

    await waitFor(() => {
      expect(event.preventDefault).toHaveBeenCalled()
      expect(prompt).toHaveBeenCalled()
    })
  })

  it('mantiene banner si instalación es descartada y lo cierra manualmente', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: typeof prompt
      userChoice: Promise<{ outcome: 'dismissed' }>
      preventDefault: jest.Mock
    }
    event.prompt = prompt
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    event.preventDefault = jest.fn()

    render(<PWAInstallPrompt />)
    fireEvent(window, event)
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    fireEvent.click(await screen.findByRole('button', { name: /instalar app/i }))
    await waitFor(() => expect(prompt).toHaveBeenCalled())
    expect(screen.getByText(/instalar 4 ases/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(localStorage.getItem('pwa-install-dismissed')).toBeTruthy()
  })

  it('ignora click de instalación si no hay prompt diferido', () => {
    render(<PWAInstallPrompt />)

    expect(screen.queryByText(/instalar 4 ases/i)).not.toBeInTheDocument()
  })

  it('muestra guía manual en iOS y permite cerrarla', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    })

    render(<PWAInstallPrompt />)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(await screen.findByText(/instalar 4 ases/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ver instrucciones/i }))

    expect(await screen.findByText(/instalar en iphone\/ipad/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(localStorage.getItem('pwa-install-dismissed')).toBeTruthy()
  })

  it('cierra guía iOS al tocar overlay y no al tocar el contenido', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
    })

    render(<PWAInstallPrompt />)
    act(() => {
      jest.advanceTimersByTime(3000)
    })

    fireEvent.click(await screen.findByRole('button', { name: /ver instrucciones/i }))
    const guide = await screen.findByText(/instalar en iphone\/ipad/i)
    fireEvent.click(guide.closest('.rounded-2xl') as HTMLElement)
    expect(screen.getByText(/instalar en iphone\/ipad/i)).toBeInTheDocument()

    fireEvent.click(guide.closest('.fixed') as HTMLElement)
    expect(localStorage.getItem('pwa-install-dismissed')).toBeTruthy()
  })
})
