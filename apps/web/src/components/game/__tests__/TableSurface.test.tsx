import { render, screen } from '@testing-library/react'
import { TablePots, TableSurface, bottomCardSrc, getPotValueSizeClass } from '../TableSurface'

describe('TableSurface', () => {
  it('renderiza las capas de la mesa (madera, canto y fieltro)', () => {
    render(<TableSurface />)
    expect(screen.getByTestId('table-wood-base')).toBeInTheDocument()
    expect(screen.getByTestId('table-wood-rim')).toBeInTheDocument()
    expect(screen.getByTestId('table-felt-surface')).toBeInTheDocument()
  })
})

describe('getPotValueSizeClass', () => {
  it('usa el tamaño mayor para importes cortos', () => {
    // "$0" → pocos caracteres visibles.
    expect(getPotValueSizeClass(0)).toBe('text-[16px] md:text-[22px]')
  })

  it('reduce el tamaño para importes medianos (>=9 caracteres)', () => {
    // 1.000.000 → "$1.000.000" (10 dígitos con puntos) cae en el tramo medio.
    expect(getPotValueSizeClass(100_000_000)).toBe('text-[14px] md:text-[20px]')
  })

  it('usa el tamaño menor para importes muy largos (>=11 caracteres)', () => {
    expect(getPotValueSizeClass(10_000_000_000)).toBe('text-[12px] md:text-[18px]')
  })
})

describe('bottomCardSrc', () => {
  it('devuelve null cuando no hay carta', () => {
    expect(bottomCardSrc(null)).toBeNull()
    expect(bottomCardSrc(undefined)).toBeNull()
    expect(bottomCardSrc('')).toBeNull()
  })

  it('devuelve null cuando el formato no trae valor y palo', () => {
    expect(bottomCardSrc('7')).toBeNull()
    expect(bottomCardSrc('-O')).toBeNull()
  })

  it('normaliza el palo de una letra a nombre de archivo y rellena el valor', () => {
    expect(bottomCardSrc('7-O')).toBe('/cards/07-oros.webp?v=4')
    expect(bottomCardSrc('12-C')).toBe('/cards/12-copas.webp?v=4')
    expect(bottomCardSrc('1-E')).toBe('/cards/01-espadas.webp?v=4')
    expect(bottomCardSrc('3-B')).toBe('/cards/03-bastos.webp?v=4')
  })

  it('usa el palo en minúsculas cuando no está en el mapa de una letra', () => {
    expect(bottomCardSrc('7-oros')).toBe('/cards/07-oros.webp?v=4')
    expect(bottomCardSrc('7-Oros')).toBe('/cards/07-oros.webp?v=4')
  })
})

describe('TablePots', () => {
  it('muestra ambos pozos con los testid del tablero por defecto', () => {
    render(<TablePots pot={500_000} piquePot={100_000} />)
    const main = screen.getByTestId('pot-main')
    const pique = screen.getByTestId('pot-pique')
    expect(main).toHaveTextContent('Apuesta Principal')
    expect(main).toHaveTextContent('5.000')
    expect(pique).toHaveTextContent('Apuesta Pique')
    expect(pique).toHaveTextContent('1.000')
    expect(screen.getByTestId('center-cluster')).toBeInTheDocument()
  })

  it('aplica el prefijo de testid de la repetición', () => {
    render(<TablePots pot={0} piquePot={0} testIdPrefix="replay-" />)
    expect(screen.getByTestId('replay-pot-main')).toBeInTheDocument()
    expect(screen.getByTestId('replay-pot-pique')).toBeInTheDocument()
    expect(screen.getByTestId('replay-center-cluster')).toBeInTheDocument()
  })

  it('atenúa el pozo de pique cuando es cero y lo muestra pleno cuando es mayor', () => {
    const { rerender } = render(<TablePots pot={0} piquePot={0} />)
    expect(screen.getByTestId('pot-pique')).toHaveClass('opacity-55')

    rerender(<TablePots pot={0} piquePot={50_000} />)
    expect(screen.getByTestId('pot-pique')).toHaveClass('opacity-100')
  })

  it('no pinta la carta del fondo cuando no se provee', () => {
    render(<TablePots pot={0} piquePot={0} />)
    expect(screen.queryByTestId('bottom-card')).not.toBeInTheDocument()
  })

  it('pinta la carta del fondo cuando se provee una carta válida', () => {
    render(<TablePots pot={0} piquePot={0} bottomCard="7-O" />)
    const bottom = screen.getByTestId('bottom-card')
    expect(bottom.querySelector('img')).toHaveAttribute('src', '/cards/07-oros.webp?v=4')
  })

  it('usa el className por defecto y permite sobreescribirlo', () => {
    const { rerender } = render(<TablePots pot={0} piquePot={0} />)
    expect(screen.getByTestId('center-cluster')).toHaveClass('mb-12')

    rerender(<TablePots pot={0} piquePot={0} className="mb-[4%]" />)
    expect(screen.getByTestId('center-cluster')).toHaveClass('mb-[4%]')
    expect(screen.getByTestId('center-cluster')).not.toHaveClass('mb-12')
  })
})
