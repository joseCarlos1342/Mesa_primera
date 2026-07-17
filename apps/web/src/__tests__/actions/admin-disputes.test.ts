/**
 * @jest-environment node
 */
import {
  approveDisputeCompensation,
  cancelDisputeCompensation,
  createDispute,
  assignDispute,
  resolveDispute,
  dismissDispute,
  getDispute,
  listDisputes,
  proposeDisputeCompensation,
  startDispute,
} from '@/app/actions/admin-disputes'
import { createClient } from '@/utils/supabase/server'
import { globalSearch } from '@/app/actions/admin-search'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/app/actions/admin-audit', () => ({
  logAdminAction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/app/actions/admin-search', () => ({
  globalSearch: jest.fn(),
}))

// ─── Helpers ────────────────────────────────────────────────

function buildMockSupabase(overrides: Record<string, unknown> = {}) {
  const base = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-id' } } }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  }
  return base
}

describe('Admin Disputes Server Actions', () => {
  let mockSupabase: ReturnType<typeof buildMockSupabase>

  beforeEach(() => {
    jest.resetAllMocks()
    mockSupabase = buildMockSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
    ;(globalSearch as jest.Mock).mockResolvedValue({ data: { matches: [], detected: { raw: '', normalized: '', type: 'unknown' }, query: '', searched_at: '' } })
  })

  // ── Auth guard ──────────────────────────────────────────────

  describe('auth guards', () => {
    it('createDispute returns error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
      const result = await createDispute({
        title: 'Test',
        description: 'Test dispute',
        priority: 'medium',
        evidence_snapshot: [],
      })
      expect(result.error).toBe('No autenticado')
    })

    it('createDispute returns error when not admin', async () => {
      mockSupabase.single.mockResolvedValue({ data: { role: 'player' }, error: null })
      const result = await createDispute({
        title: 'Test',
        description: 'Test dispute',
        priority: 'medium',
        evidence_snapshot: [],
      })
      expect(result.error).toBe('Acceso denegado')
    })
  })

  // ── createDispute ─────────────────────────────────────────

  describe('createDispute', () => {
    it('validates required fields', async () => {
      const result = await createDispute({
        title: '',
        description: 'Test',
        priority: 'medium',
        evidence_snapshot: [],
      })
      expect(result.error).toBe('El título es obligatorio')
    })

    it('no filtra errores crudos de la RPC de creación', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'detalle interno postgres' } })
      await expect(createDispute({ title: 'Caso', description: 'Desc', priority: 'medium' })).resolves.toEqual({ error: 'No fue posible crear la investigación' })
    })
  })

  // ── assignDispute ─────────────────────────────────────────

  describe('assignDispute', () => {
    it('mantiene el alias legacy sin permitir asignar a otro UUID', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { success: true, id: 'd-1', status: 'investigating', assigned_to: 'admin-id' }, error: null })
      await expect(assignDispute('d-1', 'admin-2')).resolves.toEqual({ data: { id: 'd-1', status: 'investigating', assigned_to: 'admin-id' } })
    })
  })

  // ── resolveDispute ────────────────────────────────────────

  describe('resolveDispute', () => {
    it('requires resolution notes', async () => {
      const result = await resolveDispute('d-1', '')
      expect(result.error).toBe('Las notas de resolución son obligatorias')
    })

    it('rechaza notas demasiado cortas antes de invocar la RPC', async () => {
      await expect(resolveDispute('d-1', 'Cierre')).resolves.toEqual({ error: 'Las notas de resolución deben tener al menos 10 caracteres' })
    })
  })

  // ── dismissDispute ────────────────────────────────────────

  describe('dismissDispute', () => {
    it('dismisses a dispute with reason', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { success: true, id: 'd-1', status: 'dismissed' }, error: null })

      const result = await dismissDispute('d-1', 'Falsa alarma')

      expect(result.error).toBeUndefined()
      expect(result.data!.status).toBe('dismissed')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('dismiss_admin_investigation', {
        p_case_id: 'd-1',
        p_reason: 'Falsa alarma',
      })
    })

    it('requiere razon para descartar disputa', async () => {
      await expect(dismissDispute('d-1', '   ')).resolves.toEqual({
        error: 'La razón de descarte es obligatoria',
      })
      expect(createClient).not.toHaveBeenCalled()
    })

    it('propaga errores al descartar una disputa', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'No se pudo descartar' } })

      await expect(dismissDispute('d-1', 'Falsa alarma')).resolves.toEqual({ error: 'No fue posible descartar la investigación' })
    })
  })

  // ── getDispute ────────────────────────────────────────────

  describe('getDispute', () => {
    it('fetches a single dispute by id', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'd-1',
                    status: 'open',
                    priority: 'high',
                    title: 'Test dispute',
                    description: 'Desc',
                    opened_by: 'admin-id',
                    assigned_to: null,
                    support_ticket_id: null,
                    evidence_snapshot: [],
                    resolution_notes: null,
                    resolved_at: null,
                    resolved_by: null,
                    created_at: '2026-04-14T00:00:00Z',
                    updated_at: '2026-04-14T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      const result = await getDispute('d-1')

      expect(result.error).toBeUndefined()
      expect(result.data!.id).toBe('d-1')
      expect(result.data!.status).toBe('open')
    })

    it('propaga errores al obtener una disputa', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Disputa no encontrada' } }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      await expect(getDispute('d-1')).resolves.toEqual({ error: 'Investigación no encontrada' })
    })
  })

  // ── listDisputes ──────────────────────────────────────────

  describe('listDisputes', () => {
    it('returns disputes ordered by created_at desc', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { id: 'd-2', status: 'open', title: 'Newer', created_at: '2026-04-14' },
                    { id: 'd-1', status: 'resolved', title: 'Older', created_at: '2026-04-13' },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      const result = await listDisputes()

      expect(result.error).toBeUndefined()
      expect(result.data!).toHaveLength(2)
      expect(result.data![0].id).toBe('d-2')
    })

    it('devuelve lista vacia cuando no hay disputas', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      await expect(listDisputes(10)).resolves.toEqual({ data: [] })
    })

    it('propaga errores al listar disputas', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'Listado no disponible' } }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      await expect(listDisputes()).resolves.toEqual({ error: 'No fue posible cargar las investigaciones' })
    })

    it('aplica filtros por estado, prioridad y tipo de investigación', async () => {
      const builder = {
        eq: jest.fn(),
        order: jest.fn(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      builder.eq.mockReturnValue(builder)
      builder.order.mockReturnValue(builder)
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') return { select: jest.fn().mockReturnValue(builder) }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }) }),
          }),
        }
      })

      await expect(listDisputes({ status: 'investigating', priority: 'high', investigationType: 'collusion' })).resolves.toEqual({ data: [] })
      expect(builder.eq).toHaveBeenNthCalledWith(1, 'status', 'investigating')
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'priority', 'high')
      expect(builder.eq).toHaveBeenNthCalledWith(3, 'investigation_type', 'collusion')
    })
  })

  describe('flujo de investigaciones internas', () => {
    it('resuelve la evidencia en servidor y crea una investigación mediante RPC', async () => {
      ;(globalSearch as jest.Mock).mockResolvedValue({
        data: {
          matches: [{ entity: 'replay', id: 'replay-1', target_id: 'game-1', label: 'Replay terminado', detail: null }],
          detected: { raw: 'game-1', normalized: 'game-1', type: 'uuid' },
          query: 'game-1',
          searched_at: '2026-07-14T00:00:00Z',
        },
      })
      mockSupabase.rpc.mockResolvedValue({ data: { success: true, id: 'd-new' }, error: null })

      await expect(createDispute({
        title: 'Patrón coordinado',
        description: 'Dos jugadores repiten decisiones coordinadas.',
        investigation_type: 'collusion',
        priority: 'high',
        source: 'global_search',
        source_query: 'game-1',
        subject_user_ids: ['11111111-1111-4111-8111-111111111111'],
        game_id: '22222222-2222-4222-8222-222222222222',
      })).resolves.toEqual({ data: { id: 'd-new' } })

      expect(globalSearch).toHaveBeenCalledWith('game-1')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_admin_investigation', expect.objectContaining({
        p_evidence: [{ entity: 'replay', entity_id: 'replay-1', label: 'Replay terminado', target_id: 'game-1' }],
        p_investigation_type: 'collusion',
        p_source: 'global_search',
      }))
    })

    it('inicia la investigación con el admin autenticado sin pedir otro UUID', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, id: 'd-1', status: 'investigating', assigned_to: 'admin-id' },
        error: null,
      })

      await expect(startDispute('d-1')).resolves.toEqual({
        data: { id: 'd-1', status: 'investigating', assigned_to: 'admin-id' },
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('start_admin_investigation', {
        p_case_id: 'd-1',
      })
    })

    it('resuelve una investigación con un resultado estructurado', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, id: 'd-1', status: 'resolved', resolution_outcome: 'warning' },
        error: null,
      })

      await expect(resolveDispute('d-1', {
        outcome: 'warning',
        notes: 'Se confirmó conducta antideportiva y se emitió advertencia.',
      })).resolves.toEqual({
        data: { id: 'd-1', status: 'resolved', resolution_outcome: 'warning' },
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('resolve_admin_investigation', {
        p_case_id: 'd-1',
        p_outcome: 'warning',
        p_notes: 'Se confirmó conducta antideportiva y se emitió advertencia.',
      })
    })

    it('propone una compensación sin modificar todavía el ledger', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, id: 'd-1', compensation_status: 'proposed' },
        error: null,
      })

      await expect(proposeDisputeCompensation('d-1', {
        userId: '11111111-1111-4111-8111-111111111111',
        amountCents: 100000,
        reason: 'Compensación por una mano anulada tras confirmar colusión.',
      })).resolves.toEqual({
        data: { id: 'd-1', compensation_status: 'proposed' },
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('propose_admin_investigation_compensation', {
        p_amount_cents: 100000,
        p_case_id: 'd-1',
        p_reason: 'Compensación por una mano anulada tras confirmar colusión.',
        p_user_id: '11111111-1111-4111-8111-111111111111',
      })
    })

    it('confirma la compensación mediante la RPC idempotente', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, id: 'd-1', status: 'resolved', ledger_id: 'ledger-1' },
        error: null,
      })

      await expect(approveDisputeCompensation('d-1')).resolves.toEqual({
        data: { id: 'd-1', status: 'resolved', ledger_id: 'ledger-1' },
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_admin_investigation_compensation', {
        p_case_id: 'd-1',
      })
    })

    it('cancela una propuesta para que el expediente pueda corregirse o cerrarse', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, id: 'd-1', status: 'investigating', compensation_status: null },
        error: null,
      })

      await expect(cancelDisputeCompensation('d-1', 'El beneficiario seleccionado era incorrecto.')).resolves.toEqual({
        data: { id: 'd-1', status: 'investigating' },
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('cancel_admin_investigation_compensation', {
        p_case_id: 'd-1',
        p_reason: 'El beneficiario seleccionado era incorrecto.',
      })
    })

    it('rechaza compensaciones que no respetan el múltiplo financiero', async () => {
      await expect(proposeDisputeCompensation('d-1', {
        userId: '11111111-1111-4111-8111-111111111111',
        amountCents: 150000,
        reason: 'Compensación inválida para comprobar el límite financiero.',
      })).resolves.toEqual({ error: 'El monto debe ser múltiplo de $1.000 COP' })
      expect(createClient).not.toHaveBeenCalled()
    })
  })
})
