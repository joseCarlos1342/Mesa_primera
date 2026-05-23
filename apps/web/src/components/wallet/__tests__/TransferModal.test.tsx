import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TransferModal } from '../TransferModal'
import { lookupUserByPhone, transferToPlayer } from '@/app/actions/transfer'

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

describe('TransferModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

  it('completa la transferencia exitosa y muestra resultado', async () => {
    render(<TransferModal isOpen={true} onClose={jest.fn()} currentBalance={275000} />)

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
