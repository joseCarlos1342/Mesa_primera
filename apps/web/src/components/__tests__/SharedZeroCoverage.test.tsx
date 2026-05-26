import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OrientationPortrait } from '../OrientationPortrait'
import { PresenceTracker } from '../PresenceTracker'
import { PwaLockScreen } from '../pwa-lock-screen'
import { FramerMotionProvider } from '../providers/FramerMotionProvider'
import { Toast } from '../ui/Toast'
import { usePresence } from '@/hooks/usePresence'

jest.mock('@/hooks/usePresence', () => ({
  usePresence: jest.fn(),
}))

jest.mock('framer-motion', () => ({
  domAnimation: { renderer: 'dom-animation' },
  LazyMotion: ({ children }: { children: React.ReactNode }) => <div data-testid="lazy-motion-provider">{children}</div>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

const mockUsePresence = usePresence as jest.MockedFunction<typeof usePresence>

describe('shared zero coverage components', () => {
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    document.body.style.overflow = ''
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })
  })

  it('desbloquea orientacion y sale de fullscreen en mobile', async () => {
    const unlock = jest.fn()
    const exitFullscreen = jest.fn().mockResolvedValue(undefined)

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    })
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { unlock },
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    })

    render(<OrientationPortrait />)

    expect(unlock).toHaveBeenCalledTimes(1)
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('ignora errores de orientacion y fullscreen sin mostrar UI', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14)',
    })
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { unlock: jest.fn(() => { throw new Error('unsupported') }) },
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })

    const { container } = render(<OrientationPortrait />)

    expect(container).toBeEmptyDOMElement()
  })

  it('bloquea scroll, desbloquea con exito y limpia al desmontar', async () => {
    const onUnlock = jest.fn().mockResolvedValue(true)
    const { unmount } = render(<PwaLockScreen onUnlock={onUnlock} />)

    expect(await screen.findByText('Mesa Primera')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: /desbloquear/i }))

    expect(await screen.findByText('Verificando...')).toBeInTheDocument()
    await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('button', { name: /desbloquear/i })).toBeEnabled())

    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('muestra error cuando el desbloqueo falla o rechaza', async () => {
    const onUnlock = jest.fn().mockResolvedValue(false)
    render(<PwaLockScreen onUnlock={onUnlock} />)

    fireEvent.click(await screen.findByRole('button', { name: /desbloquear/i }))

    expect(await screen.findByText('No se pudo verificar. Inténtalo de nuevo.')).toBeInTheDocument()
  })

  it('rastrea presencia con lista vacia compartida', () => {
    render(<PresenceTracker />)

    expect(mockUsePresence).toHaveBeenCalledWith([])
  })

  it('renderiza provider de framer motion con children', () => {
    render(
      <FramerMotionProvider>
        <span>Contenido animado</span>
      </FramerMotionProvider>,
    )

    expect(screen.getByTestId('lazy-motion-provider')).toContainElement(screen.getByText('Contenido animado'))
  })

  it('muestra toast y lo cierra automaticamente por duracion', () => {
    jest.useFakeTimers()
    const onClose = jest.fn()

    render(<Toast type="success" message="Operacion completada" onClose={onClose} duration={500} />)

    expect(screen.getByText('Operacion completada')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(499)
    })
    expect(onClose).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
