import { fireEvent, render, screen } from '@testing-library/react'

import { RulesModal } from '../RulesModal'

// next/image se renderiza como <img> en jsdom; lo simplificamos para evitar
// warnings de props no-DOM y centrar los asserts en el contenido del reglamento.
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => {
    return <img src={src} alt={alt} />
  },
}))

describe('RulesModal', () => {
  it('no renderiza cuando está cerrado', () => {
    render(<RulesModal isOpen={false} onClose={jest.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra el título, todas las secciones y las cartas de la jerarquía', () => {
    render(<RulesModal isOpen onClose={jest.fn()} />)

    expect(screen.getByRole('heading', { name: 'Reglamento de Primera' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Las fases del juego' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jerarquía de manos, de mayor a menor' })).toBeInTheDocument()
    expect(screen.getByText('Valores de las cartas')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reglas de desconexión' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Carta del fondo' })).toBeInTheDocument()

    expect(screen.getByText(/60 segundos/i)).toBeInTheDocument()

    // Las cartas (PlayingCard → next/image) se marcan decorativas (alt vacío).
    const decorativeCards = screen.getAllByRole('presentation', { hidden: true })
    expect(decorativeCards.length).toBeGreaterThan(0)
  })

  it('expone el enlace al reglamento completo y cierra con "Entendido"', () => {
    const onClose = jest.fn()
    render(<RulesModal isOpen onClose={onClose} />)

    const link = screen.getByRole('link', { name: 'Reglamento completo' })
    expect(link).toHaveAttribute('href', '/rules')

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra desde el backdrop y el botón de cerrar', () => {
    const onClose = jest.fn()
    render(<RulesModal isOpen onClose={onClose} />)

    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
