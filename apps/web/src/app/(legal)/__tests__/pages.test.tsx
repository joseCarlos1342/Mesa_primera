import { render, screen } from '@testing-library/react'
import PrivacyPage, { metadata as privacyMetadata } from '../privacy/page'
import PublicRulesPage, { metadata as rulesMetadata } from '../rules/page'
import SecurityPolicyPage, { metadata as securityMetadata } from '../security-policy/page'
import TermsPage, { metadata as termsMetadata } from '../terms/page'

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

  it('renderiza politica de seguridad con security.txt y alcance', () => {
    render(<SecurityPolicyPage />)

    expect(securityMetadata.title).toContain('Política de Seguridad')
    expect(screen.getByRole('heading', { name: 'Política de Seguridad' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver security\.txt/i })).toHaveAttribute('href', '/.well-known/security.txt')
    expect(screen.getByRole('heading', { name: /alcance/i })).toBeInTheDocument()
    expect(screen.getByText(/sistema de billetera digital/i)).toBeInTheDocument()
  })

  it('renderiza reglas publicas con CTA de registro', () => {
    render(<PublicRulesPage />)

    expect(rulesMetadata.title).toContain('Reglas del Juego')
    expect(screen.getByRole('heading', { name: 'Reglamento Oficial' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reglas Básicas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Seguridad y Fair Play' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Apuestas y Saldo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /únete al club/i })).toHaveAttribute('href', '/register/player')
  })
})
