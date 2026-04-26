'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ReplayController } from '@/components/replay/ReplayController';
import { LandscapeLockOverlay } from '@/components/replay/LandscapeLockOverlay';
import { Copy, Check, Trophy, Users, Coins, Layers, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

export default function ReplayViewer({ params }: { params: Promise<{ gameId: string }> }) {
  const supabase = createClient();
  const [gameId, setGameId] = useState<string>('');
  const [replay, setReplay] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seedCopied, setSeedCopied] = useState(false);

  useEffect(() => {
    params.then(p => setGameId(p.gameId));
  }, [params]);

  useEffect(() => {
    if (!gameId) return;
    async function fetchData() {
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.role === 'admin');
      }

      const { data, error } = await supabase
        .from('game_replays')
        .select('*')
        .eq('game_id', gameId)
        .single();

      if (error) console.error('Error fetching replay:', error);
      if (data) {
        // Supabase no almacena frames/version: hidratarlos desde el game server (VPS).
        try {
          const gsUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
          if (gsUrl) {
            const res = await fetch(`${gsUrl}/api/replays/${gameId}`);
            if (res.ok) {
              const json = await res.json();
              if (json?.ok && json?.data?.frames?.length) {
                data.frames = json.data.frames;
                data.version = json.data.version;
              }
            }
          }
        } catch (e) {
          console.warn('[replay] frames hydration fallback failed', e);
        }
        setReplay(data);
      }
      setLoading(false);
    }
    fetchData();
  }, [gameId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-(--accent-gold) border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-(--text-secondary) uppercase tracking-widest">Cargando repetición...</p>
        </div>
      </div>
    );
  }

  if (!replay) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg font-bold text-(--text-secondary)">Repetición no encontrada</p>
        <Link href="/lobby" className="text-(--accent-gold) font-bold hover:underline">Volver al Inicio</Link>
      </div>
    );
  }

  // Admin sees admin_timeline (with rng_state), player sees timeline
  const players: any[] = replay.players || [];
  const pot = replay.pot_breakdown || {};
  const hands = replay.final_hands || {};
  const timeline: any[] = isAdmin
    ? (replay.admin_timeline || replay.timeline || [])
    : (replay.timeline || []);
  const frames: any[] = Array.isArray(replay.frames) ? replay.frames : [];

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

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen text-(--text-primary)">
      <LandscapeLockOverlay />
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          {isAdmin && (
            <div className="mb-2">
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 tracking-widest">
                MODO ADMIN
              </span>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-(--accent-gold)">
            Repetición de Partida
          </h1>
          <p className="text-xs text-(--text-secondary) font-mono mt-1">
            ID: {replay.game_id?.substring(0, 8)}
          </p>
          {replay.rng_seed && (
            <div className="mt-2 flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2 max-w-full">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Seed:</span>
              <code className="text-[11px] font-mono text-slate-300 break-all select-all leading-relaxed">
                {replay.rng_seed}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(replay.rng_seed);
                  setSeedCopied(true);
                  setTimeout(() => setSeedCopied(false), 2000);
                }}
                className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-(--accent-gold) transition-all border border-white/5"
                title="Copiar seed"
              >
                {seedCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {isAdmin && (
          <span
            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border bg-red-500/15 text-red-400 border-red-500/30"
          >
            Modo admin · vista completa
          </span>
        )}
      </div>

      {/* Reconstrucción visual (v2): única vista del replay */}
      {replay.version === 2 && Array.isArray(replay.frames) && replay.frames.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Reconstrucción Visual</h2>
          <ReplayController frames={replay.frames} finalHands={hands} />
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8 text-center">
          <p className="text-sm font-bold text-slate-400">
            Esta repetición es de versión 1 (legacy) y no incluye frames visuales reproducibles.
          </p>
        </div>
      )}

      {/* Resumen final */}
      <section className="mt-10 space-y-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Resumen Final</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Jugadores</span>
            </div>
            <p className="text-2xl font-black text-white">{players.length}</p>
          </div>
          <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Trophy className="w-3.5 h-3.5 text-(--accent-gold)" />
              <span className="text-[10px] font-black uppercase tracking-widest">Bote</span>
            </div>
            <p className="text-xl font-black text-(--accent-gold)">
              {formatCurrency(pot.totalPot || 0)}
            </p>
          </div>
          <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Pique</span>
            </div>
            <p className="text-xl font-black text-emerald-400">
              {formatCurrency(pot.piquePot || 0)}
            </p>
          </div>
          <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Layers className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-[10px] font-black uppercase tracking-widest">Eventos</span>
            </div>
            <p className="text-2xl font-black text-white">{timeline.length}</p>
          </div>
        </div>

        {/* Manos finales */}
        {Object.keys(hands).length > 0 && (() => {
          const handsCount = Object.keys(hands).length;
          const gridCls =
            handsCount <= 1 ? 'grid-cols-1'
            : handsCount === 2 ? 'grid-cols-1 sm:grid-cols-2'
            : handsCount === 3 ? 'grid-cols-1 sm:grid-cols-3'
            : handsCount === 4 ? 'grid-cols-2 lg:grid-cols-4'
            : handsCount <= 6 ? 'grid-cols-2 sm:grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
          return (
          <div className="bg-black/30 border border-white/10 rounded-3xl p-5 md:p-6">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
              Manos Finales
            </h3>
            <div className={`grid ${gridCls} gap-3`}>
              {Object.entries(hands).map(([userId, hand]: [string, any]) => (
                <div
                  key={userId}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2"
                >
                  <p className="font-black text-white text-sm">{hand.nickname}</p>
                  {hand.handType && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-(--accent-gold)">
                      {hand.handType}
                    </p>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {hand.cards?.split(',').filter(Boolean).map((card: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-black/50 rounded-lg text-xs font-black text-(--accent-gold) border border-(--accent-gold)/20"
                      >
                        {card}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })()}
      </section>

      {/* Línea de tiempo */}
      {timeline.length > 0 && (
        <section className="mt-10 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Línea de Tiempo
          </h2>
          <ol className="bg-gradient-to-b from-black/40 to-black/20 border border-white/10 rounded-3xl divide-y divide-white/5 overflow-hidden shadow-xl">
            {timeline.map((event: any, idx: number) => {
              const playerId = event?.player || event?.winner || event?.userId;
              const detail = eventDetail(event);
              const time = event?.time || event?.timestamp;
              return (
                <li
                  key={idx}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] md:grid-cols-[2.5rem_8rem_8rem_minmax(0,1fr)_auto] items-center gap-3 px-4 md:px-5 py-2.5 text-xs hover:bg-white/[0.04] transition-colors"
                >
                  <span className="font-mono text-[10px] text-slate-500">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="font-black uppercase tracking-widest text-[10px] text-(--accent-gold) hidden md:inline">
                    {eventLabel(event)}
                  </span>
                  <span className="font-bold text-slate-200 truncate hidden md:inline">
                    {playerId ? `@${getPlayerName(playerId)}` : ''}
                  </span>
                  <span className="md:hidden font-bold text-slate-200 truncate">
                    <span className="text-(--accent-gold) uppercase tracking-widest text-[10px] mr-2">{eventLabel(event)}</span>
                    {playerId ? `@${getPlayerName(playerId)}` : ''}
                  </span>
                  <span className="text-slate-400 truncate hidden md:inline">{detail}</span>
                  {time ? (
                    <span className="text-[10px] font-mono text-slate-500 hidden md:flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(time).toLocaleTimeString('es-ES', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </span>
                  ) : <span className="hidden md:inline" />}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
