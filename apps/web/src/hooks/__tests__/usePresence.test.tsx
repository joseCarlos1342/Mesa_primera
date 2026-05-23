import { renderHook, waitFor } from '@testing-library/react'

import { usePresence } from '../usePresence'
import { createClient } from '@/utils/supabase/client'

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const authGetUserMock = jest.fn()
const subscribeMock = jest.fn()
const presenceStateMock = jest.fn()
const onMock = jest.fn()
const trackMock = jest.fn()
const channelMock = {
  on: onMock,
  subscribe: subscribeMock,
  presenceState: presenceStateMock,
  track: trackMock,
}
const removeChannelMock = jest.fn()

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('usePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    onMock.mockReturnValue(channelMock)
    subscribeMock.mockImplementation(async (cb?: (status: string) => void) => {
      cb?.('SUBSCRIBED')
      return channelMock
    })
    authGetUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    presenceStateMock.mockReturnValue({
      one: [{ user_id: 'friend-1', status: 'online' }],
      two: [{ user_id: 'friend-2', status: 'in-game' }],
    })
    mockCreateClient.mockReturnValue({
      auth: { getUser: authGetUserMock },
      channel: jest.fn(() => channelMock),
      removeChannel: removeChannelMock,
    } as never)
  })

  it('sincroniza el estado de presencia y expone getStatus', async () => {
    let syncHandler: (() => void) | undefined
    onMock.mockImplementation((type: string, event: { event: string }, handler: () => void) => {
      if (type === 'presence' && event.event === 'sync') syncHandler = handler
      return channelMock
    })

    const { result } = renderHook(() => usePresence([]))

    syncHandler?.()

    await waitFor(() => {
      expect(result.current.getStatus('friend-1')).toBe('online')
      expect(result.current.getStatus('friend-2')).toBe('in-game')
      expect(result.current.getStatus('missing')).toBe('offline')
    })
  })

  it('trackea al usuario al suscribirse y remueve el canal al desmontar el último subscriber', async () => {
    const { unmount } = renderHook(() => usePresence([]))

    await waitFor(() => {
      expect(authGetUserMock).toHaveBeenCalled()
      expect(trackMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', status: 'online' }))
    })

    unmount()
    expect(removeChannelMock).toHaveBeenCalledWith(channelMock)
  })
})
