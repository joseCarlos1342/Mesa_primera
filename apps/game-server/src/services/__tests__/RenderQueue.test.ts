import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Mocks de BullMQ — vi.hoisted para que estén disponibles antes del hoist de vi.mock */
const { mockAdd, mockQueueOn } = vi.hoisted(() => ({
  mockAdd: vi.fn().mockResolvedValue({ id: 'job-123' }),
  mockQueueOn: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    add = mockAdd;
    on = mockQueueOn;
  },
}));

import { RenderQueue } from '../../services/RenderQueue';

describe('RenderQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encola un trabajo de render con los datos correctos', async () => {
    const job = await RenderQueue.enqueue({
      gameId: 'game-abc',
      replayPath: '2026-04/game-abc.json',
      createdAt: '2026-04-12T10:00:00.000Z',
    });

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith(
      'render-mp4',
      {
        gameId: 'game-abc',
        replayPath: '2026-04/game-abc.json',
        createdAt: '2026-04-12T10:00:00.000Z',
      },
      expect.objectContaining({
        jobId: 'render-game-abc',
        attempts: 2,
        removeOnComplete: true,
      }),
    );
    expect(job).toEqual({ id: 'job-123' });
  });

  it('usa jobId deduplicado basado en gameId', async () => {
    await RenderQueue.enqueue({
      gameId: 'game-xyz',
      replayPath: '2026-04/game-xyz.json',
      createdAt: '2026-04-12T12:00:00.000Z',
    });

    const callArgs = mockAdd.mock.calls[0];
    expect(callArgs[2].jobId).toBe('render-game-xyz');
  });

  it('retorna el nombre de la cola', () => {
    expect(RenderQueue.QUEUE_NAME).toBe('mp4-render');
  });
});
