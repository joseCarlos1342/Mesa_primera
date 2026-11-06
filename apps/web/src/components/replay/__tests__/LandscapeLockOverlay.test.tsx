import { act, render, screen } from '@testing-library/react'
import { LandscapeLockOverlay } from '../LandscapeLockOverlay'

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

describe('LandscapeLockOverlay', () => {
  const originalWidth = window.innerWidth
  const originalHeight = window.innerHeight

  afterEach(() => {
    setViewport(originalWidth, originalHeight)
  })

  it('no muestra nada en un viewport ancho (escritorio)', () => {
    setViewport(1440, 900)
    render(<LandscapeLockOverlay />)
    expect(screen.queryByTestId('replay-landscape-lock')).not.toBeInTheDocument()
  })

  it('no muestra nada en móvil horizontal', () => {
    // Lado corto 400 (móvil) pero en horizontal (ancho > alto) → oculto.
    setViewport(800, 400)
    render(<LandscapeLockOverlay />)
    expect(screen.queryByTestId('replay-landscape-lock')).not.toBeInTheDocument()
  })

  it('muestra el aviso "Gira tu teléfono" en móvil vertical', () => {
    // Lado corto 400 (móvil) y vertical (alto > ancho) → visible.
    setViewport(400, 800)
    render(<LandscapeLockOverlay />)
    const overlay = screen.getByTestId('replay-landscape-lock')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute('role', 'dialog')
    expect(screen.getByRole('heading', { name: 'Gira tu teléfono' })).toBeInTheDocument()
  })

  it('reacciona a cambios de orientación vía el evento resize', () => {
    setViewport(800, 400)
    render(<LandscapeLockOverlay />)
    expect(screen.queryByTestId('replay-landscape-lock')).not.toBeInTheDocument()

    act(() => {
      setViewport(400, 800)
      window.dispatchEvent(new Event('resize'))
    })
    expect(screen.getByTestId('replay-landscape-lock')).toBeInTheDocument()

    act(() => {
      setViewport(800, 400)
      window.dispatchEvent(new Event('orientationchange'))
    })
    expect(screen.queryByTestId('replay-landscape-lock')).not.toBeInTheDocument()
  })
})
