import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  /* ── AddFriendModal ───────────────────────────────────────── */

  it('mantiene cerrado el modal de agregar amigo cuando isOpen es false', () => {
    render(<AddFriendModal isOpen={false} onClose={jest.fn()} />)

    expect(screen.queryByText('Agregar amigo')).not.toBeInTheDocument()
  })

  it('exige al menos 3 caracteres antes de buscar', async () => {
    render(<AddFriendModal isOpen onClose={jest.fn()} />)

    const input = screen.getByPlaceholderText('Nombre, apodo o teléfono...')
    fireEvent.change(input, { target: { value: 'ju' } })
    // Pista de longitud mínima visible y botón deshabilitado.
    expect(screen.getByText('Escribe al menos 3 letras o números.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled()

    fireEvent.submit(input.closest('form')!)
    expect(searchUsers).not.toHaveBeenCalled()
  })

  it('busca jugadores y marca la solicitud como enviada', async () => {
    ;(searchUsers as jest.Mock).mockResolvedValue([
      { id: 'user-2', username: 'jugadorUno', full_name: 'Jugador Uno', level: 4, avatar_url: 'avatar-ok' },
    ])

    render(<AddFriendModal isOpen onClose={jest.fn()} />)

    const input = screen.getByPlaceholderText('Nombre, apodo o teléfono...')
    fireEvent.change(input, { target: { value: 'jug' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('jugadorUno')).toBeInTheDocument()
    expect(screen.getByText('Jugador Uno')).toBeInTheDocument()
    expect(screen.getByTestId('avatar-svg')).toBeInTheDocument()
    expect(searchUsers).toHaveBeenCalledWith('jug')

    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a jugadorUno' }))

    await waitFor(() => expect(sendFriendRequest).toHaveBeenCalledWith('user-2'))
    expect(await screen.findByText('Enviada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar solicitud a jugadorUno' })).not.toBeInTheDocument()
  })

  it('muestra el nivel cuando el resultado no tiene nombre completo', async () => {
    ;(searchUsers as jest.Mock).mockResolvedValue([
      { id: 'user-3', username: 'sinNombre', full_name: null, level: 9, avatar_url: null },
    ])

    render(<AddFriendModal isOpen onClose={jest.fn()} />)
    const input = screen.getByPlaceholderText('Nombre, apodo o teléfono...')
    fireEvent.change(input, { target: { value: 'sin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('Nivel 9')).toBeInTheDocument()
  })

  it('muestra error cuando la solicitud de amistad falla', async () => {
    ;(searchUsers as jest.Mock).mockResolvedValue([
      { id: 'user-2', username: 'jugadorUno', full_name: 'Jugador Uno', level: 4, avatar_url: null },
    ])
    ;(sendFriendRequest as jest.Mock).mockResolvedValue({ success: false, error: 'Ya son amigos' })

    render(<AddFriendModal isOpen onClose={jest.fn()} />)
    const input = screen.getByPlaceholderText('Nombre, apodo o teléfono...')
    fireEvent.change(input, { target: { value: 'jug' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar solicitud a jugadorUno' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya son amigos')
  })

  it('usa un error genérico cuando la solicitud falla sin detalle', async () => {
    ;(searchUsers as jest.Mock).mockResolvedValue([
      { id: 'user-2', username: 'jugadorUno', full_name: 'Jugador Uno', level: 4, avatar_url: null },
    ])
    ;(sendFriendRequest as jest.Mock).mockResolvedValue({ success: false })

    render(<AddFriendModal isOpen onClose={jest.fn()} />)
    const input = screen.getByPlaceholderText('Nombre, apodo o teléfono...')
    fireEvent.change(input, { target: { value: 'jug' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar solicitud a jugadorUno' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar la solicitud.')
  })

  it('muestra mensaje sin resultados cuando la busqueda no encuentra jugadores', async () => {
    render(<AddFriendModal isOpen onClose={jest.fn()} />)

    const input = screen.getByPlaceholderText('Nombre, apodo o teléfono...')
    fireEvent.change(input, { target: { value: 'zzz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('No se encontraron jugadores.')).toBeInTheDocument()
  })

  /* ── FriendsList ──────────────────────────────────────────── */

  it('renderiza estado vacio de amigos', () => {
    render(<FriendsList friends={[]} onChat={jest.fn()} onRemove={jest.fn()} onAction={jest.fn()} onRefresh={jest.fn()} />)

    expect(screen.getByText('Aún no tienes amigos')).toBeInTheDocument()
  })

  it('permite chatear, invitar, borrar y actualizar apodo de un amigo', async () => {
    const onChat = jest.fn()
    const onRemove = jest.fn()
    const onAction = jest.fn()
    const onRefresh = jest.fn()

    render(<FriendsList friends={[friend]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)

    expect(screen.getByText('El Rival')).toBeInTheDocument()
    expect(screen.getByText('En línea')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mensaje' }))
    expect(onChat).toHaveBeenCalledWith(friend)

    fireEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    await waitFor(() => expect(inviteToPlay).toHaveBeenCalledWith('friend-1'))
    expect(onAction).toHaveBeenCalledWith('Invitación enviada', 'success')

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar a El Rival' }))
    expect(onRemove).toHaveBeenCalledWith('friendship-1')

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar apodo de El Rival' }))
    fireEvent.change(screen.getByDisplayValue('El Rival'), { target: { value: 'Nuevo Rival' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar apodo' }))

    await waitFor(() => expect(updateFriendNickname).toHaveBeenCalledWith('friendship-1', 'Nuevo Rival'))
    expect(onAction).toHaveBeenCalledWith('Apodo actualizado', 'success')
    expect(onRefresh).toHaveBeenCalled()
  })

  it('muestra errores de apodo e invitacion cuando las acciones fallan', async () => {
    ;(updateFriendNickname as jest.Mock).mockResolvedValue({ success: false })
    ;(inviteToPlay as jest.Mock).mockResolvedValue({ success: false })
    const onAction = jest.fn()

    render(<FriendsList friends={[friend]} onChat={jest.fn()} onRemove={jest.fn()} onAction={onAction} onRefresh={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al enviar invitación', 'error'))

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar apodo de El Rival' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar apodo' }))

    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al actualizar apodo', 'error'))
  })

  /* ── FriendRequests ───────────────────────────────────────── */

  it('renderiza solicitudes vacias y procesa aceptacion y rechazo', async () => {
    const onAction = jest.fn()
    const onRefresh = jest.fn()
    const request = {
      friendshipId: 'request-1',
      profile: { username: 'solicitante', level: 3, avatar_url: null },
    }
    const { rerender } = render(<FriendRequests requests={[]} onAction={onAction} onRefresh={onRefresh} />)

    expect(screen.getByText('Sin solicitudes pendientes')).toBeInTheDocument()

    rerender(<FriendRequests requests={[request]} onAction={onAction} onRefresh={onRefresh} />)
    expect(screen.getByText('solicitante')).toBeInTheDocument()
    expect(screen.getByText('Nivel 3 · quiere ser tu amigo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    await waitFor(() => expect(acceptFriendRequest).toHaveBeenCalledWith('request-1'))
    expect(onAction).toHaveBeenCalledWith('Solicitud aceptada', 'success')
    expect(onRefresh).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('No puedes aceptar', 'error'))

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al aceptar solicitud', 'error'))

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
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

  /* ── DirectChat ───────────────────────────────────────────── */

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

    const input = screen.getByPlaceholderText('Escribe un mensaje…')
    fireEvent.change(input, { target: { value: 'Voy entrando' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(sendDirectMessage).toHaveBeenCalledWith('friend-1', 'Voy entrando'))
    expect(input).toHaveValue('')

    unmount()
    expect(removeChannel).toHaveBeenCalledWith('channel-1')
  })

  it('muestra estado vacio de chat y evita enviar mensajes en blanco', async () => {
    render(<DirectChat friend={{ ...friend, status: 'offline', nickname: undefined }} onClose={jest.fn()} />)

    expect(await screen.findByText('Inicia la conversación')).toBeInTheDocument()
    // El título de la hoja usa el username al no haber nickname.
    expect(screen.getByRole('heading', { name: 'rivalUno' })).toBeInTheDocument()
    expect(screen.getByText('Desconectado')).toBeInTheDocument()

    fireEvent.submit(screen.getByPlaceholderText('Escribe un mensaje…').closest('form')!)

    expect(sendDirectMessage).not.toHaveBeenCalled()
  })

  it('incorpora solo mensajes realtime relacionados con la conversación', async () => {
    render(<DirectChat friend={friend} onClose={jest.fn()} />)

    expect(await screen.findByText('Inicia la conversación')).toBeInTheDocument()
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

  it('muestra error y restaura el texto cuando falla el envío de un mensaje', async () => {
    ;(sendDirectMessage as jest.Mock).mockResolvedValue({ error: 'No se pudo enviar' })
    render(<DirectChat friend={friend} onClose={jest.fn()} />)

    await screen.findByText('Inicia la conversación')
    const input = screen.getByPlaceholderText('Escribe un mensaje…')
    fireEvent.change(input, { target: { value: 'Mensaje con error' } })
    fireEvent.submit(input.closest('form')!)

    // El error se anuncia y el texto se restaura para reintentar.
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar el mensaje. Inténtalo de nuevo.')
    await waitFor(() => expect(input).toHaveValue('Mensaje con error'))
  })

  it('muestra avatar y estado cuando el amigo está en partida', async () => {
    render(<DirectChat friend={{ ...friend, status: 'in-game', profile: { ...friend.profile, avatar_url: 'avatar-ok' } }} onClose={jest.fn()} />)

    expect(await screen.findByText('En partida')).toBeInTheDocument()
    expect(screen.getByTestId('avatar-svg')).toBeInTheDocument()
  })

  it('cierra el chat al tocar el botón de cerrar', async () => {
    const onClose = jest.fn()
    render(<DirectChat friend={friend} onClose={onClose} />)

    await screen.findByText('Inicia la conversación')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar chat' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
