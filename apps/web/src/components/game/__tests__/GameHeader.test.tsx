import { fireEvent, render, screen } from '@testing-library/react'
import { GameHeader } from '../game-header'
import { useFullscreen } from '@/hooks/useFullscreen'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/hooks/useFullscreen', () => ({
  useFullscreen: jest.fn(),
}))

const mockUseFullscreen = useFullscreen as jest.MockedFunction<typeof useFullscreen>

describe('GameHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      isSupported: true,
      toggle: jest.fn(),
    })
  })

  it('abre el menu y dispara eventos de acciones principales', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    render(<GameHeader />)

    fireEvent.click(screen.getAllByRole('button')[0])

    expect(screen.getByText('Opciones de Mesa')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Audio de Jugadores'))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-player-audio-modal' }))

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getByText('Reglas del Juego'))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-rules-modal' }))

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getByText('Llamar al Admin'))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-table-help' }))

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getByText('Transferir Saldo'))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-transfer-modal' }))
  })

  it('dispara recarga desde el boton derecho', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    render(<GameHeader />)

    fireEvent.click(screen.getAllByRole('button')[1])

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-recharge-modal' }))
  })

  it('muestra fullscreen si esta soportado y llama toggle', () => {
    const toggle = jest.fn()
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      isSupported: true,
      toggle,
    })
    render(<GameHeader />)

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getByText('Pantalla Completa'))

    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('cambia copy cuando ya esta en pantalla completa y oculta opcion si no hay soporte', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: true,
      isSupported: true,
      toggle: jest.fn(),
    })
    const { rerender } = render(<GameHeader />)

    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('Salir Pantalla Completa')).toBeInTheDocument()

    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      isSupported: false,
      toggle: jest.fn(),
    })
    rerender(<GameHeader />)

    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.queryByText('Pantalla Completa')).not.toBeInTheDocument()
  })

  it('confirma salida y ejecuta onMenuClick solo al aceptar', () => {
    const onMenuClick = jest.fn()
    render(<GameHeader onMenuClick={onMenuClick} />)

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getByText('Abandonar Partida'))

    expect(screen.getByText('¿Abandonar Mesa?')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancelar'))
    expect(onMenuClick).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getByText('Abandonar Partida'))
    fireEvent.click(screen.getByText('Sí, Salir'))

    expect(onMenuClick).toHaveBeenCalledTimes(1)
  })

  it('cierra el menu al hacer click fuera', () => {
    render(<GameHeader />)

    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('Opciones de Mesa')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByText('Opciones de Mesa')).not.toBeInTheDocument()
  })
})
