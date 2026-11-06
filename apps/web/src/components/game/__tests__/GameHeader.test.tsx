import { fireEvent, render, screen } from '@testing-library/react'
import { GameHeader } from '../game-header'
import { useFullscreen } from '@/hooks/useFullscreen'

jest.mock('@/hooks/useFullscreen', () => ({
  useFullscreen: jest.fn(),
}))

const mockUseFullscreen = useFullscreen as jest.MockedFunction<typeof useFullscreen>

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Opciones de la mesa' }))

describe('GameHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      isSupported: true,
      toggle: jest.fn(),
    })
  })

  it('abre el menú (role=menu) y dispara eventos de las acciones principales', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    render(<GameHeader />)

    openMenu()
    expect(screen.getByRole('menu', { name: 'Opciones de la mesa' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Audio de jugadores' }))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-player-audio-modal' }))

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reglas del juego' }))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-rules-modal' }))

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Llamar al admin' }))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-table-help' }))

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Transferir saldo' }))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-transfer-modal' }))

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cargar saldo' }))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-recharge-modal' }))
  })

  it('el botón del carrito (aria-label "Cargar saldo") emite open-recharge-modal', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    render(<GameHeader />)

    // El botón del carrito está siempre visible en la cabecera (no en el menú).
    fireEvent.click(screen.getByRole('button', { name: 'Cargar saldo' }))

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-recharge-modal' }))
  })

  it('alterna el label del botón de opciones al abrir y cerrar', () => {
    render(<GameHeader />)

    openMenu()
    expect(screen.getByRole('button', { name: 'Cerrar opciones de la mesa' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar opciones de la mesa' }))
    expect(screen.getByRole('button', { name: 'Opciones de la mesa' })).toBeInTheDocument()
  })

  it('muestra pantalla completa si está soportada y llama toggle', () => {
    const toggle = jest.fn()
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      isSupported: true,
      toggle,
    })
    render(<GameHeader />)

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pantalla completa' }))

    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('cambia el copy en pantalla completa y oculta la opción si no hay soporte', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: true,
      isSupported: true,
      toggle: jest.fn(),
    })
    const { rerender } = render(<GameHeader />)

    openMenu()
    expect(screen.getByRole('menuitem', { name: 'Salir de pantalla completa' })).toBeInTheDocument()

    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      isSupported: false,
      toggle: jest.fn(),
    })
    rerender(<GameHeader />)

    // Cierra el menú abierto (click fuera) y vuelve a abrir.
    fireEvent.mouseDown(document.body)
    openMenu()
    expect(screen.queryByRole('menuitem', { name: 'Pantalla completa' })).not.toBeInTheDocument()
  })

  it('abre ConfirmDialog al abandonar y ejecuta onMenuClick solo al aceptar', () => {
    const onMenuClick = jest.fn()
    render(<GameHeader onMenuClick={onMenuClick} />)

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abandonar partida' }))

    expect(screen.getByText('¿Abandonar la mesa?')).toBeInTheDocument()

    // Cancelar no debe abandonar (botón de pie del diálogo, sin aria-label).
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' })
    const footerCancel = cancelButtons.find((b) => b.getAttribute('aria-label') === null) ?? cancelButtons[0]
    fireEvent.click(footerCancel)
    expect(onMenuClick).not.toHaveBeenCalled()

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abandonar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, salir' }))

    expect(onMenuClick).toHaveBeenCalledTimes(1)
  })

  it('cierra el menú al hacer click fuera', () => {
    render(<GameHeader />)

    openMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('cierra el menú con la tecla Escape', () => {
    render(<GameHeader />)

    openMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
