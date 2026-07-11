import { fireEvent, render, screen } from '@testing-library/react'
import { useActionState } from 'react'
import AdminLoginPage from '../page'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('@/app/(auth)/auth-actions', () => ({
  loginAdmin: jest.fn(),
}))

const mockUseActionState = useActionState as unknown as jest.Mock

describe('AdminLoginPage', () => {
  const formAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseActionState.mockReturnValue([null, formAction, false])
  })

  it('renderiza formulario admin, enlace de recuperacion y validacion local', () => {
    render(<AdminLoginPage />)

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByText('2FA obligatorio')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /restablecer acceso/i })).toHaveAttribute('href', '/login/admin/recovery')

    fireEvent.blur(screen.getByPlaceholderText('admin@mesa.co'), { target: { value: 'correo-invalido' } })
    fireEvent.blur(screen.getByPlaceholderText('••••••••'), { target: { value: '123' } })

    expect(screen.getByText('Correo electrónico inválido')).toBeInTheDocument()
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument()
  })

  it('muestra errores server-side y estado pendiente', () => {
    mockUseActionState.mockReturnValue([
      { error: 'Credenciales invalidas', fieldErrors: { email: 'Email bloqueado', password: 'Password debil' } },
      formAction,
      true,
    ])

    render(<AdminLoginPage />)

    expect(screen.getByText('Credenciales invalidas')).toBeInTheDocument()
    expect(screen.getByText('Email bloqueado')).toBeInTheDocument()
    expect(screen.getByText('Password debil')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificando...' })).toBeDisabled()
  })

  it('revalida email y contraseña al corregirlos después de tocarlos', () => {
    render(<AdminLoginPage />)

    const email = screen.getByPlaceholderText('admin@mesa.co')
    const password = screen.getByPlaceholderText('••••••••')

    fireEvent.blur(email, { target: { value: 'correo-invalido' } })
    fireEvent.change(email, { target: { value: 'admin@mesa.co' } })
    fireEvent.blur(password, { target: { value: '123' } })
    fireEvent.change(password, { target: { value: 'clave-segura' } })

    expect(screen.queryByText('Correo electrónico inválido')).not.toBeInTheDocument()
    expect(screen.queryByText('La contraseña debe tener al menos 8 caracteres')).not.toBeInTheDocument()
    expect(email).toHaveClass('border-green-500/40')
    expect(password).toHaveClass('border-green-500/40')
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
