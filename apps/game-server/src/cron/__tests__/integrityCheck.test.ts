import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted: mock all external deps before module evaluation ──
const { mockSchedule, mockRpc, mockFromInsert, mockQueueAdd, mockAlertEmitAsync } = vi.hoisted(() => {
  return {
    mockSchedule: vi.fn(),
    mockRpc: vi.fn(),
    mockFromInsert: vi.fn().mockResolvedValue({ error: null }),
    mockQueueAdd: vi.fn().mockResolvedValue(undefined),
    mockAlertEmitAsync: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('node-cron', () => ({
  default: { schedule: mockSchedule },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(() => ({
      insert: mockFromInsert,
    })),
  })),
}));

vi.mock('../../workers/index', () => ({
  ledgerQueue: {
    add: mockQueueAdd,
    on: vi.fn(),
  },
}));

vi.mock('../../services/AlertService', () => ({
  AlertService: {
    emitAsync: mockAlertEmitAsync,
  },
}));

import { startIntegrityCron } from '../../cron/integrityCheck';

describe('integrityCheck cron', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('registers two cron schedules', () => {
    startIntegrityCron();

    expect(mockSchedule).toHaveBeenCalledTimes(2);
    // First schedule: hourly integrity check
    expect(mockSchedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    // Second schedule: bi-hourly reconciliation
    expect(mockSchedule).toHaveBeenCalledWith('0 */2 * * *', expect.any(Function));
  });

  describe('hourly integrity check', () => {
    let integrityCallback: () => Promise<void>;

    beforeEach(() => {
      startIntegrityCron();
      // The first call to schedule is the integrity check
      integrityCallback = mockSchedule.mock.calls[0][1];
    });

    it('calls get_total_users_balance and get_ledger_net_balance RPCs', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: 500000 }) // get_total_users_balance
        .mockResolvedValueOnce({ data: 500000 }); // get_ledger_net_balance

      await integrityCallback();

      expect(mockRpc).toHaveBeenCalledWith('get_total_users_balance');
      expect(mockRpc).toHaveBeenCalledWith('get_ledger_net_balance');
    });

    it('logs success when balances match (diff === 0)', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: 1000000 })
        .mockResolvedValueOnce({ data: 1000000 });

      await integrityCallback();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bóveda cuadrada'),
      );
      // Should NOT insert an audit log for zero diff
      expect(mockFromInsert).not.toHaveBeenCalled();
    });

    it('inserts audit log and warns when discrepancy is detected (diff > 0)', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: 900000 }) // users balance
        .mockResolvedValueOnce({ data: 1000000 }); // ledger balance (surplus)

      await integrityCallback();

      expect(mockFromInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SYSTEM_INTEGRITY_ALERT',
          details: expect.objectContaining({
            discrepancy_cents: 100000,
          }),
        }),
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Discrepancia'),
      );
    });

    it('inserts audit log when discrepancy is negative (critical deficit)', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: 1000000 }) // users balance
        .mockResolvedValueOnce({ data: 800000 }); // ledger (lower → deficit)

      await integrityCallback();

      expect(mockFromInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            discrepancy_cents: -200000,
          }),
        }),
      );
    });

    it('handles RPC error gracefully', async () => {
      mockRpc.mockRejectedValueOnce(new Error('RPC failure'));

      await integrityCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CRON ERROR]'),
        expect.any(Error),
      );
    });

    it('treats null RPC data as 0', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: null });

      await integrityCallback();

      // diff = (null || 0) - (null || 0) = 0 → success
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bóveda cuadrada'),
      );
    });
  });

  describe('bi-hourly reconciliation enqueue', () => {
    let reconcileCallback: () => Promise<void>;

    beforeEach(() => {
      startIntegrityCron();
      // Second schedule call is the reconciliation
      reconcileCallback = mockSchedule.mock.calls[1][1];
    });

    it('enqueues a reconcile job via ledgerQueue', async () => {
      await reconcileCallback();

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'reconcile',
        {},
        expect.objectContaining({ removeOnComplete: 10, removeOnFail: 5 }),
      );
    });

    it('handles queue error gracefully', async () => {
      mockQueueAdd.mockRejectedValueOnce(new Error('Redis down'));

      await reconcileCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CRON ERROR]'),
        expect.any(Error),
      );
    });
  });

  describe('AlertService integration', () => {
    let checkCallback: () => Promise<void>;

    beforeEach(() => {
      startIntegrityCron();
      checkCallback = mockSchedule.mock.calls[0][1];
    });

    it('emits a discrepancy alert via AlertService when balance mismatch is found', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: 500000 })   // get_total_users_balance
        .mockResolvedValueOnce({ data: 300000 });   // get_ledger_net_balance

      await checkCallback();

      expect(mockAlertEmitAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          category: 'discrepancy',
        }),
      );
    });

    it('does NOT emit alert when balances match', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: 500000 })
        .mockResolvedValueOnce({ data: 500000 });

      await checkCallback();

      expect(mockAlertEmitAsync).not.toHaveBeenCalled();
    });
  });
});
