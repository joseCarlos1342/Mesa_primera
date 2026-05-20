import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { LandingContent } from '../LandingContent'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}))

jest.mock('gsap', () => {
  const chain = {
    from: jest.fn().mockReturnThis(),
    fromTo: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
  }

  return {
    __esModule: true,
    default: {
      registerPlugin: jest.fn(),
      timeline: jest.fn(() => chain),
      from: jest.fn(),
      fromTo: jest.fn(),
      to: jest.fn(),
      set: jest.fn(),
      utils: {
        toArray: jest.fn(() => []),
      },
      matchMedia: jest.fn(() => ({ add: jest.fn() })),
    },
    ScrollTrigger: {
      batch: jest.fn(),
    },
  }
})

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: jest.fn((loader: unknown) => {
    if (typeof loader === 'function') {
      const source = loader.toString()

      if (source.includes('LocationMapInner')) {
        return function MockDynamicLocationMap() {
          return <div data-testid="location-map-dynamic">Mapa dinámico</div>
        }
      }

      if (source.includes('TutorialWalkthrough')) {
        return function MockDynamicTutorialWalkthrough(props: { onClose?: () => void }) {
          return (
            <div data-testid="tutorial-walkthrough-dynamic">
              <button type="button" onClick={props.onClose}>Cerrar tutorial</button>
              Tutorial walkthrough
            </div>
          )
        }
      }
    }

    return function MockDynamicComponent() {
      return <div data-testid="dynamic-component" />
    }
  }),
}))

jest.mock('../tutorials/InstallAppTutorial', () => ({
  installAppSteps: [{ label: 'Paso 1', screen: <div>Instalar app</div> }],
}))

jest.mock('../tutorials/RegisterTutorial', () => ({
  registerSteps: [{ label: 'Paso 1', screen: <div>Registro</div> }],
}))

jest.mock('../tutorials/LoginTutorial', () => ({
  loginSteps: [{ label: 'Paso 1', screen: <div>Login</div> }],
}))

jest.mock('../tutorials/WalletTutorial', () => ({
  walletSteps: [{ label: 'Paso 1', screen: <div>Wallet</div> }],
}))

jest.mock('../tutorials/WithdrawTutorial', () => ({
  withdrawSteps: [{ label: 'Paso 1', screen: <div>Retiro</div> }],
}))

jest.mock('../tutorials/TransferTutorial', () => ({
  transferSteps: [{ label: 'Paso 1', screen: <div>Transferencia</div> }],
}))

jest.mock('../tutorials/FirstGameTutorial', () => ({
  firstGameSteps: [{ label: 'Paso 1', screen: <div>Primera partida</div> }],
}))

jest.mock('../tutorials/GameMenuTutorial', () => ({
  gameMenuSteps: [{ label: 'Paso 1', screen: <div>Menu mesa</div> }],
}))

jest.mock('../tutorials/FriendsTutorial', () => ({
  friendsSteps: [{ label: 'Paso 1', screen: <div>Amigos</div> }],
}))

const originalMatchMedia = window.matchMedia
const originalIntersectionObserver = window.IntersectionObserver
const originalScrollIntoView = Element.prototype.scrollIntoView
const originalScrollY = window.scrollY
const scrollIntoViewMock = jest.fn()
const observeMock = jest.fn()
const disconnectMock = jest.fn()
let intervalCallback: (() => void) | null = null
let clearIntervalMock: jest.SpyInstance

