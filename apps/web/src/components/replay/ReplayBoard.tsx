'use client';

import { m } from 'framer-motion';
import { PlayerBadge } from '@/components/game/PlayerBadge';
import { Card } from '@/components/game/Card';
import { getArcCardLayout } from '@/components/game/hand-layout';
import { TablePots, TableSurface } from '@/components/game/TableSurface';
import { formatCurrency } from '@/utils/format';
import { parseCard } from '@/types/replay';
import type { ReplayFrame, ReplayPlayerFrame } from '@/types/replay';

interface ReplayBoardProps {
  frame: ReplayFrame;
  /** Cartas conocidas por playerId (de cualquier frame previo). */
  cardFallbackByPlayerId?: Map<string, string[]>;
  /** Cartas conocidas por userId (incluye `final_hands` de la BD). */
  cardFallbackByUserId?: Map<string, string[]>;
  className?: string;
}

/**
 * Reproducción visual idéntica a la mesa de juego real, pero alimentada por un
 * `ReplayFrame` en lugar del Room de Colyseus. Como es una vista de espectador,
 * todos los jugadores ocupan asientos del perímetro distribuidos en todo el
 * contorno (incluyendo la parte inferior) para aprovechar el espacio.
 *
 * Soporta de 3 a 7 jugadores. Cada layout reparte los asientos uniformemente
 * para que la mesa no quede comprimida arriba ni vacía abajo.
 */
const SEAT_LAYOUTS: Record<number, readonly string[]> = {
  3: [
    'top-[5%] left-1/2 -translate-x-1/2',
    'bottom-[6%] left-[14%]',
    'bottom-[6%] right-[14%]',
  ],
  4: [
    'top-[5%] left-[18%]',
    'top-[5%] right-[18%]',
    'bottom-[6%] left-[18%]',
    'bottom-[6%] right-[18%]',
  ],
  5: [
    'top-[28%] left-[2%] lg:top-[26%] lg:left-[4%]',
    'top-[5%] left-[20%]',
    'top-[5%] right-[20%]',
    'top-[28%] right-[2%] lg:top-[26%] lg:right-[4%]',
    'bottom-[6%] left-1/2 -translate-x-1/2',
  ],
  6: [
    'top-[28%] left-[2%] lg:top-[26%] lg:left-[4%]',
    'top-[4%] left-[20%] lg:top-[3%] lg:left-[22%]',
    'top-[4%] right-[20%] lg:top-[3%] lg:right-[22%]',
    'top-[28%] right-[2%] lg:top-[26%] lg:right-[4%]',
    'bottom-[6%] right-[18%] lg:bottom-[6%] lg:right-[22%]',
    'bottom-[6%] left-[18%] lg:bottom-[6%] lg:left-[22%]',
  ],
  7: [
    'top-[28%] left-[1%] lg:top-[26%] lg:left-[3%]',
    'top-[4%] left-[16%]',
    'top-[3%] left-1/2 -translate-x-1/2',
    'top-[4%] right-[16%]',
    'top-[28%] right-[1%] lg:top-[26%] lg:right-[3%]',
    'bottom-[6%] right-[16%]',
    'bottom-[6%] left-[16%]',
  ],
};

/** Devuelve la lista de clases tailwind para distribuir N asientos (3..7). */
function seatPositionsFor(count: number): readonly string[] {
  const clamped = Math.max(3, Math.min(7, count));
  return SEAT_LAYOUTS[clamped];
}

/** Indica si un seatClass está en la franja inferior (necesita z-index alto). */
function isBottomSeat(seatClass: string): boolean {
  return seatClass.includes('bottom-');
}

const HIDE_MANO_PHASES = new Set(['LOBBY', 'STARTING', 'BARAJANDO', 'SORTEO_MANO']);

const PHASE_LABELS: Record<string, string> = {
  LOBBY: 'En espera',
  STARTING: 'Iniciando',
  BARAJANDO: 'Barajando',
  SORTEO_MANO: 'Sorteo de mano',
  PIQUE: 'Pique',
  DESCARTE: 'Descarte',
  APUESTA_4_CARTAS: 'Apuesta',
  CANTICOS: 'Cánticos',
  REVELAR_CARTA: 'Revelar carta',
  GUERRA: 'Guerra',
  GUERRA_JUEGO: 'Guerra — juego',
  SHOWDOWN: 'Showdown',
  SHOWDOWN_WAIT: 'Showdown',
  END: 'Fin',
};

