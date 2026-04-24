'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { ReplayFrame } from '@/types/replay';
import { ReplayBoard } from './ReplayBoard';

interface ReplayControllerProps {
  frames: ReplayFrame[];
  initialIndex?: number;
  /** Intervalo base en ms entre frames al reproducir (a velocidad 1x). */
  intervalMs?: number;
  className?: string;
}

const SPEEDS = [0.5, 1, 2, 4] as const;

/**
 * Reproductor de replays v2. Gestiona estado de playback (frame actual, play/pause,
 * velocidad) y delega el render visual a `ReplayBoard`.
 */
export function ReplayController({
  frames,
  initialIndex = 0,
  intervalMs = 1500,
  className = '',
}: ReplayControllerProps) {
  const total = frames.length;
  const clampedInitial = Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0));
  const [index, setIndex] = useState(clampedInitial);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const indexRef = useRef(index);
  indexRef.current = index;

  const goNext = useCallback(() => {
    setIndex(i => Math.min(total - 1, i + 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setIndex(i => Math.max(0, i - 1));
  }, []);

  // Autoplay con intervalo fijo; se detiene al llegar al último frame.
  useEffect(() => {
    if (!playing || total === 0) return;
    const delay = Math.max(50, intervalMs / speed);
    const id = setInterval(() => {
      setIndex(i => {
        if (i >= total - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, delay);
    return () => clearInterval(id);
  }, [playing, total, intervalMs, speed]);

  // Navegación por teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (total === 0) {
    return (
      <div
        data-testid="replay-empty"
        className={`w-full rounded-3xl border border-white/10 bg-black/30 p-8 text-center ${className}`}
      >
        <p className="text-sm font-bold text-slate-400">
          Esta partida no tiene frames reproducibles (replay legado).
        </p>
      </div>
    );
  }

  const frame = frames[index];
  const progress = total > 1 ? (index / (total - 1)) * 100 : 100;

  return (
    <div
      data-testid="replay-root"
      data-speed={String(speed)}
      className={`w-full space-y-4 ${className}`}
    >
      <ReplayBoard frame={frame} />

      {/* Barra de progreso */}
      <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <div
          className="h-full bg-gradient-to-r from-(--accent-gold) to-amber-300 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/30 border border-white/10 p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="replay-prev"
            onClick={goPrev}
            disabled={index === 0}
            aria-label="Frame anterior"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="replay-play"
            onClick={() => setPlaying(p => !p)}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
            className="p-2 rounded-xl bg-(--accent-gold) text-black hover:brightness-110 transition-all"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            data-testid="replay-next"
            onClick={goNext}
            disabled={index >= total - 1}
            aria-label="Siguiente frame"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <span
            data-testid="replay-counter"
            className="ml-3 text-xs font-mono text-slate-400"
          >
            {index + 1} / {total}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {SPEEDS.map(s => (
            <button
              type="button"
              key={s}
              data-testid={`replay-speed-${s}`}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                speed === s
                  ? 'bg-(--accent-gold) text-black'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
