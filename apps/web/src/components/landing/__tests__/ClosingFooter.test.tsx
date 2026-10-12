import { render, screen, within } from '@testing-library/react'

import { LandingFooter } from '../sections/ClosingFooter'

describe('LandingFooter (responsive)', () => {
  beforeEach(() => render(<LandingFooter address="Cra. 7 #06-87, Neiva, Huila" />))

  it('los enlaces pueden partirse en líneas y van en una columna en móvil', () => {
    const nav = screen.getByRole('navigation', { name: /enlaces del sitio/i })
    expect(nav).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-1')
    for (const link of within(nav).getAllByRole('link')) {
      expect(link).not.toHaveClass('whitespace-nowrap')
      expect(link).toHaveClass('min-w-0')
    }
    expect(within(nav).getByRole('link', { name: /términos y condiciones/i })).toHaveAttribute('href', '/terms')
  })

  it('centra los iconos de redes en móvil y los alinea a la izquierda en escritorio', () => {
    expect(screen.getByRole('list', { name: /redes sociales/i })).toHaveClass('justify-center', 'md:justify-start')
  })
})
