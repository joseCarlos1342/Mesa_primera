import {
  acceptFriendRequest,
  getFriendships,
  inviteToPlay,
  searchUsers,
  sendDirectMessage,
  sendFriendRequest,
  updateFriendNickname,
} from '../social-actions'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const currentUser = {
  id: 'user-123',
  email: 'rivera@mesa.test',
  user_metadata: { username: 'Rivera' },
}

function buildAuth(user: typeof currentUser | null = currentUser) {
  return {
    getUser: jest.fn().mockResolvedValue({ data: { user } }),
  }
}

function queuedSupabase(queues: Record<string, unknown[]>, user: typeof currentUser | null = currentUser) {
  return {
    auth: buildAuth(user),
    from: jest.fn((table: string) => {
      const query = queues[table]?.shift()
      if (!query) throw new Error(`Unexpected social query: ${table}`)
      return query
    }),
  }
}

describe('social actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('no busca usuarios cuando el texto tiene menos de tres caracteres', async () => {
    await expect(searchUsers('jo')).resolves.toEqual([])
    expect(createClient).not.toHaveBeenCalled()
  })

  it('busca usuarios por username, nombre o teléfono excluyendo al usuario actual', async () => {
    const results = [{ id: 'friend-1', username: 'ana', full_name: 'Ana Mesa' }]
    const limit = jest.fn().mockResolvedValue({ data: results, error: null })
    const neq = jest.fn().mockReturnValue({ limit })
    const or = jest.fn().mockReturnValue({ neq })
    const select = jest.fn().mockReturnValue({ or })
    const supabase = queuedSupabase({ profiles: [{ select }] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(searchUsers('ana')).resolves.toEqual(results)
    expect(or).toHaveBeenCalledWith('username.ilike.%ana%,full_name.ilike.%ana%,phone.ilike.%ana%')
    expect(neq).toHaveBeenCalledWith('id', 'user-123')
    expect(limit).toHaveBeenCalledWith(10)
  })

  it('clasifica amistades aceptadas, pendientes entrantes y pendientes salientes', async () => {
    const friendships = [
      {
        id: 'friendship-accepted',
        status: 'accepted',
        user_id: 'user-123',
        friend_id: 'friend-1',
        friend: { id: 'friend-1', username: 'ana' },
        user: { id: 'user-123', username: 'rivera' },
        nickname_for_friend: 'Anita',
        nickname_for_user: null,
      },
      {
        id: 'friendship-incoming',
        status: 'pending',
        user_id: 'friend-2',
        friend_id: 'user-123',
        friend: { id: 'user-123', username: 'rivera' },
        user: { id: 'friend-2', username: 'carlos' },
      },
      {
        id: 'friendship-outgoing',
        status: 'pending',
        user_id: 'user-123',
        friend_id: 'friend-3',
        friend: { id: 'friend-3', username: 'lina' },
        user: { id: 'user-123', username: 'rivera' },
      },
    ]
    const or = jest.fn().mockResolvedValue({ data: friendships, error: null })
    const select = jest.fn().mockReturnValue({ or })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ friendships: [{ select }] }))

    const result = await getFriendships()

    expect(result.friends).toEqual([{ friendshipId: 'friendship-accepted', profile: { id: 'friend-1', username: 'ana' }, nickname: 'Anita' }])
    expect(result.pendingIncoming).toEqual([{ friendshipId: 'friendship-incoming', profile: { id: 'friend-2', username: 'carlos' } }])
    expect(result.pendingOutgoing).toEqual([{ friendshipId: 'friendship-outgoing', profile: { id: 'friend-3', username: 'lina' } }])
    expect(or).toHaveBeenCalledWith('user_id.eq.user-123,friend_id.eq.user-123')
  })

  it('crea una solicitud de amistad y notifica al receptor', async () => {
    const friendshipInsert = jest.fn().mockResolvedValue({ error: null })
    const notificationInsert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      friendships: [{ insert: friendshipInsert }],
      notifications: [{ insert: notificationInsert }],
    }))

    await expect(sendFriendRequest('friend-1')).resolves.toEqual({ success: true })
    expect(friendshipInsert).toHaveBeenCalledWith({ user_id: 'user-123', friend_id: 'friend-1', status: 'pending' })
    expect(notificationInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'friend-1',
      type: 'friend_request',
      body: 'Rivera quiere ser tu amigo.',
      data: { senderId: 'user-123' },
    }))
    expect(revalidatePath).toHaveBeenCalledWith('/friends')
  })

  it('impide que un usuario se envíe solicitud a sí mismo', async () => {
    const supabase = queuedSupabase({})
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(sendFriendRequest('user-123')).resolves.toEqual({ error: 'No puedes amigarte a ti mismo' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('acepta una solicitud y notifica al iniciador original', async () => {
    const friendEq = jest.fn().mockResolvedValue({ error: null })
    const idEqForUpdate = jest.fn().mockReturnValue({ eq: friendEq })
    const update = jest.fn().mockReturnValue({ eq: idEqForUpdate })
    const single = jest.fn().mockResolvedValue({ data: { user_id: 'sender-1' }, error: null })
    const idEqForSelect = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq: idEqForSelect })
    const notificationInsert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      friendships: [{ update }, { select }],
      notifications: [{ insert: notificationInsert }],
    }))

    await expect(acceptFriendRequest('friendship-1')).resolves.toEqual({ success: true })
    expect(update).toHaveBeenCalledWith({ status: 'accepted' })
    expect(friendEq).toHaveBeenCalledWith('friend_id', 'user-123')
    expect(notificationInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'sender-1',
      type: 'friend_accepted',
      data: { friendId: 'user-123' },
    }))
  })

  it('envía mensaje directo y crea notificación truncada para el receptor', async () => {
    const message = 'x'.repeat(60)
    const single = jest.fn().mockResolvedValue({ data: { id: 'message-1', content: message }, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const messageInsert = jest.fn().mockReturnValue({ select })
    const notificationInsert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      direct_messages: [{ insert: messageInsert }],
      notifications: [{ insert: notificationInsert }],
    }))

    const result = await sendDirectMessage('friend-1', message)

    expect(result).toEqual({ success: true, message: { id: 'message-1', content: message } })
    expect(messageInsert).toHaveBeenCalledWith({ sender_id: 'user-123', receiver_id: 'friend-1', content: message })
    expect(notificationInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'friend-1',
      type: 'direct_message',
      body: `Rivera: ${'x'.repeat(50)}...`,
    }))
  })

  it('actualiza el apodo correcto cuando el usuario inició la amistad', async () => {
    const single = jest.fn().mockResolvedValue({ data: { user_id: 'user-123', friend_id: 'friend-1' }, error: null })
    const idEqForSelect = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq: idEqForSelect })
    const or = jest.fn().mockResolvedValue({ error: null })
    const idEqForUpdate = jest.fn().mockReturnValue({ or })
    const update = jest.fn().mockReturnValue({ eq: idEqForUpdate })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      friendships: [{ select }, { update }],
    }))

    await expect(updateFriendNickname('friendship-1', 'Socio')).resolves.toEqual({ success: true })
    expect(update).toHaveBeenCalledWith({ nickname_for_friend: 'Socio' })
    expect(or).toHaveBeenCalledWith('user_id.eq.user-123,friend_id.eq.user-123')
    expect(revalidatePath).toHaveBeenCalledWith('/friends')
  })

  it('invita a jugar usando el username del perfil actual', async () => {
    const single = jest.fn().mockResolvedValue({ data: { username: 'MesaPro' }, error: null })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    const insert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      profiles: [{ select }],
      notifications: [{ insert }],
    }))

    await expect(inviteToPlay('friend-1')).resolves.toEqual({ success: true })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'friend-1',
      type: 'game_invite',
      body: 'MesaPro te ha invitado a una mesa. ¡Únete ahora!',
      data: { senderId: 'user-123' },
    }))
  })
})
