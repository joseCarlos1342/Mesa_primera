import { fireEvent, render, screen } from '@testing-library/react'
import { AuthShell } from '../AuthShell'
import { AuthStepper, RECOVERY_STEPS, REGISTER_STEPS } from '../AuthStepper'
import {
  AuthAlert,
  AuthButton,
  AuthDivider,
  AuthField,
  AuthFooter,
  fieldToneClass,
  toneOf,
} from '../AuthForm'
import { PageNav } from '@/components/landing/PageNav'

describe('AuthShell', () => {
  it('compone nav, panel de paño con los 4 ases decorativos y un único h1', () => {
    const { container } = render(
      <AuthShell title="Inicia sesión" lead="Texto de apoyo" nav={{ href: '/register/player', label: 'Crear cuenta' }}>
        <p>formulario</p>
      </AuthShell>,
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Inicia sesión' })).toBeInTheDocument()
    expect(screen.getByText('Texto de apoyo')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('formulario')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register/player')

    const panel = screen.getByTestId('auth-panel')
    expect(panel).toHaveTextContent('Siéntate a la mesa')
    expect(panel).toHaveTextContent('Cra. 7 #06-87')
    const cards = container.querySelectorAll('[data-card]')
    expect(Array.from(cards).map((card) => card.getAttribute('data-card'))).toEqual([
      '1-oros',
      '1-copas',
      '1-espadas',
      '1-bastos',
    ])
    // Decorativas: el abanico entero queda fuera del árbol accesible.
    expect(cards[0].closest('[aria-hidden="true"]')).not.toBeNull()
    expect(container.querySelector('img[src*="dorso"]')).toBeNull()
  })

  it('reparte las cartas solo con deal y muestra el indicador de pasos', () => {
    const { container } = render(
      <AuthShell deal wide title="Crea tu cuenta" steps={{ labels: REGISTER_STEPS, current: 1 }} panelTitle="Tu lugar" panelText="Panel">
        <p>form</p>
      </AuthShell>,
    )

    expect(container.querySelectorAll('img[src*="dorso"]')).toHaveLength(4)
    expect(screen.getByText(/paso/i)).toHaveTextContent('Paso 1 de 4')
    expect(screen.getByTestId('auth-panel')).toHaveTextContent('Tu lugar')
    // Sin nav por defecto: los pasos intermedios no muestran la acción de la barra.
    expect(screen.queryByRole('link', { name: /crear cuenta|iniciar sesión/i })).not.toBeInTheDocument()
  })
})

describe('AuthStepper', () => {
  it('marca pasos hechos, actual y pendientes', () => {
    render(<AuthStepper labels={REGISTER_STEPS} current={3} />)

    expect(screen.getByRole('group', { name: 'Progreso' })).toHaveTextContent('Paso 3 de 4')
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.getAttribute('data-state'))).toEqual(['done', 'done', 'current', 'todo'])
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).toHaveTextContent('Tus datos (completado)')
  })

  it('limita el paso actual al rango del flujo', () => {
    const { rerender } = render(<AuthStepper labels={RECOVERY_STEPS} current={9} />)
    expect(screen.getByRole('group')).toHaveTextContent('Paso 3 de 3')

    rerender(<AuthStepper labels={RECOVERY_STEPS} current={0} />)
    expect(screen.getByRole('group')).toHaveTextContent('Paso 1 de 3')
  })
})

describe('AuthForm primitives', () => {
  it('AuthField asocia label, prefijo, ayuda y error', () => {
    const { rerender } = render(<AuthField label="Celular" name="phone" prefix="+57" mono hint="10 dígitos" />)

    const input = screen.getByLabelText('Celular')
    expect(input).toHaveAttribute('name', 'phone')
    expect(input.className).toContain('pl-16')
    expect(input.className).toContain('font-mono')
    expect(input).toHaveAccessibleDescription('10 dígitos')
    expect(screen.getByText('+57')).toHaveAttribute('aria-hidden', 'true')

    rerender(<AuthField label="Celular" name="phone" hint="10 dígitos" error="Número inválido" />)
    expect(screen.getByLabelText('Celular')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Celular')).toHaveAccessibleDescription('Número inválido')
    expect(screen.getByRole('alert')).toHaveTextContent('Número inválido')
    expect(screen.queryByText('10 dígitos')).not.toBeInTheDocument()

    rerender(<AuthField id="nick" label="Apodo" labelAside={<span>3/20</span>} valid />)
    expect(screen.getByLabelText('Apodo')).toHaveAttribute('id', 'nick')
    expect(screen.getByLabelText('Apodo').className).toContain('pl-4')
    expect(screen.getByLabelText('Apodo')).not.toHaveAttribute('aria-describedby')
    expect(screen.getByTestId('field-valid')).toBeInTheDocument()
    expect(screen.getByText('3/20')).toBeInTheDocument()
  })

  it('toneOf y fieldToneClass resuelven los tres estados', () => {
    expect(toneOf('x', true)).toBe('error')
    expect(toneOf(null, true)).toBe('valid')
    expect(toneOf(undefined, false)).toBe('default')
    expect(fieldToneClass('error')).toContain('#e74c3c')
    expect(fieldToneClass('valid')).toContain('#2ecc71')
    expect(fieldToneClass('default')).toContain('#8b6b2e')
  })

  it('AuthAlert usa alert para errores y status para avisos', () => {
    render(
      <>
        <AuthAlert>Falló</AuthAlert>
        <AuthAlert tone="notice" className="mb-2">
          Aviso
        </AuthAlert>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Falló')
    expect(screen.getByRole('status')).toHaveTextContent('Aviso')
  })

  it('AuthButton primario/secundario, icono y estado de carga', () => {
    const onClick = jest.fn()
    const { rerender } = render(
      <AuthButton onClick={onClick} icon={<span data-testid="icon" />}>
        Entrar
      </AuthButton>,
    )
    const button = screen.getByRole('button', { name: 'Entrar' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toContain('bg-brand-gold')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <AuthButton type="submit" variant="secondary" pending icon={<span data-testid="icon" />}>
        Entrando
      </AuthButton>,
    )
    const pending = screen.getByRole('button', { name: 'Entrando' })
    expect(pending).toBeDisabled()
    expect(pending).toHaveAttribute('aria-busy', 'true')
    expect(pending).toHaveAttribute('type', 'submit')
    expect(pending.className).toContain('border-[#8b6b2e]/80')
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  it('AuthDivider y AuthFooter', () => {
    render(
      <>
        <AuthDivider />
        <AuthDivider label="también" />
        <AuthFooter>
          <p>pie</p>
        </AuthFooter>
      </>,
    )
    expect(screen.getByText('o')).toBeInTheDocument()
    expect(screen.getByText('también')).toBeInTheDocument()
    expect(screen.getByText('pie')).toBeInTheDocument()
  })
})

describe('PageNav', () => {
  it('muestra "Crear cuenta" por defecto, acepta CTA discreta y puede ocultarla', () => {
    const { rerender } = render(<PageNav />)
    expect(screen.getByRole('link', { name: 'Crear cuenta' }).className).toContain('bg-brand-gold')

    rerender(<PageNav cta={{ href: '/login/player', label: 'Iniciar sesión', quiet: true }} />)
    const quiet = screen.getByRole('link', { name: 'Iniciar sesión' })
    expect(quiet).toHaveAttribute('href', '/login/player')
    expect(quiet.className).not.toContain('bg-brand-gold')

    rerender(<PageNav cta={null} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })
})
