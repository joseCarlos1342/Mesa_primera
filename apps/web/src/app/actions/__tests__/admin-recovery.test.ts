import { getAdminRecoveryIncidents } from '../admin-recovery'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const adminUser = { id: 'admin-1' }

function profileRoleQuery(role: string | null) {
  const single = jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

function buildSupabase({ user = adminUser, role = 'admin', rpcResult = { data: [], error: null } }: {
  user?: typeof adminUser | null
  role?: string | null
  rpcResult?: { data: unknown[] | null; error: { message: string } | null }
} = {}) {
  const profileQuery = profileRoleQuery(role)
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn((table: string) => {
      if (table !== 'profiles') throw new Error(`Tabla no esperada: ${table}`)
      return profileQuery
    }),
    rpc: jest.fn().mockResolvedValue(rpcResult),
  }
}

describe('getAdminRecoveryIncidents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza una solicitud sin sesión antes de consultar datos', async () => {
    const supabase = buildSupabase({ user: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidents()).rejects.toThrow('No autenticado')
    expect(supabase.from).not.toHaveBeenCalled()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('rechaza usuarios que no son administradores', async () => {
    const supabase = buildSupabase({ role: 'player' })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidents()).rejects.toThrow('Acceso denegado')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('proyecta solo el resumen terminal permitido por Admin Blindness', async () => {
    const supabase = buildSupabase({
      rpcResult: {
        data: [{
          game_id: 'game-1',
          room_id: 'room-original',
          cause_code: 'process_restart',
          detected_at: '2026-07-13T10:00:00.000Z',
          resolved_at: '2026-07-13T10:03:00.000Z',
          status: 'cancelled_crash',
          resolution_reason: 'recovery_deadline_expired',
          refunds_completed_count: 2,
          refunds_total_count: 3,
          private_state: { cards: ['AS'] },
          roster_user_ids: ['player-1'],
          recovered_room_id: 'active-room',
        }],
        error: null,
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidents()).resolves.toEqual([{
      gameId: 'game-1',
      roomId: 'room-original',
      cause: 'process_restart',
      detectedAt: '2026-07-13T10:00:00.000Z',
      resolvedAt: '2026-07-13T10:03:00.000Z',
      status: 'cancelled_crash',
      resolutionReason: 'recovery_deadline_expired',
      completedRefunds: 2,
      totalRefunds: 3,
    }])
    expect(supabase.rpc).toHaveBeenCalledWith('list_admin_recovery_incidents')
  })

  it('no expone errores internos de la consulta segura', async () => {
    const supabase = buildSupabase({
      rpcResult: { data: null, error: { message: 'consulta no disponible' } },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidents()).rejects.toThrow('No se pudo cargar el historial de recuperación')
  })
})
