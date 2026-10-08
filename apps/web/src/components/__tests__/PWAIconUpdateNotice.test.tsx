import { fireEvent, render, screen } from '@testing-library/react'

import { ICON_VERSION } from '@/lib/pwa/icon-version'

import {
  ICON_NOTICE_SNOOZE_KEY,
  ICON_NOTICE_SNOOZE_MS,
  ICON_VERSION_KEY,
  PWAIconUpdateNotice,
} from '../PWAIconUpdateNotice'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
const IPAD_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14)'

const original = {
  userAgent: navigator.userAgent,
  standalone: (navigator as Navigator & { standalone?: boolean }).standalone,
  maxTouchPoints: navigator.maxTouchPoints,
}

function device({ ua, standalone, touch = 0 }: { ua: string; standalone?: boolean; touch?: number }) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ua })
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: standalone })
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: touch })
}

const dialog = () => screen.queryByRole('dialog', { name: /tenemos un icono nuevo/i })

describe('PWAIconUpdateNotice', () => {
  beforeEach(() => localStorage.clear())

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original.userAgent })
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: original.standalone })
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: original.maxTouchPoints })
  })

  it('no aparece fuera de iOS standalone (Android, Safari en pestaña, escritorio)', () => {
    localStorage.setItem(ICON_VERSION_KEY, 'old00000')
    for (const d of [
      { ua: ANDROID, standalone: undefined },
      { ua: IPHONE, standalone: false },
      { ua: IPAD_DESKTOP_UA, standalone: true, touch: 0 },
    ]) {
      device(d)
      const { unmount } = render(<PWAIconUpdateNotice />)
      expect(dialog()).not.toBeInTheDocument()
      unmount()
    }
    expect(localStorage.getItem(ICON_VERSION_KEY)).toBe('old00000')
  })

  it('en la primera apertura solo registra la versión, sin avisar', () => {
    device({ ua: IPHONE, standalone: true })
    render(<PWAIconUpdateNotice />)
    expect(dialog()).not.toBeInTheDocument()
    expect(localStorage.getItem(ICON_VERSION_KEY)).toBe(ICON_VERSION)
  })

  it('no avisa si la versión instalada es la actual', () => {
    device({ ua: IPHONE, standalone: true })
    localStorage.setItem(ICON_VERSION_KEY, ICON_VERSION)
    render(<PWAIconUpdateNotice />)
    expect(dialog()).not.toBeInTheDocument()
  })

  it('avisa con los pasos de reinstalación cuando cambió el icono y "Entendido" lo marca como visto', () => {
    device({ ua: IPHONE, standalone: true })
    localStorage.setItem(ICON_VERSION_KEY, 'old00000')
    localStorage.setItem(ICON_NOTICE_SNOOZE_KEY, '1')
    render(<PWAIconUpdateNotice />)

    expect(dialog()).toBeInTheDocument()
    expect(screen.getByText(/eliminar app/i)).toBeInTheDocument()
    expect(screen.getByText(/agregar a pantalla de inicio/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /nuevo icono/i })).toHaveAttribute(
      'src',
      expect.stringContaining(`v=${ICON_VERSION}`),
    )

    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(dialog()).not.toBeInTheDocument()
    expect(localStorage.getItem(ICON_VERSION_KEY)).toBe(ICON_VERSION)
    expect(localStorage.getItem(ICON_NOTICE_SNOOZE_KEY)).toBeNull()
  })

  it('"Recordar luego" pospone 7 días y respeta el plazo (iPadOS)', () => {
    device({ ua: IPAD_DESKTOP_UA, standalone: true, touch: 5 })
    localStorage.setItem(ICON_VERSION_KEY, 'old00000')
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)

    const first = render(<PWAIconUpdateNotice />)
    fireEvent.click(screen.getByRole('button', { name: /recordar luego/i }))
    expect(dialog()).not.toBeInTheDocument()
    expect(localStorage.getItem(ICON_NOTICE_SNOOZE_KEY)).toBe(String(now + ICON_NOTICE_SNOOZE_MS))
    expect(localStorage.getItem(ICON_VERSION_KEY)).toBe('old00000')
    first.unmount()

    const snoozed = render(<PWAIconUpdateNotice />)
    expect(dialog()).not.toBeInTheDocument()
    snoozed.unmount()

    jest.spyOn(Date, 'now').mockReturnValue(now + ICON_NOTICE_SNOOZE_MS + 1)
    render(<PWAIconUpdateNotice />)
    expect(dialog()).toBeInTheDocument()
    jest.restoreAllMocks()
  })
})
