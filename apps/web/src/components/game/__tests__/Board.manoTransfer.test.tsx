import { render, screen, act } from '@testing-library/react';
import { Board } from '../Board';

// ── Heavy child component mocks ──────────────────────────────────────
jest.mock('../PlayerBadge', () => ({ PlayerBadge: () => <div data-testid="player-badge" /> }));
jest.mock('../ActionControls', () => ({ ActionControls: () => null }));
jest.mock('../ChipSelector', () => ({ ChipSelector: () => null }));
jest.mock('../Card', () => ({ Card: () => <div data-testid="card" /> }));
jest.mock('../ShowdownCinematic', () => ({
  ShowdownCinematic: ({ onDismiss }: any) => (
    <div data-testid="showdown-cinematic">
      <button data-testid="dismiss-showdown" onClick={onDismiss}>Cerrar</button>
    </div>
  ),
}));
jest.mock('../PiqueRevealOverlay', () => ({
  PiqueRevealOverlay: () => <div data-testid="pique-reveal-overlay" />,
}));
jest.mock('../AnimationLayer', () => ({ AnimationLayer: () => null }));
jest.mock('../ShuffleAnimation', () => ({ ShuffleAnimation: () => null }));
jest.mock('../ManoIcon', () => ({
  ManoIcon: (props: any) => <div data-testid="mano-icon" data-size={props.size} />,
}));
jest.mock('@/hooks/useCardPreloader', () => ({ useCardPreloader: () => {} }));
jest.mock('@/utils/handEvaluation', () => ({
  evaluateHand: () => ({ type: 'NINGUNA', points: 30 }),
}));
jest.mock('@/utils/format', () => ({
  formatCurrency: (v: number) => `$${v}`,
}));

// ── Helpers ──────────────────────────────────────────────────────────

function createMockRoom(overrides: Record<string, any> = {}) {
  const state: Record<string, any> = {
    dealerId: overrides.dealerId ?? 'player-1',
    phase: overrides.phase ?? 'GUERRA',
    turnPlayerId: overrides.turnPlayerId ?? 'player-1',
    ...overrides.stateOverrides,
  };
  return {
    sessionId: overrides.sessionId ?? 'player-1',
    state,
    send: jest.fn(),
    onMessage: jest.fn(),
  } as any;
}

