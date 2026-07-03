import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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

jest.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    batch: jest.fn(),
  },
}))

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
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener
const originalInnerWidth = window.innerWidth
const scrollIntoViewMock = jest.fn()
const observeMock = jest.fn()
const disconnectMock = jest.fn()
let intersectionCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null
let intervalCallback: (() => void) | null = null
let resizeListener: (() => void) | null = null
let removeResizeListenerMock: jest.Mock | null = null
let clearIntervalMock: jest.SpyInstance

type BatchOptions = {
  onEnter: (batch: Element[]) => void
  onLeaveBack: (batch: Element[]) => void
}

describe('LandingContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    intersectionCallback = null
    intervalCallback = null
    resizeListener = null
    removeResizeListenerMock = jest.fn()

    jest.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      if (type === 'resize' && typeof listener === 'function') {
        resizeListener = listener as () => void
      }
      return originalAddEventListener.call(window, type, listener, options)
    }) as typeof window.addEventListener)
    jest.spyOn(window, 'removeEventListener').mockImplementation(((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
      if (type === 'resize') {
        removeResizeListenerMock?.(listener)
      }
      return originalRemoveEventListener.call(window, type, listener, options)
    }) as typeof window.removeEventListener)

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
      value: jest.fn().mockImplementation((callback) => {
        intersectionCallback = callback
        return {
          observe: observeMock,
          disconnect: disconnectMock,
          unobserve: jest.fn(),
        }
      }),
    })

    Element.prototype.scrollIntoView = scrollIntoViewMock
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia })
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: originalIntersectionObserver })
    Element.prototype.scrollIntoView = originalScrollIntoView
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: originalScrollY })
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth })
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

  it('configura animaciones GSAP de landing cuando el usuario permite movimiento', () => {
    render(<LandingContent />)
    ;(gsap.utils.toArray as jest.Mock).mockImplementation((selector: string) => Array.from(document.querySelectorAll(selector)))
    ;(gsap.matchMedia as jest.Mock).mockReturnValue({ add: jest.fn((_, callback) => callback()) })

    const animationCallback = (useGSAP as jest.Mock).mock.calls[0][0] as () => void
    act(() => {
      animationCallback()
    })

    expect(gsap.timeline).toHaveBeenCalledWith({ defaults: { ease: 'power4.out' } })
    expect(gsap.to).toHaveBeenCalledWith(expect.any(Element), expect.objectContaining({ repeat: -1, yoyo: true }))
    expect(gsap.fromTo).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ y: 40, opacity: 0, scale: 0.7 }),
      expect.objectContaining({ scrollTrigger: expect.objectContaining({ start: 'top 85%' }) }),
    )
    expect(ScrollTrigger.batch).toHaveBeenCalledWith('[data-stagger-card]', expect.objectContaining({ start: 'top 88%' }))

    const batchElement = document.querySelector('[data-stagger-card]') as Element
    const batchOptions = (ScrollTrigger.batch as jest.Mock).mock.calls[0][1] as BatchOptions
    batchOptions.onEnter([batchElement])
    expect(gsap.to).toHaveBeenLastCalledWith(
      [batchElement],
      expect.objectContaining({ y: 0, opacity: 1, scale: 1, overwrite: true }),
    )

    batchOptions.onLeaveBack([batchElement])
    expect(gsap.to).toHaveBeenLastCalledWith(
      [batchElement],
      expect.objectContaining({ y: 50, opacity: 0, scale: 0.92, overwrite: true }),
    )
  })

  it('omite animaciones GSAP si el usuario prefiere movimiento reducido', () => {
    ;(window.matchMedia as jest.Mock).mockReturnValue({ matches: true })
    render(<LandingContent />)

    const animationCallback = (useGSAP as jest.Mock).mock.calls[0][0] as () => void
    act(() => {
      animationCallback()
    })

    expect(gsap.timeline).not.toHaveBeenCalled()
    expect(ScrollTrigger.batch).not.toHaveBeenCalled()
  })

  it('abre y cierra el menú mobile', () => {
    render(<LandingContent />)

    const openButton = screen.getByRole('button', { name: /abrir menú/i })
    fireEvent.click(openButton)

    const mobileNav = screen.getAllByRole('button', { name: 'Tutoriales' })
    expect(mobileNav).toHaveLength(2)
    expect(screen.getByRole('button', { name: /cerrar menú/i })).toBeInTheDocument()
  })

  it('navega desde el menú mobile y lo cierra al elegir sección', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir menú/i }))
    const tutorialButtons = screen.getAllByRole('button', { name: 'Tutoriales' })
    fireEvent.click(tutorialButtons[1])

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })
    expect(screen.getByRole('button', { name: /abrir menú/i })).toBeInTheDocument()
  })

  it('actualiza estado de scroll spy al desplazarse', () => {
    render(<LandingContent />)
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 1000 })
    const sectionOffsets: Record<string, number> = {
      inicio: 0,
      nosotros: 450,
      servicios: 900,
      'como-jugar': 1300,
      tutoriales: 1700,
      faq: 2100,
      ubicacion: 2500,
    }
    for (const [id, offsetTop] of Object.entries(sectionOffsets)) {
      Object.defineProperty(document.getElementById(id)!, 'offsetTop', { configurable: true, value: offsetTop })
    }

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getAllByRole('button', { name: 'Servicios' })[0]).toHaveClass('text-brand-gold')
  })

  it('navega al hacer click en el hint del hero', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /disponible como app/i }))

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('navega al inicio desde el botón de marca', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /primera riverada los 4 ases/i }))

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
    const photoTrack = photoCarouselSection?.querySelector('.flex.transition-transform') as HTMLElement
    expect(photoCarouselSection).toBeTruthy()
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^nuestro establecimiento$/i, level: 3 })).toBeInTheDocument()

    fireEvent.click(within(photoCarouselSection as HTMLElement).getAllByRole('button', { name: /siguiente/i })[0])
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^mesas de juego$/i, level: 3 })).toBeInTheDocument()
    expect(photoTrack.style.transform).toBe('translateX(-100%)')

    fireEvent.click(within(photoCarouselSection as HTMLElement).getByRole('button', { name: /anterior/i }))
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^nuestro establecimiento$/i, level: 3 })).toBeInTheDocument()

    fireEvent.click(within(photoCarouselSection as HTMLElement).getByRole('button', { name: /ir a slide 4/i }))
    expect(within(photoCarouselSection as HTMLElement).getByRole('heading', { name: /^eventos especiales$/i, level: 3 })).toBeInTheDocument()
  })

  it('avanza automáticamente el carrusel de fotos y pausa con hover', () => {
    render(<LandingContent />)

    const photoCarouselSection = screen.getByRole('heading', { name: /nuestro espacio/i, level: 2 }).closest('section') as HTMLElement
    const carousel = photoCarouselSection.querySelector('.relative.overflow-hidden') as Element

    act(() => {
      intervalCallback?.()
    })
    expect(within(photoCarouselSection).getByRole('heading', { name: /^mesas de juego$/i, level: 3 })).toBeInTheDocument()

    fireEvent.mouseEnter(carousel)
    expect(clearIntervalMock).toHaveBeenCalled()

    fireEvent.mouseLeave(carousel)
    expect(window.setInterval).toHaveBeenCalled()
  })

  it('permite navegar el carrusel de fotos con gestos táctiles', () => {
    render(<LandingContent />)

    const photoCarouselSection = screen.getByRole('heading', { name: /nuestro espacio/i, level: 2 }).closest('section') as HTMLElement
    const carousel = photoCarouselSection.querySelector('.relative.overflow-hidden') as Element

    fireEvent.touchStart(carousel, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 20 }] })
    expect(within(photoCarouselSection).getByRole('heading', { name: /^mesas de juego$/i, level: 3 })).toBeInTheDocument()

    fireEvent.touchStart(carousel, { touches: [{ clientX: 20 }] })
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 200 }] })
    expect(within(photoCarouselSection).getByRole('heading', { name: /^nuestro establecimiento$/i, level: 3 })).toBeInTheDocument()
  })

  it('ignora gestos táctiles cortos en el carrusel de fotos', () => {
    render(<LandingContent />)

    const photoCarouselSection = screen.getByRole('heading', { name: /nuestro espacio/i, level: 2 }).closest('section') as HTMLElement
    const carousel = photoCarouselSection.querySelector('.relative.overflow-hidden') as Element

    fireEvent.touchStart(carousel, { touches: [{ clientX: 120 }] })
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 90 }] })

    expect(within(photoCarouselSection).getByRole('heading', { name: /^nuestro establecimiento$/i, level: 3 })).toBeInTheDocument()
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

  it('navega carrusel de tutoriales y cierra tutorial al tocar backdrop', async () => {
    render(<LandingContent />)

    const tutorialsSection = screen.getByRole('heading', { name: /cómo usar la plataforma/i, level: 2 }).closest('section') as HTMLElement
    fireEvent.click(within(tutorialsSection).getByRole('button', { name: /siguiente/i }))
    fireEvent.click(within(tutorialsSection).getByRole('button', { name: /anterior/i }))

    const tutorialTrackViewport = tutorialsSection.querySelector('.overflow-hidden.flex-1') as Element
    fireEvent.touchStart(tutorialTrackViewport, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(tutorialTrackViewport, { changedTouches: [{ clientX: 20 }] })

    fireEvent.click(within(tutorialsSection).getByText(/cómo registrarte/i))
    const overlay = await screen.findByTestId('tutorial-walkthrough-dynamic')
    fireEvent.click(overlay.closest('.fixed')!)

    expect(screen.queryByTestId('tutorial-walkthrough-dynamic')).not.toBeInTheDocument()
  })

  it('actualiza carrusel de tutoriales ante resize e ignora touchend sin inicio', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 })
    const { unmount } = render(<LandingContent />)

    const tutorialsSection = screen.getByRole('heading', { name: /cómo usar la plataforma/i, level: 2 }).closest('section') as HTMLElement
    const tutorialTrackViewport = tutorialsSection.querySelector('.overflow-hidden.flex-1') as Element

    expect(within(tutorialsSection).getByText('1 / 5')).toBeInTheDocument()

    fireEvent.touchEnd(tutorialTrackViewport, { changedTouches: [{ clientX: 20 }] })
    expect(within(tutorialsSection).getByText('1 / 5')).toBeInTheDocument()

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    act(() => {
      resizeListener?.()
    })
    expect(within(tutorialsSection).getByText('1 / 9')).toBeInTheDocument()

    unmount()
    expect(removeResizeListenerMock).toHaveBeenCalledWith(expect.any(Function))
  })

  it('mantiene abierto el tutorial al hacer click dentro del contenido del modal', async () => {
    render(<LandingContent />)

    const tutorialsSection = screen.getByRole('heading', { name: /cómo usar la plataforma/i, level: 2 }).closest('section') as HTMLElement
    fireEvent.click(within(tutorialsSection).getByText(/cómo instalar la app/i))

    const tutorial = await screen.findByTestId('tutorial-walkthrough-dynamic')
    fireEvent.click(tutorial)

    expect(screen.getByTestId('tutorial-walkthrough-dynamic')).toBeInTheDocument()
  })

  it('permite volver en el carrusel de tutoriales con gesto táctil hacia la derecha', () => {
    render(<LandingContent />)

    const tutorialsSection = screen.getByRole('heading', { name: /cómo usar la plataforma/i, level: 2 }).closest('section') as HTMLElement
    const tutorialTrackViewport = tutorialsSection.querySelector('.overflow-hidden.flex-1') as Element

    fireEvent.touchStart(tutorialTrackViewport, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(tutorialTrackViewport, { changedTouches: [{ clientX: 20 }] })
    fireEvent.touchStart(tutorialTrackViewport, { touches: [{ clientX: 20 }] })
    fireEvent.touchEnd(tutorialTrackViewport, { changedTouches: [{ clientX: 200 }] })

    expect(within(tutorialsSection).getByText('1 / 5')).toBeInTheDocument()
  })

  it('muestra el mapa dinámico cuando el placeholder intersecta', () => {
    render(<LandingContent />)

    expect(screen.getByText(/cargando mapa/i)).toBeInTheDocument()
    act(() => {
      intersectionCallback?.([{ isIntersecting: true }])
    })

    expect(screen.getByTestId('location-map-dynamic')).toBeInTheDocument()
    expect(disconnectMock).toHaveBeenCalled()
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
    expect(screen.getByRole('link', { name: /desarrollado por gnesis\.group/i })).toHaveAttribute('href', 'https://gnesis.group')
    expect(screen.getByAltText('Gnesis.group')).toBeInTheDocument()
  })

  const remainingTutorials = [
    'Cómo iniciar sesión',
    'Cómo cargar saldo',
    'Cómo retirar saldo',
    'Cómo transferir saldo',
    'Cómo jugar tu primera partida',
    'Funciones del menú de mesa',
    'Amigos',
  ]

  remainingTutorials.forEach((title) => {
    it(`carga dinámicamente los pasos del tutorial "${title}"`, async () => {
      render(<LandingContent />)

      const tutorialsSection = screen.getByRole('heading', { name: /cómo usar la plataforma/i, level: 2 }).closest('section') as HTMLElement
      fireEvent.click(within(tutorialsSection).getByText(title))

      expect(await screen.findByTestId('tutorial-walkthrough-dynamic')).toBeInTheDocument()
    })
  })

  it('navega al hacer click en botón de sección del nav desktop', () => {
    render(<LandingContent />)

    const nav = screen.getByRole('button', { name: /abrir menú/i }).closest('nav')!
    const desktopButtons = within(nav).getAllByRole('button', { name: 'Nosotros' })
    fireEvent.click(desktopButtons[0])

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('cierra el menú mobile al hacer click en "Iniciar sesión"', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir menú/i }))
    const nav = screen.getByRole('button', { name: /cerrar menú/i }).closest('nav')!
    const loginLinks = within(nav).getAllByRole('link', { name: /^iniciar sesión$/i })
    fireEvent.click(loginLinks[1])

    expect(screen.getByRole('button', { name: /abrir menú/i })).toBeInTheDocument()
  })

  it('cierra el menú mobile al hacer click en "Crear cuenta"', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir menú/i }))
    const nav = screen.getByRole('button', { name: /cerrar menú/i }).closest('nav')!
    const registerLinks = within(nav).getAllByRole('link', { name: /crear cuenta/i })
    fireEvent.click(registerLinks[1])

    expect(screen.getByRole('button', { name: /abrir menú/i })).toBeInTheDocument()
  })

  it('ignora touchEnd en el carrusel de fotos sin touchStart previo', () => {
    render(<LandingContent />)

    const photoCarouselSection = screen.getByRole('heading', { name: /nuestro espacio/i, level: 2 }).closest('section') as HTMLElement
    const carousel = photoCarouselSection.querySelector('.relative.overflow-hidden') as Element

    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 20 }] })

    expect(within(photoCarouselSection).getByRole('heading', { name: /^nuestro establecimiento$/i, level: 3 })).toBeInTheDocument()
  })
})