function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? phase;
}

function PlayerSeat({
  player,
  seatClass,
  frame,
  cardFallbackByPlayerId,
  cardFallbackByUserId,
}: {
  player: ReplayPlayerFrame;
  seatClass: string;
  frame: ReplayFrame;
  cardFallbackByPlayerId?: Map<string, string[]>;
  cardFallbackByUserId?: Map<string, string[]>;
}) {
  const hideMano = HIDE_MANO_PHASES.has(frame.phase);
  const isActive = frame.turnPlayerId === player.id;
  const isDealer = !hideMano && frame.dealerId === player.id;
  const bottom = isBottomSeat(seatClass);

  const privateCards = player.privateCards ?? [];
  const revealedCards = player.revealedCards ?? [];
  // En modo repetición usamos la memoria progresiva (frames 0..index) para
  // jugadores que ya foldearon. Nunca debe alimentarse con frames futuros.
  const fallbackCards =
    cardFallbackByPlayerId?.get(player.id) ||
    cardFallbackByUserId?.get(player.userId) ||
    [];
  const visibleCards =
    privateCards.length > 0
      ? privateCards
      : fallbackCards.length > 0
        ? fallbackCards
        : revealedCards;
  const cardCount = player.cardCount ?? 0;
  // Asientos inferiores: la mano debe ir POR ENCIMA del bloque central (z-20)
  // y del badge para no quedar tapada.
  const seatZ = bottom ? 'z-30' : 'z-20';

  // En showdown (o cuando hay cualquier revelación pública) las cartas de
  // jugadores foldeados deben verse nítidas: nada de opacidad reducida ni de
  // grayscale. Sólo aplicamos el tratamiento atenuado de "fold" en fases
  // anteriores al showdown, donde la mano sigue siendo privada/oculta.
  const isRevealPhase =
    frame.phase === 'SHOWDOWN' ||
    frame.phase === 'SHOWDOWN_WAIT' ||
    privateCards.length > 0 ||
    revealedCards.length > 0;
  const dimFolded = player.isFolded && !isRevealPhase;

  return (
    <div
      id={`replay-seat-${player.id}`}
      data-testid={`replay-player-${player.id}`}
      data-active={String(isActive)}
      data-folded={String(player.isFolded)}
      data-connected={String(player.isConnected)}
      data-bottom={String(bottom)}
      className={`absolute ${seatClass} flex flex-col items-center ${seatZ} transition-all duration-700`}
    >
      <div data-seat-zone="avatar" className="flex flex-col items-center">
        <PlayerBadge
          player={player}
          isActive={isActive}
          isMe={false}
          isDealer={isDealer}
          turnOrder={player.turnOrder}
          isWaiting={player.isWaiting}
          isAllIn={player.isAllIn}
        />
      </div>
      <span
        data-testid={`replay-player-${player.id}-chips`}
        className="sr-only"
      >
        {formatCurrency(player.chips)}
      </span>
      <div
        data-testid={`replay-player-${player.id}-cards`}
        data-seat-zone="cards"
        className={`flex relative justify-center mt-1 md:mt-2 ${bottom ? 'z-30' : 'z-0'} h-32 w-44 md:h-36 md:w-52 scale-60 lg:scale-70 origin-top`}
      >
          {visibleCards.length > 0
            ? visibleCards.map((cardStr, idx, arr) => {
                const parsed = parseCard(cardStr);
                const layout = getArcCardLayout({
                  index: idx,
                  count: arr.length,
                  variant: 'opponent',
                  density: 'compact',
                });
                return (
                  <m.div
                    key={`${player.id}-card-${idx}`}
                    data-card-hidden="false"
                    initial={false}
                    animate={{ opacity: dimFolded ? 0.3 : 1, scale: dimFolded ? 0.88 : 1, x: layout.offsetX, y: layout.offsetY, rotate: layout.angle }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      transformOrigin: 'top center',
                      zIndex: layout.zIndex,
                    }}
                    className={dimFolded ? 'pointer-events-none grayscale' : 'drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]'}
                  >
                    <div className="-translate-x-1/2">
                      <Card
                        suit={parsed?.suit as any}
                        value={parsed?.value as any}
                        isHidden={!parsed}
                        priority
                      />
                    </div>
                  </m.div>
                );
              })
            : cardCount > 0
              ? player.isFolded
                ? (
                  <m.div
                    key={`${player.id}-folded-stack`}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0.25, scale: 0.7, y: 10 }}
                    transition={{ duration: 0.5 }}
                    className="relative pointer-events-none"
                  >
                    <div className="absolute top-0 left-0 translate-x-[2px] translate-y-[2px]">
                      <Card isHidden priority />
                    </div>
                    <Card isHidden priority />
                  </m.div>
                )
                : Array.from({ length: cardCount }).map((_, idx) => {
                    const layout = getArcCardLayout({
                      index: idx,
                      count: cardCount,
                      variant: 'opponent',
                      density: 'compact',
                    });
                    return (
                      <m.div
                        key={`${player.id}-back-${idx}`}
                        data-card-hidden="true"
                        initial={false}
                        animate={{ opacity: 1, scale: 1, x: layout.offsetX, y: layout.offsetY, rotate: layout.angle }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: 0,
                          transformOrigin: 'top center',
                          zIndex: layout.zIndex,
                        }}
                        className="drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]"
                      >
                        <div className="-translate-x-1/2">
                          <Card isHidden priority />
                        </div>
                      </m.div>
                    );
                  })
              : null}
      </div>
      {player.roundBet > 0 && (
        <div
          data-testid={`replay-player-${player.id}-bet`}
          className="mt-1 rounded-full border border-[#8b6b2e] bg-[#160b08]/95 px-2.5 py-0.5 font-mono text-[11px] font-black text-[#4ade80] shadow-[0_6px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(240,170,105,0.28)] md:text-xs"
        >
          {formatCurrency(player.roundBet)}
        </div>
      )}
    </div>
  );
}

