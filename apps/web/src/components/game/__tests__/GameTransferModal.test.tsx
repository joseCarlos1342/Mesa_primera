import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Room } from '@colyseus/sdk'
import { GameTransferModal } from '../TransferModal'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

type MessageData = {
  success: boolean
  userId?: string
  name?: string
  recipientName?: string
  amountCents?: number
  newBalance?: number
  error?: string
}

type Handler = (data: MessageData) => void
type MockRoom = Pick<Room, 'send' | 'onMessage'> & {
  emitMessage: (type: string, data: MessageData) => void
}

function makeRoom(): MockRoom {
  const handlers = new Map<string, Handler>()
  return {
    send: jest.fn(),
    onMessage: jest.fn((type: string, handler: Handler) => {
      handlers.set(type, handler)
    }),
    emitMessage(type: string, data: MessageData) {
      act(() => {
        handlers.get(type)?.(data)
      })
    },
  } as unknown as MockRoom
}

const asRoom = (room: MockRoom): Room => room as unknown as Room

describe('GameTransferModal', () => {
  it('no renderiza cuando esta cerrado', () => {
    const room = makeRoom()

    const { container } = render(<GameTransferModal isOpen={false} onClose={jest.fn()} room={asRoom(room)} myChips={100000} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('busca jugador por telefono sanitizado y maneja lookup fallido', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={100000} />)

    const phoneInput = screen.getByPlaceholderText('3001234567')
    fireEvent.change(phoneInput, { target: { value: '300-123-4567abc' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(phoneInput).toHaveValue('3001234567')
    expect(room.send).toHaveBeenCalledWith('lookup-player', { phone: '3001234567' })

    room.emitMessage('lookup-result', { success: false, error: 'No existe' })

    expect(await screen.findByText('No existe')).toBeInTheDocument()
  })

  it('recorre lookup, confirmacion, monto y envia transferencia', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.keyDown(screen.getByPlaceholderText('3001234567'), { key: 'Enter' })

    expect(room.send).toHaveBeenCalledWith('lookup-player', { phone: '3001234567' })

    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('300••••567')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Confirmar ✓'))
    expect(screen.getByText(/Fichas disponibles/i)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '500' } })
    expect(screen.getByText('Monto mínimo: $1.000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '5000' } })
    expect(screen.getByText('Excede tus fichas disponibles')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('¿Confirmar?')).toBeInTheDocument()
    expect(screen.getByText('Esta acción es irreversible.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(room.send).toHaveBeenCalledWith('transfer', {
      recipientUserId: 'user-2',
      amountCents: 100000,
    })
  })

  it('muestra resultado exitoso, balance nuevo y cierra reseteando estado', async () => {
    const room = makeRoom()
    const onClose = jest.fn()
    render(<GameTransferModal isOpen onClose={onClose} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
    fireEvent.click(await screen.findByText('Confirmar ✓'))
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    room.emitMessage('transfer-result', {
      success: true,
      recipientName: 'Ana',
      amountCents: 100000,
      newBalance: 150000,
    })

    expect(await screen.findByText('Transferencia Exitosa')).toBeInTheDocument()
    expect(screen.getByText(/enviados a/i)).toBeInTheDocument()
    expect(screen.getByText('Fichas restantes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('muestra error de transferencia y permite volver atras', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
    fireEvent.click(await screen.findByText('Confirmar ✓'))
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    room.emitMessage('transfer-result', { success: false, error: 'Saldo insuficiente' })

    expect(await screen.findByText('Saldo insuficiente')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.getByText('Ingresar monto')).toBeInTheDocument()
  })

  it('no busca ni transfiere si falta room', () => {
    render(<GameTransferModal isOpen onClose={jest.fn()} room={null} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(screen.getByText('Buscar jugador')).toBeInTheDocument()
  })
})
