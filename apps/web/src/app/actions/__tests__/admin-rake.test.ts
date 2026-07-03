import { getAdminRakeData } from '../admin-rake'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

const adminUser = { id: 'admin-123' }

function buildAuth(user: { id: string } | null = adminUser, error: unknown = null) {
  return {
    getUser: jest.fn().mockResolvedValue({ data: { user }, error }),
  }
}

function roleQuery(role: string | null) {
  const single = jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

function queuedSupabase(queues: Record<string, unknown[]>, auth = buildAuth()) {
  return {
    auth,
    from: jest.fn((table: string) => {
      const query = queues[table]?.shift()
      if (!query) throw new Error(`Unexpected admin-rake query: ${table}`)
      return query
    }),
  }
}

function rakeEntriesQuery(data: unknown[], count: number) {
  const range = jest.fn().mockResolvedValue({ data, count, error: null })
  const order = jest.fn().mockReturnValue({ range })
  const directionEq = jest.fn().mockReturnValue({ order })
  const typeEq = jest.fn().mockReturnValue({ eq: directionEq })
  const select = jest.fn().mockReturnValue({ eq: typeEq })
  return { select, typeEq, directionEq, order, range }
}

function winsQuery(data: unknown[]) {
  const inFilter = jest.fn().mockResolvedValue({ data, error: null })
  const directionEq = jest.fn().mockReturnValue({ in: inFilter })
  const typeEq = jest.fn().mockReturnValue({ eq: directionEq })
  const select = jest.fn().mockReturnValue({ eq: typeEq })
  return { select, inFilter }
}

function profilesQuery(data: unknown[]) {
  const inFilter = jest.fn().mockResolvedValue({ data, error: null })
  const select = jest.fn().mockReturnValue({ in: inFilter })
  return { select, inFilter }
}

function amountListQueryWithEq(data: Array<{ amount_cents: number }>) {
  const statusEq = jest.fn().mockResolvedValue({ data, error: null })
  const eq = jest.fn().mockReturnValue({ eq: statusEq })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, statusEq }
}

function amountListQueryWithGte(data: Array<{ amount_cents: number }>) {
  const gte = jest.fn().mockResolvedValue({ data, error: null })
  const eq = jest.fn().mockReturnValue({ gte })
  const select = jest.fn().mockReturnValue({ eq })
  return { select, eq, gte }
}

