import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { io } from 'socket.io-client'
import { SupportConversationList } from '../SupportConversationList'
import { closeSupportTicket, type SupportTicket } from '@/app/actions/support'

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}))

jest.mock('@/components/SupportChat', () => ({
  SupportChat: ({ userId, isAdmin, embedded, ticketId }: { userId: string; isAdmin: boolean; embedded: boolean; ticketId: string }) => (
    <div data-testid="support-chat">
      Chat {ticketId} {userId} {isAdmin ? 'admin' : 'player'} {embedded ? 'embedded' : 'full'}
    </div>
  ),
}))

jest.mock('@/app/actions/support', () => ({
  closeSupportTicket: jest.fn(),
}))

const mockIo = io as jest.MockedFunction<typeof io>
const mockCloseSupportTicket = closeSupportTicket as jest.MockedFunction<typeof closeSupportTicket>

type SocketHandler = (payload: never) => void

function createSocketMock() {
  const handlers = new Map<string, SocketHandler>()
  return {
    on: jest.fn((event: string, handler: SocketHandler) => {
      handlers.set(event, handler)
      return undefined
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    trigger(event: string, payload: unknown) {
      act(() => handlers.get(event)?.(payload as never))
    },
  }
}

function ticket(overrides: Partial<SupportTicket> & { user?: { username: string; full_name: string; avatar_url: string | null } }) {
  return {
    id: 'ticket-pending-001',
    user_id: 'user-1',
    status: 'pending',
    closed_at: null,
    closed_by: null,
    closed_by_role: null,
    last_message_at: '2026-05-25T10:00:00.000Z',
    last_message_from: 'player',
    last_message_preview: 'Necesito ayuda',
    message_count: 1,
    attachment_count: 0,
    created_at: '2026-05-25T10:00:00.000Z',
    updated_at: '2026-05-25T10:00:00.000Z',
    user: { username: 'ana', full_name: 'Ana Mesa', avatar_url: null },
    ...overrides,
  }
}

describe('SupportConversationList', () => {
  let socket: ReturnType<typeof createSocketMock>

  beforeEach(() => {
    jest.clearAllMocks()
    socket = createSocketMock()
    mockIo.mockReturnValue(socket as unknown as ReturnType<typeof io>)
    mockCloseSupportTicket.mockResolvedValue({ data: { closed_by_role: 'admin' } })
    global.Audio = jest.fn().mockImplementation(() => ({
      volume: 0,
      play: jest.fn().mockResolvedValue(undefined),
    })) as unknown as typeof Audio
  })

  it('muestra tickets por estado, contadores y abre el chat seleccionado', () => {
    render(
      <SupportConversationList
        adminId="admin-1"
        initialTickets={[
          ticket({ id: 'ticket-pending-001', status: 'pending', last_message_from: 'player', last_message_preview: 'Ayuda con saldo' }),
          ticket({ id: 'ticket-attended-1', status: 'attended', user_id: 'user-2', last_message_from: 'admin', last_message_preview: 'Te respondi', user: { username: 'beto', full_name: 'Beto Club', avatar_url: null } }),
          ticket({ id: 'ticket-final-01', status: 'finalized', user_id: 'user-3', last_message_preview: 'Cerrado', user: { username: 'cata', full_name: 'Cata Pro', avatar_url: null } }),
        ]}
      />
    )

    expect(screen.getByText('Centro de Comando')).toBeInTheDocument()
    expect(screen.getByText('Pendientes')).toBeInTheDocument()
    expect(screen.getByText('Atendidos')).toBeInTheDocument()
    expect(screen.getByText('Finalizados')).toBeInTheDocument()
    expect(screen.getByText(/Ayuda con saldo/)).toBeInTheDocument()
    expect(screen.queryByText('Te respondi')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ATENDIDOS' }))
    expect(screen.getByText(/Te respondi/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Beto Club'))
    expect(screen.getByTestId('support-chat')).toHaveTextContent('Chat ticket-attended-1 user-2 admin embedded')
    expect(screen.getByText(/Sesión #ticket-a · Atendido/)).toBeInTheDocument()
  })

  it('incorpora tickets y mensajes realtime sin reabrir tickets finalizados', () => {
    render(
      <SupportConversationList
        adminId="admin-1"
        initialTickets={[ticket({ id: 'ticket-final-01', status: 'finalized', last_message_preview: 'Ya cerrado' })]}
      />
    )

    socket.trigger('support:ticket-created', { ticketId: 'ticket-new-001', userId: 'user-new', username: 'nuevo', preview: 'Hola soporte' })
    expect(screen.getByText(/Hola soporte/)).toBeInTheDocument()
    expect(global.Audio).toHaveBeenCalledTimes(1)

    socket.trigger('support:message-created', {
      ticketId: 'ticket-new-001',
      message: 'Sigo esperando respuesta del equipo de soporte',
      from: 'player',
      timestamp: '2026-05-25T10:10:00.000Z',
    })
    expect(screen.getByText(/Sigo esperando respuesta del equipo de soporte/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'FINALIZADOS' }))
    expect(screen.getByText(/Ya cerrado/)).toBeInTheDocument()
    socket.trigger('support:message-created', {
      ticketId: 'ticket-final-01',
      message: 'No debe cambiar',
      from: 'player',
      timestamp: '2026-05-25T10:20:00.000Z',
    })
    expect(screen.queryByText('No debe cambiar')).not.toBeInTheDocument()
  })

  it('finaliza un ticket desde admin, emite realtime y muestra estado cerrado', async () => {
    render(<SupportConversationList adminId="admin-1" initialTickets={[ticket({ id: 'ticket-close-1' })]} />)

    fireEvent.click(screen.getByText('Ana Mesa'))
    fireEvent.click(screen.getAllByRole('button', { name: /finalizar chat/i })[0])

    await waitFor(() => expect(mockCloseSupportTicket).toHaveBeenCalledWith('ticket-close-1'))
    expect(socket.emit).toHaveBeenCalledWith('support:ticket-finalized', { ticketId: 'ticket-close-1', closedByRole: 'admin' })
    expect(screen.getByText('Centro de Comando')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'FINALIZADOS' }))
    fireEvent.click(screen.getByText('Ana Mesa'))
    expect(screen.getByText('FINALIZADO')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /finalizar chat/i })).not.toBeInTheDocument()
  })

  it('muestra empty states, respeta errores de cierre y desconecta el socket', async () => {
    mockCloseSupportTicket.mockResolvedValueOnce({ error: 'No se pudo cerrar' })
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<SupportConversationList adminId="admin-1" initialTickets={[ticket({ id: 'ticket-error-1' })]} />)

    fireEvent.click(screen.getByRole('button', { name: 'ATENDIDOS' }))
    expect(screen.getByText('No hay tickets atendidos')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'PENDIENTES' }))
    fireEvent.click(screen.getByText('Ana Mesa'))
    fireEvent.click(screen.getAllByRole('button', { name: /finalizar chat/i })[0])

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith('Error closing ticket:', 'No se pudo cerrar'))
    expect(screen.getByTestId('support-chat')).toBeInTheDocument()

    unmount()
    expect(socket.disconnect).toHaveBeenCalledTimes(1)
    consoleError.mockRestore()
  })
})