/** Normaliza la carta del fondo (`07-O`, `7O`, `7-Oros`) al formato de la mesa (`7-O`). */
function normalizeBottomCard(card: string | null | undefined): string | null {
  const parsed = card ? parseCard(card) : null;
  return parsed ? `${parsed.value}-${parsed.suit.charAt(0)}` : null;
}

/**
 * Repetición con la misma mesa que la partida: base de nogal, canto, paño,
 * pozos y mazo salen de `TableSurface`/`TablePots`, compartidos con `Board`.
 */
export function ReplayBoard({ frame, cardFallbackByPlayerId, cardFallbackByUserId, className = '' }: ReplayBoardProps) {
  const seatedPlayers = frame.players.slice(0, 7);
  const seatClasses = seatPositionsFor(seatedPlayers.length);

  return (
    <div
      data-testid="replay-board"
      data-phase={frame.phase}
      className={`relative w-full h-[70vh] min-h-[520px] bg-surface-wood flex items-center justify-center overflow-hidden font-sans rounded-xl ${className}`}
      style={{ backgroundColor: '#120806' }}
    >
      <TableSurface />

      {/* Fase actual, con el mismo display de nogal y latón que los pozos. */}
      <div className="absolute left-3 top-3 z-30 pointer-events-none md:left-5 md:top-5">
        <span
          data-testid="replay-phase"
          className="inline-flex items-center rounded-full border border-[#8b6b2e] bg-[#160b08]/95 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[#fdf0a6] shadow-[0_8px_16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(240,170,105,0.28)] md:text-sm"
        >
          {phaseLabel(frame.phase)}
        </span>
      </div>

      {/* Asientos perimetrales (3..7) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {seatedPlayers.map((player, slotIdx) => (
          <PlayerSeat
            key={player.id}
            player={player}
            seatClass={seatClasses[slotIdx] ?? seatClasses[seatClasses.length - 1]}
            frame={frame}
            cardFallbackByPlayerId={cardFallbackByPlayerId}
            cardFallbackByUserId={cardFallbackByUserId}
          />
        ))}
      </div>

      <TablePots
        pot={frame.pot}
        piquePot={frame.piquePot}
        bottomCard={normalizeBottomCard(frame.bottomCard)}
        className="mb-[4%] lg:mb-[6%]"
        testIdPrefix="replay-"
      />
    </div>
  );
}
