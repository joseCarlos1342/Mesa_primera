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

function groupBoxes(name: RegExp) {
  return Array.from(screen.getByRole('group', { name }).querySelectorAll('input')) as HTMLInputElement[]
}

function hidden(container: HTMLElement, name: string) {
  return container.querySelector(`input[type="hidden"][name="${name}"]`) as HTMLInputElement
}

describe('SetPinPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupActionState()
  })

  it('renderiza base, paso 3 de 4, hidden flow register y CTA inicial', () => {
    const { container } = render(<SetPinPage />)

    expect(screen.getByRole('heading', { name: /crea tu clave/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Progreso' })).toHaveTextContent('Paso 3 de 4')
    expect(groupBoxes(/^clave de 6 dígitos$/i)).toHaveLength(6)
    expect(groupBoxes(/repite tu clave/i)).toHaveLength(6)
    expect(groupBoxes(/^clave de 6 dígitos$/i)[0]).toHaveAttribute('type', 'password')
    expect(container.querySelector('input[name="flow"]')).toHaveValue('register')
    expect(hidden(container, 'pin')).toHaveValue('')
    expect(hidden(container, 'pinConfirm')).toHaveValue('')
    expect(screen.getByRole('button', { name: /guardar mi clave/i })).toBeEnabled()
  })

  it('valida PIN inválido, revalida al corregir y detecta confirmación distinta', () => {
    const { container } = render(<SetPinPage />)

    const [pinFirst] = groupBoxes(/^clave de 6 dígitos$/i)
    fireEvent.change(pinFirst, { target: { value: '12a' } })
    fireEvent.blur(pinFirst)
    expect(hidden(container, 'pin')).toHaveValue('12')
    expect(screen.getByText(/exactamente 6 dígitos numéricos/i)).toBeInTheDocument()

    fireEvent.paste(pinFirst, { clipboardData: { getData: () => '123456' } })
    expect(hidden(container, 'pin')).toHaveValue('123456')
    expect(screen.queryByText(/exactamente 6 dígitos numéricos/i)).not.toBeInTheDocument()

    const [confirmFirst] = groupBoxes(/repite tu clave/i)
    fireEvent.paste(confirmFirst, { clipboardData: { getData: () => '654321' } })
    fireEvent.blur(confirmFirst)
    expect(screen.getByText(/las claves no coinciden/i)).toBeInTheDocument()

    fireEvent.keyDown(groupBoxes(/repite tu clave/i)[5], { key: 'Backspace' })
    expect(hidden(container, 'pinConfirm')).toHaveValue('65432')
    expect(screen.getByText(/las claves no coinciden/i)).toBeInTheDocument()
  })

  it('muestra error global y estado pending del action', () => {
    setupActionState([{ error: 'No se pudo configurar la clave' }, jest.fn(), true])
    render(<SetPinPage />)

    expect(screen.getByText(/no se pudo configurar la clave/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /configurando/i })).toBeDisabled()
  })

  it('prioriza fieldErrors del servidor', () => {
    setupActionState([{ fieldErrors: { pin: 'PIN inseguro', pinConfirm: 'No coincide' } }, jest.fn(), false])
    render(<SetPinPage />)

    expect(screen.getByText('PIN inseguro')).toBeInTheDocument()
    expect(screen.getByText('No coincide')).toBeInTheDocument()
  })
})
