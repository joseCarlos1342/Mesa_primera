'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2 } from 'lucide-react';
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

  // Teléfono en horizontal (poca altura): la mesa ocupa toda la pantalla con
  // controles flotantes, igual que en pantalla completa, para que se vea entera.
  const [shortLandscape, setShortLandscape] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(max-height: 500px) and (orientation: landscape)');
    const update = () => setShortLandscape(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  const immersive = isFullscreen || shortLandscape;
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
        className={`w-full rounded-xl border border-[#8b6b2e]/60 bg-[#120806] p-8 text-center ${className}`}
      >
        <p className="font-display text-[1.375rem] font-bold text-text-premium">Sin mesa para reproducir</p>
        <p className="mt-2 text-base text-[#bdb7a6]">
          Esta partida se grabó con el formato anterior y solo tiene el resumen y la línea de tiempo.
        </p>
      </div>
    );
  }

  const frame = frames[index];

  return (
    <div
      data-testid="replay-root"
      data-speed={String(speed)}
      className={`w-full space-y-3 [@media(max-height:500px)]:space-y-2 ${className}`}
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
        data-immersive={String(immersive)}
        className={
          immersive
            ? 'fixed inset-0 z-[1000] w-screen h-screen bg-[#120806] flex flex-col'
            : 'relative'
        }
      >
        <div className={immersive ? 'flex-1 min-h-0' : ''}>
          <ReplayBoard
            frame={frame}
            cardFallbackByPlayerId={progressiveFallback.byPlayerId[index]}
            cardFallbackByUserId={progressiveFallback.byUserId[index]}
            className={immersive ? 'h-full! min-h-0! rounded-none! border-0!' : ''}
          />
        </div>

        {/* Controles flotantes superpuestos. Deben vivir DENTRO del target
            de fullscreen porque el navegador oculta cualquier nodo externo
            al elemento en pantalla completa. */}
        {immersive && (
          <div
            data-testid="replay-floating-controls"
            className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 rounded-xl border border-[#8b6b2e] bg-[#120806]/95 px-3 py-2 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(240,170,105,0.28)]"
          >
            <button
              type="button"
              data-testid="replay-floating-prev"
              onClick={goPrev}
              disabled={index === 0}
              aria-label="Paso anterior"
              className={secondaryControl}
            >
              <SkipBack className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              data-testid="replay-floating-play"
              onClick={() => setPlaying(p => !p)}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              className={primaryControl}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              type="button"
              data-testid="replay-floating-next"
              onClick={goNext}
              disabled={index >= total - 1}
              aria-label="Paso siguiente"
              className={secondaryControl}
            >
              <SkipForward className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              data-testid="replay-floating-exit"
              onClick={() => { if (isFullscreen) void toggleFullscreen(); else window.history.back(); }}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Volver'}
              className={secondaryControl}
            >
              <Minimize2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Barra de progreso y controles regulares: solo fuera de fullscreen. */}
      {!immersive && (
        <div className="rounded-xl border border-[#8b6b2e]/60 bg-[#120806] p-3 shadow-[inset_0_1px_0_rgba(240,170,105,0.2)] sm:p-4 [@media(max-height:500px)]:flex [@media(max-height:500px)]:items-center [@media(max-height:500px)]:gap-3 [@media(max-height:500px)]:py-2">
          <label htmlFor="replay-scrub" className="sr-only">
            Momento de la partida
          </label>
          <input
            id="replay-scrub"
            data-testid="replay-progress"
            type="range"
            min={0}
            max={Math.max(total - 1, 0)}
            value={index}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            aria-valuetext={`Paso ${index + 1} de ${total}`}
            className="h-11 w-full cursor-pointer accent-[#e2b044]"
          />

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between [@media(max-height:500px)]:mt-0 [@media(max-height:500px)]:shrink-0">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <button
                type="button"
                data-testid="replay-prev"
                onClick={goPrev}
                disabled={index === 0}
                aria-label="Paso anterior"
                className={secondaryControl}
              >
                <SkipBack className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="replay-play"
                onClick={handlePlayToggle}
                aria-label={playing ? 'Pausar' : 'Reproducir'}
                className={`${primaryControl} w-14`}
              >
                {playing ? <Pause className="h-6 w-6" aria-hidden="true" /> : <Play className="h-6 w-6 fill-current" aria-hidden="true" />}
              </button>
              <button
                type="button"
                data-testid="replay-next"
                onClick={goNext}
                disabled={index >= total - 1}
                aria-label="Paso siguiente"
                className={secondaryControl}
              >
                <SkipForward className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="replay-fullscreen"
                onClick={() => { void toggleFullscreen(); }}
                aria-label="Pantalla completa"
                className={secondaryControl}
              >
                <Maximize2 className="h-5 w-5" aria-hidden="true" />
              </button>
              <span data-testid="replay-counter" className="ml-2 font-mono text-base tabular-nums text-[#d9d3bf]">
                {index + 1} / {total}
              </span>
            </div>

            <div role="group" aria-label="Velocidad" className="flex items-center justify-center gap-1 rounded-lg border border-[#8b6b2e]/50 p-1 sm:justify-end">
              {SPEEDS.map(s => (
                <button
                  type="button"
                  key={s}
                  data-testid={`replay-speed-${s}`}
                  onClick={() => setSpeed(s)}
                  aria-pressed={speed === s}
                  className={`min-h-10 min-w-12 rounded-md px-2 font-mono text-base font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
                    speed === s ? 'bg-[#0a2c20] text-brand-gold-light shadow-[inset_0_0_0_1px_rgba(197,160,89,0.6)]' : 'text-[#d9d3bf] hover:text-text-premium'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const primaryControl =
  'inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-gold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light';
const secondaryControl =
  'inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[#8b6b2e]/80 text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:pointer-events-none disabled:opacity-35';
