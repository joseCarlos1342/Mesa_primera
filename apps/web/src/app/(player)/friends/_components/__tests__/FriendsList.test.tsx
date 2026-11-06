import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FriendsList, presenceOf } from '../FriendsList'
import { inviteToPlay, updateFriendNickname } from '@/app/actions/social-actions'
import { getAvatarSvg } from '@/utils/avatars'

jest.mock('@/app/actions/social-actions', () => ({ inviteToPlay: jest.fn(), updateFriendNickname: jest.fn() }))
jest.mock('@/utils/avatars', () => ({ getAvatarSvg: jest.fn(() => null) }))

const friend = { friendshipId: 'friendship-1', profile: { id: 'user-2', username: 'beto', avatar_url: null, level: 5 }, status: 'online' as const, nickname: 'Beto VIP' }

describe('FriendsList', () => {
  const onChat = jest.fn(); const onRemove = jest.fn(); const onAction = jest.fn(); const onRefresh = jest.fn(); const onAdd = jest.fn()
  beforeEach(() => { jest.clearAllMocks(); (inviteToPlay as jest.Mock).mockResolvedValue({ success: true }); (updateFriendNickname as jest.Mock).mockResolvedValue({ success: true }) })

  it('mapea el estado de presencia a su etiqueta y colores', () => {
    expect(presenceOf('online').label).toBe('En línea')
    expect(presenceOf('in-game').label).toBe('En partida')
    expect(presenceOf('offline').label).toBe('Desconectado')
    // Sin estado se asume desconectado.
    expect(presenceOf().label).toBe('Desconectado')
  })

  it('muestra estado vacío sin amigos y dispara onAdd', () => {
    render(<FriendsList friends={[]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} onAdd={onAdd} />)
    expect(screen.getByText('Aún no tienes amigos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Agregar amigo' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('no renderiza botón de agregar en el estado vacío sin onAdd', () => {
    render(<FriendsList friends={[]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)
    expect(screen.getByText('Aún no tienes amigos')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar amigo' })).not.toBeInTheDocument()
  })

  it('ejecuta chat, eliminación, invitación y actualización de apodo', async () => {
    render(<FriendsList friends={[friend]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} onAdd={onAdd} />)
    expect(screen.getByText('Beto VIP')).toBeInTheDocument()
    expect(screen.getByText('En línea')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mensaje' }))
    expect(onChat).toHaveBeenCalledWith(friend)

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar a Beto VIP' }))
    expect(onRemove).toHaveBeenCalledWith('friendship-1')

    fireEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    await waitFor(() => expect(inviteToPlay).toHaveBeenCalledWith('user-2'))
    expect(onAction).toHaveBeenCalledWith('Invitación enviada', 'success')

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar apodo de Beto VIP' }))
    const input = screen.getByDisplayValue('Beto VIP')
    fireEvent.change(input, { target: { value: 'Nuevo Beto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar apodo' }))
    await waitFor(() => expect(updateFriendNickname).toHaveBeenCalledWith('friendship-1', 'Nuevo Beto'))
    expect(onAction).toHaveBeenCalledWith('Apodo actualizado', 'success')
    expect(onRefresh).toHaveBeenCalled()
  })

  it('muestra errores de invitación y apodo sin refrescar', async () => {
    ;(inviteToPlay as jest.Mock).mockResolvedValueOnce({ success: false })
    ;(updateFriendNickname as jest.Mock).mockResolvedValueOnce({ success: false })
    const offlineFriend = { ...friend, status: 'offline' as const, nickname: undefined }
    render(<FriendsList friends={[offlineFriend]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)

    expect(screen.getByText('Desconectado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al enviar invitación', 'error'))

    // Sin nickname el aria usa el username.
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar apodo de beto' }))
    const input = screen.getByDisplayValue('')
    fireEvent.change(input, { target: { value: 'Alias' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar apodo' }))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al actualizar apodo', 'error'))
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('muestra avatar SVG cuando el perfil lo tiene configurado y estado en partida', () => {
    ;(getAvatarSvg as jest.Mock).mockReturnValue(<svg data-testid="friend-avatar" />)
    render(<FriendsList friends={[{ ...friend, profile: { ...friend.profile, avatar_url: 'avatar-ok' }, status: 'in-game' }]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)
    expect(screen.getByTestId('friend-avatar')).toBeInTheDocument()
    expect(screen.getByText('En partida')).toBeInTheDocument()
  })

  it('cancela la edición sin persistir cambios', () => {
    render(<FriendsList friends={[friend]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar apodo de Beto VIP' }))
    expect(screen.getByDisplayValue('Beto VIP')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar apodo' }))
    expect(screen.getByText('Beto VIP')).toBeInTheDocument()
    expect(updateFriendNickname).not.toHaveBeenCalled()
  })

  it('muestra el username junto al apodo cuando ambos existen', () => {
    render(<FriendsList friends={[friend]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)
    expect(screen.getByText('Beto VIP')).toBeInTheDocument()
    expect(screen.getByText(/beto/)).toBeInTheDocument()
  })
})
