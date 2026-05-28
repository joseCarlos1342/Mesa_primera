import { render, screen } from '@testing-library/react'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import VerifyPage from '../page'

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

describe('VerifyPage', () => {
  const formAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    setSearchParams({ phone: '3001234567', flow: 'register' })
    mockUseActionState.mockReturnValue([null, formAction, false])
  })

  it('renderiza telefono y conserva phone/flow en inputs ocultos', () => {
    const { container } = render(<VerifyPage />)

    expect(screen.getByRole('heading', { name: 'Verifica tu Código' })).toBeInTheDocument()
    expect(screen.getByText('3001234567')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('000000')).toHaveAttribute('maxLength', '6')
    expect(container.querySelector('input[name="phone"]')).toHaveValue('3001234567')
    expect(container.querySelector('input[name="flow"]')).toHaveValue('register')
    expect(screen.getByRole('button', { name: /código correcto/i })).toBeEnabled()
  })

  it('usa login como flujo por defecto y muestra error/estado pendiente', () => {
    setSearchParams({ phone: '3112223344' })
    mockUseActionState.mockReturnValue([{ error: 'Código inválido' }, formAction, true])

    const { container } = render(<VerifyPage />)

    expect(screen.getByText('Código inválido')).toBeInTheDocument()
    expect(container.querySelector('input[name="flow"]')).toHaveValue('login')
    expect(screen.getByRole('button', { name: /autenticando/i })).toBeDisabled()
  })
})