function makePlayers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    nickname: `Player${i + 1}`,
    chips: 10_000_000,
    connected: true,
    isFolded: false,
    revealedCards: '',
    cardCount: 0,
    turnOrder: i + 1,
  }));
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Board — Mano transfer deferral during reveal overlays', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('does NOT show mano announcement when dealerId changes during SHOWDOWN', () => {
    const players = makePlayers(3);
    const room = createMockRoom({ dealerId: 'player-1', phase: 'GUERRA' });

    const { rerender } = render(
      <Board room={room} phase="GUERRA" pot={1_000_000} piquePot={0} players={players} />
    );

    // Transition to SHOWDOWN and change dealerId simultaneously (server does both)
    room.state.dealerId = 'player-2';
    room.state.phase = 'SHOWDOWN';

    // Add revealedCards so ShowdownCinematic renders
    players[0].revealedCards = '01-O,03-C,05-E,07-B';
    players[1].revealedCards = '02-O,04-C,06-E,01-B';

    rerender(
      <Board room={room} phase="SHOWDOWN" pot={1_000_000} piquePot={0} players={players} />
    );

    // The announcement should NOT appear while SHOWDOWN overlay is active
    expect(screen.queryByText(/es la nueva mano/)).not.toBeInTheDocument();
  });

  it('does NOT show mano announcement when dealerId changes during PIQUE_REVEAL', () => {
    const players = makePlayers(3);
    const room = createMockRoom({ dealerId: 'player-1', phase: 'PIQUE' });

    const { rerender } = render(
      <Board room={room} phase="PIQUE" pot={0} piquePot={500_000} players={players} />
    );

    // Transition to PIQUE_REVEAL and change dealerId
    room.state.dealerId = 'player-2';
    room.state.phase = 'PIQUE_REVEAL';

    rerender(
      <Board room={room} phase="PIQUE_REVEAL" pot={0} piquePot={500_000} players={players} />
    );

    expect(screen.queryByText(/es la nueva mano/)).not.toBeInTheDocument();
  });

  it('shows mano announcement AFTER overlay closes (SHOWDOWN → LOBBY)', () => {
    const players = makePlayers(3);
    const room = createMockRoom({ dealerId: 'player-1', phase: 'GUERRA' });

    const { rerender } = render(
      <Board room={room} phase="GUERRA" pot={1_000_000} piquePot={0} players={players} />
    );

    // Enter SHOWDOWN with dealer change
    room.state.dealerId = 'player-2';
    room.state.phase = 'SHOWDOWN';
    players[0].revealedCards = '01-O,03-C,05-E,07-B';
    players[1].revealedCards = '02-O,04-C,06-E,01-B';

    rerender(
      <Board room={room} phase="SHOWDOWN" pot={1_000_000} piquePot={0} players={players} />
    );

    // Confirm still suppressed
    expect(screen.queryByText(/es la nueva mano/)).not.toBeInTheDocument();

    // Now overlay dismissed — phase goes to LOBBY
    room.state.phase = 'LOBBY';
    players[0].revealedCards = '';
    players[1].revealedCards = '';

    rerender(
      <Board room={room} phase="LOBBY" pot={0} piquePot={0} players={players} />
    );

    // NOW the announcement should appear
    expect(screen.getByText('Player2 es la nueva mano')).toBeInTheDocument();
  });

  it('immediately shows mano announcement during non-blocking phases', () => {
    const players = makePlayers(3);
    const room = createMockRoom({ dealerId: 'player-1', phase: 'GUERRA' });

    const { rerender } = render(
      <Board room={room} phase="GUERRA" pot={1_000_000} piquePot={0} players={players} />
    );

    // Change dealerId during a normal phase (e.g. mid-pique rotation)
    room.state.dealerId = 'player-2';
    room.state.phase = 'PIQUE';

    rerender(
      <Board room={room} phase="PIQUE" pot={0} piquePot={500_000} players={players} />
    );

    // Should appear immediately (no deferral)
    expect(screen.getByText('Player2 es la nueva mano')).toBeInTheDocument();
  });

  it('clears the announcement after 3.5s timeout', () => {
    const players = makePlayers(3);
    const room = createMockRoom({ dealerId: 'player-1', phase: 'GUERRA' });

    const { rerender } = render(
      <Board room={room} phase="GUERRA" pot={1_000_000} piquePot={0} players={players} />
    );

    room.state.dealerId = 'player-2';
    room.state.phase = 'PIQUE';

    rerender(
      <Board room={room} phase="PIQUE" pot={0} piquePot={500_000} players={players} />
    );

    expect(screen.getByText('Player2 es la nueva mano')).toBeInTheDocument();

    // Advance past the 3.5s auto-clear
    act(() => { jest.advanceTimersByTime(4000); });

    expect(screen.queryByText(/es la nueva mano/)).not.toBeInTheDocument();
  });

  it('only keeps the LAST dealer change when multiple occur during an overlay', () => {
    const players = makePlayers(4);
    const room = createMockRoom({ dealerId: 'player-1', phase: 'GUERRA' });

    const { rerender } = render(
      <Board room={room} phase="GUERRA" pot={1_000_000} piquePot={0} players={players} />
    );

    // Enter SHOWDOWN and change dealer twice
    room.state.dealerId = 'player-2';
    room.state.phase = 'SHOWDOWN';
    players.forEach(p => p.revealedCards = '01-O,03-C,05-E,07-B');

    rerender(
      <Board room={room} phase="SHOWDOWN" pot={1_000_000} piquePot={0} players={players} />
    );

    // Second dealer change while still in SHOWDOWN
    room.state.dealerId = 'player-3';

    rerender(
      <Board room={room} phase="SHOWDOWN" pot={1_000_000} piquePot={0} players={players} />
    );

    // Exit overlay
    room.state.phase = 'LOBBY';
    players.forEach(p => p.revealedCards = '');

    rerender(
      <Board room={room} phase="LOBBY" pot={0} piquePot={0} players={players} />
    );

    // Should show Player3 (the latest), NOT Player2
    expect(screen.getByText('Player3 es la nueva mano')).toBeInTheDocument();
    expect(screen.queryByText('Player2 es la nueva mano')).not.toBeInTheDocument();
  });
});
