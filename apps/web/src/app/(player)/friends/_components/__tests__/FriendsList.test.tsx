import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FriendsList } from '../FriendsList'
import { inviteToPlay, updateFriendNickname } from '@/app/actions/social-actions'
import { getAvatarSvg } from '@/utils/avatars'

jest.mock('framer-motion', () => ({ motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div> } }))
jest.mock('@/app/actions/social-actions', () => ({ inviteToPlay: jest.fn(), updateFriendNickname: jest.fn() }))
jest.mock('@/utils/avatars', () => ({ getAvatarSvg: jest.fn(() => null) }))

const friend = { friendshipId: 'friendship-1', profile: { id: 'user-2', username: 'beto', avatar_url: null, level: 5 }, status: 'online' as const, nickname: 'Beto VIP' }

describe('FriendsList', () => {
  const onChat = jest.fn(); const onRemove = jest.fn(); const onAction = jest.fn(); const onRefresh = jest.fn()
  beforeEach(() => { jest.clearAllMocks(); (inviteToPlay as jest.Mock).mockResolvedValue({ success: true }); (updateFriendNickname as jest.Mock).mockResolvedValue({ success: true }) })

  it('muestra estado vacío sin amigos', () => {
    render(<FriendsList friends={[]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)
    expect(screen.getByText('Tu círculo está vacío')).toBeInTheDocument()
  })

  it('ejecuta chat, eliminación, invitación y actualización de apodo', async () => {
    render(<FriendsList friends={[friend]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByTitle('Escribir')); fireEvent.click(screen.getByTitle('Borrar amigo'))
    expect(onChat).toHaveBeenCalledWith(friend); expect(onRemove).toHaveBeenCalledWith('friendship-1')
    fireEvent.click(screen.getByTitle('Invitar a jugar'))
    await waitFor(() => expect(inviteToPlay).toHaveBeenCalledWith('user-2'))
    expect(onAction).toHaveBeenCalledWith('¡Invitación enviada!', 'success')
    fireEvent.click(screen.getByRole('button', { name: '' }))
    const input = screen.getByDisplayValue('Beto VIP'); fireEvent.change(input, { target: { value: 'Nuevo Beto' } })
    fireEvent.click(input.parentElement!.querySelector('button')!)
    await waitFor(() => expect(updateFriendNickname).toHaveBeenCalledWith('friendship-1', 'Nuevo Beto'))
    expect(onRefresh).toHaveBeenCalled()
  })

  it('muestra errores de invitación y apodo sin refrescar', async () => {
    ;(inviteToPlay as jest.Mock).mockResolvedValueOnce({ success: false })
    ;(updateFriendNickname as jest.Mock).mockResolvedValueOnce({ success: false })
    const offlineFriend = { ...friend, status: 'offline' as const, nickname: undefined }
    render(<FriendsList friends={[offlineFriend]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)

    expect(screen.getByText('Desconectado')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Invitar a jugar'))
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al enviar invitación', 'error'))

    fireEvent.click(screen.getByRole('button', { name: '' }))
    const input = screen.getByDisplayValue(''); fireEvent.change(input, { target: { value: 'Alias' } })
    fireEvent.click(input.parentElement!.querySelector('button')!)
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('Error al actualizar apodo', 'error'))
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('muestra avatar SVG cuando el perfil lo tiene configurado', () => {
    ;(getAvatarSvg as jest.Mock).mockReturnValue(<svg data-testid="friend-avatar" />)
    render(<FriendsList friends={[{ ...friend, profile: { ...friend.profile, avatar_url: 'avatar-ok' }, status: 'in-game' }]} onChat={onChat} onRemove={onRemove} onAction={onAction} onRefresh={onRefresh} />)
    expect(screen.getByTestId('friend-avatar')).toBeInTheDocument()
    expect(screen.getByText('En Partida')).toBeInTheDocument()
  })
})
