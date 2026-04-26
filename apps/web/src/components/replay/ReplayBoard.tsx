'use client';

import { m } from 'framer-motion';
import { PlayerBadge } from '@/components/game/PlayerBadge';
import { Card } from '@/components/game/Card';
import { getArcCardLayout } from '@/components/game/hand-layout';
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
        <div className="mt-1 px-2 py-0.5 rounded-full bg-black/60 border border-[#d4af37]/40 text-[8px] md:text-[10px] font-black text-[#4ade80] font-mono">
          {formatCurrency(player.roundBet)}
        </div>
      )}
    </div>
  );
}

export function ReplayBoard({ frame, cardFallbackByPlayerId, cardFallbackByUserId, className = '' }: ReplayBoardProps) {
  const seatedPlayers = frame.players.slice(0, 7);
  const seatClasses = seatPositionsFor(seatedPlayers.length);
  const bottomParsed = parseCard(frame.bottomCard);

  return (
    <div
      data-testid="replay-board"
      data-phase={frame.phase}
      className={`relative w-full h-[70vh] min-h-[520px] bg-[#073926] flex items-center justify-center overflow-hidden font-sans border-t-4 border-[#0a2e1b] rounded-3xl ${className}`}
    >
      {/* Fieltro y bordes decorativos, idénticos a la mesa real */}
      <div className="absolute inset-0 bg-[#073b24] opacity-100" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-40 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-[5%] border-[12px] border-black/10 rounded-[50%] blur-sm pointer-events-none" />
      <div className="absolute w-[85vw] h-[55vh] border-[1px] border-white/5 rounded-[50%] pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.3)]" />

      {/* Badge de fase */}
      <div className="absolute top-3 left-3 z-30 pointer-events-none">
        <span
          data-testid="replay-phase"
          className="text-[10px] md:text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-black/60 border border-[#d4af37]/40 text-[#fdf0a6] backdrop-blur-md"
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

      {/* Centro: botes + mazo + bottom card. Lo anclamos al tercio inferior
          de la mesa para liberar la franja superior, donde se concentran las
          manos de hasta 7 jugadores en móvil. */}
      <div
        data-testid="replay-center-cluster"
        className="absolute inset-x-0 bottom-[14%] md:bottom-[18%] z-20 flex justify-center pointer-events-none"
      >
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-12 px-4 md:px-10 py-4 md:py-6 rounded-3xl">
          <div className="flex flex-col gap-1 md:gap-2 shrink-0">
            <div className="flex flex-col items-center bg-[#0a180e]/95 px-2 md:px-6 py-0.5 md:py-2 rounded-lg md:rounded-xl border border-[#d4af37]/30 backdrop-blur-md shadow-lg min-w-[70px] md:min-w-[160px]">
              <span className="text-[#fdf0a6] text-[5px] md:text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 opacity-60">Apuesta Principal</span>
              <span
                data-testid="replay-pot-main"
                className="text-[#4ade80] font-mono font-black text-[10px] md:text-xl"
              >
                {formatCurrency(frame.pot)}
              </span>
            </div>
            <div
              className={`flex flex-col items-center bg-[#0a180e]/95 px-2 md:px-6 py-0.5 md:py-2 rounded-lg md:rounded-xl border border-[#d4af37]/30 backdrop-blur-md shadow-lg min-w-[70px] md:min-w-[160px] ${
                frame.piquePot > 0 ? '' : 'sr-only'
              }`}
            >
              <span className="text-[#fdf0a6] text-[5px] md:text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 opacity-60">Apuesta Pique</span>
              <span
                data-testid="replay-pot-pique"
                className="text-[#4ade80] font-mono font-black text-[10px] md:text-xl"
              >
                {formatCurrency(frame.piquePot)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0">
            <div className="relative shrink-0">
              <div className="w-6 h-9 md:w-16 md:h-24 bg-[#0a0a0a] rounded-md md:rounded-lg absolute translate-x-0.5 translate-y-0.5 md:translate-x-1.5 md:translate-y-1.5 shadow-[2px_2px_15px_rgba(0,0,0,0.9)]" />
              <div className="w-6 h-9 md:w-16 md:h-24 bg-[#1a1a1a] rounded-md md:rounded-lg absolute translate-x-[1px] translate-y-[1px] md:translate-x-1 md:translate-y-1" />
              <div className="w-6 h-9 md:w-16 md:h-24 rounded-md md:rounded-lg overflow-hidden border-[1.5px] md:border-[2px] border-[#d4af37]/40 bg-[url('/images/card-back-rooster.png')] bg-cover bg-center relative z-10">
                <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] pointer-events-none rounded-md md:rounded-lg" />
                <div className="absolute inset-0 border border-white/10 rounded-md md:rounded-lg pointer-events-none" />
              </div>

              {bottomParsed && (
                <div className="absolute top-1/2 -translate-y-1/2 left-[70%] z-[5] w-6 h-9 md:w-16 md:h-24 rounded-md md:rounded-lg overflow-hidden border border-[#d4af37]/30 shadow-[0_4px_16px_rgba(0,0,0,0.7)] rotate-[8deg]">
                  <img
                    src={`/cards/${String(bottomParsed.value).padStart(2, '0')}-${bottomParsed.suit.toLowerCase()}.png?v=3`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.4)] pointer-events-none rounded-lg" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
