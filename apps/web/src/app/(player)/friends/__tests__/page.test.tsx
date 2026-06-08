import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FriendsPage from '../page'
import { getFriendships, removeFriendship } from '@/app/actions/social-actions'
import { createClient } from '@/utils/supabase/client'
import { usePresence } from '@/hooks/usePresence'

const searchParamsGet = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: searchParamsGet }),
}))

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, layoutId: _layoutId, ...props }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
      layoutId?: string
    }) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/app/actions/social-actions', () => ({
  getFriendships: jest.fn(),
  removeFriendship: jest.fn(),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/hooks/usePresence', () => ({
  usePresence: jest.fn(),
}))

jest.mock('@/components/ui/Toast', () => ({
  Toast: ({ message, type }: { message: string; type: string }) => <div role="status">{type}: {message}</div>,
}))

jest.mock('../_components/FriendsList', () => ({
  FriendsList: ({ friends, onChat, onRemove, onAction, onRefresh }: {
    friends: Array<{ friendshipId: string; nickname?: string; status: string; profile: { id: string; username: string } }>
    onChat: (friend: unknown) => void
    onRemove: (id: string) => void
    onAction: (message: string, type: string) => void
    onRefresh: () => void
  }) => (
    <div>
      <p>Lista amigos: {friends.length}</p>
      <button type="button" onClick={onRefresh}>Refrescar amigos</button>
      <button type="button" onClick={() => onRemove('missing-friendship')}>Eliminar inexistente</button>
      {friends.map((friend) => (
        <article key={friend.friendshipId}>
          <span>{friend.nickname || friend.profile.username}</span>
          <span>{friend.status}</span>
          <button type="button" onClick={() => onChat(friend)}>Chat {friend.profile.username}</button>
          <button type="button" onClick={() => onRemove(friend.friendshipId)}>Eliminar {friend.profile.username}</button>
          <button type="button" onClick={() => onAction('Accion lista', 'success')}>Toast lista</button>
        </article>
      ))}
    </div>
  ),
}))

jest.mock('../_components/FriendRequests', () => ({
  FriendRequests: ({ requests, onAction, onRefresh }: {
    requests: Array<{ id: string; requester: { username: string } }>
    onAction: (message: string, type: string) => void
    onRefresh: () => void
  }) => (
    <div>
      <p>Solicitudes pendientes: {requests.length}</p>
      {requests.map((request) => <span key={request.id}>{request.requester.username}</span>)}
      <button type="button" onClick={() => onAction('Solicitud aceptada', 'success')}>Responder solicitud</button>
      <button type="button" onClick={onRefresh}>Refrescar solicitudes</button>
    </div>
  ),
}))

jest.mock('../_components/AddFriendModal', () => ({
  AddFriendModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <button type="button" onClick={onClose}>Cerrar agregar amigo</button> : null
  ),
}))

jest.mock('../_components/DirectChat', () => ({
  DirectChat: ({ friend, onClose }: { friend: { profile: { username: string } }; onClose: () => void }) => (
    <section aria-label="chat directo">
      Chat con {friend.profile.username}
      <button type="button" onClick={onClose}>Cerrar chat</button>
    </section>
  ),
}))

const mockGetFriendships = getFriendships as jest.MockedFunction<typeof getFriendships>
const mockRemoveFriendship = removeFriendship as jest.MockedFunction<typeof removeFriendship>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockUsePresence = usePresence as jest.MockedFunction<typeof usePresence>

const friendships = {
  friends: [
    { friendshipId: 'friendship-1', nickname: 'Alias Ana', profile: { id: 'friend-1', username: 'Ana' } },
  ],
  pendingIncoming: [
    { id: 'request-1', requester: { username: 'Luis' } },
  ],
  pendingOutgoing: [],
}

function mockSupabaseRealtime() {
  const channel = { name: 'friendships-changes' }
  const on = jest.fn().mockReturnThis()
  const subscribe = jest.fn().mockReturnValue(channel)
  const removeChannel = jest.fn()

  mockCreateClient.mockReturnValue({
    channel: jest.fn(() => ({ on, subscribe })),
    removeChannel,
  } as never)

  return { on, subscribe, removeChannel }
}

