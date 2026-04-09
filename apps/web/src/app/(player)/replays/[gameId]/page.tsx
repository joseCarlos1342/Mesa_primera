'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { formatAmount } from '@/utils/format';
import { Trophy, Clock, Users } from 'lucide-react';

type TimelineEvent = {
  event: string;
  phase?: string;
  player?: string;
  action?: string;
  amount?: number;
  combination?: string;
  droppedCards?: string[];
  winner?: string;
  pot?: number;
  payout?: number;
  rake?: number;
  seed?: string;
  time: number;
  rng_state?: string;
};

type PlayerSnapshot = {
  userId: string;
  sessionId?: string;
  nickname: string;
  cards: string;
  chips: number;
};

const PHASE_COLORS: Record<string, string> = {
  PIQUE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DESCARTE: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  APUESTA_4_CARTAS: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  CANTICOS: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  GUERRA: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const EVENT_ICONS: Record<string, string> = {
  start: '🎬',
  action: '🃏',
  end: '🏆',
};

function formatCard(card: string): string {
  const [value, suit] = card.split('-');
  const suitMap: Record<string, string> = { O: '🪙', C: '🏆', E: '⚔️', B: '🪵' };
  return `${value}${suitMap[suit] || suit}`;
}

export default function ReplayViewer({ params }: { params: Promise<{ gameId: string }> }) {
  const supabase = createClient();
  const [gameId, setGameId] = useState<string>('');
  const [replay, setReplay] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRng, setShowRng] = useState(false);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1);
  const SPEEDS = [0.5, 1, 2, 4];

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
      if (data) setReplay(data);
      setLoading(false);
    }
    fetchData();
  }, [gameId, supabase]);

  // Autoplay timer
  useEffect(() => {
    if (!isPlaying || !replay) return;
    const timeline = replay.timeline || [];
    if (currentStep >= timeline.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => setCurrentStep(s => s + 1), 1500 / speed);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, replay, speed]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setCurrentStep(s => s + 1);
    if (e.key === 'ArrowLeft') setCurrentStep(s => Math.max(0, s - 1));
    if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
        <Link href="/lobby" className="text-(--accent-gold) font-bold hover:underline">Volver al Lobby</Link>
      </div>
    );
  }

  // Admin sees admin_timeline (with rng_state), player sees timeline
  const timeline: TimelineEvent[] = (isAdmin && replay.admin_timeline)
    ? replay.admin_timeline
    : (replay.timeline || []);

  const event = timeline[Math.min(currentStep, timeline.length - 1)];
  const players: PlayerSnapshot[] = replay.players || [];
  const progress = timeline.length > 1 ? (currentStep / (timeline.length - 1)) * 100 : 100;

  const getPlayerName = (sessionId?: string) => {
    if (!sessionId) return 'Desconocido';
    // Priority: sessionId (new format), then userId (old format)
    const p = players.find(pl => pl.sessionId === sessionId || pl.userId === sessionId);
    return p?.nickname || sessionId.substring(0, 8);
  };

  // Build a descriptive label for the current event
  const getEventDescription = (ev: TimelineEvent): string => {
    if (ev.event === 'start') return 'Inicio de Partida';
    if (ev.event === 'end') {
      return `${getPlayerName(ev.winner)} gana ${ev.payout ? `$${formatAmount(ev.payout)}` : ''}`;
    }
    const name = getPlayerName(ev.player);
    const actionLabel = ev.action === 'voy' ? 'Apuesta' : ev.action === 'paso' ? 'Pasa' : ev.action === 'discard' ? 'Descarta' : ev.action || '';
    const amountStr = ev.amount ? ` $${formatAmount(ev.amount)}` : '';
    const comboStr = ev.combination ? ` (${ev.combination})` : '';
    return `${name} → ${actionLabel}${amountStr}${comboStr}`;
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen text-(--text-primary)">
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
            ID: {replay.game_id?.substring(0, 8)} &middot; Seed: {replay.rng_seed?.substring(0, 12)}...
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowRng(!showRng)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
              showRng
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
            }`}
          >
            {showRng ? '🔒 Ocultar RNG' : '🔍 Auditar RNG'}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-(--accent-gold) to-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <span>Paso {currentStep + 1} de {timeline.length}</span>
          <span>{new Date(event.time).toLocaleTimeString('es-ES')}</span>
        </div>
      </div>

      {/* Main Event Display */}
      <div className="bg-(--bg-card) border border-(--border-glow) rounded-4xl p-6 md:p-8 mb-6 shadow-2xl">
        {/* Event Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{EVENT_ICONS[event.event] || '📋'}</span>
            <div>
              <p className="text-xl md:text-2xl font-black italic tracking-tight text-white">
                {getEventDescription(event)}
              </p>
              {event.phase && (
                <span className={`inline-block mt-1 text-[10px] font-black uppercase px-3 py-1 rounded-full border tracking-widest ${PHASE_COLORS[event.phase] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                  {event.phase}
                </span>
              )}
            </div>
          </div>

          {event.event === 'end' && (
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pozo Total</p>
                <p className="text-xl font-black text-white">${formatAmount(event.pot || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rake</p>
                <p className="text-xl font-black text-emerald-400">${formatAmount(event.rake || 0)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dropped Cards (DESCARTE) */}
        {event.droppedCards && event.droppedCards.length > 0 && (
          <div className="mb-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Cartas Descartadas</p>
            <div className="flex gap-2">
              {event.droppedCards.map((card, i) => (
                <span key={i} className="px-3 py-1.5 bg-purple-500/20 rounded-lg text-sm font-black text-purple-300 border border-purple-500/20">
                  {formatCard(card)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Admin RNG State */}
        {isAdmin && showRng && event.rng_state && (
          <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Estado RNG (Admin)</p>
            <code className="text-sm font-mono text-red-300 select-all">{event.rng_state}</code>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setCurrentStep(0)}
          disabled={currentStep === 0}
          className="p-3 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
          title="Inicio"
        >
          ⏮
        </button>
        <button
          onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="px-5 py-3 rounded-xl bg-white/5 text-slate-300 font-black hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
        >
          ◀ Anterior
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all border ${
            isPlaying
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-(--accent-gold) text-black border-(--accent-gold)'
          }`}
        >
          {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
        </button>
        <button
          onClick={() => setCurrentStep(s => Math.min(timeline.length - 1, s + 1))}
          disabled={currentStep >= timeline.length - 1}
          className="px-5 py-3 rounded-xl bg-white/5 text-slate-300 font-black hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
        >
          Siguiente ▶
        </button>
        <button
          onClick={() => setCurrentStep(timeline.length - 1)}
          disabled={currentStep >= timeline.length - 1}
          className="p-3 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
          title="Final"
        >
          ⏭
        </button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Velocidad</span>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
              speed === s
                ? 'bg-(--accent-gold) text-black border-(--accent-gold)'
                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Timeline Mini-Map */}
      <div className="bg-black/30 border border-white/5 rounded-4xl p-6 mb-6 shadow-2xl backdrop-blur-md">
        <h3 className="text-xs font-black uppercase tracking-widest text-(--accent-gold) mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Línea de Tiempo
        </h3>
        <div className="flex flex-wrap gap-2">
          {timeline.map((ev, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-10 h-10 rounded-xl text-xs font-black transition-all border flex items-center justify-center ${
                i === currentStep
                  ? 'bg-(--accent-gold) text-black border-(--accent-gold) scale-110 shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                  : i < currentStep
                  ? 'bg-(--accent-gold)/10 text-(--accent-gold) border-(--accent-gold)/20 hover:bg-(--accent-gold)/20'
                  : 'bg-black/40 text-slate-500 border-white/5 hover:bg-white/10 hover:text-white/80'
              }`}
              title={`${ev.event}${ev.phase ? ` (${ev.phase})` : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Players State */}
      <div className="bg-black/30 border border-white/5 rounded-4xl p-6 shadow-2xl backdrop-blur-md mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-(--accent-gold) mb-5 flex items-center gap-2">
          <Users className="w-4 h-4" /> Estado Final de Jugadores
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p, i) => {
            const isWinner = event.event === 'end' && event.winner === p.userId;
            return (
              <div
                key={i}
                className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
                  isWinner
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_4px_24px_-8px_rgba(16,185,129,0.2)]'
                    : 'bg-black/40 border-white/5 hover:bg-white/5'
                }`}
              >
                {isWinner && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500/50 to-emerald-400" />
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-black text-white italic truncate pr-2">{p.nickname}</span>
                  {isWinner ? (
                    <span className="text-emerald-400 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
                      <Trophy className="w-4 h-4" />
                    </span>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#8b9b91]">Fichas</span>
                    <span className="text-sm font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">${formatAmount(p.chips)}</span>
                  </div>
                  {p.cards && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Cartas</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {p.cards.split(',').filter(Boolean).map((card, ci) => (
                          <span key={ci} className="px-2.5 py-1 bg-black/50 rounded-lg text-xs font-black text-(--accent-gold) border border-(--accent-gold)/20">
                            {formatCard(card)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <p className="text-center text-[10px] text-slate-600 mt-6 font-bold uppercase tracking-widest">
        ◀ ▶ para navegar &middot; Espacio para reproducir/pausar &middot; Controles de velocidad arriba
      </p>
    </div>
  );
}
