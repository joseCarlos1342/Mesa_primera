/**
 * Replay v2 — Contrato para reconstruir visualmente una partida a partir de frames.
 *
 * Una partida v2 se compone de:
 *  - `events[]`: la linea de tiempo auditable (lo que ya existe en v1 como `timeline`).
 *  - `frames[]`: snapshots normalizados del estado del juego inmediatamente despues
 *                de cada evento. Cada frame es suficiente para pintar la mesa
 *                (cartas, fichas, fase, turno) sin necesidad de reejecutar el motor.
 *
 * Las estructuras aqui definidas son deliberadamente agnosticas de Colyseus para
 * que el `SnapshotBuilder` sea unit-testable sin levantar un Room.
 */

export const REPLAY_VERSION = 2 as const;

/** Campos minimos de Player requeridos para construir un frame. */
export interface PlayerLike {
  id: string;
  nickname: string;
  avatarUrl: string;
  connected: boolean;
  isFolded: boolean;
  isReady: boolean;
  isWaiting: boolean;
  isAllIn: boolean;
  hasActed: boolean;
  chips: number;
  roundBet: number;
  turnOrder: number;
  cardCount: number;
  revealedCards: string;
  /** Mano privada; solo se expone en el frame cuando se ha revelado (SHOWDOWN). */
  cards: string;
  supabaseUserId: string;
}

/** Campos minimos de GameState requeridos para construir un frame. */
export interface StateLike {
  phase: string;
  dealerId: string;
  activeManoId: string;
  turnPlayerId: string;
  pot: number;
  piquePot: number;
  currentMaxBet: number;
  bottomCard: string;
  countdown: number;
  /** Compatible con MapSchema (tiene `.values()`) y con Map nativo. */
  players: { values(): IterableIterator<PlayerLike> } | Map<string, PlayerLike>;
}

/** Tipos de animacion que el reproductor puede interpretar. */
export type AnimationHintKind =
  | 'deal'
  | 'discard'
  | 'bet'
  | 'fold'
  | 'pass'
  | 'reveal'
  | 'pot_award'
  | 'pique_award'
  | 'mano_transfer'
  | 'phase_change';

export interface AnimationHint {
  kind: AnimationHintKind;
  targetPlayerId?: string;
  amount?: number;
  cards?: string[];
}

export interface ReplayPlayerFrame {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl: string;
  chips: number;
  turnOrder: number;
  roundBet: number;
  cardCount: number;
  revealedCards: string[];
  isDealer: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isWaiting: boolean;
  isConnected: boolean;
  hasActed: boolean;
  /** Mano completa; solo se debe rellenar cuando la fase ya hizo publicas las cartas. */
  privateCards?: string[];
}

export interface ReplayFrame {
  seq: number;
  ts: number;
  eventIdx: number;
  phase: string;
  dealerId: string;
  activeManoId: string;
  turnPlayerId: string;
  pot: number;
  piquePot: number;
  currentMaxBet: number;
  bottomCard: string;
  countdown: number;
  players: ReplayPlayerFrame[];
  hint?: AnimationHint;
}

/** Separa una cadena "A,B,C" en tokens y descarta vacios. */
function splitCards(csv: string): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

/** Extrae los jugadores de `state.players` soportando MapSchema y Map. */
function iteratePlayers(players: StateLike['players']): PlayerLike[] {
  if (players instanceof Map) {
    return Array.from(players.values());
  }
  return Array.from(players.values());
}

/**
 * Snapshot frame sin la parte privada de las cartas. `privateCards` solo se
 * rellena en fases donde el juego ya las revelo (SHOWDOWN).
 */
function snapshotPlayer(player: PlayerLike, dealerId: string, state: StateLike): ReplayPlayerFrame {
  const shouldExposeHand =
    state.phase === 'SHOWDOWN' ||
    state.phase === 'SHOWDOWN_WAIT' ||
    state.phase === 'REVELAR_CARTA' ||
    state.phase === 'GUERRA_JUEGO';

  const frame: ReplayPlayerFrame = {
    id: player.id,
    userId: player.supabaseUserId || player.id,
    nickname: player.nickname,
    avatarUrl: player.avatarUrl,
    chips: player.chips,
    turnOrder: player.turnOrder,
    roundBet: player.roundBet,
    cardCount: splitCards(player.cards).length || player.cardCount,
    revealedCards: splitCards(player.revealedCards),
    isDealer: player.id === dealerId,
    isFolded: player.isFolded,
    isAllIn: player.isAllIn,
    isWaiting: player.isWaiting,
    isConnected: player.connected,
    hasActed: player.hasActed,
  };

  if (shouldExposeHand && player.cards) {
    frame.privateCards = splitCards(player.cards);
  }

  return frame;
}

/**
 * Construye frames normalizados a partir de `GameState`. No ejecuta el motor;
 * se limita a serializar el estado actual al momento de cada evento.
 */
export class SnapshotBuilder {
  private _frames: ReplayFrame[] = [];
  private _seq: number = 0;

  get frames(): ReplayFrame[] {
    return this._frames;
  }

  get nextSeq(): number {
    return this._seq;
  }

  /**
   * Captura un frame a partir del estado actual. Normalmente se llama
   * inmediatamente despues de empujar un evento al timeline.
   */
  captureFrame(state: StateLike, eventIdx: number, hint?: AnimationHint): ReplayFrame {
    const sortedPlayers = iteratePlayers(state.players)
      .slice()
      .sort((a, b) => {
        // Jugadores con turnOrder asignado primero (ascendente);
        // los que aun no lo tienen (0) se mantienen al final por id.
        if (a.turnOrder !== b.turnOrder) {
          if (a.turnOrder === 0) return 1;
          if (b.turnOrder === 0) return -1;
          return a.turnOrder - b.turnOrder;
        }
        return a.id.localeCompare(b.id);
      })
      .map(p => snapshotPlayer(p, state.dealerId, state));

    const frame: ReplayFrame = {
      seq: this._seq,
      ts: Date.now(),
      eventIdx,
      phase: state.phase,
      dealerId: state.dealerId,
      activeManoId: state.activeManoId,
      turnPlayerId: state.turnPlayerId,
      pot: state.pot,
      piquePot: state.piquePot,
      currentMaxBet: state.currentMaxBet,
      bottomCard: state.bottomCard,
      countdown: state.countdown,
      players: sortedPlayers,
    };

    if (hint) {
      frame.hint = hint;
    }

    this._frames.push(frame);
    this._seq += 1;
    return frame;
  }

  /** Devuelve el array de frames acumulado (misma referencia en cada llamada). */
  build(): ReplayFrame[] {
    return this._frames;
  }

  /** Reinicia el estado interno (util al iniciar una nueva partida dentro del mismo room). */
  reset(): void {
    this._frames = [];
    this._seq = 0;
  }
}
