import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ──
const { mockSchedule, mockRpc, mockFromInsert, mockCollusionEmit } = vi.hoisted(() => {
  return {
    mockSchedule: vi.fn(),
    mockRpc: vi.fn(),
    mockFromInsert: vi.fn().mockResolvedValue({ error: null }),
    mockCollusionEmit: vi.fn(),
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

vi.mock('../../services/AlertService', () => ({
  AlertService: {
    collusion: mockCollusionEmit,
  },
}));

import { startAntiCollusionCron } from '../../cron/antiCollusion';

describe('antiCollusion cron', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('registers a bi-hourly cron schedule', () => {
    startAntiCollusionCron();

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith('0 */2 * * *', expect.any(Function));
  });

  describe('collusion detection callback', () => {
    let callback: () => Promise<void>;

    beforeEach(() => {
      startAntiCollusionCron();
      callback = mockSchedule.mock.calls[0][1];
    });

    it('calls detect_potential_collusion RPC with threshold=10', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await callback();

      expect(mockRpc).toHaveBeenCalledWith('detect_potential_collusion', { threshold: 10 });
    });

    it('logs OK when no collusion patterns detected', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await callback();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No hay patrones evidentes'),
      );
      expect(mockCollusionEmit).not.toHaveBeenCalled();
    });

    it('handles missing RPC gracefully (error from DB)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'function does not exist' },
      });

      await callback();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('no encontrado'),
      );
      expect(mockCollusionEmit).not.toHaveBeenCalled();
    });

    it('triggers AlertService.collusion and inserts audit entries when pairs found', async () => {
      const pairs = [
        { player_1: 'user-a', player_2: 'user-b', count: 15 },
        { player_1: 'user-c', player_2: 'user-d', count: 12 },
      ];
      mockRpc.mockResolvedValue({ data: pairs, error: null });

      await callback();

      expect(mockCollusionEmit).toHaveBeenCalledWith(pairs);
      // One audit insert per pair
      expect(mockFromInsert).toHaveBeenCalledTimes(2);
      expect(mockFromInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SYSTEM_ANTI_COLLUSION_ALERT',
          details: expect.objectContaining({
            player_1: 'user-a',
            player_2: 'user-b',
            matches_together: 15,
          }),
        }),
      );
    });

    it('handles a single collusion pair', async () => {
      const pairs = [{ player_1: 'x', player_2: 'y', count: 20 }];
      mockRpc.mockResolvedValue({ data: pairs, error: null });

      await callback();

      expect(mockCollusionEmit).toHaveBeenCalledTimes(1);
      expect(mockFromInsert).toHaveBeenCalledTimes(1);
    });

    it('handles exception in callback gracefully', async () => {
      mockRpc.mockRejectedValue(new Error('Network timeout'));

      await callback();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CRON ERROR]'),
        expect.any(Error),
      );
    });

    it('does not trigger alert for null data without error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await callback();

      // null data without error → treated as no collusion
      expect(mockCollusionEmit).not.toHaveBeenCalled();
    });
  });
});
