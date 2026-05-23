import { render } from '@testing-library/react'

import { NotificationSocketProvider } from '../NotificationSocketProvider'
import { useNotificationSocket } from '@/hooks/useNotificationSocket'

jest.mock('@/hooks/useNotificationSocket', () => ({
  useNotificationSocket: jest.fn(),
}))

const mockUseNotificationSocket = useNotificationSocket as jest.MockedFunction<typeof useNotificationSocket>

describe('NotificationSocketProvider', () => {
  it('invoca el hook con el userId y no renderiza UI', () => {
    const { container } = render(<NotificationSocketProvider userId="user-1" />)

    expect(mockUseNotificationSocket).toHaveBeenCalledWith('user-1')
    expect(container.firstChild).toBeNull()
  })
})
