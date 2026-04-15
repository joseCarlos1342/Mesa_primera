import { render, screen, act } from '@testing-library/react';

// Mock formatAmount to avoid import resolution issues in jsdom
jest.mock('@/utils/format', () => ({
  formatAmount: (v: number) => String(v),
}));

import { RenderClient } from '../RenderClient';

// ── Helpers ──

function makeTimeline(length: number) {
  const events = [{ event: 'start', time: 0 }];
  for (let i = 1; i < length - 1; i++) {
    events.push({ event: 'action', action: 'voy', player: 'u1', amount: 100, time: i });
  }
  if (length > 1) {
    events.push({ event: 'end', winner: 'u1', payout: 1000, pot: 2000, rake: 100, time: length - 1 });
  }
  return events;
}

function makeReplay(timelineLength: number) {
  return {
    game_id: 'game-test',
    timeline: makeTimeline(timelineLength),
    admin_timeline: [],
    players: [{ userId: 'u1', nickname: 'Alice', chips: 5000 }],
    pot_breakdown: { totalPot: 2000 },
    final_hands: {},
    rng_seed: 'seed-abc',
    created_at: '2026-04-12T10:00:00Z',
  };
}

// ── Tests ──

describe('RenderClient — contrato de render automático', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('timeline vacío marca data-render-done="true" inmediatamente', () => {
    const replay = makeReplay(0);
    replay.timeline = [];
    replay.admin_timeline = [];
    const { container } = render(<RenderClient replay={replay} />);
    const el = container.querySelector('[data-render-done="true"]');
    expect(el).toBeInTheDocument();
  });

  it('expone data-render-state con valores loading|playing|done|error', () => {
    const replay = makeReplay(5);
    const { container } = render(<RenderClient replay={replay} />);
    const el = container.querySelector('[data-render-state]');
    expect(el).toBeInTheDocument();
    const state = el!.getAttribute('data-render-state');
    expect(['loading', 'playing', 'done', 'error']).toContain(state);
  });

  it('expone data-render-step y data-render-total como metadatos observables', () => {
    const replay = makeReplay(10);
    const { container } = render(<RenderClient replay={replay} />);
    const el = container.querySelector('[data-render-step]');
    expect(el).toBeInTheDocument();
    expect(el!.getAttribute('data-render-step')).toBe('0');
    expect(el!.getAttribute('data-render-total')).toBe('10');
  });

  it('un timeline de 200 eventos completa en menos de 60 segundos de wall time simulado', () => {
    const replay = makeReplay(200);
    const { container } = render(<RenderClient replay={replay} />);

    // Advance in small steps so React re-renders and chains timeouts
    const steps = Math.ceil(60_000 / 250);
    for (let i = 0; i < steps; i++) {
      act(() => { jest.advanceTimersByTime(250); });
    }

    const el = container.querySelector('[data-render-done="true"]');
    expect(el).toBeInTheDocument();
  });

  it('un timeline de 300 eventos completa en menos de 90 segundos de wall time simulado', () => {
    const replay = makeReplay(300);
    const { container } = render(<RenderClient replay={replay} />);

    const steps = Math.ceil(90_000 / 250);
    for (let i = 0; i < steps; i++) {
      act(() => { jest.advanceTimersByTime(250); });
    }

    const el = container.querySelector('[data-render-done="true"]');
    expect(el).toBeInTheDocument();
  });

  it('al finalizar el último paso, data-render-state transiciona a "done"', () => {
    const replay = makeReplay(3);
    const { container } = render(<RenderClient replay={replay} />);

    // Advance step by step to allow React to chain timeouts
    const steps = Math.ceil(30_000 / 250);
    for (let i = 0; i < steps; i++) {
      act(() => { jest.advanceTimersByTime(250); });
    }

    const el = container.querySelector('[data-render-state="done"]');
    expect(el).toBeInTheDocument();
    // También debe tener data-render-done="true" para retrocompatibilidad
    expect(el!.getAttribute('data-render-done')).toBe('true');
  });
});
