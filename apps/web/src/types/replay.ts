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

/** Parse "valor-Palo" (e.g. "07-O" o "12-Copas") → { value, suit }. */
export function parseCard(card: string): { value: number; suit: 'Oros' | 'Copas' | 'Espadas' | 'Bastos' } | null {
  if (!card) return null;
  const parts = card.split('-');
  if (parts.length !== 2) return null;
  const value = parseInt(parts[0], 10);
  if (!Number.isFinite(value)) return null;
  const suitKey = parts[1];
  const map: Record<string, 'Oros' | 'Copas' | 'Espadas' | 'Bastos'> = {
    O: 'Oros', Oros: 'Oros',
    C: 'Copas', Copas: 'Copas',
    E: 'Espadas', Espadas: 'Espadas',
    B: 'Bastos', Bastos: 'Bastos',
  };
  const suit = map[suitKey];
  if (!suit) return null;
  return { value, suit };
}
