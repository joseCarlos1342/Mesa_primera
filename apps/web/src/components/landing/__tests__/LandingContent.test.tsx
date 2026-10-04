import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { LandingContent } from '../LandingContent'
import { ClubSection } from '../sections/ClubSection'
import { DeckBoard } from '../sections/DeckBoard'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
    >
      {children}
    </a>
  ),
}))

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: jest.fn((loader: unknown) => {
    const source = String(loader)
    if (source.includes('LocationMapInner')) {
      return function MockDynamicLocationMap() {
        return <div data-testid="location-map-dynamic">Mapa dinámico</div>
      }
    }
    return function MockDynamicTutorialWalkthrough(props: {
      onClose?: () => void
      video?: { src: string; poster: string; captions: string }
    }) {
      return (
        <div data-testid="tutorial-walkthrough-dynamic">
          <button type="button" onClick={props.onClose}>Cerrar tutorial</button>
          {props.video && (
            <span data-testid="tutorial-video-prop">
              {props.video.src}|{props.video.poster}|{props.video.captions}
            </span>
          )}
        </div>
      )
    }
  }),
}))

jest.mock('../tutorials/InstallAppTutorial', () => ({ installAppSteps: [{ label: 'Paso 1', screen: <div>Instalar app</div> }] }))
jest.mock('../tutorials/RegisterTutorial', () => ({ registerSteps: [{ label: 'Paso 1', screen: <div>Registro</div> }] }))
jest.mock('../tutorials/LoginTutorial', () => ({ loginSteps: [{ label: 'Paso 1', screen: <div>Login</div> }] }))
jest.mock('../tutorials/WalletTutorial', () => ({ walletSteps: [{ label: 'Paso 1', screen: <div>Wallet</div> }] }))
jest.mock('../tutorials/WithdrawTutorial', () => ({ withdrawSteps: [{ label: 'Paso 1', screen: <div>Retiro</div> }] }))
jest.mock('../tutorials/TransferTutorial', () => ({ transferSteps: [{ label: 'Paso 1', screen: <div>Transferencia</div> }] }))
jest.mock('../tutorials/FirstGameTutorial', () => ({ firstGameSteps: [{ label: 'Paso 1', screen: <div>Primera partida</div> }] }))
jest.mock('../tutorials/GameMenuTutorial', () => ({ gameMenuSteps: [{ label: 'Paso 1', screen: <div>Menu mesa</div> }] }))
jest.mock('../tutorials/FriendsTutorial', () => ({ friendsSteps: [{ label: 'Paso 1', screen: <div>Amigos</div> }] }))

type ObserverEntry = { isIntersecting: boolean; target?: Element }
interface MockObserver {
  callback: (entries: ObserverEntry[]) => void
  targets: Element[]
  disconnect: jest.Mock
}

const originalIntersectionObserver = window.IntersectionObserver
const originalScrollIntoView = Element.prototype.scrollIntoView
const originalScrollBy = Element.prototype.scrollBy
const scrollIntoViewMock = jest.fn()
const scrollByMock = jest.fn()
let observers: MockObserver[] = []

function boardObserver(): MockObserver {
  return observers.find((observer) => observer.targets.some((target) => target.hasAttribute('data-board-step')))!
}

function mapObserver(): MockObserver {
  return observers.find((observer) => !observer.targets.some((target) => target.hasAttribute('data-board-step')))!
}

function tutorialsSection(): HTMLElement {
  return screen.getByRole('heading', { name: /cómo usar la plataforma/i, level: 2 }).closest('section') as HTMLElement
}

