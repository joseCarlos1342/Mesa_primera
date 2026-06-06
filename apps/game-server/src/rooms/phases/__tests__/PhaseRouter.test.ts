import { describe, expect, it, vi } from 'vitest';
import { enterPhase, getPhase, registerPhase } from '../PhaseRouter';

describe('PhaseRouter', () => {
  it('registers and retrieves phases by id', () => {
    const phase = { id: 'TEST_PHASE', enter: vi.fn() };

    registerPhase(phase);

    expect(getPhase('TEST_PHASE')).toBe(phase);
  });

  it('enters registered phases with context and options', () => {
    const enter = vi.fn();
    const phase = { id: 'ENTER_PHASE', enter };
    const ctx = { state: { phase: 'LOBBY' } } as any;
    const opts = { reason: 'test' };
    registerPhase(phase);

    enterPhase(ctx, 'ENTER_PHASE', opts);

    expect(enter).toHaveBeenCalledWith(ctx, opts);
  });

  it('throws for unknown phases', () => {
    expect(() => enterPhase({} as any, 'MISSING_PHASE')).toThrow('[PhaseRouter] Fase no registrada: MISSING_PHASE');
  });
});
