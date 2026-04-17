/**
 * @jest-environment node
 */
import { getAdminDashboardStats } from '@/app/actions/admin-dashboard'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

type QueryResult = { data?: any; count?: number | null; error: null }

function makeQueryBuilder(table: string, queriedTables: string[]) {
  let selectOptions: { head?: boolean; count?: string } | undefined
  const filters: Array<{ type: 'eq' | 'in' | 'gte'; field: string; value: any }> = []

  const resolveResult = (): QueryResult => {
    if (selectOptions?.head && selectOptions.count === 'exact') {
      if (table === 'deposit_requests') return { count: 0, error: null }
      if (table === 'withdrawal_requests') return { count: 0, error: null }
      if (table === 'support_tickets') {
        const pendingFilter = filters.find((filter) => filter.type === 'eq' && filter.field === 'status')
        return { count: pendingFilter?.value === 'pending' ? 0 : 2, error: null }
      }
      if (table === 'table_help_requests') return { count: 0, error: null }
      if (table === 'games') return { count: 0, error: null }
    }

    if (table === 'support_messages') {
      return {
        data: [
          { user_id: 'user-1', is_resolved: false },
          { user_id: 'user-2', is_resolved: false },
        ],
        error: null,
      }
    }

    if (table === 'user_devices') return { data: [], error: null }
    if (table === 'ledger') return { data: [], error: null }
    if (table === 'wallets') return { data: [], error: null }
    if (table === 'games') return { data: [], error: null }

    return { data: [], error: null }
  }

  const builder = {
    select: (_columns?: string, options?: { head?: boolean; count?: string }) => {
      selectOptions = options
      return builder
    },
    eq: (field: string, value: any) => {
      filters.push({ type: 'eq', field, value })
      return builder
    },
    in: (field: string, value: any) => {
      filters.push({ type: 'in', field, value })
      return builder
    },
    gte: (field: string, value: any) => {
      filters.push({ type: 'gte', field, value })
      return builder
    },
    order: () => builder,
    single: async () => {
      if (table === 'profiles') {
        return { data: { role: 'admin' }, error: null }
      }

      return { data: null, error: null }
    },
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(resolveResult()).then(resolve, reject),
  }

  queriedTables.push(table)
  return builder
}

describe('Admin dashboard support counter', () => {
  beforeEach(() => {
    const queriedTables: string[] = []

    ;(createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null }),
      },
      from: jest.fn((table: string) => makeQueryBuilder(table, queriedTables)),
      rpc: jest.fn((name: string) => {
        if (name === 'get_active_users_count') return Promise.resolve({ data: 4, error: null })
        if (name === 'get_total_users_balance') return Promise.resolve({ data: 10000, error: null })
        if (name === 'get_ledger_net_balance') return Promise.resolve({ data: 10000, error: null })
        if (name === 'get_vault_status') {
          return Promise.resolve({
            data: { total_deposits: 10000, total_withdrawals: 0, vault_balance: 10000, coverage: 100 },
            error: null,
          })
        }
        return Promise.resolve({ data: 0, error: null })
      }),
      __queriedTables: queriedTables,
    })

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] }) as jest.Mock
  })

  it('counts only pending support tickets and ignores unresolved rows from finalized chats', async () => {
    const result = await getAdminDashboardStats()
    const mockClient = await (createClient as jest.Mock).mock.results[0].value

    expect(result.pendingSupport).toBe(0)
    expect(mockClient.__queriedTables).toContain('support_tickets')
    expect(mockClient.__queriedTables).not.toContain('support_messages')
  })
})