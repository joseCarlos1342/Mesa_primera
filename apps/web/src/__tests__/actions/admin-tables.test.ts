/**
 * @jest-environment node
 */
import {
  getTablesList,
  createTable,
  createCustomTable,
  updateTable,
  toggleTableActive,
  getLobbyTables,
} from '@/app/actions/admin-tables';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

function buildMockSupabase(overrides: Record<string, unknown> = {}) {
  // All methods return `chainable` so chaining always works.
  // When awaited directly, the chainable resolves to { data: ..., error: null }.
  const chainable: any = {};

  // Default resolution for awaiting any point of the chain
  const defaultResolve = { data: null, error: null };

  const methodNames = ['select', 'eq', 'neq', 'in', 'order', 'limit', 'update', 'delete', 'insert'];
  for (const name of methodNames) {
    chainable[name] = jest.fn().mockReturnValue(chainable);
  }
  chainable.single = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null });
  chainable.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

  // Make chainable thenable so it can be awaited (resolves to defaultResolve)
  chainable.then = jest.fn((resolve: any) => resolve?.(defaultResolve));

  const base = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-id' } } }),
    },
    from: jest.fn().mockReturnValue(chainable),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  };

  (base as any)._chain = chainable;
  return base;
}

describe('Admin Tables Server Actions', () => {
  let mockSupabase: ReturnType<typeof buildMockSupabase>;
  let chain: any;

  beforeEach(() => {
    jest.resetAllMocks();
    mockSupabase = buildMockSupabase();
    chain = (mockSupabase as any)._chain;
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // ── Auth guard ────────────────────────────────────────────
  describe('ensureAdmin guard', () => {
    it('throws when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(getTablesList()).rejects.toThrow('No autenticado');
    });

    it('throws when user is not admin role', async () => {
      chain.single.mockResolvedValue({ data: { role: 'player' }, error: null });
      await expect(getTablesList()).rejects.toThrow('Acceso denegado');
    });
  });

  // ── getTablesList (extended) ──────────────────────────────
  describe('getTablesList', () => {
    it('returns tables with new category fields', async () => {
      const tables = [
        {
          id: 't1', name: 'Mesa #1', min_bet: 1, max_players: 7, game_type: 'primera_28',
          table_category: 'common', min_entry_cents: 5000000, min_pique_cents: 500000,
          disabled_chips: [], lobby_slot: 1, is_active: true, created_at: '2026-01-01',
          games: [{ count: 2 }],
        },
        {
          id: 't2', name: 'VIP Diamante', min_bet: 1, max_players: 5, game_type: 'primera_28',
          table_category: 'custom', min_entry_cents: 20000000, min_pique_cents: 2000000,
          disabled_chips: [100000, 200000], lobby_slot: null, is_active: true, created_at: '2026-04-14',
          games: [{ count: 0 }],
        },
      ];
      chain.then.mockImplementation((resolve: any) => resolve?.({ data: tables, error: null }));

      const result = await getTablesList();

      expect(result).toHaveLength(2);
      expect(result[0].table_category).toBe('common');
      expect(result[1].table_category).toBe('custom');
      expect(result[1].min_entry_cents).toBe(20000000);
      expect(result[1].disabled_chips).toEqual([100000, 200000]);
    });

    it('can filter by category when provided', async () => {
      chain.then.mockImplementation((resolve: any) => resolve?.({ data: [], error: null }));

      await getTablesList('custom');

      const eqCalls = chain.eq.mock.calls;
      const categoryCall = eqCalls.find((c: any) => c[0] === 'table_category');
      expect(categoryCall).toBeTruthy();
      expect(categoryCall[1]).toBe('custom');
    });
  });

  // ── createTable (common) ──────────────────────────────────
  describe('createTable (common)', () => {
    it('inserts a common table with fixed defaults', async () => {
      chain.insert.mockResolvedValue({ error: null });

      const result = await createTable({
        name: 'Mesa #3',
        max_players: 7,
      });

      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('tables');
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Mesa #3',
        table_category: 'common',
        min_entry_cents: 5000000,
        min_pique_cents: 500000,
        disabled_chips: [],
      }));
    });
  });

  // ── createCustomTable ─────────────────────────────────────
  describe('createCustomTable', () => {
    it('inserts a custom table with admin-specified config', async () => {
      chain.insert.mockResolvedValue({ error: null });

      const result = await createCustomTable({
        name: 'VIP Diamante',
        max_players: 5,
        min_entry_cents: 20000000,
        min_pique_cents: 2000000,
        disabled_chips: [100000, 200000],
      });

      expect(result).toEqual({ success: true });
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'VIP Diamante',
        table_category: 'custom',
        max_players: 5,
        min_entry_cents: 20000000,
        min_pique_cents: 2000000,
        disabled_chips: [100000, 200000],
      }));
    });

    it('rejects when name is empty', async () => {
      await expect(createCustomTable({
        name: '',
        max_players: 5,
        min_entry_cents: 20000000,
        min_pique_cents: 2000000,
        disabled_chips: [],
      })).rejects.toThrow();
    });

    it('rejects when all chips are disabled', async () => {
      await expect(createCustomTable({
        name: 'Test',
        max_players: 5,
        min_entry_cents: 20000000,
        min_pique_cents: 2000000,
        disabled_chips: [100000, 200000, 500000, 1000000, 2000000, 5000000],
      })).rejects.toThrow();
    });

    it('rejects invalid max_players', async () => {
      await expect(createCustomTable({
        name: 'Test',
        max_players: 10,
        min_entry_cents: 5000000,
        min_pique_cents: 500000,
        disabled_chips: [],
      })).rejects.toThrow();
    });
  });

  // ── updateTable ───────────────────────────────────────────
  describe('updateTable', () => {
    it('updates allowed fields on a custom table', async () => {
      // single() called: 1st for role check, 2nd for table fetch
      chain.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: { id: 't2', table_category: 'custom', is_active: true }, error: null });

      const result = await updateTable('t2', {
        name: 'VIP Updated',
        min_entry_cents: 30000000,
      });

      expect(result).toEqual({ success: true });
    });

    it('rejects editing a common table entry/pique/chips', async () => {
      chain.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: { id: 't1', table_category: 'common', is_active: true }, error: null });

      await expect(updateTable('t1', {
        min_entry_cents: 10000000,
      })).rejects.toThrow('parámetros financieros');
    });
  });

  // ── toggleTableActive ─────────────────────────────────────
  describe('toggleTableActive', () => {
    it('deactivates a table (soft delete)', async () => {
      chain.update.mockReturnThis();

      const result = await toggleTableActive('t2', false);

      expect(result).toEqual({ success: true });
      expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    });

    it('activates a table', async () => {
      chain.update.mockReturnThis();

      const result = await toggleTableActive('t2', true);

      expect(result).toEqual({ success: true });
      expect(chain.update).toHaveBeenCalledWith({ is_active: true });
    });
  });

  // ── getLobbyTables ────────────────────────────────────────
  describe('getLobbyTables', () => {
    it('calls the get_lobby_tables RPC and returns structured data', async () => {
      const lobbyData = [
        { id: 't1', name: 'Mesa #1', game_type: 'primera_28', max_players: 7, table_category: 'common', lobby_slot: 1, min_entry_cents: 5000000, min_pique_cents: 500000, disabled_chips: [], sort_order: 1 },
        { id: 't2', name: 'Mesa #2', game_type: 'primera_28', max_players: 7, table_category: 'common', lobby_slot: 2, min_entry_cents: 5000000, min_pique_cents: 500000, disabled_chips: [], sort_order: 2 },
        { id: 't3', name: 'VIP', game_type: 'primera_28', max_players: 5, table_category: 'custom', lobby_slot: null, min_entry_cents: 20000000, min_pique_cents: 2000000, disabled_chips: [100000, 200000], sort_order: 0 },
      ];
      mockSupabase.rpc.mockResolvedValue({ data: lobbyData, error: null });

      const result = await getLobbyTables();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_lobby_tables');
      expect(result.common).toHaveLength(2);
      expect(result.custom).toHaveLength(1);
      expect(result.common[0].lobby_slot).toBe(1);
      expect(result.custom[0].disabled_chips).toEqual([100000, 200000]);
    });
  });
});
