"use client";

import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/app/actions/stats";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { EmptyState } from "@/components/player/PlayerUI";

interface LeaderboardProps {
  entries: readonly LeaderboardEntry[];
  category: string;
  /** Resalta la fila del jugador actual. */
  currentUserId?: string;
}

function scoreLabel(category: string) {
  if (category === 'mejor_racha') return 'Mejor racha';
  if (category === 'maestro_primera') return 'Especiales';
  return 'Partidas';
}

/** Ranking en filas: posición en mono, avatar, nombre y puntaje. */
export function Leaderboard({ entries, category, currentUserId }: LeaderboardProps) {
  if (entries.length === 0) {
    return <EmptyState icon={Trophy} title="Todavía no hay ranking" text="Aparecerá cuando se jueguen las primeras mesas." />;
  }

  const unit = scoreLabel(category);

  return (
    <ol aria-label={`Ranking por ${unit.toLowerCase()}`} className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
      {entries.map((entry, idx) => {
        const isMe = currentUserId !== undefined && entry.user_id === currentUserId;
        const podium = idx < 3;
        return (
          <li
            key={entry.user_id}
            aria-current={isMe ? 'true' : undefined}
            className={`flex min-h-[4.5rem] items-center gap-4 py-3 ${isMe ? '-mx-3 rounded-lg bg-[#0a2c20] px-3 shadow-[inset_0_0_0_1px_rgba(197,160,89,0.55)]' : ''}`}
          >
            <span
              className={`w-8 shrink-0 text-center font-mono text-xl font-medium tabular-nums ${podium ? 'text-brand-gold-light' : 'text-[#bdb7a6]'}`}
            >
              {idx + 1}
            </span>
            <PlayerAvatar avatar={entry.avatar_url} name={entry.username} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-semibold text-text-premium">{entry.username || 'Anónimo'}</span>
              {isMe && <span className="block text-base text-brand-gold-light">Tú</span>}
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-xl font-medium tabular-nums text-text-premium">{entry.score}</span>
              <span className="block text-sm text-[#bdb7a6]">{unit}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
