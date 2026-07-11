import { fireEvent, render, screen } from '@testing-library/react'
import { useActionState } from 'react'

import RecoveryPage from '../page'
import { startPinRecovery } from '../../auth-actions'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('../../auth-actions', () => ({
  startPinRecovery: jest.fn(),
}))

jest.mock('@/components/auth/turnstile-widget', () => ({
  TurnstileWidget: () => <div data-testid="turnstile-widget">Turnstile</div>,
}))

const mockUseActionState = useActionState as unknown as jest.Mock

function setupActionState(tuple: [unknown, jest.Mock, boolean] = [null, jest.fn(), false]) {
  mockUseActionState.mockImplementation((action: unknown) => {
    if (action === startPinRecovery) return tuple
    throw new Error('Unexpected action passed to useActionState mock')
  })
}

describe('RecoveryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupActionState()
  })

  it('renderiza base, turnstile y link a login', () => {
    render(<RecoveryPage />)

    expect(screen.getByRole('heading', { name: /¿olvidaste tu clave\?/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('3001234567')).toBeInTheDocument()
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/login/player')
    expect(screen.getByRole('button', { name: /enviar código sms/i })).toBeEnabled()
  })

  it('sanea teléfono y muestra error local de validación', () => {
    render(<RecoveryPage />)

    const phoneInput = screen.getByPlaceholderText('3001234567') as HTMLInputElement
    fireEvent.change(phoneInput, { target: { value: '30a-1' } })
    expect(phoneInput.value).toBe('301')

    fireEvent.blur(phoneInput, { target: { value: '301' } })
    expect(screen.getByText(/número inválido/i)).toBeInTheDocument()
  })

  it('prioriza error del servidor y estado pending', () => {
    setupActionState([{ fieldErrors: { phone: 'Número bloqueado' }, error: 'SMS no disponible' }, jest.fn(), true])
    render(<RecoveryPage />)

    expect(screen.getByText(/número bloqueado/i)).toBeInTheDocument()
    expect(screen.getByText(/sms no disponible/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled()
  })

  it('muestra estado válido tras corregir un número de celular', () => {
    render(<RecoveryPage />)

    const phoneInput = screen.getByPlaceholderText('3001234567')
    fireEvent.blur(phoneInput, { target: { value: '301' } })
    fireEvent.change(phoneInput, { target: { value: '3001234567' } })

    expect(screen.queryByText(/número inválido/i)).not.toBeInTheDocument()
    expect(phoneInput).toHaveClass('border-green-500/40')
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
