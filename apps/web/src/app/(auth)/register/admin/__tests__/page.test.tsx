import { render, screen } from '@testing-library/react'
import { useActionState } from 'react'
import AdminRegisterPage from '../page'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('@/app/(auth)/auth-actions', () => ({
  registerAdmin: jest.fn(),
}))

const mockUseActionState = useActionState as unknown as jest.Mock

describe('AdminRegisterPage', () => {
  const formAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseActionState.mockReturnValue([null, formAction, false])
  })

  it('renderiza alta admin con campos requeridos y link de login', () => {
    render(<AdminRegisterPage />)

    expect(screen.getByText('Alta de Comandante')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'NUEVO ADMINISTRADOR' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Admin Boss')).toHaveAttribute('name', 'fullName')
    expect(screen.getByPlaceholderText('admin@terminal.auth')).toHaveAttribute('name', 'email')
    expect(screen.getAllByPlaceholderText(/••/)).toHaveLength(2)
    expect(screen.getByRole('button', { name: /alta de administrador/i })).toBeEnabled()
    expect(screen.getByRole('link', { name: /iniciar sesión admin/i })).toHaveAttribute('href', '/login/admin')
  })

  it('muestra error server-side y bloquea submit en pending', () => {
    mockUseActionState.mockReturnValue([{ error: 'Token de invitación inválido' }, formAction, true])

    render(<AdminRegisterPage />)

    expect(screen.getByText('Token de invitación inválido')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrando/i })).toBeDisabled()
  })
})
