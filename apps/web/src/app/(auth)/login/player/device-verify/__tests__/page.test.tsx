import { render, screen } from '@testing-library/react'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import DeviceVerifyPage from '../page'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

jest.mock('@/app/(auth)/auth-actions', () => ({
  verifyOtp: jest.fn(),
}))

const mockUseActionState = useActionState as unknown as jest.Mock
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>

function setSearchParams(params: Record<string, string>) {
  mockUseSearchParams.mockReturnValue({
    get: (name: string) => params[name] ?? null,
  } as ReturnType<typeof useSearchParams>)
}

describe('DeviceVerifyPage', () => {
  const formAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    setSearchParams({ phone: '3005556677' })
    mockUseActionState.mockReturnValue([null, formAction, false])
  })

  it('renderiza verificacion de dispositivo y fija el flujo device-verify', () => {
    const { container } = render(<DeviceVerifyPage />)

    expect(screen.getByText('NUEVO DISPOSITIVO')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Verifica tu Identidad' })).toBeInTheDocument()
    expect(screen.getByText('3005556677')).toBeInTheDocument()
    expect(container.querySelector('input[name="phone"]')).toHaveValue('3005556677')
    expect(container.querySelector('input[name="flow"]')).toHaveValue('device-verify')
    expect(screen.getByText(/recordado por 30 días/i)).toBeInTheDocument()
  })

  it('muestra error y bloquea el boton mientras verifica', () => {
    mockUseActionState.mockReturnValue([{ error: 'Dispositivo rechazado' }, formAction, true])

    render(<DeviceVerifyPage />)

    expect(screen.getByText('Dispositivo rechazado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled()
  })
})
