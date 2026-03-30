'use client';

import { useState, useCallback, useEffect } from 'react';

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
  nickname: string;
  cards?: string;
  chips?: number;
};

const PHASE_COLORS: Record<string, string> = {
  PIQUE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DESCARTE: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  APUESTA_4_CARTAS: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  CANTICOS: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  GUERRA: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const SPEEDS = [0.5, 1, 2, 4];

export function AdminReplayViewer({ timeline, players }: { timeline: TimelineEvent[]; players: PlayerSnapshot[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showRng, setShowRng] = useState(false);

  const event = timeline[Math.min(currentStep, timeline.length - 1)];
  const progress = timeline.length > 1 ? (currentStep / (timeline.length - 1)) * 100 : 100;

  // Autoplay
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= timeline.length - 1) { setIsPlaying(false); return; }
    const timer = setTimeout(() => setCurrentStep(s => s + 1), 1500 / speed);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, timeline.length, speed]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setCurrentStep(s => Math.min(timeline.length - 1, s + 1));
    if (e.key === 'ArrowLeft') setCurrentStep(s => Math.max(0, s - 1));
    if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
  }, [timeline.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getPlayerName = (sessionId?: string) => {
    if (!sessionId) return 'Desconocido';
    return players.find(p => p.userId === sessionId)?.nickname || sessionId.substring(0, 8);
  };

  const getEventDescription = (ev: TimelineEvent): string => {
    if (ev.event === 'start') return 'Inicio de Partida';
    if (ev.event === 'end') return `${getPlayerName(ev.winner)} gana ${ev.payout ? `$${(ev.payout / 100).toLocaleString()}` : ''}`;
    const name = getPlayerName(ev.player);
    const actionLabel = ev.action === 'voy' ? 'Apuesta' : ev.action === 'paso' ? 'Pasa' : ev.action === 'discard' ? 'Descarta' : ev.action || '';
    const amountStr = ev.amount ? ` $${(ev.amount / 100).toLocaleString()}` : '';
    const comboStr = ev.combination ? ` (${ev.combination})` : '';
    return `${name} → ${actionLabel}${amountStr}${comboStr}`;
  };

  if (!event) return null;

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
          Reproducción de Eventos ({timeline.length} pasos)
        </h3>
        <button
          onClick={() => setShowRng(!showRng)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            showRng
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
          }`}
        >
          {showRng ? '🔒 Ocultar RNG' : '🔍 Auditar RNG'}
        </button>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-purple-500 to-brand-gold rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <span>Paso {currentStep + 1} de {timeline.length}</span>
          <span>{new Date(event.time).toLocaleTimeString('es-ES')}</span>
        </div>
      </div>

      {/* Current Event */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <p className="text-lg font-black italic tracking-tight text-white">
              {getEventDescription(event)}
            </p>
            {event.phase && (
              <span className={`inline-block mt-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-widest ${PHASE_COLORS[event.phase] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                {event.phase}
              </span>
            )}
          </div>
          {event.event === 'end' && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500">Pozo</p>
                <p className="text-lg font-black text-white">${((event.pot || 0) / 100).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500">Rake</p>
                <p className="text-lg font-black text-emerald-400">${((event.rake || 0) / 100).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dropped Cards */}
        {event.droppedCards && event.droppedCards.length > 0 && (
          <div className="mt-3 flex gap-1.5">
            <span className="text-[9px] font-black uppercase text-purple-400 mr-2 self-center">Descartó:</span>
            {event.droppedCards.map((card, i) => (
              <span key={i} className="px-2 py-1 bg-purple-500/20 rounded-lg text-xs font-black text-purple-300 border border-purple-500/20">
                {card}
              </span>
            ))}
          </div>
        )}

        {/* RNG State */}
        {showRng && event.rng_state && (
          <div className="mt-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
            <p className="text-[9px] font-black uppercase text-red-400 mb-1">Estado RNG</p>
            <code className="text-xs font-mono text-red-300 select-all break-all">{event.rng_state}</code>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentStep(0)} disabled={currentStep === 0}
            className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 border border-white/5"
            title="Inicio">⏮</button>
          <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0}
            className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-black hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 border border-white/5">
            ◀ Anterior</button>
          <button onClick={() => setIsPlaying(!isPlaying)}
            className={`px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all border ${
              isPlaying ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-purple-500 text-white border-purple-500'
            }`}>
            {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
          </button>
          <button onClick={() => setCurrentStep(s => Math.min(timeline.length - 1, s + 1))} disabled={currentStep >= timeline.length - 1}
            className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-black hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 border border-white/5">
            Siguiente ▶</button>
          <button onClick={() => setCurrentStep(timeline.length - 1)} disabled={currentStep >= timeline.length - 1}
            className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 border border-white/5"
            title="Final">⏭</button>
        </div>
        {/* Speed Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 mr-1">Velocidad</span>
          {SPEEDS.map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all border ${
                speed === s
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
              }`}>
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Mini-Map */}
      <div>
        <div className="flex flex-wrap gap-1">
          {timeline.map((ev, i) => (
            <button key={i} onClick={() => setCurrentStep(i)}
              className={`w-7 h-7 rounded-lg text-[9px] font-black transition-all border ${
                i === currentStep
                  ? 'bg-purple-500 text-white border-purple-500 scale-110 shadow-lg'
                  : i < currentStep
                  ? 'bg-white/10 text-white/60 border-white/10'
                  : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
              }`}
              title={`${ev.event}${ev.phase ? ` (${ev.phase})` : ''}`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
