import { fireEvent, render, screen } from '@testing-library/react'
import { useActionState } from 'react'

import SetPinPage from '../page'
import { setPlayerPin } from '../../../../auth-actions'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('../../../../auth-actions', () => ({
  setPlayerPin: jest.fn(),
}))

const mockUseActionState = useActionState as unknown as jest.Mock

function setupActionState(tuple: [unknown, jest.Mock, boolean] = [null, jest.fn(), false]) {
  mockUseActionState.mockImplementation((action: unknown) => {
    if (action === setPlayerPin) return tuple
    throw new Error('Unexpected action passed to useActionState mock')
  })
}

describe('SetPinPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupActionState()
  })

  it('renderiza base, hidden flow register y CTA inicial', () => {
    const { container } = render(<SetPinPage />)

    expect(screen.getByRole('heading', { name: /crea tu clave/i, level: 2 })).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText('••••••')).toHaveLength(2)
    expect(container.querySelector('input[name="flow"]')).toHaveValue('register')
    expect(screen.getByRole('button', { name: /guardar mi clave/i })).toBeEnabled()
  })

  it('valida PIN inválido y confirmación distinta', () => {
    render(<SetPinPage />)

    const [pinInput, confirmInput] = screen.getAllByPlaceholderText('••••••')
    fireEvent.change(pinInput, { target: { value: '12a' } })
    fireEvent.blur(pinInput)
    expect(pinInput).toHaveValue('12')
    expect(screen.getByText(/exactamente 6 dígitos numéricos/i)).toBeInTheDocument()

    fireEvent.change(pinInput, { target: { value: '123456' } })
    fireEvent.blur(pinInput)
    fireEvent.change(confirmInput, { target: { value: '654321' } })
    fireEvent.blur(confirmInput)

    expect(screen.getByText(/las claves no coinciden/i)).toBeInTheDocument()
  })

  it('muestra error global y estado pending del action', () => {
    setupActionState([{ error: 'No se pudo configurar la clave' }, jest.fn(), true])
    render(<SetPinPage />)

    expect(screen.getByText(/no se pudo configurar la clave/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /configurando/i })).toBeDisabled()
  })
})
