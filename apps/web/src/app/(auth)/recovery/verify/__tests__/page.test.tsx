import { render, screen } from '@testing-library/react'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import RecoveryVerifyPage from '../page'

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

describe('RecoveryVerifyPage', () => {
  const formAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    setSearchParams({ phone: '3009991122' })
    mockUseActionState.mockReturnValue([null, formAction, false])
  })

  it('renderiza recuperacion con telefono y flujo recovery', () => {
    const { container } = render(<RecoveryVerifyPage />)

    expect(screen.getByText('VERIFICACIÓN')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Confirma tu Identidad' })).toBeInTheDocument()
    expect(screen.getByText('3009991122')).toBeInTheDocument()
    expect(container.querySelector('input[name="phone"]')).toHaveValue('3009991122')
    expect(container.querySelector('input[name="flow"]')).toHaveValue('recovery')
    expect(screen.getByRole('button', { name: /confirmar código/i })).toBeEnabled()
  })

  it('muestra error del OTP', () => {
    mockUseActionState.mockReturnValue([{ error: 'Código vencido' }, formAction, false])

    render(<RecoveryVerifyPage />)

    expect(screen.getByText('Código vencido')).toBeInTheDocument()
  })

  it('bloquea el submit mientras verifica', () => {
    mockUseActionState.mockReturnValue([null, formAction, true])

    render(<RecoveryVerifyPage />)

    expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled()
  })
})
