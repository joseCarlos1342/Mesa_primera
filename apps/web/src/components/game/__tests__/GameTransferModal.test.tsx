import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Room } from '@colyseus/sdk'
import { GameTransferModal } from '../TransferModal'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => avatarId === 'avatar-ok' ? <svg data-testid="game-transfer-avatar" /> : null),
}))

type MessageData = {
  success: boolean
  userId?: string
  name?: string
  recipientName?: string
  amountCents?: number
  newBalance?: number
  avatar_url?: string | null
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

  it('avanza a la confirmacion al presionar Enter con un monto valido', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
    fireEvent.click(await screen.findByText('Confirmar ✓'))

    const amountInput = screen.getByPlaceholderText('0')
    fireEvent.change(amountInput, { target: { value: '1000' } })
    fireEvent.keyDown(amountInput, { key: 'Enter' })

    expect(screen.getByText('Revisar datos')).toBeInTheDocument()
    expect(screen.getByText('Esta acción es irreversible.')).toBeInTheDocument()
    expect(room.send).not.toHaveBeenCalledWith('transfer', expect.anything())
  })

  it.each([
    ['vacío', ''],
    ['inferior al mínimo', '500'],
    ['superior al balance', '3000'],
  ])('no avanza con Enter cuando el monto es %s', async (_scenario, amount) => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
    fireEvent.click(await screen.findByText('Confirmar ✓'))

    const amountInput = screen.getByPlaceholderText('0')
    if (amount) fireEvent.change(amountInput, { target: { value: amount } })
    fireEvent.keyDown(amountInput, { key: 'Enter' })

    expect(screen.getByText('Ingresar monto')).toBeInTheDocument()
    expect(screen.queryByText('Revisar datos')).not.toBeInTheDocument()
    expect(room.send).not.toHaveBeenCalledWith('transfer', expect.anything())
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

  it('navega hacia atras entre destinatario, monto y confirmacion', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })

    expect(await screen.findByText('Confirmar destinatario')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('Buscar jugador')).toBeInTheDocument()

    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
    fireEvent.click(await screen.findByText('Confirmar ✓'))
    expect(screen.getByText('Ingresar monto')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('Confirmar destinatario')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Confirmar ✓'))
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Revisar datos')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('Ingresar monto')).toBeInTheDocument()
  })

  it('permite buscar otro jugador y limpia el destinatario previo', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Buscar Otro'))

    expect(screen.getByText('Buscar jugador')).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
  })

  it('muestra avatar custom cuando lookup lo devuelve', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana', avatar_url: 'avatar-ok' })

    expect(await screen.findByTestId('game-transfer-avatar')).toBeInTheDocument()
  })

  it('muestra errores por defecto cuando el servidor no envia detalle', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    room.emitMessage('lookup-result', { success: false })

    expect(await screen.findByText('Usuario no encontrado')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
    fireEvent.click(await screen.findByText('Confirmar ✓'))
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    room.emitMessage('transfer-result', { success: false })

    expect(await screen.findByText('Error en la transferencia')).toBeInTheDocument()
  })

  it('desregistra listeners al desmontar mientras esta abierto', () => {
    const room = makeRoom()
    const { unmount } = render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    expect(room.onMessage).toHaveBeenCalledWith('transfer-result', expect.any(Function))
    expect(room.onMessage).toHaveBeenCalledWith('lookup-result', expect.any(Function))

    unmount()

    expect(room.onMessage).toHaveBeenLastCalledWith('lookup-result', expect.any(Function))
    expect(room.onMessage).toHaveBeenCalledTimes(4)
  })

  it('no busca ni transfiere si falta room', () => {
    render(<GameTransferModal isOpen onClose={jest.fn()} room={null} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(screen.getByText('Buscar jugador')).toBeInTheDocument()
  })
})
