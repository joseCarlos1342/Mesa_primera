import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TableHelpModal } from '../TableHelpModal'
import { createClient } from '@/utils/supabase/client'

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const insertMock = jest.fn()
const fromMock = jest.fn()

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function setupSupabase({
  pendingRequest = null,
  insertError = null,
  selectDeferred = false,
}: { pendingRequest?: any; insertError?: any; selectDeferred?: boolean } = {}) {
  insertMock.mockResolvedValue({ error: insertError })

  const limitMock = jest.fn().mockImplementation(() =>
    selectDeferred
      ? new Promise(() => {}) // nunca resuelve: deja el skeleton visible
      : Promise.resolve({ data: pendingRequest ? [pendingRequest] : [] }),
  )
  const orderMock = jest.fn().mockReturnValue({ limit: limitMock })
  const inMock = jest.fn().mockReturnValue({ order: orderMock })
  const roomEqBuilder = { in: inMock }
  const userEqBuilder = { eq: jest.fn().mockReturnValue(roomEqBuilder) }

  fromMock.mockImplementation((table: string) => {
    if (table === 'table_help_requests') {
      return {
        select: jest.fn(() => ({ eq: jest.fn().mockReturnValue(userEqBuilder) })),
        insert: insertMock,
      }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  mockCreateClient.mockReturnValue({ from: fromMock } as never)
}

describe('TableHelpModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('no renderiza cuando está cerrado', () => {
    setupSupabase()
    render(<TableHelpModal isOpen={false} onClose={jest.fn()} roomId="room-1" userId="user-1" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra el estado de carga mientras revisa solicitudes previas', () => {
    setupSupabase({ selectDeferred: true })
    render(<TableHelpModal isOpen onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    expect(screen.getByRole('heading', { name: 'Llamar al admin' })).toBeInTheDocument()
    expect(screen.getByLabelText('Revisando solicitudes')).toBeInTheDocument()
  })

  it('renderiza una solicitud pendiente existente y permite volver a la mesa', async () => {
    setupSupabase({ pendingRequest: { id: 'req-1', reason: 'technical', status: 'pending', created_at: '2025-01-01T10:00:00.000Z' } })
    const onClose = jest.fn()
    render(<TableHelpModal isOpen onClose={onClose} roomId="room-1" userId="user-1" />)

    expect(await screen.findByText(/ya tienes una solicitud activa/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la mesa' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('muestra estado de atención cuando un admin ya tomó la solicitud', async () => {
    setupSupabase({
      pendingRequest: { id: 'req-2', reason: 'other', status: 'attending', created_at: '2025-01-01T10:00:00.000Z' },
    })
    render(<TableHelpModal isOpen onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    expect(await screen.findByText(/admin en camino/i)).toBeInTheDocument()
    expect(screen.getByText(/un administrador está revisando tu mesa/i)).toBeInTheDocument()
    expect(screen.getByText(/motivo: otro motivo/i)).toBeInTheDocument()
  })

  it('muestra los cuatro motivos con aria-pressed y los alterna al seleccionar', async () => {
    setupSupabase()
    render(<TableHelpModal isOpen onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    const dispute = await screen.findByRole('button', { name: /disputa en la mesa/i })
    expect(screen.getByRole('button', { name: /juego desleal/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /problema técnico/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /otro motivo/i })).toBeInTheDocument()

    expect(dispute).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(dispute)
    expect(dispute).toHaveAttribute('aria-pressed', 'true')
  })

  it('deshabilita el envío hasta elegir un motivo y usa la etiqueta del campo de descripción', async () => {
    setupSupabase()
    render(<TableHelpModal isOpen onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    await screen.findByRole('button', { name: /disputa en la mesa/i })
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled()
    expect(screen.getByLabelText('Descripción (opcional)')).toBeInTheDocument()
  })

  it('resetea motivo, mensaje y errores cuando el modal se cierra', async () => {
    setupSupabase({ insertError: { message: 'insert failed' } })
    const { rerender } = render(<TableHelpModal isOpen onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    expect(await screen.findByRole('button', { name: /disputa en la mesa/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /disputa en la mesa/i }))
    fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: 'Texto temporal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo enviar la solicitud/i)

    rerender(<TableHelpModal isOpen={false} onClose={jest.fn()} roomId="room-1" userId="user-1" />)
    rerender(<TableHelpModal isOpen onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    expect(await screen.findByRole('button', { name: /disputa en la mesa/i })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled()
  })

  it('crea una nueva solicitud, muestra "Enviando…" y el estado "Solicitud enviada"', async () => {
    setupSupabase()
    let resolveInsert: (value: { error: null }) => void = () => {}
    insertMock.mockImplementation(() => new Promise((resolve) => { resolveInsert = resolve }))

    const onClose = jest.fn()
    render(<TableHelpModal isOpen onClose={onClose} roomId="room-1" userId="user-1" />)

    expect(await screen.findByRole('button', { name: /problema técnico/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /problema técnico/i }))
    fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: 'No veo mis cartas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    // Mientras la inserción está en vuelo, el botón muestra el estado de envío.
    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeInTheDocument()

    resolveInsert({ error: null })

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith({
        user_id: 'user-1',
        room_id: 'room-1',
        reason: 'technical',
        message: 'No veo mis cartas',
      })
      expect(screen.getByText('Solicitud enviada')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la mesa' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('muestra el error dentro del textarea (role=alert) si la inserción falla', async () => {
    setupSupabase({ insertError: { message: 'insert failed' } })
    render(<TableHelpModal isOpen onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    expect(await screen.findByRole('button', { name: /disputa en la mesa/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /disputa en la mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo enviar la solicitud/i)
  })
})
