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

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => avatarId === 'avatar-ok' ? <svg data-testid="support-avatar" /> : null),
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
  return ({
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
  } satisfies SupportTicket & { user: { username: string; full_name: string; avatar_url: string | null } })
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

  afterEach(() => {
    delete (window as Window & typeof globalThis & { __MESA_PRIMERA_RUNTIME_ENV__?: unknown }).__MESA_PRIMERA_RUNTIME_ENV__
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

  it('usa runtime socket URL y muestra fallbacks de usuario sin nombre', () => {
    ;(window as Window & typeof globalThis & { __MESA_PRIMERA_RUNTIME_ENV__?: { NEXT_PUBLIC_SOCKET_URL: string } }).__MESA_PRIMERA_RUNTIME_ENV__ = {
      NEXT_PUBLIC_SOCKET_URL: 'https://socket.runtime.test',
    }
    render(<SupportConversationList adminId="admin-1" initialTickets={[
      ticket({ id: 'fallback-user', user: { username: '', full_name: '', avatar_url: null } }),
    ]} />)

    expect(mockIo).toHaveBeenCalledWith('https://socket.runtime.test/support', { withCredentials: true })
    expect(screen.getByText('U')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Usuario'))
    expect(screen.getByText('Chat Principal')).toBeInTheDocument()
  })

  it('permite cerrar la vista seleccionada sin cerrar el ticket', () => {
    render(<SupportConversationList adminId="admin-1" initialTickets={[ticket({ id: 'ticket-view-close' })]} />)

    fireEvent.click(screen.getByText('Ana Mesa'))
    expect(screen.getByTestId('support-chat')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Cerrar vista'))

    expect(screen.getByText('Centro de Comando')).toBeInTheDocument()
    expect(mockCloseSupportTicket).not.toHaveBeenCalled()
  })

  it('muestra empty states de pendientes y finalizados', () => {
    render(<SupportConversationList adminId="admin-1" initialTickets={[]} />)

    expect(screen.getByText('No hay tickets pendientes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'FINALIZADOS' }))
    expect(screen.getByText('No hay historial')).toBeInTheDocument()
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

  it('continúa si el navegador bloquea audio de notificación', () => {
    global.Audio = jest.fn().mockImplementation(() => {
      throw new Error('audio blocked')
    }) as unknown as typeof Audio
    render(<SupportConversationList adminId="admin-1" initialTickets={[]} />)

    expect(() => socket.trigger('support:ticket-created', { ticketId: 'audio-blocked', userId: 'user-audio', username: 'audio', preview: 'Sin sonido' })).not.toThrow()
    expect(screen.getByText(/Sin sonido/)).toBeInTheDocument()
  })

  it('finaliza un ticket desde admin, emite realtime y muestra estado cerrado', async () => {
    render(<SupportConversationList adminId="admin-1" initialTickets={[
      ticket({ id: 'ticket-close-1' }),
      ticket({ id: 'ticket-keep-open', user_id: 'user-2', last_message_preview: 'Sigo pendiente', user: { username: 'beto', full_name: 'Beto Club', avatar_url: null } }),
    ]} />)

    fireEvent.click(screen.getByText('Ana Mesa'))
    fireEvent.click(screen.getAllByRole('button', { name: /finalizar chat/i })[0])

    await waitFor(() => expect(mockCloseSupportTicket).toHaveBeenCalledWith('ticket-close-1'))
    expect(socket.emit).toHaveBeenCalledWith('support:ticket-finalized', { ticketId: 'ticket-close-1', closedByRole: 'admin' })
    expect(screen.getByText('Centro de Comando')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'FINALIZADOS' }))
    fireEvent.click(screen.getByText('Ana Mesa'))
    expect(screen.getByText('FINALIZADO')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /finalizar chat/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'PENDIENTES' }))
    expect(screen.getByText(/Sigo pendiente/)).toBeInTheDocument()
  })

  it('actualiza estados por eventos realtime de atendido y finalizado', () => {
    render(<SupportConversationList adminId="admin-1" initialTickets={[ticket({ id: 'ticket-state-1' })]} />)

    socket.trigger('support:ticket-attended', { ticketId: 'ticket-state-1' })
    fireEvent.click(screen.getByRole('button', { name: 'ATENDIDOS' }))
    expect(screen.getByText('Ana Mesa')).toBeInTheDocument()
    expect(screen.getByText('Atendido')).toBeInTheDocument()

    socket.trigger('support:ticket-finalized', { ticketId: 'ticket-state-1', closedByRole: 'player' })
    fireEvent.click(screen.getByRole('button', { name: 'FINALIZADOS' }))
    expect(screen.getByText('Ana Mesa')).toBeInTheDocument()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
  })

  it('ignora cambios de estado que no aplican al ticket actual', () => {
    render(
      <SupportConversationList
        adminId="admin-1"
        initialTickets={[
          ticket({ id: 'pending-keep', status: 'pending', last_message_preview: 'Pendiente real' }),
          ticket({ id: 'final-keep', status: 'finalized', last_message_preview: 'Finalizado real' }),
        ]}
      />,
    )

    socket.trigger('support:ticket-attended', { ticketId: 'final-keep' })
    socket.trigger('support:ticket-finalized', { ticketId: 'missing-ticket', closedByRole: 'admin' })

    expect(screen.getByText(/Pendiente real/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'FINALIZADOS' }))
    expect(screen.getByText(/Finalizado real/)).toBeInTheDocument()
  })

  it('procesa mensajes legacy existentes y crea tickets nuevos sin duplicar creados', () => {
    render(<SupportConversationList adminId="admin-1" initialTickets={[ticket({ id: 'legacy-1', last_message_preview: 'Antes' })]} />)

    socket.trigger('support:ticket-created', { ticketId: 'legacy-new', userId: 'user-new', username: 'nuevo', preview: 'Primer mensaje' })
    socket.trigger('support:ticket-created', { ticketId: 'legacy-new', userId: 'user-new', username: 'nuevo', preview: 'Duplicado' })
    expect(screen.getByText(/Primer mensaje/)).toBeInTheDocument()
    expect(screen.queryByText(/Duplicado/)).not.toBeInTheDocument()

    socket.trigger('support:incoming', { ticketId: 'legacy-1', userId: 'user-1', message: 'Mensaje legacy actualizado' })
    expect(screen.getByText(/Mensaje legacy actualizado/)).toBeInTheDocument()

    socket.trigger('support:incoming', { userId: 'legacy-user-only', message: 'Ticket creado por legacy' })
    expect(screen.getByText(/Ticket creado por legacy/)).toBeInTheDocument()
  })

  it('mantiene tickets finalizados intactos ante eventos legacy y muestra avatar cuando existe', () => {
    render(
      <SupportConversationList
        adminId="admin-1"
        initialTickets={[
          ticket({ id: 'final-avatar', status: 'finalized', last_message_preview: 'Cerrado', user: { username: 'avatar', full_name: 'Avatar User', avatar_url: 'avatar-ok' } }),
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'FINALIZADOS' }))
    expect(screen.getByTestId('support-avatar')).toBeInTheDocument()
    socket.trigger('support:incoming', { ticketId: 'final-avatar', userId: 'user-1', message: 'No reabrir' })

    expect(screen.getByText(/Cerrado/)).toBeInTheDocument()
    expect(screen.queryByText(/No reabrir/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Avatar User'))
    expect(screen.getAllByTestId('support-avatar')).toHaveLength(2)
    expect(screen.getByText('CHAT FINALIZADO')).toBeInTheDocument()
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
