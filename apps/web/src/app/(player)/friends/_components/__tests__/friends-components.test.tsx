import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AddFriendModal } from '../AddFriendModal'
import { DirectChat } from '../DirectChat'
import { FriendRequests } from '../FriendRequests'
import { FriendsList } from '../FriendsList'
import {
  acceptFriendRequest,
  getDirectMessages,
  inviteToPlay,
  removeFriendship,
  searchUsers,
  sendDirectMessage,
  sendFriendRequest,
  updateFriendNickname,
} from '@/app/actions/social-actions'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, layout: _layout, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => avatarId === 'avatar-ok' ? <svg data-testid="avatar-svg" /> : null),
}))

jest.mock('@/app/actions/social-actions', () => ({
  acceptFriendRequest: jest.fn(),
  getDirectMessages: jest.fn(),
  inviteToPlay: jest.fn(),
  removeFriendship: jest.fn(),
  searchUsers: jest.fn(),
  sendDirectMessage: jest.fn(),
  sendFriendRequest: jest.fn(),
  updateFriendNickname: jest.fn(),
}))

const removeChannel = jest.fn()
const subscribe = jest.fn(() => 'channel-1')
type RealtimeHandler = (payload: { new: Record<string, unknown> }) => void
const on = jest.fn((_event: string, _config: unknown, _handler: RealtimeHandler) => ({ subscribe }))
const channel = jest.fn(() => ({ on }))
const getUser = jest.fn()

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser },
    channel,
    removeChannel,
  })),
}))

const friend = {
  friendshipId: 'friendship-1',
  profile: {
    id: 'friend-1',
    username: 'rivalUno',
    avatar_url: null,
    level: 7,
  },
  status: 'online' as const,
  nickname: 'El Rival',
}

