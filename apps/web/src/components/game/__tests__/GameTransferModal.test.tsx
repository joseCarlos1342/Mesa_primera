import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Room } from '@colyseus/sdk'
import { GameTransferModal } from '../TransferModal'

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => (avatarId === 'avatar-ok' ? <svg data-testid="game-transfer-avatar" /> : null)),
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

// Recorre search → confirm-recipient → amount, dejando el modal en el paso del monto.
async function goToAmountStep(room: MockRoom) {
  fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar jugador' }))
  room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }))
}

describe('GameTransferModal', () => {
  it('no renderiza cuando está cerrado', () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen={false} onClose={jest.fn()} room={asRoom(room)} myChips={100000} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra el título y la descripción con el paso actual', () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={100000} />)

    expect(screen.getByRole('heading', { name: 'Transferir saldo' })).toBeInTheDocument()
    expect(screen.getByText(/Paso 1 de 4/)).toBeInTheDocument()
    expect(screen.getByLabelText('Celular del jugador')).toBeInTheDocument()
  })

  it('busca jugador por teléfono sanitizado y maneja lookup fallido', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={100000} />)

    const phoneInput = screen.getByPlaceholderText('3001234567')
    fireEvent.change(phoneInput, { target: { value: '300-123-4567abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar jugador' }))

    expect(phoneInput).toHaveValue('3001234567')
    expect(room.send).toHaveBeenCalledWith('lookup-player', { phone: '3001234567' })

    room.emitMessage('lookup-result', { success: false, error: 'No existe' })
    expect(await screen.findByText('No existe')).toBeInTheDocument()
  })

  it('recorre lookup, confirmación, monto y envía la transferencia', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.keyDown(screen.getByPlaceholderText('3001234567'), { key: 'Enter' })

    expect(room.send).toHaveBeenCalledWith('lookup-player', { phone: '3001234567' })

    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('300••••567')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByLabelText('Monto a enviar')).toBeInTheDocument()

    const amountInput = screen.getByLabelText('Monto a enviar')
    fireEvent.change(amountInput, { target: { value: '500' } })
    expect(screen.getByText('Monto mínimo: $1.000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()

    fireEvent.change(amountInput, { target: { value: '5000' } })
    expect(screen.getByText('Excede tus fichas disponibles')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()

    fireEvent.change(amountInput, { target: { value: '1000' } })
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText(/Revisar y confirmar/)).toBeInTheDocument()
    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(room.send).toHaveBeenCalledWith('transfer', {
      recipientUserId: 'user-2',
      amountCents: 100000,
    })
  })

  it('solo acepta dígitos en el monto', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    await goToAmountStep(room)

    const amountInput = screen.getByLabelText('Monto a enviar')
    fireEvent.change(amountInput, { target: { value: '1a2b3c' } })
    expect(amountInput).toHaveValue('123')
  })

  it('avanza a la confirmación al presionar Enter con un monto válido', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    await goToAmountStep(room)

    const amountInput = screen.getByLabelText('Monto a enviar')
    fireEvent.change(amountInput, { target: { value: '1000' } })
    fireEvent.keyDown(amountInput, { key: 'Enter' })

    expect(screen.getByText(/Revisar y confirmar/)).toBeInTheDocument()
    expect(room.send).not.toHaveBeenCalledWith('transfer', expect.anything())
  })

  it.each([
    ['vacío', ''],
    ['inferior al mínimo', '500'],
    ['superior al balance', '3000'],
  ])('no avanza con Enter cuando el monto es %s', async (_scenario, amount) => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    await goToAmountStep(room)

    const amountInput = screen.getByLabelText('Monto a enviar')
    if (amount) fireEvent.change(amountInput, { target: { value: amount } })
    fireEvent.keyDown(amountInput, { key: 'Enter' })

    expect(screen.getByText(/Ingresar monto/)).toBeInTheDocument()
    expect(screen.queryByText(/Revisar y confirmar/)).not.toBeInTheDocument()
    expect(room.send).not.toHaveBeenCalledWith('transfer', expect.anything())
  })

  it('muestra resultado exitoso, fichas restantes y cierra reseteando estado', async () => {
    const room = makeRoom()
    const onClose = jest.fn()
    render(<GameTransferModal isOpen onClose={onClose} room={asRoom(room)} myChips={250000} />)

    await goToAmountStep(room)
    fireEvent.change(screen.getByLabelText('Monto a enviar'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    room.emitMessage('transfer-result', {
      success: true,
      recipientName: 'Ana',
      amountCents: 100000,
      newBalance: 150000,
    })

    expect(await screen.findByText('Transferencia exitosa')).toBeInTheDocument()
    expect(screen.getByText(/enviados a/i)).toBeInTheDocument()
    expect(screen.getByText(/Fichas restantes/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la mesa' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('muestra error de transferencia en AuthAlert y permite cancelar hacia el monto', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    await goToAmountStep(room)
    fireEvent.change(screen.getByLabelText('Monto a enviar'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    room.emitMessage('transfer-result', { success: false, error: 'Saldo insuficiente' })

    expect(await screen.findByText('Saldo insuficiente')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText(/Ingresar monto/)).toBeInTheDocument()
  })

  it('navega hacia atrás con el botón "Volver al paso anterior"', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar jugador' }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })

    expect(await screen.findByText(/Confirmar destinatario/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al paso anterior' }))
    expect(screen.getByText(/Paso 1 de 4/)).toBeInTheDocument()

    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }))
    expect(screen.getByText(/Ingresar monto/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al paso anterior' }))
    expect(screen.getByText(/Confirmar destinatario/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    fireEvent.change(screen.getByLabelText('Monto a enviar'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText(/Revisar y confirmar/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al paso anterior' }))
    expect(screen.getByText(/Ingresar monto/)).toBeInTheDocument()
  })

  it('permite buscar otro jugador y limpia el destinatario previo', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar jugador' }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar otro' }))

    expect(screen.getByText(/Paso 1 de 4/)).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
  })

  it('muestra avatar custom cuando lookup lo devuelve', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar jugador' }))
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana', avatar_url: 'avatar-ok' })

    expect(await screen.findByTestId('game-transfer-avatar')).toBeInTheDocument()
  })

  it('muestra errores por defecto cuando el servidor no envía detalle', async () => {
    const room = makeRoom()
    render(<GameTransferModal isOpen onClose={jest.fn()} room={asRoom(room)} myChips={250000} />)

    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar jugador' }))
    room.emitMessage('lookup-result', { success: false })

    expect(await screen.findByText('Usuario no encontrado')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3001234567' } })
    room.emitMessage('lookup-result', { success: true, userId: 'user-2', name: 'Ana' })
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }))
    fireEvent.change(screen.getByLabelText('Monto a enviar'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    room.emitMessage('transfer-result', { success: false })

    // Un fallo de transferencia no abre la pantalla de resultado: mantiene el
    // paso de confirmación y muestra el mensaje por defecto en AuthAlert.
    expect(await screen.findByText('Error en la transferencia')).toBeInTheDocument()
    expect(screen.queryByText('No se pudo transferir')).not.toBeInTheDocument()
  })

  it('cierra la transferencia desde el botón de cerrar', () => {
    const room = makeRoom()
    const onClose = jest.fn()
    render(<GameTransferModal isOpen onClose={onClose} room={asRoom(room)} myChips={250000} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar transferencia' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('desregistra listeners al desmontar mientras está abierto', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Buscar jugador' }))

    expect(screen.getByText(/Paso 1 de 4/)).toBeInTheDocument()
  })
})
