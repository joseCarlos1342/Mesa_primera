import { renderHook } from '@testing-library/react'

import { useNotificationSocket } from '../useNotificationSocket'
import { io } from 'socket.io-client'

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}))

const onMock = jest.fn()
const emitMock = jest.fn()
const disconnectMock = jest.fn()
const mockIo = io as jest.MockedFunction<typeof io>

describe('useNotificationSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIo.mockReturnValue({
      on: onMock,
      emit: emitMock,
      disconnect: disconnectMock,
    } as never)
  })

  it('no conecta si userId es undefined', () => {
    renderHook(() => useNotificationSocket(undefined))
    expect(mockIo).not.toHaveBeenCalled()
  })

  it('conecta al namespace notifications, registra el usuario y despacha eventos', () => {
    Object.defineProperty(window, '__MESA_PRIMERA_RUNTIME_ENV__', {
      configurable: true,
      value: { NEXT_PUBLIC_SOCKET_URL: 'https://socket.test' },
    })
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    const handlers: Record<string, (...args: any[]) => void> = {}
    onMock.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      handlers[event] = handler
    })

    const { unmount } = renderHook(() => useNotificationSocket('user-1'))

    expect(mockIo).toHaveBeenCalledWith('https://socket.test/notifications', expect.objectContaining({ reconnection: true }))

    handlers.connect?.()
    expect(emitMock).toHaveBeenCalledWith('register', 'user-1')

    handlers.notification?.({ broadcastId: 'b1', title: 'Hola' })
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'socket-notification' }))

    handlers.reconnect?.()
    expect(emitMock).toHaveBeenCalledWith('register', 'user-1')

    unmount()
    expect(disconnectMock).toHaveBeenCalledTimes(1)
  })

  it('deriva URL local cuando no hay runtime env y registra desconexiones', () => {
    Object.defineProperty(window, '__MESA_PRIMERA_RUNTIME_ENV__', {
      configurable: true,
      value: undefined,
    })
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const handlers: Record<string, (...args: unknown[]) => void> = {}
    onMock.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler
    })

    renderHook(() => useNotificationSocket('user-2'))

    expect(mockIo).toHaveBeenCalledWith('http://localhost:2568/notifications', expect.objectContaining({
      transports: ['websocket', 'polling'],
      withCredentials: true,
    }))

    handlers.disconnect?.('transport close')
    expect(consoleSpy).toHaveBeenCalledWith('[NotifSocket] Disconnected: transport close')
  })
})
