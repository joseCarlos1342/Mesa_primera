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
})