describe('friends player components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'me-1' } } })
    ;(searchUsers as jest.Mock).mockResolvedValue([])
    ;(sendFriendRequest as jest.Mock).mockResolvedValue({ success: true })
    ;(updateFriendNickname as jest.Mock).mockResolvedValue({ success: true })
    ;(inviteToPlay as jest.Mock).mockResolvedValue({ success: true })
    ;(acceptFriendRequest as jest.Mock).mockResolvedValue({ success: true })
    ;(removeFriendship as jest.Mock).mockResolvedValue({ success: true })
    ;(getDirectMessages as jest.Mock).mockResolvedValue([])
    ;(sendDirectMessage as jest.Mock).mockResolvedValue({ success: true })
  })

  it('mantiene cerrado el modal de agregar amigo cuando isOpen es false', () => {
    render(<AddFriendModal isOpen={false} onClose={jest.fn()} />)

    expect(screen.queryByText('Añadir Amigo')).not.toBeInTheDocument()
  })

  it('busca jugadores y retira el resultado cuando la solicitud se envia', async () => {
    ;(searchUsers as jest.Mock).mockResolvedValue([
      { id: 'user-2', username: 'jugadorUno', full_name: 'Jugador Uno', level: 4, avatar_url: 'avatar-ok' },
    ])
    const onClose = jest.fn()

    render(<AddFriendModal isOpen onClose={onClose} />)

    fireEvent.change(screen.getByPlaceholderText('Nombre, apodo o teléfono...'), {
      target: { value: 'jug' },
    })
    fireEvent.submit(screen.getByPlaceholderText('Nombre, apodo o teléfono...').closest('form')!)

    expect(await screen.findByText('jugadorUno')).toBeInTheDocument()
    expect(screen.getByTestId('avatar-svg')).toBeInTheDocument()
    expect(searchUsers).toHaveBeenCalledWith('jug')

    const row = screen.getByText('jugadorUno').closest('div')!.parentElement!.parentElement!
    fireEvent.click(within(row).getAllByRole('button')[0])

    await waitFor(() => expect(sendFriendRequest).toHaveBeenCalledWith('user-2'))
    await waitFor(() => expect(screen.queryByText('jugadorUno')).not.toBeInTheDocument())
  })

  it('muestra mensaje sin resultados cuando la busqueda no encuentra jugadores', async () => {
    render(<AddFriendModal isOpen onClose={jest.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Nombre, apodo o teléfono...'), {
      target: { value: 'zzz' },
    })
    fireEvent.submit(screen.getByPlaceholderText('Nombre, apodo o teléfono...').closest('form')!)

    expect(await screen.findByText('No se encontraron jugadores.')).toBeInTheDocument()
  })

  it('renderiza estado vacio de amigos', () => {
    render(<FriendsList friends={[]} onChat={jest.fn()} onRemove={jest.fn()} onAction={jest.fn()} onRefresh={jest.fn()} />)

    expect(screen.getByText('Tu círculo está vacío')).toBeInTheDocument()
  })

  it('permite chatear, invitar, borrar y actualizar apodo de un amigo', async () => {
    const onChat = jest.fn()
    const onRemove = jest.fn()
    const onAction = jest.fn()
    const onRefresh = jest.fn()

    render(<FriendsList friends={[friend]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)

    expect(screen.getByText('El Rival')).toBeInTheDocument()
    expect(screen.getByText('@rivalUno')).toBeInTheDocument()
    expect(screen.getByText('En Línea')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Escribir'))
    expect(onChat).toHaveBeenCalledWith(friend)

    fireEvent.click(screen.getByTitle('Invitar a jugar'))
    await waitFor(() => expect(inviteToPlay).toHaveBeenCalledWith('friend-1'))
    expect(onAction).toHaveBeenCalledWith('¡Invitación enviada!', 'success')

    fireEvent.click(screen.getByTitle('Borrar amigo'))
    expect(onRemove).toHaveBeenCalledWith('friendship-1')

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.change(screen.getByDisplayValue('El Rival'), { target: { value: 'Nuevo Rival' } })
    fireEvent.click(screen.getAllByRole('button')[0])

    await waitFor(() => expect(updateFriendNickname).toHaveBeenCalledWith('friendship-1', 'Nuevo Rival'))
    expect(onAction).toHaveBeenCalledWith('Apodo actualizado', 'success')
    expect(onRefresh).toHaveBeenCalled()
  })

  it('muestra errores de apodo e invitacion cuando las acciones fallan', async () => {
    ;(updateFriendNickname as jest.Mock).mockResolvedValue({ success: false })
    ;(inviteToPlay as jest.Mock).mockResolvedValue({ success: false })
    const onAction = jest.fn()

    render(<FriendsList friends={[friend]} onChat={jest.fn()} onRemove={jest.fn()} onAction={onAction} onRefresh={jest.fn()} />)

    fireEvent.click(screen.getByTitle('Invitar a jugar'))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al enviar invitación', 'error'))

    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getAllByRole('button')[0])

    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al actualizar apodo', 'error'))
  })

  it('renderiza solicitudes vacias y procesa aceptacion y rechazo', async () => {
    const onAction = jest.fn()
    const onRefresh = jest.fn()
    const request = {
      friendshipId: 'request-1',
      profile: { username: 'solicitante', level: 3, avatar_url: null },
    }
    const { rerender } = render(<FriendRequests requests={[]} onAction={onAction} onRefresh={onRefresh} />)

    expect(screen.getByText('Sin Solicitudes Pendientes')).toBeInTheDocument()

    rerender(<FriendRequests requests={[request]} onAction={onAction} onRefresh={onRefresh} />)
    expect(screen.getByText('solicitante')).toBeInTheDocument()
    expect(screen.getByText('Nivel 3')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Aceptar'))
    await waitFor(() => expect(acceptFriendRequest).toHaveBeenCalledWith('request-1'))
    expect(onAction).toHaveBeenCalledWith('¡Solicitud aceptada!', 'success')
    expect(onRefresh).toHaveBeenCalled()

    fireEvent.click(screen.getByTitle('Rechazar'))
    await waitFor(() => expect(removeFriendship).toHaveBeenCalledWith('request-1'))
    expect(onAction).toHaveBeenCalledWith('Solicitud rechazada', 'info')
  })

  it('propaga mensajes de error al aceptar o rechazar solicitudes', async () => {
    ;(acceptFriendRequest as jest.Mock).mockResolvedValue({ success: false, error: 'No puedes aceptar' })
    ;(removeFriendship as jest.Mock).mockResolvedValue({ success: false, error: 'No puedes rechazar' })
    const onAction = jest.fn()
    const request = {
      friendshipId: 'request-1',
      profile: { username: 'solicitante', level: 3, avatar_url: null },
    }

    render(<FriendRequests requests={[request]} onAction={onAction} onRefresh={jest.fn()} />)

    fireEvent.click(screen.getByTitle('Aceptar'))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('No puedes aceptar', 'error'))

    fireEvent.click(screen.getByTitle('Rechazar'))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('No puedes rechazar', 'error'))
  })

  it('usa mensajes de error seguros cuando las solicitudes fallan sin detalle', async () => {
    ;(acceptFriendRequest as jest.Mock).mockResolvedValue({ success: false })
    ;(removeFriendship as jest.Mock).mockResolvedValue({ success: false })
    const onAction = jest.fn()
    const request = {
      friendshipId: 'request-1',
      profile: { username: 'solicitante', level: 3, avatar_url: null },
    }

    render(<FriendRequests requests={[request]} onAction={onAction} onRefresh={jest.fn()} />)

    fireEvent.click(screen.getByTitle('Aceptar'))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al aceptar solicitud', 'error'))

    fireEvent.click(screen.getByTitle('Rechazar'))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al procesar', 'error'))
  })

  it('muestra el avatar de una solicitud cuando está disponible', () => {
    const request = {
      friendshipId: 'request-1',
      profile: { username: 'solicitante', level: 3, avatar_url: 'avatar-ok' },
    }

    render(<FriendRequests requests={[request]} onAction={jest.fn()} onRefresh={jest.fn()} />)

    expect(screen.getByTestId('avatar-svg')).toBeInTheDocument()
    expect(screen.getByText('solicitante')).toBeInTheDocument()
  })

  it('carga mensajes directos, se suscribe al canal y envia un mensaje', async () => {
    ;(getDirectMessages as jest.Mock).mockResolvedValue([
      { id: 'msg-1', sender_id: 'me-1', receiver_id: 'friend-1', content: 'Hola rival', created_at: '2026-06-01T10:00:00.000Z' },
      { id: 'msg-2', sender_id: 'friend-1', receiver_id: 'me-1', content: 'Listo para jugar', created_at: '2026-06-01T10:01:00.000Z' },
    ])

    const { unmount } = render(<DirectChat friend={friend} onClose={jest.fn()} />)

    expect(await screen.findByText('Hola rival')).toBeInTheDocument()
    expect(screen.getByText('Listo para jugar')).toBeInTheDocument()
    expect(getDirectMessages).toHaveBeenCalledWith('friend-1')
    expect(channel).toHaveBeenCalledWith('chat-friend-1')
    expect(on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ table: 'direct_messages' }), expect.any(Function))

    fireEvent.change(screen.getByPlaceholderText('Mensaje...'), { target: { value: 'Voy entrando' } })
    fireEvent.submit(screen.getByPlaceholderText('Mensaje...').closest('form')!)

    await waitFor(() => expect(sendDirectMessage).toHaveBeenCalledWith('friend-1', 'Voy entrando'))
    expect(screen.getByPlaceholderText('Mensaje...')).toHaveValue('')

    unmount()
    expect(removeChannel).toHaveBeenCalledWith('channel-1')
  })

  it('muestra estado vacio de chat y evita enviar mensajes en blanco', async () => {
    render(<DirectChat friend={{ ...friend, status: 'offline', nickname: undefined }} onClose={jest.fn()} />)

    expect(await screen.findByText(/Inicia/)).toBeInTheDocument()
    expect(screen.getByText('rivalUno')).toBeInTheDocument()
    expect(screen.getByText('Desconectado')).toBeInTheDocument()

    fireEvent.submit(screen.getByPlaceholderText('Mensaje...').closest('form')!)

    expect(sendDirectMessage).not.toHaveBeenCalled()
  })

  it('incorpora solo mensajes realtime relacionados con la conversación', async () => {
    render(<DirectChat friend={friend} onClose={jest.fn()} />)

    expect(await screen.findByText(/Inicia/)).toBeInTheDocument()
    const realtimeHandler = [...on.mock.calls].reverse().find(([event]) => event === 'postgres_changes')?.[2]
    expect(realtimeHandler).toEqual(expect.any(Function))
    if (!realtimeHandler) throw new Error('No se registró el handler realtime del chat')

    act(() => {
      realtimeHandler({
        new: { id: 'ignored', sender_id: 'other-1', receiver_id: 'other-2', content: 'Mensaje ajeno', created_at: '2026-06-01T10:02:00.000Z' },
      })
    })
    expect(screen.queryByText('Mensaje ajeno')).not.toBeInTheDocument()

    act(() => {
      realtimeHandler({
        new: { id: 'incoming', sender_id: 'friend-1', receiver_id: 'me-1', content: 'Mensaje entrante', created_at: '2026-06-01T10:03:00.000Z' },
      })
      realtimeHandler({
        new: { id: 'outgoing', sender_id: 'me-1', receiver_id: 'friend-1', content: 'Mensaje saliente', created_at: '2026-06-01T10:04:00.000Z' },
      })
    })

    expect(screen.getByText('Mensaje entrante')).toBeInTheDocument()
    expect(screen.getByText('Mensaje saliente')).toBeInTheDocument()
  })

  it('registra el error y permite reintentar cuando falla un mensaje', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ;(sendDirectMessage as jest.Mock).mockResolvedValue({ error: 'No se pudo enviar' })
    render(<DirectChat friend={friend} onClose={jest.fn()} />)

    await screen.findByText(/Inicia/)
    const input = screen.getByPlaceholderText('Mensaje...')
    const submitButton = input.closest('form')!.querySelector('button')!
    fireEvent.change(input, { target: { value: 'Mensaje con error' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith('No se pudo enviar'))
    fireEvent.change(input, { target: { value: 'Intentar de nuevo' } })
    expect(submitButton).not.toBeDisabled()
    consoleError.mockRestore()
  })

  it('muestra avatar y estado cuando el amigo está en partida', async () => {
    render(<DirectChat friend={{ ...friend, status: 'in-game', profile: { ...friend.profile, avatar_url: 'avatar-ok' } }} onClose={jest.fn()} />)

    expect(await screen.findByText('En Partida')).toBeInTheDocument()
    expect(screen.getByTestId('avatar-svg')).toBeInTheDocument()
  })
})
