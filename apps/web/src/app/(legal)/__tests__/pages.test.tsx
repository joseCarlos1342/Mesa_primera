import { render, screen } from '@testing-library/react'
import PrivacyPage, { metadata as privacyMetadata } from '../privacy/page'
import TermsPage, { metadata as termsMetadata } from '../terms/page'
import LegalLayout from '../layout'

describe('legal layout', () => {
  it('envuelve el contenido con PageNav, main accesible y LandingFooter', () => {
    render(
      <LegalLayout>
        <p>Contenido legal</p>
      </LegalLayout>,
    )

    // PageNav aporta la barra pública (nav "Principal").
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    // El contenido va dentro del landmark principal.
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'contenido-principal')
    expect(main).toHaveTextContent('Contenido legal')
    // LandingFooter cierra la página.
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})

describe('legal pages', () => {
  it('renderiza privacidad con metadata canonica y secciones de datos', () => {
    render(<PrivacyPage />)

    expect(privacyMetadata.title).toBe('Política de Privacidad')
    expect(screen.getByRole('heading', { name: 'Política de Privacidad' })).toBeInTheDocument()
    expect(screen.getAllByText(/primera riverada los 4 ases/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /información que recopilamos/i })).toBeInTheDocument()
    expect(screen.getByText(/número de celular \(\+57\)/i)).toBeInTheDocument()
  })

  it('renderiza terminos con reglas de elegibilidad y billetera', () => {
    render(<TermsPage />)

    expect(termsMetadata.title).toBe('Términos y Condiciones')
    expect(screen.getByRole('heading', { name: 'Términos y Condiciones' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /elegibilidad y registro/i })).toBeInTheDocument()
    expect(screen.getByText(/mayor de 18 años/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /billetera/i })).toBeInTheDocument()
  })
})
