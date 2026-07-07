import {
  acceptFriendRequest,
  deleteNotification,
  getDirectMessages,
  getFriendships,
  getLeaderboard,
  getNotifications,
  inviteToPlay,
  markNotificationAsRead,
  removeFriendship,
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

type MockAuthUser = Omit<typeof currentUser, 'user_metadata'> & {
  user_metadata: Record<string, unknown>
}

function buildAuth(user: MockAuthUser | null = currentUser) {
  return {
    getUser: jest.fn().mockResolvedValue({ data: { user } }),
  }
}

function queuedSupabase(queues: Record<string, unknown[]>, user: MockAuthUser | null = currentUser) {
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
    ;(createClient as jest.Mock).mockReset()
    ;(revalidatePath as jest.Mock).mockReset()
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('no busca usuarios cuando el texto tiene menos de tres caracteres', async () => {
    await expect(searchUsers('jo')).resolves.toEqual([])
    expect(createClient).not.toHaveBeenCalled()
  })

  it('rechaza queries con caracteres de filtro PostgREST antes de llamar a .or()', async () => {
    const supabase = queuedSupabase({})
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(searchUsers('ana),profiles(*)')).resolves.toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza queries demasiado largas antes de llamar a .or', async () => {
    const supabase = queuedSupabase({})
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(searchUsers('x'.repeat(120))).resolves.toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('obtiene leaderboard por periodo/categoría y devuelve vacío si RPC falla', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: [{ user_id: 'user-1', score: 120 }], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('rpc failed') })
    ;(createClient as jest.Mock).mockResolvedValue({ rpc })

    await expect(getLeaderboard('monthly', 'wins')).resolves.toEqual([{ user_id: 'user-1', score: 120 }])
    await expect(getLeaderboard('weekly', 'chips')).resolves.toEqual([])

    expect(rpc).toHaveBeenNthCalledWith(1, 'get_leaderboard', { p_period: 'monthly', p_category: 'wins' })
    expect(rpc).toHaveBeenNthCalledWith(2, 'get_leaderboard', { p_period: 'weekly', p_category: 'chips' })
    expect(console.error).toHaveBeenCalledWith('Error fetching leaderboard', expect.any(Error))
  })

  it('no busca usuarios si no hay sesión y devuelve vacío ante error de búsqueda', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(searchUsers('ana')).resolves.toEqual([])
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const limit = jest.fn().mockResolvedValue({ data: null, error: new Error('search failed') })
    const neq = jest.fn().mockReturnValue({ limit })
    const or = jest.fn().mockReturnValue({ neq })
    const select = jest.fn().mockReturnValue({ or })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ profiles: [{ select }] }))

    await expect(searchUsers('ana')).resolves.toEqual([])
    expect(console.error).toHaveBeenCalledWith('Error searching users', expect.any(Error))
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

  it('maneja amistades sin sesión, error de lectura y nickname cuando el usuario no inició', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(getFriendships()).resolves.toEqual({ friends: [], pendingIncoming: [], pendingOutgoing: [] })
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const orWithError = jest.fn().mockResolvedValue({ data: null, error: new Error('friendships failed') })
    const selectWithError = jest.fn().mockReturnValue({ or: orWithError })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ friendships: [{ select: selectWithError }] }))

    await expect(getFriendships()).resolves.toEqual({ friends: [], pendingIncoming: [], pendingOutgoing: [] })
    expect(console.error).toHaveBeenCalledWith('Error fetching friendships', expect.any(Error))

    const friendships = [{
      id: 'friendship-received-accepted',
      status: 'accepted',
      user_id: 'friend-1',
      friend_id: 'user-123',
      user: { id: 'friend-1', username: 'ana' },
      friend: { id: 'user-123', username: 'rivera' },
      nickname_for_friend: 'Rivera',
      nickname_for_user: 'Mesa Ana',
    }]
    const or = jest.fn().mockResolvedValue({ data: friendships, error: null })
    const select = jest.fn().mockReturnValue({ or })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ friendships: [{ select }] }))

    await expect(getFriendships()).resolves.toEqual({
      friends: [{ friendshipId: 'friendship-received-accepted', profile: { id: 'friend-1', username: 'ana' }, nickname: 'Mesa Ana' }],
      pendingIncoming: [],
      pendingOutgoing: [],
    })
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

  it('maneja solicitud de amistad sin sesión y no notifica cuando insert falla', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(sendFriendRequest('friend-1')).resolves.toEqual({ error: 'No autenticado' })
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const friendshipInsert = jest.fn().mockResolvedValue({ error: new Error('duplicate') })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ friendships: [{ insert: friendshipInsert }] }))

    await expect(sendFriendRequest('friend-1')).resolves.toEqual({ success: false })
    expect(revalidatePath).toHaveBeenCalledWith('/friends')
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

  it('maneja aceptar amistad sin sesión, error de update y amistad sin iniciador', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(acceptFriendRequest('friendship-1')).resolves.toEqual({ error: 'No autenticado' })
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const friendEqWithError = jest.fn().mockResolvedValue({ error: new Error('not receiver') })
    const idEqForUpdateWithError = jest.fn().mockReturnValue({ eq: friendEqWithError })
    const updateWithError = jest.fn().mockReturnValue({ eq: idEqForUpdateWithError })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ friendships: [{ update: updateWithError }] }))

    await expect(acceptFriendRequest('friendship-1')).resolves.toEqual({ error: 'Error al aceptar.' })
    expect(console.error).toHaveBeenCalledWith('Error accepting friend request', expect.any(Error))

    const friendEq = jest.fn().mockResolvedValue({ error: null })
    const idEqForUpdate = jest.fn().mockReturnValue({ eq: friendEq })
    const update = jest.fn().mockReturnValue({ eq: idEqForUpdate })
    const single = jest.fn().mockResolvedValue({ data: null, error: null })
    const idEqForSelect = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq: idEqForSelect })
    const supabase = queuedSupabase({ friendships: [{ update }, { select }] })
    ;(createClient as jest.Mock).mockResolvedValueOnce(supabase)

    await expect(acceptFriendRequest('friendship-1')).resolves.toEqual({ success: true })
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('elimina amistad si pertenece al usuario y maneja errores o falta de sesión', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(removeFriendship('friendship-1')).resolves.toEqual({ error: 'No autenticado' })
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const eqWithError = jest.fn().mockResolvedValue({ error: new Error('delete failed') })
    const deleteWithError = jest.fn().mockReturnValue({ eq: eqWithError })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ friendships: [{ delete: deleteWithError }] }))

    await expect(removeFriendship('friendship-1')).resolves.toEqual({ error: 'Error al eliminar.' })
    expect(console.error).toHaveBeenCalledWith('Error removing friendship', expect.any(Error))

    const eq = jest.fn().mockResolvedValue({ error: null })
    const deleteFn = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ friendships: [{ delete: deleteFn }] }))

    await expect(removeFriendship('friendship-1')).resolves.toEqual({ success: true })
    expect(eq).toHaveBeenCalledWith('id', 'friendship-1')
    expect(revalidatePath).toHaveBeenCalledWith('/friends')
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

  it('rechaza mensaje directo vacío antes de insertar', async () => {
    const supabase = queuedSupabase({})
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(sendDirectMessage('friend-1', '   ')).resolves.toEqual({ error: 'El mensaje no puede estar vacío' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza mensaje directo demasiado largo antes de insertar', async () => {
    const supabase = queuedSupabase({})
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(sendDirectMessage('friend-1', 'x'.repeat(1001))).resolves.toEqual({
      error: 'El mensaje es demasiado largo',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('maneja mensaje directo sin sesión, error de insert y notificación sin truncar', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(sendDirectMessage('friend-1', 'Hola')).resolves.toEqual({ error: 'No autenticado' })
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const singleWithError = jest.fn().mockResolvedValue({ data: null, error: new Error('insert failed') })
    const selectWithError = jest.fn().mockReturnValue({ single: singleWithError })
    const insertWithError = jest.fn().mockReturnValue({ select: selectWithError })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ direct_messages: [{ insert: insertWithError }] }))

    await expect(sendDirectMessage('friend-1', 'Hola')).resolves.toEqual({ error: 'Error al enviar mensaje' })

    const userWithoutUsername = { id: 'user-123', email: 'mesa@correo.test', user_metadata: {} }
    const single = jest.fn().mockResolvedValue({ data: { id: 'message-2', content: 'Hola' }, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const messageInsert = jest.fn().mockReturnValue({ select })
    const notificationInsert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      direct_messages: [{ insert: messageInsert }],
      notifications: [{ insert: notificationInsert }],
    }, userWithoutUsername))

    await expect(sendDirectMessage('friend-1', 'Hola')).resolves.toEqual({ success: true, message: { id: 'message-2', content: 'Hola' } })
    expect(notificationInsert).toHaveBeenCalledWith(expect.objectContaining({ body: 'mesa: Hola' }))
  })

  it('obtiene mensajes directos en ambos sentidos y devuelve vacío ante error o sin sesión', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(getDirectMessages('friend-1')).resolves.toEqual([])
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const order = jest.fn().mockResolvedValue({ data: [{ id: 'dm-1' }], error: null })
    const or = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ or })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ direct_messages: [{ select }] }))

    await expect(getDirectMessages('friend-1')).resolves.toEqual([{ id: 'dm-1' }])
    expect(or).toHaveBeenCalledWith('and(sender_id.eq.user-123,receiver_id.eq.friend-1),and(sender_id.eq.friend-1,receiver_id.eq.user-123)')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true })

    const orderWithError = jest.fn().mockResolvedValue({ data: null, error: new Error('dm failed') })
    const orWithError = jest.fn().mockReturnValue({ order: orderWithError })
    const selectWithError = jest.fn().mockReturnValue({ or: orWithError })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ direct_messages: [{ select: selectWithError }] }))

    await expect(getDirectMessages('friend-1')).resolves.toEqual([])
    expect(console.error).toHaveBeenCalledWith('Error fetching DMs', expect.any(Error))
  })

  it('lee, marca y elimina notificaciones respetando sesión, errores y revalidación', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(getNotifications()).resolves.toEqual([])
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const limit = jest.fn().mockResolvedValue({ data: [{ id: 'n1' }], error: null })
    const order = jest.fn().mockReturnValue({ limit })
    const eqForSelect = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq: eqForSelect })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ notifications: [{ select }] }))

    await expect(getNotifications()).resolves.toEqual([{ id: 'n1' }])
    expect(eqForSelect).toHaveBeenCalledWith('user_id', 'user-123')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(50)

    const limitWithError = jest.fn().mockResolvedValue({ data: null, error: new Error('notifications failed') })
    const orderWithError = jest.fn().mockReturnValue({ limit: limitWithError })
    const eqWithError = jest.fn().mockReturnValue({ order: orderWithError })
    const selectWithError = jest.fn().mockReturnValue({ eq: eqWithError })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ notifications: [{ select: selectWithError }] }))
    await expect(getNotifications()).resolves.toEqual([])

    const markEq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: markEq })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ notifications: [{ update }] }))
    await expect(markNotificationAsRead('n1')).resolves.toEqual({ success: true })
    expect(update).toHaveBeenCalledWith({ is_read: true })
    expect(revalidatePath).toHaveBeenCalledWith('/')

    const deleteEq = jest.fn().mockResolvedValue({ error: new Error('delete notification failed') })
    const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ notifications: [{ delete: deleteFn }] }))
    await expect(deleteNotification('n1')).resolves.toEqual({ success: false })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('rechaza actualizar apodo vacío o demasiado largo', async () => {
    const supabase = queuedSupabase({})
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateFriendNickname('friendship-1', '   ')).resolves.toEqual({ error: 'Apodo inválido' })
    await expect(updateFriendNickname('friendship-1', 'x'.repeat(31))).resolves.toEqual({ error: 'Apodo inválido' })
    expect(supabase.from).not.toHaveBeenCalled()
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

  it('actualiza apodo del iniciador contrario y maneja sesión, amistad inexistente y error', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(updateFriendNickname('friendship-1', 'Socio')).resolves.toEqual({ error: 'No autenticado' })
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const singleMissing = jest.fn().mockResolvedValue({ data: null, error: null })
    const idEqForMissing = jest.fn().mockReturnValue({ single: singleMissing })
    const selectMissing = jest.fn().mockReturnValue({ eq: idEqForMissing })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ friendships: [{ select: selectMissing }] }))
    await expect(updateFriendNickname('friendship-1', 'Socio')).resolves.toEqual({ error: 'Amistad no encontrada' })

    const single = jest.fn().mockResolvedValue({ data: { user_id: 'friend-1', friend_id: 'user-123' }, error: null })
    const idEqForSelect = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq: idEqForSelect })
    const orWithError = jest.fn().mockResolvedValue({ error: new Error('update failed') })
    const idEqForUpdate = jest.fn().mockReturnValue({ or: orWithError })
    const update = jest.fn().mockReturnValue({ eq: idEqForUpdate })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ friendships: [{ select }, { update }] }))

    await expect(updateFriendNickname('friendship-1', 'Socio')).resolves.toEqual({ error: 'Error al actualizar apodo' })
    expect(update).toHaveBeenCalledWith({ nickname_for_user: 'Socio' })
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

  it('invita a jugar con fallback y maneja falta de sesión o error de insert', async () => {
    const unauthSupabase = queuedSupabase({}, null)
    ;(createClient as jest.Mock).mockResolvedValueOnce(unauthSupabase)

    await expect(inviteToPlay('friend-1')).resolves.toEqual({ error: 'No autenticado' })
    expect(unauthSupabase.from).not.toHaveBeenCalled()

    const single = jest.fn().mockResolvedValue({ data: null, error: null })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    const insert = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ profiles: [{ select }], notifications: [{ insert }] }))

    await expect(inviteToPlay('friend-1')).resolves.toEqual({ success: true })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ body: 'Un amigo te ha invitado a una mesa. ¡Únete ahora!' }))

    const singleForError = jest.fn().mockResolvedValue({ data: { username: 'MesaPro' }, error: null })
    const eqForError = jest.fn().mockReturnValue({ single: singleForError })
    const selectForError = jest.fn().mockReturnValue({ eq: eqForError })
    const insertWithError = jest.fn().mockResolvedValue({ error: new Error('invite failed') })
    ;(createClient as jest.Mock).mockResolvedValueOnce(queuedSupabase({ profiles: [{ select: selectForError }], notifications: [{ insert: insertWithError }] }))

    await expect(inviteToPlay('friend-1')).resolves.toEqual({ error: 'Error al enviar invitación' })
  })
})