describe('FriendsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    searchParamsGet.mockReturnValue(null)
    mockSupabaseRealtime()
    mockUsePresence.mockReturnValue({ getStatus: (id: string) => id === 'friend-1' ? 'online' : 'offline' } as never)
    mockGetFriendships.mockResolvedValue(friendships as never)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('carga amigos, agrega presencia realtime y abre modal para agregar', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<FriendsPage />)

    expect(screen.getByText('Sincronizando círculo...')).toBeInTheDocument()
    expect(await screen.findByText('Lista amigos: 1')).toBeInTheDocument()
    expect(screen.getByText('Alias Ana')).toBeInTheDocument()
    expect(screen.getByText('online')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Agregar amigo'))

    expect(screen.getByRole('button', { name: 'Cerrar agregar amigo' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar agregar amigo' }))
    expect(screen.queryByRole('button', { name: 'Cerrar agregar amigo' })).not.toBeInTheDocument()
  })

  it('refresca por evento realtime y remueve canal al desmontar', async () => {
    const realtime = mockSupabaseRealtime()

    const { unmount } = render(<FriendsPage />)
    await screen.findByText('Lista amigos: 1')

    const realtimeHandler = realtime.on.mock.calls[0]?.[2]
    await act(async () => {
      realtimeHandler()
    })

    expect(mockGetFriendships).toHaveBeenCalledTimes(2)
    unmount()
    expect(realtime.removeChannel).toHaveBeenCalledWith({ name: 'friendships-changes' })
  })

  it('muestra solicitudes pendientes al cambiar de pestaña', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<FriendsPage />)

    await screen.findByText('Lista amigos: 1')
    await user.click(screen.getByRole('button', { name: /solicitudes/i }))

    expect(screen.getByText('Solicitudes pendientes: 1')).toBeInTheDocument()
    expect(screen.getByText('Luis')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Responder solicitud' }))
    await act(async () => {
      jest.advanceTimersByTime(20)
    })
    expect(screen.getByRole('status')).toHaveTextContent('success: Solicitud aceptada')

    await user.click(screen.getByRole('button', { name: 'Refrescar solicitudes' }))
    expect(mockGetFriendships).toHaveBeenCalledTimes(2)
  })

  it('abre chat desde querystring cuando el amigo existe', async () => {
    searchParamsGet.mockReturnValue('friend-1')

    render(<FriendsPage />)

    expect(await screen.findByLabelText('chat directo')).toHaveTextContent('Chat con Ana')
    expect(searchParamsGet).toHaveBeenCalledWith('chat')
  })

  it('ignora querystring de chat si no corresponde a un amigo cargado', async () => {
    searchParamsGet.mockReturnValue('friend-missing')

    render(<FriendsPage />)

    await screen.findByText('Lista amigos: 1')
    expect(screen.queryByLabelText('chat directo')).not.toBeInTheDocument()
  })

  it('abre y cierra chat desde la lista, y permite acciones/refresh de lista', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    const { container } = render(<FriendsPage />)
    await screen.findByText('Lista amigos: 1')

    await user.click(screen.getByRole('button', { name: 'Chat Ana' }))
    expect(screen.getByLabelText('chat directo')).toHaveTextContent('Chat con Ana')
    const chatBackdrop = Array.from(container.querySelectorAll('div')).find((el) => el.className.includes('bg-black/60'))
    expect(chatBackdrop).toBeTruthy()
    await user.click(chatBackdrop as HTMLElement)
    expect(screen.queryByLabelText('chat directo')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Chat Ana' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar chat' }))
    expect(screen.queryByLabelText('chat directo')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toast lista' }))
    await act(async () => {
      jest.advanceTimersByTime(20)
    })
    expect(screen.getByRole('status')).toHaveTextContent('success: Accion lista')

    await user.click(screen.getByRole('button', { name: 'Refrescar amigos' }))
    expect(mockGetFriendships).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: 'Eliminar inexistente' }))
    expect(screen.queryByText('¿Eliminar Amigo?')).not.toBeInTheDocument()
  })

  it('confirma eliminacion de amigo, refresca datos y muestra toast de exito', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    mockRemoveFriendship.mockResolvedValue({ success: true } as never)

    render(<FriendsPage />)

    await screen.findByText('Lista amigos: 1')
    await user.click(screen.getByRole('button', { name: 'Eliminar Ana' }))
    expect(screen.getByText('¿Eliminar Amigo?')).toBeInTheDocument()
    expect(screen.getAllByText('Alias Ana')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Sí, Eliminar' }))
    await act(async () => {
      jest.advanceTimersByTime(20)
    })

    await waitFor(() => expect(mockRemoveFriendship).toHaveBeenCalledWith('friendship-1'))
    expect(mockGetFriendships).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('success: Amigo eliminado correctamente')
  })

  it('permite cancelar el modal de eliminación con botón cancelar y cerrar', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    const { container } = render(<FriendsPage />)
    await screen.findByText('Lista amigos: 1')

    await user.click(screen.getByRole('button', { name: 'Eliminar Ana' }))
    expect(screen.getByText('¿Eliminar Amigo?')).toBeInTheDocument()
    const deleteBackdrop = Array.from(container.querySelectorAll('div')).find((el) => el.className.includes('bg-black/80'))
    expect(deleteBackdrop).toBeTruthy()
    await user.click(deleteBackdrop as HTMLElement)
    expect(screen.queryByText('¿Eliminar Amigo?')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar Ana' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('¿Eliminar Amigo?')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar Ana' }))
    await user.click(screen.getByLabelText('Cerrar'))
    expect(screen.queryByText('¿Eliminar Amigo?')).not.toBeInTheDocument()
    expect(mockRemoveFriendship).not.toHaveBeenCalled()
  })

  it('usa username como nombre a eliminar si el amigo no tiene nickname', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    mockGetFriendships.mockResolvedValueOnce({
      friends: [
        { friendshipId: 'friendship-1', nickname: undefined, profile: { id: 'friend-1', username: 'Ana' } },
      ],
      pendingIncoming: [],
      pendingOutgoing: [],
    } as never)

    render(<FriendsPage />)

    await screen.findByText('Lista amigos: 1')
    await user.click(screen.getByRole('button', { name: 'Eliminar Ana' }))

    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0)
  })

  it('muestra toast de error si falla eliminar amigo', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    mockRemoveFriendship.mockResolvedValue({ success: false } as never)

    render(<FriendsPage />)

    await screen.findByText('Lista amigos: 1')
    await user.click(screen.getByRole('button', { name: 'Eliminar Ana' }))
    await user.click(screen.getByRole('button', { name: 'Sí, Eliminar' }))
    await act(async () => {
      jest.advanceTimersByTime(20)
    })

    expect(screen.getByRole('status')).toHaveTextContent('error: Error al eliminar amigo')
  })
})
