import { acknowledgeRecoveryIncident, closeRecoveryIncident, getAdminRecoveryIncidentExport, getAdminRecoveryIncidentPage, getAdminRecoveryIncidents, getAdminRecoveryRefunds, reconcileRecoveryRefund, type RecoveryIncidentFilters } from '../admin-recovery'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/utils/redis'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/utils/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
}))

const adminUser = { id: 'admin-1' }

function profileRoleQuery(role: string | null) {
  const single = jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

function buildSupabase({ user = adminUser, role = 'admin', rpcResult = { data: [], error: null }, recoveryRows = [], recoveryError = null }: {
  user?: typeof adminUser | null
  role?: string | null
  rpcResult?: { data: unknown; error: { message: string } | null }
  recoveryRows?: { id: string; game_id: string; acknowledged_at: string | null }[]
  recoveryError?: { message: string } | null
} = {}) {
  const profileQuery = profileRoleQuery(role)
  const recoveryQuery = {
    select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: recoveryRows, error: recoveryError }) }),
  }
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn((table: string) => {
      if (table === 'profiles') return profileQuery
      if (table === 'game_recovery_incidents') return recoveryQuery
      throw new Error(`Tabla no esperada: ${table}`)
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
      replayAvailable: false,
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

  it('devuelve una lista vacía cuando la RPC no devuelve filas', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: null } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidents()).resolves.toEqual([])
  })
})

describe('getAdminRecoveryIncidentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('valida filtros y solicita una página terminal con cursor estable', async () => {
    const supabase = buildSupabase({
      rpcResult: {
        data: [{
          game_id: '00000000-0000-0000-0000-000000000111',
          room_id: 'mesa-vip',
          cause_code: 'process_restart',
          detected_at: '2026-07-17T15:00:00.000Z',
          resolved_at: '2026-07-17T15:03:00.000Z',
          status: 'manual_review',
          resolution_reason: 'requires_review',
          refunds_completed_count: 1,
          refunds_total_count: 1,
          replay_available: false,
          total_count: 1,
        }],
        error: null,
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentPage({
      status: 'manual_review',
      cause: 'process_restart',
      query: ' mesa-vip ',
      from: '2026-07-01',
      to: '2026-07-17',
      cursor: {
        detectedAt: '2026-07-16T15:00:00.000Z',
        gameId: '00000000-0000-4000-8000-000000000110',
      },
    })).resolves.toEqual({
      incidents: [{
        gameId: '00000000-0000-0000-0000-000000000111',
        roomId: 'mesa-vip',
        cause: 'process_restart',
        detectedAt: '2026-07-17T15:00:00.000Z',
        resolvedAt: '2026-07-17T15:03:00.000Z',
        status: 'manual_review',
        resolutionReason: 'requires_review',
        completedRefunds: 1,
        totalRefunds: 1,
        replayAvailable: false,
      }],
      total: 1,
      nextCursor: null,
    })

    expect(supabase.rpc).toHaveBeenCalledWith('list_admin_recovery_incidents_v2', {
      p_status: 'manual_review',
      p_cause_code: 'process_restart',
      p_query: 'mesa-vip',
      p_detected_from: '2026-07-01',
      p_detected_to: '2026-07-17',
      p_cursor_detected_at: '2026-07-16T15:00:00.000Z',
      p_cursor_game_id: '00000000-0000-4000-8000-000000000110',
      p_limit: 26,
    })
  })

  it('rechaza filtros malformados antes de consultar la base de datos', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentPage({ status: 'active' } as unknown as RecoveryIncidentFilters)).rejects.toThrow('Filtros de recuperación inválidos')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('acepta cursores TIMESTAMPTZ con offset devueltos por Postgres', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await getAdminRecoveryIncidentPage({
      cursor: {
        detectedAt: '2026-07-18T04:00:00.000+00:00',
        gameId: '00000000-0000-4000-8000-000000000110',
      },
    })

    expect(supabase.rpc).toHaveBeenCalledWith('list_admin_recovery_incidents_v2', expect.objectContaining({
      p_cursor_detected_at: '2026-07-18T04:00:00.000+00:00',
    }))
  })

  it('falla de forma segura si la RPC paginada devuelve un error', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: { message: 'detalle interno' } } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentPage()).rejects.toThrow('No se pudo cargar el historial de recuperación')
  })

  it('devuelve una página vacía sin consultar reconocimientos', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: null } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentPage()).resolves.toEqual({ incidents: [], total: 0, nextCursor: null })
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('conserva el total filtrado y genera el cursor desde la última fila visible', async () => {
    const row = {
      room_id: 'mesa',
      cause_code: 'process_restart',
      resolved_at: null,
      status: 'cancelled_crash' as const,
      resolution_reason: null,
      refunds_completed_count: 0,
      refunds_total_count: 0,
      replay_available: false,
      total_count: 27,
    }
    const supabase = buildSupabase({
      rpcResult: {
        data: Array.from({ length: 26 }, (_, index) => ({
          ...row,
          game_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          detected_at: `2026-07-17T15:${String(59 - index).padStart(2, '0')}:00.000Z`,
        })),
        error: null,
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await getAdminRecoveryIncidentPage()

    expect(result.incidents).toHaveLength(25)
    expect(result.total).toBe(27)
    expect(result.nextCursor).toEqual({
      detectedAt: '2026-07-17T15:35:00.000Z',
      gameId: '00000000-0000-4000-8000-000000000025',
    })
  })

  it('asocia el reconocimiento terminal sin exponer estado activo', async () => {
    const gameId = '00000000-0000-4000-8000-000000000111'
    const incidentId = '00000000-0000-4000-8000-000000000131'
    const supabase = buildSupabase({
      rpcResult: {
        data: [{
          game_id: gameId,
          room_id: 'mesa-vip',
          cause_code: 'process_restart',
          detected_at: '2026-07-17T15:00:00.000Z',
          resolved_at: '2026-07-17T15:03:00.000Z',
          status: 'manual_review',
          resolution_reason: 'requires_review',
          refunds_completed_count: 1,
          refunds_total_count: 1,
          replay_available: true,
          total_count: 1,
        }],
        error: null,
      },
      recoveryRows: [{ id: incidentId, game_id: gameId, acknowledged_at: '2026-07-18T03:00:00.000Z' }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await getAdminRecoveryIncidentPage()

    expect(result.incidents[0]).toEqual(expect.objectContaining({
      gameId,
      incidentId,
      acknowledgedAt: '2026-07-18T03:00:00.000Z',
      replayAvailable: true,
    }))
  })

  it('falla de forma segura si no puede consultar los reconocimientos', async () => {
    const supabase = buildSupabase({
      rpcResult: {
        data: [{
          game_id: '00000000-0000-4000-8000-000000000111',
          room_id: 'mesa-vip',
          cause_code: 'process_restart',
          detected_at: '2026-07-17T15:00:00.000Z',
          resolved_at: null,
          status: 'manual_review',
          resolution_reason: null,
          refunds_completed_count: 0,
          refunds_total_count: 1,
          replay_available: false,
          total_count: 1,
        }],
        error: null,
      },
      recoveryError: { message: 'tabla no disponible' },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentPage()).rejects.toThrow('No se pudo cargar el historial de recuperación')
  })
})

describe('getAdminRecoveryIncidentExport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('proyecta únicamente columnas terminales para exportación', async () => {
    const supabase = buildSupabase({
      rpcResult: {
        data: [{
          game_id: 'game-1',
          room_id: 'room-1',
          cause_code: 'process_restart',
          detected_at: '2026-07-17T15:00:00.000Z',
          resolved_at: null,
          status: 'closed',
          resolution_reason: 'reviewed',
          refunds_completed_count: '2',
          refunds_total_count: '2',
          private_state: { cards: ['AS'] },
        }],
        error: null,
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentExport({ status: 'closed' })).resolves.toEqual([{
      gameId: 'game-1',
      roomId: 'room-1',
      cause: 'process_restart',
      detectedAt: '2026-07-17T15:00:00.000Z',
      resolvedAt: null,
      status: 'closed',
      resolutionReason: 'reviewed',
      completedRefunds: 2,
      totalRefunds: 2,
    }])
  })

  it('no filtra el error interno de exportación', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: { message: 'detalle interno' } } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentExport()).rejects.toThrow('No se pudo exportar el historial de recuperación')
  })

  it('rechaza filtros de exportación inválidos antes de autenticar', async () => {
    await expect(getAdminRecoveryIncidentExport({ cursor: {
      detectedAt: '2026-07-18T04:00:00.000+00:00',
      gameId: '00000000-0000-4000-8000-000000000110',
    } } as unknown as Omit<RecoveryIncidentFilters, 'cursor'>)).rejects.toThrow('Filtros de recuperación inválidos')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('devuelve una exportación vacía cuando la RPC no devuelve filas', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: null } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentExport()).resolves.toEqual([])
  })

  it('exige acotar filtros cuando la exportación supera el máximo seguro', async () => {
    const row = {
      game_id: 'game-1',
      room_id: 'room-1',
      cause_code: 'process_restart',
      detected_at: '2026-07-17T15:00:00.000Z',
      resolved_at: null,
      status: 'closed',
      resolution_reason: 'reviewed',
      refunds_completed_count: 1,
      refunds_total_count: 1,
    }
    const supabase = buildSupabase({
      rpcResult: { data: Array.from({ length: 5001 }, () => row), error: null },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryIncidentExport()).rejects.toThrow(
      'La exportación supera 5000 filas; acota los filtros'
    )
  })
})

describe('reconcileRecoveryRefund', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('solo envía el refund y el motivo a la RPC financiera', async () => {
    const supabase = buildSupabase({
      rpcResult: {
        data: {
          success: true,
          refund_id: '00000000-0000-4000-8000-000000000121',
          ledger_id: '00000000-0000-4000-8000-000000000122',
          already_reconciled: false,
        },
        error: null,
      } as unknown as { data: unknown[] | null; error: { message: string } | null },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(reconcileRecoveryRefund({
      refundId: '00000000-0000-4000-8000-000000000121',
      reason: 'Validación operativa de refund pendiente tras caída.',
    })).resolves.toEqual({
      data: {
        refundId: '00000000-0000-4000-8000-000000000121',
        ledgerId: '00000000-0000-4000-8000-000000000122',
        alreadyReconciled: false,
      },
    })

    expect(supabase.rpc).toHaveBeenCalledWith('reconcile_game_recovery_refund', {
      p_refund_id: '00000000-0000-4000-8000-000000000121',
      p_reason: 'Validación operativa de refund pendiente tras caída.',
    })
  })

  it('rechaza motivos insuficientes antes de llamar a la base', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(reconcileRecoveryRefund({
      refundId: '00000000-0000-4000-8000-000000000121',
      reason: 'corto',
    })).resolves.toEqual({ error: 'El motivo debe tener entre 10 y 500 caracteres' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('devuelve un error seguro si la RPC financiera falla', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: { message: 'ledger indisponible' } } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(reconcileRecoveryRefund({
      refundId: '00000000-0000-4000-8000-000000000121',
      reason: 'Validación operativa de refund pendiente tras caída.',
    })).resolves.toEqual({ error: 'No fue posible reconciliar el refund' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('no expone detalles devueltos por una reconciliación rechazada', async () => {
    const supabase = buildSupabase({ rpcResult: { data: { success: false, error: 'constraint wallets_ledger_internal' }, error: null } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(reconcileRecoveryRefund({
      refundId: '00000000-0000-4000-8000-000000000121',
      reason: 'Validación operativa de refund pendiente tras caída.',
    })).resolves.toEqual({ error: 'No fue posible reconciliar el refund' })
  })

  it('rechaza la conciliación cuando el rate limit está agotado', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({ success: false })

    await expect(reconcileRecoveryRefund({
      refundId: '00000000-0000-4000-8000-000000000121',
      reason: 'Validación operativa de refund pendiente tras caída.',
    })).resolves.toEqual({ error: 'Demasiados intentos de conciliación. Inténtalo más tarde.' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('rechaza respuestas exitosas sin identificadores financieros completos', async () => {
    const supabase = buildSupabase({
      rpcResult: { data: { success: true, refund_id: 'refund-1', already_reconciled: false }, error: null },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(reconcileRecoveryRefund({
      refundId: '00000000-0000-4000-8000-000000000121',
      reason: 'Validación operativa de refund pendiente tras caída.',
    })).resolves.toEqual({ error: 'No fue posible reconciliar el refund' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('acknowledgeRecoveryIncident', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reconoce un incidente manual mediante su RPC idempotente', async () => {
    const supabase = buildSupabase({
      rpcResult: {
        data: {
          success: true,
          incident_id: '00000000-0000-4000-8000-000000000131',
          acknowledged_at: '2026-07-18T03:00:00.000Z',
          already_acknowledged: false,
        },
        error: null,
      } as unknown as { data: unknown[] | null; error: { message: string } | null },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(acknowledgeRecoveryIncident('00000000-0000-4000-8000-000000000131')).resolves.toEqual({
      data: {
        incidentId: '00000000-0000-4000-8000-000000000131',
        acknowledgedAt: '2026-07-18T03:00:00.000Z',
        alreadyAcknowledged: false,
      },
    })
    expect(supabase.rpc).toHaveBeenCalledWith('acknowledge_game_recovery_incident', {
      p_incident_id: '00000000-0000-4000-8000-000000000131',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/recovery')
  })

  it('rechaza ids inválidos sin consultar la base de datos', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(acknowledgeRecoveryIncident('incident-no-valido')).resolves.toEqual({ error: 'El incidente no es válido' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('no expone detalles devueltos por un reconocimiento rechazado', async () => {
    const supabase = buildSupabase({ rpcResult: { data: { success: false, error: 'internal incident state' }, error: null } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(acknowledgeRecoveryIncident('00000000-0000-4000-8000-000000000131')).resolves.toEqual({
      error: 'No fue posible reconocer el incidente',
    })
  })

  it('devuelve un error seguro si la RPC de reconocimiento falla', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: { message: 'detalle interno' } } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(acknowledgeRecoveryIncident('00000000-0000-4000-8000-000000000131')).resolves.toEqual({
      error: 'No fue posible reconocer el incidente',
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rechaza respuestas exitosas sin timestamp de reconocimiento', async () => {
    const supabase = buildSupabase({
      rpcResult: { data: { success: true, incident_id: 'incident-1', already_acknowledged: false }, error: null },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(acknowledgeRecoveryIncident('00000000-0000-4000-8000-000000000131')).resolves.toEqual({
      error: 'No fue posible reconocer el incidente',
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('getAdminRecoveryRefunds', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('obtiene únicamente el detalle terminal del refund y su enlace al ledger', async () => {
    const supabase = buildSupabase({
      rpcResult: {
        data: [{
          refund_id: '00000000-0000-4000-8000-000000000141',
          user_id: '00000000-0000-4000-8000-000000000142',
          amount_cents: 5000,
          status: 'pending',
          ledger_id: null,
          completed_at: null,
        }],
        error: null,
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryRefunds('00000000-0000-4000-8000-000000000140')).resolves.toEqual([{
      refundId: '00000000-0000-4000-8000-000000000141',
      userId: '00000000-0000-4000-8000-000000000142',
      amountCents: 5000,
      status: 'pending',
      ledgerId: null,
      completedAt: null,
    }])
    expect(supabase.rpc).toHaveBeenCalledWith('list_admin_recovery_refunds', {
      p_game_id: '00000000-0000-4000-8000-000000000140',
    })
  })

  it('rechaza un game id inválido antes de autenticar', async () => {
    await expect(getAdminRecoveryRefunds('game-no-valido')).rejects.toThrow('El juego no es válido')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('no filtra el error interno al cargar refunds', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: { message: 'detalle interno' } } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryRefunds('00000000-0000-4000-8000-000000000140')).rejects.toThrow('No se pudo cargar el detalle de refunds')
  })

  it('devuelve una lista vacía cuando la RPC de refunds no devuelve filas', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: null } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRecoveryRefunds('00000000-0000-4000-8000-000000000140')).resolves.toEqual([])
  })
})

describe('closeRecoveryIncident', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('requiere motivo y confirmación explícita antes de cerrar', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(closeRecoveryIncident({
      incidentId: '00000000-0000-4000-8000-000000000150',
      reason: 'Cierre tras validar refunds y evidencia terminal.',
      confirmed: false,
    })).resolves.toEqual({ error: 'Debes confirmar el cierre irreversible' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('delegra el cierre idempotente a la RPC sin aceptar datos financieros', async () => {
    const supabase = buildSupabase({
      rpcResult: {
        data: {
          success: true,
          incident_id: '00000000-0000-4000-8000-000000000150',
          closed_at: '2026-07-18T04:00:00.000Z',
          already_closed: false,
        },
        error: null,
      } as unknown as { data: unknown[] | null; error: { message: string } | null },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(closeRecoveryIncident({
      incidentId: '00000000-0000-4000-8000-000000000150',
      reason: 'Cierre tras validar refunds y evidencia terminal.',
      confirmed: true,
    })).resolves.toEqual({
      data: {
        incidentId: '00000000-0000-4000-8000-000000000150',
        closedAt: '2026-07-18T04:00:00.000Z',
        alreadyClosed: false,
      },
    })
    expect(supabase.rpc).toHaveBeenCalledWith('close_game_recovery_incident', {
      p_incident_id: '00000000-0000-4000-8000-000000000150',
      p_reason: 'Cierre tras validar refunds y evidencia terminal.',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/recovery')
  })

  it('devuelve un error seguro si la RPC de cierre falla', async () => {
    const supabase = buildSupabase({ rpcResult: { data: null, error: { message: 'detalle interno' } } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(closeRecoveryIncident({
      incidentId: '00000000-0000-4000-8000-000000000150',
      reason: 'Cierre tras validar refunds y evidencia terminal.',
      confirmed: true,
    })).resolves.toEqual({ error: 'No fue posible cerrar el incidente' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('no expone detalles devueltos por un cierre rechazado', async () => {
    const supabase = buildSupabase({ rpcResult: { data: { success: false, error: 'internal close state' }, error: null } })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(closeRecoveryIncident({
      incidentId: '00000000-0000-4000-8000-000000000150',
      reason: 'Cierre tras validar refunds y evidencia terminal.',
      confirmed: true,
    })).resolves.toEqual({ error: 'No fue posible cerrar el incidente' })
  })

  it('rechaza respuestas exitosas sin timestamp de cierre', async () => {
    const supabase = buildSupabase({
      rpcResult: { data: { success: true, incident_id: 'incident-1', already_closed: false }, error: null },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(closeRecoveryIncident({
      incidentId: '00000000-0000-4000-8000-000000000150',
      reason: 'Cierre tras validar refunds y evidencia terminal.',
      confirmed: true,
    })).resolves.toEqual({ error: 'No fue posible cerrar el incidente' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
