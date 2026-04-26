/**
 * Contrato de Replay v2 — duplicado en el workspace web por ausencia de un paquete
 * compartido entre `apps/web` y `apps/game-server`. Mantener sincronizado con
 * `apps/game-server/src/services/ReplayV2.ts`.
 */

export const REPLAY_VERSION = 2 as const;

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

/** Parse "valor-Palo" (e.g. "07-O" o "12-Copas") o el formato compacto histórico
 *  ("3O", "7B") → { value, suit }. Devuelve null si la cadena no es interpretable.
 *
 *  Mantenemos retrocompatibilidad con replays antiguos persistidos en VPS que
 *  pudieran haberse grabado en formato compacto. El formato canónico actual del
 *  motor (`MesaRoom.createDeck`) es "valor-Palo" con palo de una letra.
 */
export function parseCard(card: string): { value: number; suit: 'Oros' | 'Copas' | 'Espadas' | 'Bastos' } | null {
  if (!card || typeof card !== 'string') return null;
  const suitMap: Record<string, 'Oros' | 'Copas' | 'Espadas' | 'Bastos'> = {
    O: 'Oros', Oros: 'Oros',
    C: 'Copas', Copas: 'Copas',
    E: 'Espadas', Espadas: 'Espadas',
    B: 'Bastos', Bastos: 'Bastos',
  };

  let valueStr = '';
  let suitKey = '';

  if (card.includes('-')) {
    const parts = card.split('-');
    if (parts.length !== 2) return null;
    valueStr = parts[0];
    suitKey = parts[1];
  } else {
    // Formato compacto: "3O", "12C". Suit es la última 1 letra (O/C/E/B).
    const match = card.match(/^(\d{1,2})([OCEB])$/);
    if (!match) return null;
    valueStr = match[1];
    suitKey = match[2];
  }

  if (!valueStr) return null;
  const value = parseInt(valueStr, 10);
  if (!Number.isFinite(value)) return null;
  const suit = suitMap[suitKey];
  if (!suit) return null;
  return { value, suit };
}
