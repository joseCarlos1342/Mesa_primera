'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlayerReplayDetail, type PlayerReplayDetail } from '@/app/actions/replays';
import { ReplayController } from '@/components/replay/ReplayController';
import { LandscapeLockOverlay } from '@/components/replay/LandscapeLockOverlay';
import { Film } from 'lucide-react';
import { EmptyState, PageHeader, Section, Skeleton, playerButton } from '@/components/player/PlayerUI';
import { PlayingCard } from '@/components/landing/PlayingCard';
import { parseCard } from '@/types/replay';
import type { Card as DeckCard, Rank, Suit } from '@/components/landing/primeraHands';
import { formatCurrency } from '@/utils/format';

export default function ReplayViewer({ params }: { params: Promise<{ gameId: string }> }) {
  const [gameId, setGameId] = useState<string>('');
  const [replay, setReplay] = useState<PlayerReplayDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => setGameId(p.gameId));
  }, [params]);

  useEffect(() => {
    if (!gameId) return;
    async function fetchData() {
      setReplay(await getPlayerReplayDetail(gameId));
      setLoading(false);
    }
    fetchData();
  }, [gameId]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Cargando repetición">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  if (!replay) {
    return (
      <div className="max-w-xl">
        <PageHeader back={{ href: '/replays', label: 'Repeticiones' }} title="Repetición" />
        <EmptyState
          icon={Film}
          title="Repetición no encontrada"
          text="Puede que la partida no sea tuya o que todavía no haya terminado."
          action={
            <Link href="/replays" className={`${playerButton.secondary} w-full`}>
              Volver a repeticiones
            </Link>
          }
        />
      </div>
    );
  }

  const players = replay.players || [];
  const pot = replay.pot_breakdown || {};
  const hands = replay.final_hands || {};
  const timeline = replay.timeline || [];
  const frames = Array.isArray(replay.frames) ? replay.frames : [];

  // Mapa sessionId -> nickname (los eventos del timeline usan sessionId, no userId).
  const sessionIdToNickname: Record<string, string> = {};
  for (const f of frames) {
    for (const p of (f?.players ?? [])) {
      if (p?.id && p?.nickname && !sessionIdToNickname[p.id]) {
        sessionIdToNickname[p.id] = p.nickname;
      }
    }
  }
  for (const p of players) {
    if (p?.userId && p?.nickname && !sessionIdToNickname[p.userId]) {
      sessionIdToNickname[p.userId] = p.nickname;
    }
  }

  const getPlayerName = (id: string) => {
    if (!id) return '—';
    if (sessionIdToNickname[id]) return sessionIdToNickname[id];
    const p = players.find((pl: any) => pl.userId === id);
    return p?.nickname || id.substring(0, 6);
  };

  // Traducciones de acciones del motor a etiquetas legibles.
  const ACTION_LABELS: Record<string, string> = {
    voy: 'Voy',
    paso: 'Paso',
    pasar: 'Paso',
    bote: 'Se botó',
    botarse: 'Se botó',
    'me-boto': 'Se botó',
    igualar: 'Igualó',
    apostar: 'Apuesta',
    'apuesta-pique': 'Apuesta Pique',
    descartar: 'Descarta',
    'llevo-juego': 'Lleva Juego',
    'llevo-juego-inmediato': 'Lleva Juego',
    'no-llevo-juego': 'No lleva Juego',
  };
  const EVENT_LABELS: Record<string, string> = {
    start: 'Inicio',
    action: 'Acción',
    pique_won: 'Gana Pique',
    pique_restart: 'Pique reinicia',
    declarar_juego: 'Declara Juego',
    end: 'Fin',
  };
  const eventLabel = (e: any): string => {
    if (e?.action && ACTION_LABELS[e.action]) return ACTION_LABELS[e.action];
    if (e?.action) return String(e.action).toUpperCase();
    if (e?.event && EVENT_LABELS[e.event]) return EVENT_LABELS[e.event];
    return String(e?.event ?? e?.type ?? 'Evento');
  };
  const eventDetail = (e: any): string => {
    const parts: string[] = [];
    if (typeof e?.amount === 'number' && e.amount > 0) parts.push(formatCurrency(e.amount));
    if (typeof e?.payout === 'number' && e.payout > 0) parts.push(`Pago ${formatCurrency(e.payout)}`);
    if (Array.isArray(e?.droppedCards) && e.droppedCards.length > 0) {
      parts.push(`Descarta ${e.droppedCards.join(', ')}`);
    }
    if (e?.phase) parts.push(String(e.phase));
    if (typeof e?.tiene === 'boolean') parts.push(e.tiene ? 'Tiene Juego' : 'No Juego');
    return parts.join(' · ');
  };

  const handEntries = Object.entries(hands) as [string, { nickname?: string; handType?: string; cards?: string }][];
  const playedAt = replay.created_at ? new Date(replay.created_at) : null;

  return (
    <div className="max-w-6xl">
      <LandscapeLockOverlay />
      <PageHeader
        back={{ href: '/replays', label: 'Repeticiones' }}
        title="Repetición de la partida"
        lead={
          <>
            {playedAt && !Number.isNaN(playedAt.getTime()) && (
              <span className="tabular-nums">{DATE_FORMAT.format(playedAt)} · </span>
            )}
            <span className="font-mono text-[#bdb7a6]">{replay.game_id?.substring(0, 8)}</span>
          </>
        }
      />

      <ReplayController frames={frames} finalHands={hands} />

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
        <div className="min-w-0 space-y-12">
          <Section id="replay-resumen" title="Resumen">
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-6">
              <Metric label="Jugadores" value={String(players.length)} />
              <Metric label="Bote" value={formatCurrency(pot.totalPot || 0)} />
              <Metric label="Pique" value={formatCurrency(pot.piquePot || 0)} />
              <Metric label="Jugadas" value={String(timeline.length)} />
            </dl>
          </Section>

          {handEntries.length > 0 && (
            <Section id="replay-manos" title="Manos finales">
              <ul className="mt-2 divide-y divide-[#8b6b2e]/30">
                {handEntries.map(([userId, hand]) => {
                  const cards = (hand.cards ?? '').split(',').filter(Boolean).map(toDeckCard);
                  return (
                    <li key={userId} className="flex items-center gap-4 py-4">
                      <span className="flex shrink-0" aria-hidden={cards.every(Boolean) ? undefined : true}>
                        {cards.map((card, i) =>
                          card ? (
                            <span key={i} className="-ml-3 w-11 first:ml-0">
                              <PlayingCard card={card} sizes="44px" />
                            </span>
                          ) : null,
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-lg font-semibold text-text-premium">{hand.nickname || 'Jugador'}</span>
                        {hand.handType && <span className="block text-base text-brand-gold-light">{handTypeLabel(hand.handType)}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </div>

        {timeline.length > 0 && (
          <Section id="replay-linea" title="Línea de tiempo" className="min-w-0">
            <ol className="mt-1 divide-y divide-[#8b6b2e]/30">
              {timeline.map((event: any, idx: number) => {
                const playerId = event?.player || event?.winner || event?.userId;
                const detail = eventDetail(event);
                const time = event?.time || event?.timestamp;
                return (
                  <li key={idx} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-3 py-3">
                    <span className="font-mono text-sm tabular-nums text-[#bdb7a6]">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">
                      <span className="block text-lg leading-snug text-text-premium">
                        <span className="font-semibold text-brand-gold-light">{eventLabel(event)}</span>
                        {playerId ? <span> · {getPlayerName(playerId)}</span> : null}
                      </span>
                      {detail && <span className="block text-base text-[#bdb7a6] [overflow-wrap:anywhere]">{detail}</span>}
                    </span>
                    {time ? (
                      <span className="font-mono text-sm tabular-nums text-[#bdb7a6]">{TIME_FORMAT.format(new Date(time))}</span>
                    ) : (
                      <span />
                    )}
                  </li>
                );
              })}
            </ol>
          </Section>
        )}
      </div>
    </div>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const TIME_FORMAT = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const SUIT_BY_NAME: Record<string, Suit> = { Oros: 'oros', Copas: 'copas', Espadas: 'espadas', Bastos: 'bastos' };

function toDeckCard(raw: string): DeckCard | null {
  const parsed = parseCard(raw.trim());
  if (!parsed || parsed.value < 1 || parsed.value > 7) return null;
  return { rank: parsed.value as Rank, suit: SUIT_BY_NAME[parsed.suit] };
}

const HAND_LABELS: Record<string, string> = {
  SEGUNDA: 'Segunda',
  CHIVO: 'Chivo',
  PRIMERA: 'Primera',
  PUNTOS: 'Puntos',
  NINGUNA: 'Sin juego',
};

function handTypeLabel(type: string): string {
  return HAND_LABELS[type?.toUpperCase?.()] ?? type;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[#8b6b2e]/50 pl-4">
      <dt className="text-base text-[#bdb7a6]">{label}</dt>
      <dd className="mt-1 font-mono text-[1.75rem] font-medium leading-none tabular-nums text-text-premium">{value}</dd>
    </div>
  );
}