describe('getAdminRakeData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirige a login si no hay usuario autenticado', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({}, buildAuth(null)))

    await expect(getAdminRakeData()).rejects.toThrow('redirect:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('redirige a dashboard si el usuario no es admin', async () => {
    const role = roleQuery('player')
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ profiles: [{ select: role.select }] }))

    await expect(getAdminRakeData()).rejects.toThrow('redirect:/dashboard')
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('arma entradas de rake con usuarios, ganancias relacionadas y agregados', async () => {
    const role = roleQuery('admin')
    const rakeRows = [
      {
        id: 'rake-1',
        user_id: 'winner-1',
        game_id: 'game-1',
        table_id: 'table-1',
        amount_cents: 500,
        metadata: { source: 'showdown' },
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'rake-2',
        user_id: 'winner-2',
        game_id: null,
        table_id: 'table-2',
        amount_cents: 300,
        metadata: null,
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ]
    const rakeQuery = rakeEntriesQuery(rakeRows, 2)
    const winQuery = winsQuery([{ game_id: 'game-1', amount_cents: 10000 }])
    const profileQuery = profilesQuery([
      { id: 'winner-1', username: 'Ana' },
      { id: 'winner-2', username: null },
    ])
    const allRake = amountListQueryWithEq([{ amount_cents: 500 }, { amount_cents: 300 }])
    const rake24h = amountListQueryWithGte([{ amount_cents: 500 }])
    const rake7d = amountListQueryWithGte([{ amount_cents: 500 }, { amount_cents: 300 }])
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      profiles: [{ select: role.select }, { select: profileQuery.select }],
      ledger: [
        { select: rakeQuery.select },
        { select: winQuery.select },
        { select: allRake.select },
        { select: rake24h.select },
        { select: rake7d.select },
      ],
    }))

    const result = await getAdminRakeData(2, 25)

    expect(rakeQuery.range).toHaveBeenCalledWith(25, 49)
    expect(winQuery.inFilter).toHaveBeenCalledWith('game_id', ['game-1'])
    expect(profileQuery.inFilter).toHaveBeenCalledWith('id', ['winner-1', 'winner-2'])
    expect(result).toEqual({
      entries: [
        expect.objectContaining({ id: 'rake-1', winner_username: 'Ana', win_amount: 10000 }),
        expect.objectContaining({ id: 'rake-2', winner_username: 'Desconocido', win_amount: 0 }),
      ],
      totalCount: 2,
      stats: {
        totalRake: 800,
        totalRake24h: 500,
        totalRake7d: 800,
        rakeCount: 2,
      },
    })
  })

  it('omite consultas de wins y perfiles cuando no hay entradas', async () => {
    const role = roleQuery('admin')
    const rakeQuery = rakeEntriesQuery([], 0)
    const allRake = amountListQueryWithEq([])
    const rake24h = amountListQueryWithGte([])
    const rake7d = amountListQueryWithGte([])
    const supabase = queuedSupabase({
      profiles: [{ select: role.select }],
      ledger: [
        { select: rakeQuery.select },
        { select: allRake.select },
        { select: rake24h.select },
        { select: rake7d.select },
      ],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRakeData()).resolves.toEqual({
      entries: [],
      totalCount: 0,
      stats: { totalRake: 0, totalRake24h: 0, totalRake7d: 0, rakeCount: 0 },
    })
    expect(supabase.from).toHaveBeenCalledTimes(5)
  })

  it('maneja rakeEntries null sin romper agregados ni consultas secundarias', async () => {
    const role = roleQuery('admin')
    const rakeQuery = rakeEntriesQuery(null as any, 0)
    const allRake = amountListQueryWithEq([])
    const rake24h = amountListQueryWithGte([])
    const rake7d = amountListQueryWithGte([])
    const supabase = queuedSupabase({
      profiles: [{ select: role.select }],
      ledger: [
        { select: rakeQuery.select },
        { select: allRake.select },
        { select: rake24h.select },
        { select: rake7d.select },
      ],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminRakeData()).resolves.toEqual({
      entries: [],
      totalCount: 0,
      stats: { totalRake: 0, totalRake24h: 0, totalRake7d: 0, rakeCount: 0 },
    })
  })

  it('usa win_amount cero cuando el game_id del rake no tiene win entry correspondiente', async () => {
    const role = roleQuery('admin')
    const rakeRows = [
      {
        id: 'rake-1',
        user_id: 'winner-1',
        game_id: 'game-with-win',
        table_id: 'table-1',
        amount_cents: 500,
        metadata: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'rake-2',
        user_id: 'winner-1',
        game_id: 'game-no-win',
        table_id: 'table-2',
        amount_cents: 300,
        metadata: null,
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ]
    const rakeQuery = rakeEntriesQuery(rakeRows, 2)
    const winQuery = winsQuery([{ game_id: 'game-with-win', amount_cents: 10000 }])
    const profileQuery = profilesQuery([{ id: 'winner-1', username: 'Ana' }])
    const allRake = amountListQueryWithEq([{ amount_cents: 500 }, { amount_cents: 300 }])
    const rake24h = amountListQueryWithGte([{ amount_cents: 500 }])
    const rake7d = amountListQueryWithGte([{ amount_cents: 500 }, { amount_cents: 300 }])
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      profiles: [{ select: role.select }, { select: profileQuery.select }],
      ledger: [
        { select: rakeQuery.select },
        { select: winQuery.select },
        { select: allRake.select },
        { select: rake24h.select },
        { select: rake7d.select },
      ],
    }))

    const result = await getAdminRakeData()

    expect(result.entries).toEqual([
      expect.objectContaining({ id: 'rake-1', win_amount: 10000 }),
      expect.objectContaining({ id: 'rake-2', win_amount: 0 }),
    ])
  })
})
