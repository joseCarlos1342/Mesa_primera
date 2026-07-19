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
const originalAudio = global.Audio

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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => { resolve = promiseResolve })
  return { promise, resolve }
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
    global.Audio = originalAudio
  })

  it('abre únicamente un initialTicketId que pertenezca a la lista', () => {
    const initialTickets = [
      ticket({ id: 'ticket-initial-ok', user_id: 'user-initial' }),
      ticket({ id: 'ticket-secondary', user_id: 'user-secondary' }),
    ]
    const { unmount } = render(
      <SupportConversationList adminId="admin-1" initialTickets={initialTickets} initialTicketId="ticket-initial-ok" />,
    )

    expect(screen.getByTestId('support-chat')).toHaveTextContent('Chat ticket-initial-ok user-initial admin embedded')
    unmount()

    render(
      <SupportConversationList adminId="admin-1" initialTickets={initialTickets} initialTicketId="ticket-inexistente" />,
    )
    expect(screen.queryByTestId('support-chat')).not.toBeInTheDocument()
    expect(screen.getByText('Centro de Comando')).toBeInTheDocument()
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

  it('mantiene el ticket nuevo si Audio.play rechaza por autoplay', async () => {
    const play = jest.fn().mockRejectedValue(new DOMException('Autoplay bloqueado', 'NotAllowedError'))
    global.Audio = jest.fn().mockImplementation(() => ({ volume: 0, play })) as unknown as typeof Audio
    render(<SupportConversationList adminId="admin-1" initialTickets={[]} />)

    socket.trigger('support:ticket-created', {
      ticketId: 'audio-rejected', userId: 'user-audio', username: 'audio', preview: 'Continuar sin audio',
    })

    expect(await screen.findByText(/Continuar sin audio/)).toBeInTheDocument()
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('finaliza un ticket desde admin, emite realtime y muestra estado cerrado', async () => {
    render(<SupportConversationList adminId="admin-1" initialTickets={[
      ticket({ id: 'ticket-close-1' }),
      ticket({ id: 'ticket-keep-open', user_id: 'user-2', last_message_preview: 'Sigo pendiente', user: { username: 'beto', full_name: 'Beto Club', avatar_url: null } }),
    ]} />)

    fireEvent.click(screen.getByText('Ana Mesa'))
    fireEvent.click(screen.getAllByRole('button', { name: /finalizar chat/i })[0])

    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('support:ticket-finalized', { ticketId: 'ticket-close-1', closedByRole: 'admin' }))
    expect(screen.getByText('Centro de Comando')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'FINALIZADOS' }))
    fireEvent.click(screen.getByText('Ana Mesa'))
    expect(screen.getByText('FINALIZADO')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /finalizar chat/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'PENDIENTES' }))
    expect(screen.getByText(/Sigo pendiente/)).toBeInTheDocument()
  })

  it('finaliza el ticket desde el callback móvil', async () => {
    render(<SupportConversationList adminId="admin-1" initialTickets={[ticket({ id: 'ticket-mobile-close' })]} />)
    fireEvent.click(screen.getByText('Ana Mesa'))

    fireEvent.click(screen.getByRole('button', { name: /finalizar chat en móvil/i }))

    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('support:ticket-finalized', {
      ticketId: 'ticket-mobile-close', closedByRole: 'admin',
    }))
    expect(screen.getByText('Centro de Comando')).toBeInTheDocument()
  })

  it('permite reintentar si la acción de cierre rechaza por red', async () => {
    mockCloseSupportTicket
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ data: { closed_by_role: 'admin' } })
    render(<SupportConversationList adminId="admin-1" initialTickets={[ticket({ id: 'ticket-retry-close' })]} />)
    fireEvent.click(screen.getByText('Ana Mesa'))
    const closeButton = screen.getAllByRole('button', { name: /finalizar chat/i })[0]

    fireEvent.click(closeButton)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo finalizar el chat')
    expect(closeButton).toBeEnabled()
    expect(screen.getByTestId('support-chat')).toBeInTheDocument()
    expect(socket.emit).not.toHaveBeenCalledWith('support:ticket-finalized', expect.anything())

    fireEvent.click(closeButton)
    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('support:ticket-finalized', {
      ticketId: 'ticket-retry-close', closedByRole: 'admin',
    }))
  })

  it('no cierra la vista de otro ticket ante una respuesta tardía', async () => {
    const pendingClose = deferred<{ data: { closed_by_role: 'admin' } }>()
    mockCloseSupportTicket.mockReturnValueOnce(pendingClose.promise)
    render(<SupportConversationList adminId="admin-1" initialTickets={[
      ticket({ id: 'ticket-close-slow', last_message_preview: 'Cerrar lento' }),
      ticket({ id: 'ticket-stay-open', user_id: 'user-2', last_message_preview: 'Mantener abierto', user: { username: 'beto', full_name: 'Beto Club', avatar_url: null } }),
    ]} />)
    fireEvent.click(screen.getByText('Ana Mesa'))
    fireEvent.click(screen.getAllByRole('button', { name: /finalizar chat/i })[0])
    fireEvent.click(screen.getByText('Beto Club'))

    pendingClose.resolve({ data: { closed_by_role: 'admin' } })

    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('support:ticket-finalized', {
      ticketId: 'ticket-close-slow', closedByRole: 'admin',
    }))
    expect(screen.getByTestId('support-chat')).toHaveTextContent('Chat ticket-stay-open user-2 admin embedded')
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
    const { unmount } = render(<SupportConversationList adminId="admin-1" initialTickets={[ticket({ id: 'ticket-error-1' })]} />)

    fireEvent.click(screen.getByRole('button', { name: 'ATENDIDOS' }))
    expect(screen.getByText('No hay tickets atendidos')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'PENDIENTES' }))
    fireEvent.click(screen.getByText('Ana Mesa'))
    fireEvent.click(screen.getAllByRole('button', { name: /finalizar chat/i })[0])

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo finalizar el chat')
    expect(screen.getByTestId('support-chat')).toBeInTheDocument()

    unmount()
    expect(socket.disconnect).toHaveBeenCalledTimes(1)
  })
})
