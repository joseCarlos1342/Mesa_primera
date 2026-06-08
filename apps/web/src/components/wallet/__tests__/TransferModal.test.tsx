import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TransferModal } from '../TransferModal'
import { lookupUserByPhone, transferToPlayer } from '@/app/actions/transfer'
import { getAvatarSvg } from '@/utils/avatars'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/app/actions/transfer', () => ({
  lookupUserByPhone: jest.fn(),
  transferToPlayer: jest.fn(),
}))

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn(() => null),
}))

const mockLookupUserByPhone = lookupUserByPhone as jest.MockedFunction<typeof lookupUserByPhone>
const mockTransferToPlayer = transferToPlayer as jest.MockedFunction<typeof transferToPlayer>
const mockGetAvatarSvg = getAvatarSvg as jest.MockedFunction<typeof getAvatarSvg>

describe('TransferModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAvatarSvg.mockReturnValue(null)
    mockLookupUserByPhone.mockResolvedValue({ user: { id: 'user-2', username: 'AsDelDestino', avatar_url: null, level: 8 } } as never)
    mockTransferToPlayer.mockResolvedValue({ referenceId: 'ref-1', senderBalanceAfter: 150000 } as never)
  })

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(<TransferModal isOpen={false} onClose={jest.fn()} currentBalance={275000} />)
    expect(container.firstChild).toBeNull()
  })

  it('permite buscar destinatario y avanzar a confirmación', async () => {
    render(<TransferModal isOpen={true} onClose={jest.fn()} currentBalance={275000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))

    await waitFor(() => {
      expect(mockLookupUserByPhone).toHaveBeenCalledWith('3001234567')
      expect(screen.getByText('AsDelDestino')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
    })
  })

  it('normaliza teléfono, permite buscar con Enter y renderiza avatar custom', async () => {
    mockLookupUserByPhone.mockResolvedValue({ user: { id: 'user-2', username: 'AsDelDestino', avatar_url: 'as-oros', level: 8 } } as never)
    mockGetAvatarSvg.mockReturnValue(<svg data-testid="recipient-avatar" />)
    render(<TransferModal isOpen={true} onClose={jest.fn()} currentBalance={275000} />)

    const input = screen.getByPlaceholderText('3001234567')
    fireEvent.change(input, { target: { value: '+57 300-123-456789' } })
    expect(input).toHaveValue('5730012345')

    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockLookupUserByPhone).toHaveBeenCalledWith('5730012345')
      expect(screen.getByTestId('recipient-avatar')).toBeInTheDocument()
    })
  })

  it('no busca con teléfono vacío y limpia error al editar el teléfono', async () => {
    mockLookupUserByPhone.mockResolvedValue({ error: 'Jugador no encontrado' } as never)
    render(<TransferModal isOpen={true} onClose={jest.fn()} currentBalance={275000} />)

    fireEvent.keyDown(screen.getByPlaceholderText('3001234567'), { key: 'Enter' })
    expect(mockLookupUserByPhone).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))
    expect(await screen.findByText(/jugador no encontrado/i)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234568' } })
    expect(screen.queryByText(/jugador no encontrado/i)).not.toBeInTheDocument()
  })

  it('muestra error si lookupUserByPhone falla', async () => {
    mockLookupUserByPhone.mockResolvedValue({ error: 'Jugador no encontrado' } as never)
    render(<TransferModal isOpen={true} onClose={jest.fn()} currentBalance={275000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))

    expect(await screen.findByText(/jugador no encontrado/i)).toBeInTheDocument()
  })

  it('valida monto mínimo y saldo disponible antes de continuar', async () => {
    render(<TransferModal isOpen={true} onClose={jest.fn()} currentBalance={275000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }))

    const amountInput = screen.getByPlaceholderText('0')
    fireEvent.change(amountInput, { target: { value: '999' } })
    expect(screen.getByText(/monto mínimo: \$1.000/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled()

    fireEvent.change(amountInput, { target: { value: '3000' } })
    expect(screen.getByText(/excede tu saldo disponible/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled()
  })

  it('permite volver entre pasos y buscar otro destinatario', async () => {
    render(<TransferModal isOpen={true} onClose={jest.fn()} currentBalance={275000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))
    expect(await screen.findByText('AsDelDestino')).toBeInTheDocument()
    expect(screen.getByText('1234')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /volver al paso anterior/i }))
    expect(screen.getByText(/buscar destinatario/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))
    fireEvent.click(await screen.findByRole('button', { name: /buscar otro/i }))
    expect(screen.getByText(/buscar destinatario/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }))
    expect(screen.getByText(/ingresar monto/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /volver al paso anterior/i }))
    expect(screen.getByText(/confirmar destinatario/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    const amountInput = screen.getByPlaceholderText('0')
    fireEvent.change(amountInput, { target: { value: '1000' } })
    fireEvent.keyDown(amountInput, { key: 'Enter' })
    expect(screen.getByText(/revisar y confirmar/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /volver al paso anterior/i }))
    expect(screen.getByText(/ingresar monto/i)).toBeInTheDocument()
  })

  it('completa la transferencia exitosa y muestra resultado', async () => {
    const onClose = jest.fn()
    render(<TransferModal isOpen={true} onClose={onClose} currentBalance={275000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }))

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(mockTransferToPlayer).toHaveBeenCalledWith('user-2', 100000)
      expect(screen.getByText(/transferencia exitosa/i)).toBeInTheDocument()
      expect(screen.getByText('$1.500')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^cerrar$/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('muestra error del transfer y permite cerrar reseteando el modal', async () => {
    const onClose = jest.fn()
    mockTransferToPlayer.mockResolvedValue({ error: 'Saldo insuficiente' } as never)
    render(<TransferModal isOpen={true} onClose={onClose} currentBalance={275000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar jugador/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }))
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(await screen.findByText(/saldo insuficiente/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cerrar transferencia/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
