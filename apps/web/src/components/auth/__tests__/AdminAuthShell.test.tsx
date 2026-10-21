import { render, screen } from '@testing-library/react'
import { ShieldCheck } from 'lucide-react'
import { AdminAlert, AdminAuthShell, AdminButton, AdminField, adminInputClass } from '../AdminAuthShell'

describe('AdminAuthShell', () => {
  it('usa el mundo admin (gris + indigo) sin rastro del mundo player', () => {
    const { container } = render(
      <AdminAuthShell icon={ShieldCheck} title="Admin" description="Acceso del personal">
        <p>contenido</p>
      </AdminAuthShell>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByText('Acceso del personal')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('contenido')
    const html = container.innerHTML
    expect(html).toContain('bg-gray-900')
    expect(html).not.toMatch(/brand-gold|#0a2c20|#8b6b2e|data-card/)
  })

  it('renderiza sin descripción', () => {
    render(
      <AdminAuthShell icon={ShieldCheck} title="Solo título">
        <p>x</p>
      </AdminAuthShell>,
    )
    expect(screen.getByRole('heading', { name: 'Solo título' })).toBeInTheDocument()
  })
})

describe('Admin auth primitives', () => {
  it('AdminField asocia label, error y estado válido', () => {
    const { rerender } = render(<AdminField label="Correo" name="email" error="Correo inválido" />)
    const input = screen.getByLabelText('Correo')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Correo inválido')
    expect(input.className).toContain('border-red-400/70')

    rerender(<AdminField id="mail" label="Correo" name="email" valid className="font-mono" />)
    const valid = screen.getByLabelText('Correo')
    expect(valid).toHaveAttribute('id', 'mail')
    expect(valid.className).toContain('border-emerald-400/60')
    expect(valid.className).toContain('font-mono')
    expect(screen.getByTestId('field-valid')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('adminInputClass usa indigo en foco por defecto', () => {
    expect(adminInputClass()).toContain('focus:border-indigo-500')
  })

  it('AdminButton primario, secundario y pendiente', () => {
    const { rerender } = render(<AdminButton>Acceder</AdminButton>)
    const button = screen.getByRole('button', { name: 'Acceder' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toContain('bg-indigo-500')

    rerender(
      <AdminButton type="submit" variant="secondary" pending>
        Validando
      </AdminButton>,
    )
    const pending = screen.getByRole('button', { name: 'Validando' })
    expect(pending).toBeDisabled()
    expect(pending).toHaveAttribute('aria-busy', 'true')
    expect(pending.className).toContain('border-white/10')
  })

  it('AdminAlert distingue error y éxito', () => {
    render(
      <>
        <AdminAlert>Error</AdminAlert>
        <AdminAlert tone="success">Hecho</AdminAlert>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Error')
    expect(screen.getByRole('status')).toHaveTextContent('Hecho')
  })
})
