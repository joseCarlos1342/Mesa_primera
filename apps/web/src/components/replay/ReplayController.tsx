'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Minimize2 } from 'lucide-react';
import type { ReplayFrame } from '@/types/replay';
import { ReplayBoard } from './ReplayBoard';
import { useFullscreen } from '@/hooks/useFullscreen';

interface ReplayControllerProps {
  frames: ReplayFrame[];
  initialIndex?: number;
  /** Intervalo base en ms entre frames al reproducir (a velocidad 1x). */
  intervalMs?: number;
  /** Manos finales de la BD (mapa por userId / supabaseUserId). */
  finalHands?: Record<string, { cards?: string; nickname?: string }>;
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
  finalHands: _finalHands,
  className = '',
}: ReplayControllerProps) {
  const total = frames.length;
  const clampedInitial = Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0));
  const [index, setIndex] = useState(clampedInitial);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const indexRef = useRef(index);
  indexRef.current = index;

  // Contenedor objetivo del fullscreen: SOLO la mesa + controles del replay,
  // nunca toda la app. El hook recibe este ref para apuntar a este nodo.
  const fullscreenTargetRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen móvil: al pulsar play en pantallas estrechas (≤1024px) intentamos
  // entrar en fullscreen para ocultar las barras del navegador. Salir devuelve
  // a la vista normal del replay sin navegar a otra ruta.
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(fullscreenTargetRef);
  const isMobileViewport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.matchMedia('(max-width: 1024px)').matches;
    } catch {
      return false;
    }
  }, []);

  const handlePlayToggle = useCallback(() => {
    setPlaying(p => {
      const next = !p;
      // Solo intentamos fullscreen al ENTRAR en play, en móvil, y si no estamos
      // ya en fullscreen. Es best-effort: el navegador puede negarlo.
      if (next && isMobileViewport() && !isFullscreen) {
        void toggleFullscreen();
      }
      return next;
    });
  }, [isFullscreen, isMobileViewport, toggleFullscreen]);

  /**
   * Memoria progresiva: para cada índice de frame, calcula las últimas cartas
   * conocidas por playerId / userId mirando ÚNICAMENTE los frames 0..index.
   * Evita filtrar cartas reveladas en SHOWDOWN al primer paso del timeline.
   *
   * `finalHands` deliberadamente no participa: solo es fuente del resumen
   * final, no del estado intermedio.
   */
  const progressiveFallback = useMemo(() => {
    const byPlayerId: Map<string, string[]>[] = [];
    const byUserId: Map<string, string[]>[] = [];
    const accPid = new Map<string, string[]>();
    const accUid = new Map<string, string[]>();
    for (const f of frames) {
      for (const p of f.players) {
        if (p.privateCards && p.privateCards.length > 0) {
          accPid.set(p.id, p.privateCards);
          if (p.userId) accUid.set(p.userId, p.privateCards);
        }
      }
      // Snapshot inmutable por frame (clones para que mutaciones futuras no
      // afecten frames anteriores).
      byPlayerId.push(new Map(accPid));
      byUserId.push(new Map(accUid));
    }
    return { byPlayerId, byUserId };
  }, [frames]);

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
      {/*
        Wrapper específico del fullscreen: cuando está activo, ocupa 100vw/100vh
        sobre fondo opaco, sin nav ni menús externos. El navegador aplica el
        backdrop fullscreen al primer hijo del documento; este nodo es el target.
      */}
      <div
        ref={fullscreenTargetRef}
        data-testid="replay-fullscreen-target"
        data-fullscreen={String(isFullscreen)}
        className={
          isFullscreen
            ? 'fixed inset-0 z-[1000] w-screen h-screen bg-[#041c11] flex flex-col'
            : 'relative'
        }
      >
        <div className={isFullscreen ? 'flex-1 min-h-0' : ''}>
          <ReplayBoard
            frame={frame}
            cardFallbackByPlayerId={progressiveFallback.byPlayerId[index]}
            cardFallbackByUserId={progressiveFallback.byUserId[index]}
            className={isFullscreen ? '!h-full !min-h-0 !rounded-none !border-0' : ''}
          />
        </div>

        {/* Controles flotantes superpuestos. Deben vivir DENTRO del target
            de fullscreen porque el navegador oculta cualquier nodo externo
            al elemento en pantalla completa. */}
        {isFullscreen && (
          <div
            data-testid="replay-floating-controls"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 rounded-2xl bg-black/70 border border-white/15 backdrop-blur-md px-3 py-2 shadow-2xl"
          >
            <button
              type="button"
              data-testid="replay-floating-prev"
              onClick={goPrev}
              disabled={index === 0}
              aria-label="Frame anterior"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              type="button"
              data-testid="replay-floating-play"
              onClick={() => setPlaying(p => !p)}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              className="p-2 rounded-xl bg-(--accent-gold) text-black hover:brightness-110 transition-all"
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              type="button"
              data-testid="replay-floating-next"
              onClick={goNext}
              disabled={index >= total - 1}
              aria-label="Siguiente frame"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              type="button"
              data-testid="replay-floating-exit"
              onClick={() => { void toggleFullscreen(); }}
              aria-label="Salir de pantalla completa"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Barra de progreso y controles regulares: solo fuera de fullscreen. */}
      {!isFullscreen && (
        <>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-(--accent-gold) to-amber-300 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controles: en m\u00f3vil ambos grupos centrados; en desktop separados */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-black/30 border border-white/10 p-3">
            <div className="flex items-center justify-center sm:justify-start gap-2">
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
                onClick={handlePlayToggle}
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

            <div className="flex items-center justify-center sm:justify-end gap-1 flex-wrap">
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
        </>
      )}
    </div>
  );
}
