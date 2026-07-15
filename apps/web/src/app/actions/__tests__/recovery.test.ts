import { resolveRecoveredRoom } from '../recovery'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('resolveRecoveredRoom', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('resuelve una sala recuperada para el usuario autenticado', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{
        status: 'resumed',
        recovered_room_id: 'recovered-room-456',
        recovery_deadline_at: '2026-07-13T12:05:00.000Z',
      }],
      error: null,
    })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
      rpc,
    })

    await expect(resolveRecoveredRoom('room-123')).resolves.toEqual({
      status: 'resumed',
      recoveredRoomId: 'recovered-room-456',
      deadline: '2026-07-13T12:05:00.000Z',
    })
    expect(rpc).toHaveBeenCalledWith('resolve_player_recovery_room', {
      p_original_room_id: 'room-123',
    })
  })

  it('rechaza solicitudes sin sesión antes de consultar el RPC', async () => {
    const rpc = jest.fn()
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      rpc,
    })

    await expect(resolveRecoveredRoom('room-123')).resolves.toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rechaza room ids inválidos antes de crear cliente', async () => {
    await expect(resolveRecoveredRoom('')).resolves.toBeNull()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('no expone errores ni resultados incompletos del RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'database failure' } })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
      rpc,
    })

    await expect(resolveRecoveredRoom('room-123')).resolves.toBeNull()
  })
})
