/**
 * @jest-environment node
 */
import {
  createDispute,
  assignDispute,
  resolveDispute,
  dismissDispute,
  getDispute,
  listDisputes,
} from '@/app/actions/admin-disputes'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/app/actions/admin-audit', () => ({
  logAdminAction: jest.fn().mockResolvedValue(undefined),
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
    it('inserts a new dispute case and returns the id', async () => {
      const disputeId = 'dispute-001'

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: disputeId },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'admin_audit_log') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
        // profiles for verifyAdmin
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      const result = await createDispute({
        title: 'Sospecha de colusión',
        description: 'Jugadores X e Y muestran patrones inusuales',
        priority: 'high',
        evidence_snapshot: [
          { entity: 'replay', entity_id: 'rep-1', label: 'Replay del juego' },
          { entity: 'alert', entity_id: 'alert-1', label: 'Alerta de colusión' },
        ],
        support_ticket_id: 'ticket-1',
      })

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual({ id: disputeId })
    })

    it('validates required fields', async () => {
      const result = await createDispute({
        title: '',
        description: 'Test',
        priority: 'medium',
        evidence_snapshot: [],
      })
      expect(result.error).toBe('El título es obligatorio')
    })
  })

  // ── assignDispute ─────────────────────────────────────────

  describe('assignDispute', () => {
    it('assigns a dispute to an admin and sets status to investigating', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'd-1', status: 'investigating', assigned_to: 'admin-2' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'admin_audit_log') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      const result = await assignDispute('d-1', 'admin-2')

      expect(result.error).toBeUndefined()
      expect(result.data!.status).toBe('investigating')
      expect(result.data!.assigned_to).toBe('admin-2')
    })
  })

  // ── resolveDispute ────────────────────────────────────────

  describe('resolveDispute', () => {
    it('resolves a dispute with notes', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'd-1',
                      status: 'resolved',
                      resolution_notes: 'No se encontró evidencia',
                      resolved_by: 'admin-id',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'admin_audit_log') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      const result = await resolveDispute('d-1', 'No se encontró evidencia')

      expect(result.error).toBeUndefined()
      expect(result.data!.status).toBe('resolved')
      expect(result.data!.resolution_notes).toBe('No se encontró evidencia')
    })

    it('requires resolution notes', async () => {
      const result = await resolveDispute('d-1', '')
      expect(result.error).toBe('Las notas de resolución son obligatorias')
    })
  })

  // ── dismissDispute ────────────────────────────────────────

  describe('dismissDispute', () => {
    it('dismisses a dispute with reason', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_dispute_cases') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'd-1', status: 'dismissed' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'admin_audit_log') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      })

      const result = await dismissDispute('d-1', 'Falsa alarma')

      expect(result.error).toBeUndefined()
      expect(result.data!.status).toBe('dismissed')
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
  })
})
