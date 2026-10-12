import fs from 'fs'
import path from 'path'
import { render, screen, within } from '@testing-library/react'

import SecurityPolicyPage, { metadata } from '../page'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority: _p, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

const securityTxt = fs.readFileSync(path.resolve(__dirname, '../../../../public/.well-known/security.txt'), 'utf-8')

describe('/security-policy', () => {
  it('mantiene la metadata pública y canónica', () => {
    expect(metadata.title).toContain('Divulgación Responsable')
    expect(metadata.alternates?.canonical).toBe('/security-policy')
    expect(metadata.robots).toEqual({ index: true, follow: true })
  })

  it('conserva el contenido de la política: alcance, reporte, tiempos, reglas y agradecimientos', () => {
    render(<SecurityPolicyPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Política de Divulgación Responsable' })).toBeInTheDocument()
    expect(screen.getByText(/última actualización: 15 de septiembre de 2026/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver security\.txt/i })).toHaveAttribute('href', '/.well-known/security.txt')

    const scope = screen.getByRole('heading', { level: 2, name: /alcance/i }).closest('section')!
    expect(within(scope).getByText('Billetera digital y transacciones')).toBeInTheDocument()
    expect(within(scope).getByText(/denegación de servicio/i)).toBeInTheDocument()
    expect(within(scope).getByText(/no pruebes contra cuentas reales ni operaciones con dinero real/i)).toBeInTheDocument()

    const report = screen.getByRole('heading', { level: 2, name: /cómo reportar una vulnerabilidad/i }).closest('section')!
    const emailLink = within(report).getByRole('link', { name: 'Escribir a seguridad@primerariveradalos4ases.com' })
    expect(emailLink).toHaveAttribute('href', 'mailto:seguridad@primerariveradalos4ases.com')
    expect(emailLink).toHaveTextContent('seguridad@primerariveradalos4ases.com')
    expect(within(report).getAllByRole('listitem')).toHaveLength(5)
    expect(within(report).getByText(/clave PGP pública/i)).toBeInTheDocument()

    const response = screen.getByRole('heading', { level: 2, name: /objetivos de respuesta/i }).closest('section')!
    expect(within(response).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      '48 horas',
      '7 días',
      '30 días',
      'Acordado',
    ])
    expect(within(response).getByText(/no iniciaremos acciones legales/i)).toBeInTheDocument()

    const rules = screen.getByRole('heading', { level: 2, name: /reglas de investigación/i }).closest('section')!
    expect(within(rules).getAllByRole('listitem')).toHaveLength(6)

    expect(screen.getByRole('heading', { level: 2, name: /agradecimientos/i })).toBeInTheDocument()
    expect(screen.getByText(/rfc 9116/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /reportar una vulnerabilidad/i })).toHaveAttribute(
      'href',
      'mailto:seguridad@primerariveradalos4ases.com',
    )
  })

  it('mantiene las anclas que publica security.txt', () => {
    const { container } = render(<SecurityPolicyPage />)
    const anchors = [...securityTxt.matchAll(/security-policy#([\w-]+)/g)].map((m) => m[1])
    expect(anchors).toEqual(['report', 'acknowledgements'])
    for (const id of anchors) expect(container.querySelector(`section#${id}`)).not.toBeNull()
  })

  it('no salta niveles de encabezado', () => {
    const { container } = render(<SecurityPolicyPage />)
    const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4')).map((h) => Number(h.tagName[1]))
    expect(levels[0]).toBe(1)
    levels.reduce((prev, level) => {
      expect(level - prev).toBeLessThanOrEqual(1)
      return level
    })
  })

  it('ya no vive dentro del layout legal (tarjeta angosta)', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../(legal)/security-policy/page.tsx'))).toBe(false)
  })
})
