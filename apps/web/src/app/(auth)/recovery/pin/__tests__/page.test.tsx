import { fireEvent, render, screen } from '@testing-library/react'
import { useActionState } from 'react'
import RecoveryPinPage from '../page'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('@/app/(auth)/auth-actions', () => ({
  setPlayerPin: jest.fn(),
}))

const mockUseActionState = useActionState as unknown as jest.Mock

describe('RecoveryPinPage', () => {
  const formAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseActionState.mockReturnValue([null, formAction, false])
  })

  it('filtra PIN a digitos, valida longitud y confirmacion', () => {
    render(<RecoveryPinPage />)

    const inputs = screen.getAllByPlaceholderText('••••••')
    fireEvent.change(inputs[0], { target: { value: '12a34b' } })
    expect(inputs[0]).toHaveValue('1234')
    fireEvent.blur(inputs[0])
    expect(screen.getByText('La clave debe ser exactamente 6 dígitos numéricos')).toBeInTheDocument()

    fireEvent.change(inputs[0], { target: { value: '123456' } })
    fireEvent.blur(inputs[0])
    fireEvent.change(inputs[1], { target: { value: '654321' } })
    fireEvent.blur(inputs[1])
    expect(screen.getByText('Las claves no coinciden')).toBeInTheDocument()
  })

  it('muestra errores server-side y estado pendiente', () => {
    mockUseActionState.mockReturnValue([
      { error: 'Token vencido', fieldErrors: { pin: 'PIN inseguro', pinConfirm: 'No coincide' } },
      formAction,
      true,
    ])

    render(<RecoveryPinPage />)

    expect(screen.getByText('Token vencido')).toBeInTheDocument()
    expect(screen.getByText('PIN inseguro')).toBeInTheDocument()
    expect(screen.getByText('No coincide')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled()
  })
})