describe('LandingContent', () => {
  beforeEach(() => {
    observers = []
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((callback) => {
        const observer: MockObserver = { callback, targets: [], disconnect: jest.fn() }
        observers.push(observer)
        return {
          observe: (target: Element) => observer.targets.push(target),
          disconnect: observer.disconnect,
          unobserve: jest.fn(),
        }
      }),
    })
    Element.prototype.scrollIntoView = scrollIntoViewMock
    Element.prototype.scrollBy = scrollByMock
  })

  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, configurable: true, value: originalIntersectionObserver })
    Element.prototype.scrollIntoView = originalScrollIntoView
    Element.prototype.scrollBy = originalScrollBy
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 })
    document.body.style.overflow = ''
  })

  it('renderiza la marca, los CTAs de registro y el tablero de 28 cartas', () => {
    render(<LandingContent />)

    expect(screen.getByRole('heading', { name: /primera riverada/i, level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /crear cuenta gratis/i })[0]).toHaveAttribute('href', '/register/player')
    expect(screen.getAllByRole('link', { name: /^iniciar sesión$/i })[0]).toHaveAttribute('href', '/login/player')

    const board = screen.getByRole('figure', { name: /baraja española de 28 cartas/i })
    expect(board).toHaveAttribute('data-step', 'deal')
    expect(board.querySelectorAll('[data-card]')).toHaveLength(28)
    expect(within(board).getByText('Baraja completa repartida sobre la mesa.')).toBeInTheDocument()
  })

  it('pinta el fondo del documento y lo restaura al desmontar', () => {
    document.body.style.backgroundColor = 'red'
    const { unmount } = render(<LandingContent />)
    expect(document.body.style.backgroundColor).toBe('rgb(10, 10, 10)')

    unmount()
    expect(document.body.style.backgroundColor).toBe('red')
  })

  it('enseña la jerarquía oficial en orden con sus cartas', () => {
    render(<LandingContent />)

    const section = screen.getByRole('heading', { name: /cómo se gana/i, level: 2 }).closest('section') as HTMLElement
    const titles = within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(titles).toEqual(['Segunda', 'Chivo', 'Primera', 'Puntos'])
    expect(within(section).getByRole('img', { name: 'As de Copas' })).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: /lee el reglamento completo/i })).toHaveAttribute('href', '/rules')
  })

  it('ilumina en el tablero la mano que cruza el centro de la pantalla', () => {
    render(<LandingContent />)

    const board = screen.getByRole('figure', { name: /baraja española/i })
    const observer = boardObserver()
    const chivo = observer.targets.find((target) => target.getAttribute('data-board-step') === 'chivo')!

    act(() => {
      observer.callback([
        { isIntersecting: false, target: observer.targets[0] },
        { isIntersecting: true, target: chivo },
      ])
    })

    expect(board).toHaveAttribute('data-step', 'chivo')
    const lit = Array.from(board.querySelectorAll('[data-lit="true"][data-card]')).map((el) => el.getAttribute('data-card'))
    expect(lit.sort()).toEqual(['1-oros', '3-bastos', '6-oros', '7-oros'])
    expect(within(board).getByText(/ejemplo de chivo/i)).toBeInTheDocument()
  })

  it('desconecta el observador del tablero al desmontar', () => {
    const { unmount } = render(<LandingContent />)
    const observer = boardObserver()

    unmount()
    expect(observer.disconnect).toHaveBeenCalled()
  })

  it('no falla si el navegador no tiene IntersectionObserver', () => {
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, configurable: true, value: undefined })

    render(<DeckBoard onInstallHint={jest.fn()} />)
    expect(screen.getByRole('figure', { name: /baraja española/i })).toHaveAttribute('data-step', 'deal')
  })

  it('lleva al tutorial de instalación desde el aviso de app', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getAllByRole('button', { name: /disponible como app/i })[0])
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('abre, navega y cierra el menú móvil', () => {
    render(<LandingContent />)

    const toggle = screen.getByRole('button', { name: /abrir menú/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: /cerrar menú/i })).toHaveAttribute('aria-expanded', 'true')

    const mobileMenu = document.getElementById('menu-movil') as HTMLElement
    fireEvent.click(within(mobileMenu).getByRole('button', { name: 'Tutoriales' }))
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })
    expect(document.getElementById('menu-movil')).toBeNull()
  })

  it('cierra el menú móvil con Escape y al elegir iniciar sesión', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir menú/i }))
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(document.getElementById('menu-movil')).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.getElementById('menu-movil')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /abrir menú/i }))
    fireEvent.click(within(document.getElementById('menu-movil') as HTMLElement).getByRole('link', { name: /iniciar sesión/i }))
    expect(document.getElementById('menu-movil')).toBeNull()
  })

  it('navega al inicio desde la marca y a una sección desde el nav de escritorio', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /primera riverada los 4 ases/i }))
    fireEvent.click(screen.getAllByRole('button', { name: 'El club' })[0])
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2)
  })

  it('marca la sección activa al desplazarse', () => {
    render(<LandingContent />)
    const offsets: Record<string, number> = {
      inicio: 0,
      'como-se-gana': 800,
      empezar: 3000,
      club: 4000,
      tutoriales: 5000,
      faq: 6000,
      ubicacion: 7000,
    }
    for (const [id, offsetTop] of Object.entries(offsets)) {
      Object.defineProperty(document.getElementById(id)!, 'offsetTop', { configurable: true, value: offsetTop })
    }
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 4100 })

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getAllByRole('button', { name: 'El club' })[0]).toHaveAttribute('aria-current', 'true')
  })

  it('presenta los tres pasos y los enlaces de confianza', () => {
    render(<LandingContent />)

    expect(screen.getByRole('heading', { name: /en tres pasos, a la mesa/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /regístrate/i, level: 3 })).toBeInTheDocument()
    expect(screen.getByText(/recarga vía nequi/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /reglas oficiales/i })).toHaveAttribute('href', '/rules')
    expect(screen.getByRole('link', { name: /política de divulgación responsable/i })).toHaveAttribute('href', '/security-policy')
  })

  it('presenta el club, sus servicios y no muestra fotos inventadas', () => {
    render(<LandingContent />)

    const club = screen.getByRole('heading', { name: /el club en neiva/i, level: 2 }).closest('section') as HTMLElement
    expect(within(club).getByText(/juego de primera/i)).toBeInTheDocument()
    expect(within(club).getByText(/partidas de dominó/i)).toBeInTheDocument()
    expect(within(club).getByRole('link', { name: /cra\. 7 #06-87/i })).toHaveAttribute('href', '#ubicacion')
    expect(screen.queryByText(/foto próximamente/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('club-photos')).not.toBeInTheDocument()
  })

  it('muestra las fotos del club cuando existen', () => {
    render(
      <ClubSection
        address="Cra. 7 #06-87, Neiva, Huila"
        photos={[{ src: '/club/mesa.jpg', alt: 'Mesa de Primera del club', width: 1200, height: 800 }]}
      />,
    )

    expect(screen.getByTestId('club-photos')).toBeInTheDocument()
    expect(screen.getByAltText('Mesa de Primera del club')).toHaveAttribute('src', '/club/mesa.jpg')
  })

  it('muestra los tutoriales con sus pasos reales y desplaza el carril', () => {
    render(<LandingContent />)

    const section = tutorialsSection()
    expect(within(section).getAllByTestId('tutorial-card')).toHaveLength(9)
    expect(within(section).getAllByText('5 pasos')).toHaveLength(3)
    expect(within(section).getAllByText('4 pasos')).toHaveLength(5)
    expect(within(section).getByText('2 pasos')).toBeInTheDocument()
    expect(document.getElementById('instalar-app')).toHaveAttribute('aria-label', 'Abrir tutorial: Cómo instalar la app')

    fireEvent.click(within(section).getByRole('button', { name: /tutoriales siguientes/i }))
    fireEvent.click(within(section).getByRole('button', { name: /tutoriales anteriores/i }))
    expect(scrollByMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ behavior: 'smooth' }))
    expect(scrollByMock).toHaveBeenCalledTimes(2)
  })

  it('abre un tutorial, bloquea el scroll y lo cierra devolviendo el foco', async () => {
    render(<LandingContent />)

    const card = screen.getByRole('button', { name: /abrir tutorial: cómo instalar la app/i })
    card.focus()
    fireEvent.click(card)

    expect(screen.getByRole('status')).toHaveTextContent(/cargando tutorial/i)
    expect(await screen.findByTestId('tutorial-walkthrough-dynamic')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /cómo instalar la app/i })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByTestId('tutorial-walkthrough-dynamic'))
    expect(screen.getByTestId('tutorial-walkthrough-dynamic')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cerrar tutorial/i }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(card).toHaveFocus()
  })

  it('pasa video y subtítulos al tutorial de registro y cierra con Escape', async () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir tutorial: cómo registrarte/i }))
    expect(await screen.findByTestId('tutorial-video-prop')).toHaveTextContent(
      '/tutorials/register-tutorial.mp4|/tutorials/register-tutorial-poster.png|/tutorials/register-tutorial.vtt',
    )

    fireEvent.keyDown(document, { key: 'a' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cierra el tutorial al tocar el fondo', async () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir tutorial: amigos/i }))
    await screen.findByTestId('tutorial-walkthrough-dynamic')
    fireEvent.click(screen.getByRole('dialog'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mantiene el foco dentro del tutorial con Tab', async () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir tutorial: cómo iniciar sesión/i }))
    await screen.findByTestId('tutorial-walkthrough-dynamic')
    const dialog = screen.getByRole('dialog')
    const only = screen.getByRole('button', { name: /cerrar tutorial/i })

    fireEvent.keyDown(dialog, { key: 'ArrowDown' })
    only.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(only).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(only).toHaveFocus()

    dialog.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(dialog).toHaveFocus()
  })

  it('ignora Tab cuando el tutorial no tiene elementos enfocables', () => {
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir tutorial: cómo cargar saldo/i }))
    const dialog = screen.getByRole('dialog')
    expect(() => fireEvent.keyDown(dialog, { key: 'Tab' })).not.toThrow()
  })

  it('muestra un error recuperable si el tutorial no carga', async () => {
    const catalog = jest.requireActual('../tutorialCatalog') as typeof import('../tutorialCatalog')
    const definition = catalog.getTutorialDefinition('withdraw')
    const spy = jest.spyOn(definition, 'loader').mockRejectedValueOnce(new Error('offline'))
    render(<LandingContent />)

    fireEvent.click(screen.getByRole('button', { name: /abrir tutorial: cómo retirar saldo/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo cargar/i)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /volver a tutoriales/i }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    spy.mockRestore()
  })

  it('descarta la carga de un tutorial cerrado antes de terminar', async () => {
    const catalog = jest.requireActual('../tutorialCatalog') as typeof import('../tutorialCatalog')
    const definition = catalog.getTutorialDefinition('transfer')
    let resolveSteps: (steps: never[]) => void = () => undefined
    let rejectSteps: (error: Error) => void = () => undefined
    const spy = jest
      .spyOn(definition, 'loader')
      .mockReturnValueOnce(new Promise((resolve) => { resolveSteps = resolve }))
      .mockReturnValueOnce(new Promise((_, reject) => { rejectSteps = reject }))
    render(<LandingContent />)
    const card = screen.getByRole('button', { name: /abrir tutorial: cómo transferir saldo/i })

    fireEvent.click(card)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(card)
    fireEvent.keyDown(document, { key: 'Escape' })
    await act(async () => {
      resolveSteps([])
      rejectSteps(new Error('tarde'))
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    spy.mockRestore()
  })

  it('renderiza las preguntas frecuentes como acordeón con el texto en el DOM', () => {
    render(<LandingContent />)

    expect(screen.getByRole('heading', { name: /preguntas frecuentes/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /¿dónde queda primera riverada los 4 ases/i, level: 3 })).toBeInTheDocument()
    expect(screen.getByText(/valida tu número de celular/i)).toBeInTheDocument()
    expect(document.querySelectorAll('#faq details')).toHaveLength(4)
  })

  it('carga el mapa solo cuando su espacio entra en pantalla', () => {
    render(<LandingContent />)

    expect(screen.getByText(/cargando mapa/i)).toBeInTheDocument()
    const observer = mapObserver()
    act(() => observer.callback([{ isIntersecting: false }]))
    expect(screen.queryByTestId('location-map-dynamic')).not.toBeInTheDocument()

    act(() => observer.callback([{ isIntersecting: true }]))
    expect(screen.getByTestId('location-map-dynamic')).toBeInTheDocument()
    expect(observer.disconnect).toHaveBeenCalled()
  })

  it('renderiza ubicación y enlaces externos de Google Maps', () => {
    render(<LandingContent />)

    expect(screen.getByRole('heading', { name: /cómo llegarnos/i, level: 2 })).toBeInTheDocument()
    expect(screen.getAllByText(/cra\. 7 #06-87, neiva, huila/i).length).toBeGreaterThanOrEqual(3)
    expect(screen.getByRole('link', { name: /ver en google maps/i })).toHaveAttribute('href', expect.stringContaining('maps.google.com/maps?q='))
    expect(screen.getByRole('link', { name: /cómo llegar/i })).toHaveAttribute('href', expect.stringContaining('maps.google.com/maps/dir/'))
  })

  it('cierra con la invitación a la mesa y el footer completo', () => {
    render(<LandingContent />)

    const closing = screen.getByRole('heading', { name: /siéntate a la mesa/i, level: 2 }).closest('section') as HTMLElement
    expect(within(closing).getByRole('link', { name: /crear cuenta gratis/i })).toHaveAttribute('href', '/register/player')

    const footerNav = screen.getByRole('navigation', { name: /enlaces del sitio/i })
    expect(within(footerNav).getByRole('link', { name: /^iniciar sesión$/i })).toHaveAttribute('href', '/login/player')
    expect(within(footerNav).getByRole('link', { name: /crear cuenta/i })).toHaveAttribute('href', '/register/player')
    expect(within(footerNav).getByRole('link', { name: /política de privacidad/i })).toHaveAttribute('href', '/privacy')
    expect(within(footerNav).getByRole('link', { name: /términos y condiciones/i })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: /facebook de primera riverada/i })).toHaveAttribute('href', expect.stringContaining('facebook.com'))
    expect(screen.getByRole('link', { name: /instagram de primera riverada/i })).toHaveAttribute('href', expect.stringContaining('instagram.com'))
    expect(screen.getByRole('link', { name: /correo electrónico de contacto/i })).toHaveAttribute('href', expect.stringContaining('mailto:'))
    expect(screen.getByRole('link', { name: /desarrollado por gnesis\.group/i })).toHaveAttribute('href', 'https://gnesis.group')
    expect(screen.getByText(/también conocido como primera riverada dario/i)).toHaveClass('sr-only')
  })
})
