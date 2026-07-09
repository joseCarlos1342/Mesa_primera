import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TableHelpModal } from '../TableHelpModal'
import { createClient } from '@/utils/supabase/client'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const insertMock = jest.fn()
const fromMock = jest.fn()

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function setupSupabase({ pendingRequest = null, insertError = null }: { pendingRequest?: any; insertError?: any } = {}) {
  insertMock.mockResolvedValue({ error: insertError })

  const limitMock = jest.fn().mockResolvedValue({ data: pendingRequest ? [pendingRequest] : [] })
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

  it('renderiza una solicitud pendiente existente y permite cerrarla', async () => {
    setupSupabase({ pendingRequest: { id: 'req-1', reason: 'technical', status: 'pending', created_at: '2025-01-01T10:00:00.000Z' } })
    const onClose = jest.fn()
    render(<TableHelpModal isOpen={true} onClose={onClose} roomId="room-1" userId="user-1" />)

    expect(await screen.findByText(/ya tienes una solicitud activa/i, { exact: false })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('muestra estado de atención cuando un admin ya tomó la solicitud', async () => {
    setupSupabase({
      pendingRequest: {
        id: 'req-2',
        reason: 'other',
        status: 'attending',
        created_at: '2025-01-01T10:00:00.000Z',
      },
    })
    render(<TableHelpModal isOpen={true} onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    expect(await screen.findByText(/admin en camino/i)).toBeInTheDocument()
    expect(screen.getByText(/un administrador está revisando tu mesa/i)).toBeInTheDocument()
    expect(screen.getByText(/motivo: otro motivo/i)).toBeInTheDocument()
  })

  it('resetea motivo, mensaje y errores cuando el modal se cierra', async () => {
    setupSupabase({ insertError: { message: 'insert failed' } })
    const { rerender } = render(
      <TableHelpModal isOpen={true} onClose={jest.fn()} roomId="room-1" userId="user-1" />,
    )

    expect(await screen.findByText(/disputa en la mesa/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/disputa en la mesa/i))
    fireEvent.change(screen.getByPlaceholderText(/describe brevemente la situación/i), {
      target: { value: 'Texto temporal' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviar solicitud/i }))
    expect(await screen.findByText(/no se pudo enviar la solicitud/i)).toBeInTheDocument()

    rerender(<TableHelpModal isOpen={false} onClose={jest.fn()} roomId="room-1" userId="user-1" />)
    rerender(<TableHelpModal isOpen={true} onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    expect(await screen.findByText(/disputa en la mesa/i)).toBeInTheDocument()
    expect(screen.queryByText(/no se pudo enviar la solicitud/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/describe brevemente la situación/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /enviar solicitud/i })).toBeDisabled()
  })

  it('permite crear una nueva solicitud y mostrar estado exitoso', async () => {
    setupSupabase()
    const onClose = jest.fn()
    render(<TableHelpModal isOpen={true} onClose={onClose} roomId="room-1" userId="user-1" />)

    expect(await screen.findByText(/problema técnico/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/problema técnico/i))
    fireEvent.change(screen.getByPlaceholderText(/describe brevemente la situación/i), { target: { value: 'No veo mis cartas' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar solicitud/i }))

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith({
        user_id: 'user-1',
        room_id: 'room-1',
        reason: 'technical',
        message: 'No veo mis cartas',
      })
      expect(screen.getByText(/solicitud enviada/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /volver a la mesa/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('muestra error si la inserción falla', async () => {
    setupSupabase({ insertError: { message: 'insert failed' } })
    render(<TableHelpModal isOpen={true} onClose={jest.fn()} roomId="room-1" userId="user-1" />)

    expect(await screen.findByText(/disputa en la mesa/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/disputa en la mesa/i))
    fireEvent.click(screen.getByRole('button', { name: /enviar solicitud/i }))

    expect(await screen.findByText(/no se pudo enviar la solicitud/i)).toBeInTheDocument()
  })
})