describe('LandingContent', () => {
  beforeEach(() => {
    intervalCallback = null
    jest.spyOn(window, 'setInterval').mockImplementation(((callback: TimerHandler) => {
      intervalCallback = callback as () => void
      return 1 as unknown as number
    }) as unknown as typeof window.setInterval)
    clearIntervalMock = jest.spyOn(window, 'clearInterval').mockImplementation(jest.fn())

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        observe: observeMock,
        disconnect: disconnectMock,
        unobserve: jest.fn(),
      })),
    })

    Element.prototype.scrollIntoView = scrollIntoViewMock
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia })
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: originalIntersectionObserver })
    Element.prototype.scrollIntoView = originalScrollIntoView
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: originalScrollY })
    document.body.innerHTML = ''
  })

  it('renderiza hero, CTAs y FAQs principales', () => {
    render(<LandingContent />)

    expect(screen.getByRole('heading', { name: /primera riverada/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /crear cuenta gratis/i })).toHaveAttribute('href', '/register/player')
    expect(screen.getAllByRole('link', { name: /^iniciar sesión$/i })[0]).toHaveAttribute('href', '/login/player')
    expect(screen.getByRole('heading', { name: /preguntas frecuentes/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByText(/¿dónde queda primera riverada los 4 ases/i)).toBeInTheDocument()
  })

  it('abre y cierra el menú mobile', () => {
    render(<LandingContent />)

    const openButton = screen.getByRole('button', { name: /abrir menú/i })
    fireEvent.click(openButton)

    const mobileNav = screen.getAllByRole('button', { name: 'Tutoriales' })
    expect(mobileNav).toHaveLength(2)
    expect(screen.getByRole('button', { name: /cerrar menú/i })).toBeInTheDocument()
  })

  it('navega al hacer click en el hint del hero', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /disponible como app/i }))

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('renderiza servicios, pasos y enlaces legales', () => {
    render(<LandingContent />)

    expect(screen.getByRole('heading', { name: /nuestro establecimiento/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByText(/juego de primera/i)).toBeInTheDocument()
    expect(screen.getByText(/partidas de dominó/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /cómo jugar/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /regístrate/i, level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /reglas oficiales/i })).toHaveAttribute('href', '/rules')
    expect(screen.getByRole('link', { name: /política de seguridad/i })).toHaveAttribute('href', '/security-policy')
  })

  it('permite navegar el carrusel de fotos con flechas y dots', () => {
    render(<LandingContent />)

    const photoCarouselSection = screen.getByRole('heading', { name: /nuestro espacio/i, level: 2 }).closest('section')
    expect(photoCarouselSection).toBeTruthy()
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^nuestro establecimiento$/i, level: 3 })).toBeInTheDocument()

    fireEvent.click(within(photoCarouselSection as HTMLElement).getAllByRole('button', { name: /siguiente/i })[0])
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^mesas de juego$/i, level: 3 })).toBeInTheDocument()

    fireEvent.click(within(photoCarouselSection as HTMLElement).getByRole('button', { name: /anterior/i }))
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^nuestro establecimiento$/i, level: 3 })).toBeInTheDocument()

    fireEvent.click(within(photoCarouselSection as HTMLElement).getByRole('button', { name: /ir a slide 4/i }))
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^eventos especiales$/i, level: 3 })).toBeInTheDocument()
  })

  it('pausa el autoplay al hacer hover y vuelve a rotar con el intervalo', () => {
    render(<LandingContent />)

    const photoCarouselSection = screen.getByRole('heading', { name: /nuestro espacio/i, level: 2 }).closest('section')
    const carousel = photoCarouselSection?.querySelector('.relative.overflow-hidden')
    expect(carousel).toBeTruthy()

    act(() => {
      intervalCallback?.()
    })
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^mesas de juego$/i, level: 3 })).toBeInTheDocument()

    fireEvent.mouseEnter(carousel as Element)
    expect(clearIntervalMock).toHaveBeenCalled()
  })

  it('abre un tutorial y permite cerrarlo desde el overlay', async () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByText(/cómo instalar la app/i))

    expect(await screen.findByTestId('tutorial-walkthrough-dynamic')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cerrar tutorial/i }))

    expect(screen.queryByTestId('tutorial-walkthrough-dynamic')).not.toBeInTheDocument()
  })

  it('renderiza ubicación, placeholder del mapa y CTAs externos', () => {
    render(<LandingContent />)

    expect(screen.getByRole('heading', { name: /cómo llegarnos/i, level: 2 })).toBeInTheDocument()
    expect(screen.getAllByText(/cra. 7 #06-87, neiva, huila/i)).toHaveLength(2)
    expect(screen.getByText(/cargando mapa/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver en google maps/i })).toHaveAttribute('href', expect.stringContaining('maps.google.com/maps?q='))
    expect(screen.getByRole('link', { name: /cómo llegar/i })).toHaveAttribute('href', expect.stringContaining('maps.google.com/maps/dir/'))
  })

  it('renderiza footer con enlaces y redes sociales', () => {
    render(<LandingContent />)

    const footerNav = screen.getByRole('navigation', { name: /enlaces del sitio/i })
    expect(within(footerNav).getByRole('link', { name: /^iniciar sesión$/i })).toHaveAttribute('href', '/login/player')
    expect(within(footerNav).getByRole('link', { name: /crear cuenta/i })).toHaveAttribute('href', '/register/player')
    expect(within(footerNav).getByRole('link', { name: /política de privacidad/i })).toHaveAttribute('href', '/privacy')
    expect(within(footerNav).getByRole('link', { name: /términos y condiciones/i })).toHaveAttribute('href', '/terms')

    expect(screen.getByRole('link', { name: /facebook de primera riverada/i })).toHaveAttribute('href', expect.stringContaining('facebook.com'))
    expect(screen.getByRole('link', { name: /instagram de primera riverada/i })).toHaveAttribute('href', expect.stringContaining('instagram.com'))
    expect(screen.getByRole('link', { name: /correo electrónico de contacto/i })).toHaveAttribute('href', expect.stringContaining('mailto:'))
  })
})
