import { describe, it, expect, beforeEach } from 'vitest';
import { SnapshotBuilder, REPLAY_VERSION, type StateLike, type PlayerLike } from '../ReplayV2';

function mkPlayer(overrides: Partial<PlayerLike> = {}): PlayerLike {
  return {
    id: overrides.id ?? 'p1',
    nickname: overrides.nickname ?? 'Player 1',
    avatarUrl: overrides.avatarUrl ?? '',
    connected: overrides.connected ?? true,
    isFolded: overrides.isFolded ?? false,
    isReady: overrides.isReady ?? false,
    isWaiting: overrides.isWaiting ?? false,
    isAllIn: overrides.isAllIn ?? false,
    hasActed: overrides.hasActed ?? false,
    chips: overrides.chips ?? 1_000_000,
    roundBet: overrides.roundBet ?? 0,
    turnOrder: overrides.turnOrder ?? 1,
    cardCount: overrides.cardCount ?? 0,
    revealedCards: overrides.revealedCards ?? '',
    cards: overrides.cards ?? '',
    supabaseUserId: overrides.supabaseUserId ?? 'uuid-p1',
  };
}

function mkState(overrides: Partial<StateLike> = {}, players: PlayerLike[] = []): StateLike {
  const map = new Map<string, PlayerLike>();
  players.forEach(p => map.set(p.id, p));
  return {
    phase: overrides.phase ?? 'LOBBY',
    dealerId: overrides.dealerId ?? '',
    activeManoId: overrides.activeManoId ?? '',
    turnPlayerId: overrides.turnPlayerId ?? '',
    pot: overrides.pot ?? 0,
    piquePot: overrides.piquePot ?? 0,
    currentMaxBet: overrides.currentMaxBet ?? 0,
    bottomCard: overrides.bottomCard ?? '',
    countdown: overrides.countdown ?? -1,
    players: map,
  };
}

describe('SnapshotBuilder', () => {
  let builder: SnapshotBuilder;

  beforeEach(() => {
    builder = new SnapshotBuilder();
  });

  it('empty builder has no frames and seq starts at 0', () => {
    expect(builder.frames).toEqual([]);
    expect(builder.nextSeq).toBe(0);
  });

  it('captures a frame with core GameState fields', () => {
    const state = mkState(
      { phase: 'PIQUE', dealerId: 'p1', pot: 1000, piquePot: 500, turnPlayerId: 'p2', currentMaxBet: 250 },
      [mkPlayer({ id: 'p1', turnOrder: 1 }), mkPlayer({ id: 'p2', turnOrder: 2, nickname: 'Player 2' })]
    );

    builder.captureFrame(state, 0);

    expect(builder.frames).toHaveLength(1);
    const frame = builder.frames[0];
    expect(frame.seq).toBe(0);
    expect(frame.eventIdx).toBe(0);
    expect(frame.phase).toBe('PIQUE');
    expect(frame.dealerId).toBe('p1');
    expect(frame.turnPlayerId).toBe('p2');
    expect(frame.pot).toBe(1000);
    expect(frame.piquePot).toBe(500);
    expect(frame.currentMaxBet).toBe(250);
    expect(frame.players).toHaveLength(2);
    expect(typeof frame.ts).toBe('number');
  });

  it('increments seq across consecutive captures', () => {
    const state = mkState({}, [mkPlayer()]);
    builder.captureFrame(state, 0);
    builder.captureFrame(state, 1);
    builder.captureFrame(state, 2);

    expect(builder.frames.map(f => f.seq)).toEqual([0, 1, 2]);
    expect(builder.frames.map(f => f.eventIdx)).toEqual([0, 1, 2]);
    expect(builder.nextSeq).toBe(3);
  });

  it('serializes player frame with expected fields and computes cardCount', () => {
    const state = mkState(
      { phase: 'PIQUE', dealerId: 'p1' },
      [mkPlayer({ id: 'p1', cards: '3O,5C,7B,QE', chips: 500_000, turnOrder: 1 })]
    );

    builder.captureFrame(state, 0);

    const player = builder.frames[0].players[0];
    expect(player.id).toBe('p1');
    expect(player.userId).toBe('uuid-p1');
    expect(player.nickname).toBe('Player 1');
    expect(player.chips).toBe(500_000);
    expect(player.turnOrder).toBe(1);
    expect(player.isDealer).toBe(true);
    expect(player.cardCount).toBe(4);
    expect(player.revealedCards).toEqual([]);
  });

  it('orders players by turnOrder ascending (stable seat presentation)', () => {
    const state = mkState(
      {},
      [
        mkPlayer({ id: 'p3', turnOrder: 3 }),
        mkPlayer({ id: 'p1', turnOrder: 1 }),
        mkPlayer({ id: 'p2', turnOrder: 2 }),
      ]
    );

    builder.captureFrame(state, 0);

    expect(builder.frames[0].players.map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('exposes revealedCards as an array and trims empty entries', () => {
    const state = mkState(
      {},
      [mkPlayer({ id: 'p1', revealedCards: '3O,5C,' })]
    );

    builder.captureFrame(state, 0);

    expect(builder.frames[0].players[0].revealedCards).toEqual(['3O', '5C']);
  });

  it('attaches animation hint when provided', () => {
    const state = mkState({}, [mkPlayer()]);
    builder.captureFrame(state, 0, { kind: 'bet', targetPlayerId: 'p1', amount: 5000 });

    expect(builder.frames[0].hint).toEqual({ kind: 'bet', targetPlayerId: 'p1', amount: 5000 });
  });

  it('marks bottomCard and countdown from state', () => {
    const state = mkState({ bottomCard: '7O', countdown: 5 }, [mkPlayer()]);
    builder.captureFrame(state, 0);

    expect(builder.frames[0].bottomCard).toBe('7O');
    expect(builder.frames[0].countdown).toBe(5);
  });

  it('REPLAY_VERSION is 2', () => {
    expect(REPLAY_VERSION).toBe(2);
  });

  it('build() returns the frames array and resets nothing (idempotent read)', () => {
    const state = mkState({}, [mkPlayer()]);
    builder.captureFrame(state, 0);
    const first = builder.build();
    const second = builder.build();

    expect(first).toBe(second);
    expect(first).toHaveLength(1);
  });
});
