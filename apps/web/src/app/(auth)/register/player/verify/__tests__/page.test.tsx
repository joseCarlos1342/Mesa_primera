import { render, screen } from '@testing-library/react'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'

import RegisterVerifyPage from '../page'
import { verifyOtp } from '../../../../auth-actions'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

jest.mock('../../../../auth-actions', () => ({
  verifyOtp: jest.fn(),
}))

const mockUseActionState = useActionState as unknown as jest.Mock
const mockUseSearchParams = useSearchParams as unknown as jest.Mock

function setupActionState(tuple: [unknown, jest.Mock, boolean] = [null, jest.fn(), false]) {
  mockUseActionState.mockImplementation((action: unknown) => {
    if (action === verifyOtp) return tuple
    throw new Error('Unexpected action passed to useActionState mock')
  })
}

describe('RegisterVerifyPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'phone' ? '+573001234567' : null)),
    })
    setupActionState()
  })

  it('renderiza el teléfono, los hidden inputs y el CTA base', () => {
    const { container } = render(<RegisterVerifyPage />)

    expect(screen.getByRole('heading', { name: /confirma tu número/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByText('+573001234567')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    expect(container.querySelector('input[name="phone"]')).toHaveValue('+573001234567')
    expect(container.querySelector('input[name="flow"]')).toHaveValue('register')
    expect(screen.getByRole('button', { name: /confirmar código/i })).toBeEnabled()
  })

  it('renderiza error del action', () => {
    setupActionState([{ error: 'Código inválido' }, jest.fn(), false])
    render(<RegisterVerifyPage />)

    expect(screen.getByText(/código inválido/i)).toBeInTheDocument()
  })

  it('muestra estado pending en el submit', () => {
    setupActionState([null, jest.fn(), true])
    render(<RegisterVerifyPage />)

    expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled()
  })
})
