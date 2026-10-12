import { fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'

import { ICON_VERSION } from '@/lib/pwa/icon-version'

import {
  ICON_NOTICE_SNOOZE_KEY,
  ICON_NOTICE_SNOOZE_MS,
  ICON_VERSION_KEY,
  PWAIconUpdateNotice,
  getInstalledPlatform,
} from '../PWAIconUpdateNotice'

jest.mock('next/navigation', () => ({ usePathname: jest.fn(() => '/') }))
const mockedPathname = usePathname as jest.MockedFunction<typeof usePathname>

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
const IPAD_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14)'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

const original = {
  userAgent: navigator.userAgent,
  standalone: (navigator as Navigator & { standalone?: boolean }).standalone,
  maxTouchPoints: navigator.maxTouchPoints,
  matchMedia: window.matchMedia,
}

function device({
  ua,
  standalone,
  touch = 0,
  displayStandalone = false,
}: {
  ua: string
  standalone?: boolean
  touch?: number
  displayStandalone?: boolean
}) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ua })
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: standalone })
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: touch })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn((query: string) => ({ matches: displayStandalone && query === '(display-mode: standalone)' })),
  })
}

const dialog = () => screen.queryByRole('dialog', { name: /tenemos un icono nuevo/i })

describe('PWAIconUpdateNotice', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedPathname.mockReturnValue('/')
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original.userAgent })
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: original.standalone })
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: original.maxTouchPoints })
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: original.matchMedia })
    jest.restoreAllMocks()
  })

  it('detecta la plataforma solo cuando la app está instalada', () => {
    device({ ua: IPHONE, standalone: true })
    expect(getInstalledPlatform()).toBe('ios')
    device({ ua: IPHONE, standalone: false })
    expect(getInstalledPlatform()).toBeNull()
    device({ ua: IPAD_DESKTOP_UA, standalone: true, touch: 5 })
    expect(getInstalledPlatform()).toBe('ios')
    device({ ua: ANDROID, displayStandalone: true })
    expect(getInstalledPlatform()).toBe('android')
    device({ ua: ANDROID, displayStandalone: false })
    expect(getInstalledPlatform()).toBeNull()
    device({ ua: DESKTOP, displayStandalone: true })
    expect(getInstalledPlatform()).toBeNull()
  })

  it('en Android sin matchMedia no considera la app instalada', () => {
    device({ ua: ANDROID })
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: undefined })
    expect(getInstalledPlatform()).toBeNull()
  })

  it('no aparece en el navegador (Android, Safari en pestaña, Mac sin táctil, escritorio)', () => {
    for (const d of [
      { ua: ANDROID },
      { ua: IPHONE, standalone: false },
      { ua: IPAD_DESKTOP_UA, standalone: true, touch: 0 },
      { ua: DESKTOP, displayStandalone: true },
    ]) {
      device(d)
      const { unmount } = render(<PWAIconUpdateNotice />)
      expect(dialog()).not.toBeInTheDocument()
      unmount()
    }
    expect(localStorage.getItem(ICON_VERSION_KEY)).toBeNull()
  })

  it('no aparece en el admin', () => {
    mockedPathname.mockReturnValue('/admin/users')
    device({ ua: IPHONE, standalone: true })
    render(<PWAIconUpdateNotice />)
    expect(dialog()).not.toBeInTheDocument()
  })

  it('aparece también si usePathname no devuelve ruta', () => {
    mockedPathname.mockReturnValue(null as unknown as string)
    device({ ua: IPHONE, standalone: true })
    render(<PWAIconUpdateNotice />)
    expect(dialog()).toBeInTheDocument()
  })

  it('sin versión registrada (instalación previa al aviso) avisa y "Entendido" lo marca como visto', () => {
    device({ ua: IPHONE, standalone: true })
    const first = render(<PWAIconUpdateNotice />)

    expect(dialog()).toBeInTheDocument()
    expect(screen.getByText(/si tu icono ya se ve así/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /nuevo icono/i })).toHaveAttribute(
      'src',
      expect.stringContaining(`v=${ICON_VERSION}`),
    )

    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(dialog()).not.toBeInTheDocument()
    expect(localStorage.getItem(ICON_VERSION_KEY)).toBe(ICON_VERSION)
    first.unmount()

    render(<PWAIconUpdateNotice />)
    expect(dialog()).not.toBeInTheDocument()
  })

  it('no avisa si la versión confirmada es la actual', () => {
    device({ ua: ANDROID, displayStandalone: true })
    localStorage.setItem(ICON_VERSION_KEY, ICON_VERSION)
    render(<PWAIconUpdateNotice />)
    expect(dialog()).not.toBeInTheDocument()
  })

  it('en iPhone muestra los pasos de reinstalación desde Safari y limpia el pospuesto', () => {
    device({ ua: IPHONE, standalone: true })
    localStorage.setItem(ICON_VERSION_KEY, 'old00000')
    localStorage.setItem(ICON_NOTICE_SNOOZE_KEY, '1')
    render(<PWAIconUpdateNotice />)

    expect(dialog()).toBeInTheDocument()
    expect(screen.getByText(/eliminar app/i)).toBeInTheDocument()
    expect(screen.getByText(/agregar a pantalla de inicio/i)).toBeInTheDocument()
    expect(screen.getByText(/safari/i)).toBeInTheDocument()
    expect(screen.queryByText(/revisar actualización de la app/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(localStorage.getItem(ICON_NOTICE_SNOOZE_KEY)).toBeNull()
  })

  it('en Android muestra cómo aceptar el cambio en Chrome o reinstalar', () => {
    device({ ua: ANDROID, displayStandalone: true })
    localStorage.setItem(ICON_VERSION_KEY, 'old00000')
    render(<PWAIconUpdateNotice />)

    expect(dialog()).toBeInTheDocument()
    expect(screen.getByText(/revisar actualización de la app/i)).toBeInTheDocument()
    expect(screen.getByText(/desinstalar/i)).toBeInTheDocument()
    expect(screen.getByText(/apps recientes/i)).toBeInTheDocument()
    expect(screen.queryByText(/safari/i)).not.toBeInTheDocument()
  })

  it('"Recordar luego" pospone 7 días aunque no haya versión registrada', () => {
    device({ ua: ANDROID, displayStandalone: true })
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)

    const first = render(<PWAIconUpdateNotice />)
    fireEvent.click(screen.getByRole('button', { name: /recordar luego/i }))
    expect(dialog()).not.toBeInTheDocument()
    expect(localStorage.getItem(ICON_NOTICE_SNOOZE_KEY)).toBe(String(now + ICON_NOTICE_SNOOZE_MS))
    expect(localStorage.getItem(ICON_VERSION_KEY)).toBeNull()
    first.unmount()

    const snoozed = render(<PWAIconUpdateNotice />)
    expect(dialog()).not.toBeInTheDocument()
    snoozed.unmount()

    jest.spyOn(Date, 'now').mockReturnValue(now + ICON_NOTICE_SNOOZE_MS + 1)
    render(<PWAIconUpdateNotice />)
    expect(dialog()).toBeInTheDocument()
  })
})
