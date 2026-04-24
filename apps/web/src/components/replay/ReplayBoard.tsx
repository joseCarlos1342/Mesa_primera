'use client';

import { m } from 'framer-motion';
import type { ReplayFrame, ReplayPlayerFrame } from '@/types/replay';
import { parseCard } from '@/types/replay';
import { formatCurrency } from '@/utils/format';
import { Card } from '@/components/game/Card';
import { ManoIcon } from '@/components/game/ManoIcon';
import { getAvatarSvg } from '@/utils/avatars';

const PHASE_LABELS: Record<string, string> = {
  WAITING: 'En espera',
  PIQUE: 'Pique',
  DESCARTE: 'Descarte',
  APUESTA_4_CARTAS: 'Apuesta (4 cartas)',
  CANTICOS: 'Cánticos',
  REVELAR_CARTA: 'Revelar carta',
  GUERRA: 'Guerra',
  GUERRA_JUEGO: 'Guerra — juego',
  SHOWDOWN: 'Showdown',
  SHOWDOWN_WAIT: 'Showdown (espera)',
  END: 'Fin',
};

function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? phase;
}

interface ReplayPlayerSeatProps {
  player: ReplayPlayerFrame;
  isActive: boolean;
}

function ReplayPlayerSeat({ player, isActive }: ReplayPlayerSeatProps) {
  const privateCards = player.privateCards ?? [];
  const visibleCount = privateCards.length > 0 ? privateCards.length : player.cardCount;
  const avatarSvg = player.avatarUrl ? getAvatarSvg(player.avatarUrl) : null;

  return (
    <div
      data-testid={`replay-player-${player.id}`}
      data-active={isActive ? 'true' : 'false'}
      data-folded={player.isFolded ? 'true' : 'false'}
      data-connected={player.isConnected ? 'true' : 'false'}
      className={`
        flex flex-col items-center gap-2 px-3 py-2 rounded-2xl
        border transition-all
        ${player.isFolded ? 'opacity-40 border-slate-800' : 'border-white/10'}
        ${isActive ? 'border-emerald-500/60 shadow-[0_0_18px_rgba(16,185,129,0.35)]' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
          {avatarSvg ?? (
            <span className="text-[10px] font-black text-slate-500">
              {player.nickname?.substring(0, 2)?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white leading-tight">{player.nickname}</span>
          <span
            data-testid={`replay-player-${player.id}-chips`}
            className="text-[11px] font-mono text-(--accent-gold)"
          >
            {formatCurrency(player.chips)}
          </span>
        </div>
        {player.isDealer && <ManoIcon size="xs" />}
        {player.isAllIn && (
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
            All-in
          </span>
        )}
      </div>

      <div
        data-testid={`replay-player-${player.id}-cards`}
        className="flex gap-1 items-end"
      >
        {Array.from({ length: visibleCount }).map((_, idx) => {
          const revealed = privateCards[idx];
          const parsed = revealed ? parseCard(revealed) : null;
          const hidden = !parsed;
          return (
            <div
              key={idx}
              data-card-hidden={hidden ? 'true' : 'false'}
              className="scale-[0.55] -m-2 origin-bottom"
            >
              <Card
                suit={parsed?.suit}
                value={parsed?.value}
                isHidden={hidden}
              />
            </div>
          );
        })}
      </div>

      {player.roundBet > 0 && (
        <span className="text-[10px] font-black uppercase tracking-widest text-(--accent-gold)">
          Apuesta: {formatCurrency(player.roundBet)}
        </span>
      )}
    </div>
  );
}

interface ReplayBoardProps {
  frame: ReplayFrame;
  className?: string;
}

/**
 * Componente presentacional que reconstruye la mesa a partir de un `ReplayFrame`.
 * No depende de Colyseus ni de hooks de Room; es seguro renderizar en cualquier
 * contexto (server/client) que acepte framer-motion.
 */
export function ReplayBoard({ frame, className = '' }: ReplayBoardProps) {
  const bottomParsed = parseCard(frame.bottomCard);

  return (
    <m.div
      data-testid="replay-board"
      data-phase={frame.phase}
      className={`w-full rounded-3xl bg-gradient-to-br from-[#0c1d13] via-[#08130c] to-[#0c1d13] border border-(--accent-gold)/20 p-6 ${className}`}
    >
      {/* Cabecera: fase + botes */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <span
          data-testid="replay-phase"
          className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white"
        >
          {phaseLabel(frame.phase)}
        </span>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Bote
            </span>
            <span
              data-testid="replay-pot-main"
              className="text-lg font-black text-(--accent-gold)"
            >
              {formatCurrency(frame.pot)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Pique
            </span>
            <span
              data-testid="replay-pot-pique"
              className="text-lg font-black text-blue-300"
            >
              {formatCurrency(frame.piquePot)}
            </span>
          </div>
        </div>
      </div>

      {/* Carta de fondo (si existe) */}
      {bottomParsed && (
        <div className="flex justify-center mb-6">
          <div className="scale-75">
            <Card suit={bottomParsed.suit} value={bottomParsed.value} isHidden={false} />
          </div>
        </div>
      )}

      {/* Jugadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {frame.players.map(player => (
          <ReplayPlayerSeat
            key={player.id}
            player={player}
            isActive={player.id === frame.turnPlayerId}
          />
        ))}
      </div>
    </m.div>
  );
}
