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
    const { container } = render(<RecoveryPinPage />)

    expect(screen.getByRole('heading', { level: 1, name: /restablece tu clave/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Progreso' })).toHaveTextContent('Paso 3 de 3')
    expect(container.querySelector('input[name="flow"]')).toHaveValue('recovery')

    const pinGroup = screen.getByRole('group', { name: /nueva clave de 6 dígitos/i })
    const confirmGroup = screen.getByRole('group', { name: /repite tu nueva clave/i })
    const pinFirst = pinGroup.querySelector('input') as HTMLInputElement
    const confirmFirst = confirmGroup.querySelector('input') as HTMLInputElement
    const hiddenPin = container.querySelector('input[type="hidden"][name="pin"]')

    fireEvent.change(pinFirst, { target: { value: '12a34b' } })
    expect(hiddenPin).toHaveValue('1234')
    fireEvent.blur(pinFirst)
    expect(screen.getByText('La clave debe ser exactamente 6 dígitos numéricos')).toBeInTheDocument()

    fireEvent.paste(pinFirst, { clipboardData: { getData: () => '123456' } })
    expect(screen.queryByText('La clave debe ser exactamente 6 dígitos numéricos')).not.toBeInTheDocument()
    fireEvent.paste(confirmFirst, { clipboardData: { getData: () => '654321' } })
    fireEvent.blur(confirmFirst)
    expect(screen.getByText('Las claves no coinciden')).toBeInTheDocument()

    fireEvent.paste(confirmFirst, { clipboardData: { getData: () => '123456' } })
    expect(screen.queryByText('Las claves no coinciden')).not.toBeInTheDocument()
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
