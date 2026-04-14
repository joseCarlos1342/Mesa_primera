/**
 * @jest-environment node
 */
import { registerDevice, enforceRateLimiting } from '@/app/actions/anti-fraud';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/utils/redis', () => ({
  getClientIp: jest.fn().mockResolvedValue('127.0.0.1'),
  checkRateLimit: jest.fn(),
}));

import { getClientIp, checkRateLimit } from '@/utils/redis';

describe('Anti-Fraud Server Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.resetAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // ── registerDevice ─────────────────────────────────────

  describe('registerDevice', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await registerDevice('fp-hash-123');
      expect(result).toEqual({ error: 'No user authenticated' });
    });

    it('returns success on valid device registration', async () => {
      const result = await registerDevice('fp-hash-123');
      expect(result).toEqual({ success: true });
    });

    it('upserts device with correct conflict key', async () => {
      await registerDevice('fp-hash-456');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_devices');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          device_id: 'fp-hash-456',
        }),
        { onConflict: 'user_id, device_id' },
      );
    });

    it('returns error when upsert fails', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: { message: 'unique violation' } });
      const result = await registerDevice('fp-hash-789');
      expect(result).toEqual({ error: 'unique violation' });
    });
  });

  // ── enforceRateLimiting ────────────────────────────────

  describe('enforceRateLimiting', () => {
    it('returns success when under rate limit', async () => {
      (checkRateLimit as jest.Mock).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: 60,
      });

      const result = await enforceRateLimiting('login');
      expect(result).toEqual({ success: true });
    });

    it('returns error when rate limit exceeded', async () => {
      (checkRateLimit as jest.Mock).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: 60,
      });

      const result = await enforceRateLimiting('withdraw');
      expect(result.error).toContain('Demasiados intentos');
    });

    it('constructs the correct rate limit key from action name and IP', async () => {
      (getClientIp as jest.Mock).mockResolvedValue('192.168.1.100');
      (checkRateLimit as jest.Mock).mockResolvedValue({ success: true });

      await enforceRateLimiting('login', 10, 120);

      expect(checkRateLimit).toHaveBeenCalledWith(
        'rate_limit:login:192.168.1.100',
        10,
        120,
      );
    });

    it('uses default limit=5 and windowSecs=60 when not specified', async () => {
      (getClientIp as jest.Mock).mockResolvedValue('10.0.0.1');
      (checkRateLimit as jest.Mock).mockResolvedValue({ success: true });

      await enforceRateLimiting('deposit');

      expect(checkRateLimit).toHaveBeenCalledWith(
        'rate_limit:deposit:10.0.0.1',
        5,
        60,
      );
    });
  });
});
