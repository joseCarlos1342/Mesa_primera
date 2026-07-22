/**
 * @jest-environment node
 */
import { detectIdentifier } from '@/lib/detect-identifier'
import { globalSearch } from '@/app/actions/admin-search'
import { createClient } from '@/utils/supabase/server'
import { logAdminAction } from '@/app/actions/admin-audit'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
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
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  }
  return base
}

// ─── detectIdentifier (pure function) ───────────────────────

describe('detectIdentifier', () => {
  it('detects a valid UUID', () => {
    const result = detectIdentifier('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(result.type).toBe('uuid')
    expect(result.normalized).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  })

  it('detects a UUID with uppercase', () => {
    const result = detectIdentifier('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')
    expect(result.type).toBe('uuid')
    expect(result.normalized).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  })

  it('detects a hex seed (64 chars)', () => {
    const seed = 'ab'.repeat(32)
    const result = detectIdentifier(seed)
    expect(result.type).toBe('seed')
  })

  it('detects a shorter hex seed (32 chars)', () => {
    const seed = 'ab'.repeat(16)
    const result = detectIdentifier(seed)
    expect(result.type).toBe('seed')
  })

  it('detects a username with @', () => {
    const result = detectIdentifier('@juanito')
    expect(result.type).toBe('username')
    expect(result.normalized).toBe('juanito')
  })

  it('detects plain text as username', () => {
    const result = detectIdentifier('mauro')
    expect(result.type).toBe('username')
    expect(result.normalized).toBe('mauro')
  })

  it('rejects unsafe PostgREST filter grammar characters', () => {
    const result = detectIdentifier('juan),profiles(*)')
    expect(result.type).toBe('unknown')
    expect(result.normalized).toBe('')
  })

  it('trims whitespace', () => {
    const result = detectIdentifier('  @maria  ')
    expect(result.type).toBe('username')
    expect(result.normalized).toBe('maria')
  })

  it('returns unknown for empty string', () => {
    const result = detectIdentifier('')
    expect(result.type).toBe('unknown')
  })
})

// ─── globalSearch — auth guard ──────────────────────────────

describe('globalSearch', () => {
  let mockSupabase: ReturnType<typeof buildMockSupabase>

  beforeEach(() => {
    jest.resetAllMocks()
    mockSupabase = buildMockSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await globalSearch('test')
    expect(result.error).toBe('No autenticado')
  })

  it('returns error when user is not admin', async () => {
    mockSupabase.single.mockResolvedValue({ data: { role: 'player' }, error: null })
    const result = await globalSearch('test')
    expect(result.error).toBe('Acceso denegado')
  })

  // ── UUID search ────────────────────────────────────────────

  it('searches ledger, deposits, withdrawals, replays by UUID', async () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

    const mockData: Record<string, any[]> = {
      ledger: [{ id: 'led-1', user_id: 'u1', type: 'deposit', direction: 'credit', amount_cents: 50000, created_at: '2026-04-01T00:00:00Z' }],
      deposit_requests: [],
      withdrawal_requests: [],
      game_replays: [],
      profiles: [],
      support_tickets: [],
      server_alerts: [],
    }

    mockSupabase.from.mockImplementation((table: string) => {
      // verifyAdmin check
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockData[table] || [], error: null }),
          }),
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockData[table] || [], error: null }),
          }),
        }),
      }
    })

    const result = await globalSearch(uuid)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data!.detected.type).toBe('uuid')
    expect(result.data!.matches.length).toBeGreaterThanOrEqual(1)
    expect(result.data!.matches[0].entity).toBe('ledger')
  })

  // ── Seed search ────────────────────────────────────────────

  it('searches game_replays by seed', async () => {
    const seed = 'ab'.repeat(32)

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: table === 'game_replays'
                ? [{ id: 'rep-1', game_id: 'g-1', rng_seed: seed, created_at: '2026-04-01' }]
                : [],
              error: null,
            }),
          }),
        }),
      }
    })

    mockSupabase.rpc.mockResolvedValue({ data: [{ id: 'rep-1', game_id: 'g-1', created_at: '2026-04-01' }], error: null })
    const result = await globalSearch(seed)

    expect(result.data).toBeDefined()
    expect(result.data!.detected.type).toBe('seed')
    expect(result.data!.matches.some(m => m.entity === 'replay')).toBe(true)
  })

  // ── Username search ────────────────────────────────────────

  it('searches profiles by username', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles' && !searchProfilesCalled) {
        searchProfilesCalled = true
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: table === 'profiles'
                ? [{ id: 'u-1', full_name: 'Juan', username: 'juanito', role: 'player' }]
                : [],
              error: null,
            }),
          }),
          in: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    })
    let searchProfilesCalled = false

    const result = await globalSearch('@juanito')

    expect(result.data).toBeDefined()
    expect(result.data!.detected.type).toBe('username')
    expect(result.data!.matches.some(m => m.entity === 'user')).toBe(true)
  })

  it('incluye tickets, alertas y disputas relacionadas con los perfiles encontrados', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const profileSelect = jest.fn()
        profileSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [{ id: 'user-1', full_name: null, username: 'jugador', role: 'player' }], error: null }),
          }),
        })
        return {
          select: profileSelect,
        }
      }

      const dataByTable: Record<string, unknown[]> = {
        profiles: [{ id: 'user-1', full_name: null, username: 'jugador', role: 'player' }],
        support_tickets: [{ id: 'ticket-1', status: 'open', created_at: '2026-07-19' }],
        server_alerts: [{ id: 'alert-1', title: 'Actividad inusual', severity: 'high', created_at: '2026-07-19' }],
        admin_dispute_cases: [{ id: 'dispute-1', title: 'Caso relacionado', status: 'open', created_at: '2026-07-19' }],
      }
      return {
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: dataByTable[table] || [], error: null }),
          }),
          in: jest.fn((column: string, values: string[]) => {
            if (column === 'support_ticket_id') {
              expect(values).toEqual(['ticket-1'])
            } else {
              expect(['user_id', 'player_id']).toContain(column)
              expect(values).toEqual(['user-1'])
            }
            return {
              limit: jest.fn().mockResolvedValue({ data: dataByTable[table] || [], error: null }),
            }
          }),
        }),
      }
    })

    const result = await globalSearch('@jugador')

    expect(result.data?.matches.map((match) => match.entity)).toEqual(['user', 'ticket', 'alert', 'dispute'])
  })

  it('devuelve error seguro y registra el fallo cuando una búsqueda falla', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const profileSelect = jest.fn()
        profileSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [{ id: 'user-1', username: 'fallo', role: 'player' }], error: null }),
          }),
        })
        return {
          select: profileSelect,
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'detalle interno' } }),
          }),
        }),
      }
    })

    const result = await globalSearch('@fallo')

    expect(result).toEqual({ error: 'No fue posible completar la consulta. Inténtalo de nuevo.' })
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-id',
      'global_search_failed',
      'search',
      '@fallo',
      { detected_type: 'username' },
    )
  })

  it('oculta errores de una consulta relacionada', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const select = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [{ id: 'user-1', username: 'jugador', role: 'player' }], error: null }),
          }),
        })
        return { select }
      }
      if (table === 'support_tickets') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'error interno' } }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    })

    await expect(globalSearch('jugador')).resolves.toEqual({ error: 'No fue posible completar la consulta. Inténtalo de nuevo.' })
  })

  // ── Empty query ────────────────────────────────────────────

  it('returns error on empty query', async () => {
    const result = await globalSearch('')
    expect(result.error).toBe('Consulta vacía')
  })

  it('rejects unsafe search query before interpolating filters', async () => {
    const result = await globalSearch('juan),profiles(*)')

    expect(result.error).toBe('Consulta inválida')
    expect(mockSupabase.or).not.toHaveBeenCalled()
  })

  // ── Audit logging ─────────────────────────────────────────

  it('logs the search in admin_audit_log', async () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    })

    await globalSearch(uuid)

    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-id',
      'global_search',
      'search',
      uuid,
      expect.objectContaining({ detected_type: 'uuid' })
    )
  })
})
