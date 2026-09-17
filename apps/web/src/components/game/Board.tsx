"use client"

import { Room } from '@colyseus/sdk'
import { evaluateHand } from '@/utils/handEvaluation'
import { formatCurrency } from '@/utils/format'
import { m, AnimatePresence } from 'framer-motion'
import { PlayerBadge } from './PlayerBadge'
import { ActionControls } from './ActionControls'
import { ChipSelector } from './ChipSelector'
import { GameAnnouncer } from './GameAnnouncer'
import { Card } from './Card'
import { ShowdownCinematic } from './ShowdownCinematic'
import { PiqueRevealOverlay } from './PiqueRevealOverlay'
import { useState, useEffect, useRef } from 'react'
import { AnimationLayer } from './AnimationLayer'
import { ShuffleAnimation } from './ShuffleAnimation'
import { ManoIcon } from './ManoIcon'
import { useCardPreloader } from '@/hooks/useCardPreloader'
import { getArcCardLayout } from './hand-layout'

function getPotValueSizeClass(amount: number): string {
  const visibleCharacters = formatCurrency(amount).replace(/\s/g, '').length

  if (visibleCharacters >= 11) return 'text-[12px] md:text-[18px]'
  if (visibleCharacters >= 9) return 'text-[14px] md:text-[20px]'
  return 'text-[16px] md:text-[22px]'
}

interface BoardProps {
  room: Room | null;
  phase: string;
  pot: number;
  piquePot: number;
  players: any[];
  /** Cartas privadas del jugador local (recibidas por mensaje privado del servidor). */
  myCards?: string;
  /** Pique mínimo configurado en la sala (en centavos). */
  minPique?: number;
  /** Apuesta máxima en la ronda de apuestas actual (synced). */
  currentMaxBet?: number;
  /** Denominaciones de fichas deshabilitadas por el admin en mesas personalizadas. */
  disabledChips?: number[];
  /** Opción válida de juego derivada por el servidor. */
  validJuegoOption?: { hasJuego: boolean; handType: string } | null;
  /** Si se reabrió el Pique para que los que pasaron puedan igualar. */
  piqueReopenActive?: boolean;
  /** Prompt de resolución inmediata de paso definitivo con juego. */
  pasoJuegoChoice?: { hasJuego: boolean; handType: string } | null;
  /** Callback al resolver el prompt de paso-juego. */
  onPasoJuegoResolved?: () => void;
  /** Decisión simultánea de JUEGO_VALIDACION para el jugador local. */
  juegoValidation?: { hasJuego: boolean; handType: string; minPique: number } | null;
  /** Limpia la decisión local después de enviarla al servidor. */
  onJuegoValidationResolved?: () => void;
}

export function Board({ room, phase, pot, piquePot, players, myCards = "", minPique = 500_000, currentMaxBet = 0, disabledChips = [], validJuegoOption = null, piqueReopenActive = false, pasoJuegoChoice = null, onPasoJuegoResolved, juegoValidation = null, onJuegoValidationResolved }: BoardProps) {
  useCardPreloader();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [chipCounts, setChipCounts] = useState<Record<number, number>>({});
  const [adminWatching, setAdminWatching] = useState(false);
  const [manoMessage, setManoMessage] = useState<string | null>(null);
  const [manoTransfer, setManoTransfer] = useState<{ fromId: string; toId: string } | null>(null);
  const prevDealerIdRef = useRef<string>("");
  const pendingManoRef = useRef<{ fromId: string; toId: string } | null>(null);
  const prevPlayersRef = useRef<any[]>([]);
  const prevMyCardsRef = useRef<string>("");
  const awaitingInitialPrivateHydrationRef = useRef(false);
  // Keep the first render deterministic for SSR/hydration. The compact layout
  // is applied after mount and refreshed when the viewport changes.
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  useEffect(() => {
    const updateViewportDensity = () => setIsCompactViewport(window.innerWidth < 1000);
    updateViewportDensity();
    window.addEventListener('resize', updateViewportDensity);
    return () => window.removeEventListener('resize', updateViewportDensity);
  }, []);

  const myId = room?.sessionId ?? "";
  const currentPhase = room?.state?.phase ?? phase;
  const me = players.find(p => p.id === myId);
  const manoId = room?.state?.activeManoId || room?.state?.dealerId || '';
  const isMyTurn = currentPhase === 'JUEGO_VALIDACION'
    ? Boolean(me && !me.isFolded && me.connected)
    : room ? room.state.turnPlayerId === myId : false;
  const getPlayerIndex = (id: string) => players.findIndex(p => p.id === id);

  const totalBet = Object.entries(chipCounts).reduce((sum, [denom, count]) => sum + Number(denom) * count, 0);

  // Hide dealer badge during preliminary phases before the sorteo is confirmed
  const hideMano = ['LOBBY', 'STARTING', 'BARAJANDO', 'SORTEO_MANO'].includes(phase);

  const addChip = (val: number) => {
    if ((me?.chips || 0) < totalBet + val) return;
    setChipCounts(prev => ({ ...prev, [val]: (prev[val] || 0) + 1 }));
  };
  const removeChip = (val: number) => {
    setChipCounts(prev => {
      const newCount = (prev[val] || 0) - 1;
      if (newCount <= 0) { const { [val]: _, ...rest } = prev; return rest; }
      return { ...prev, [val]: newCount };
    });
  };

  // Intro shows only during the STARTING phase (server-controlled timing)
  const showIntro = phase === 'STARTING';

  // Phases where a fullscreen reveal overlay blocks the table — defer mano transfer animation
  const isRevealOverlayActive = phase === 'SHOWDOWN' || phase === 'PIQUE_REVEAL';

  // Detect dealerId changes to trigger Mano transfer animation + announcement
  useEffect(() => {
    const dealerId = manoId;
    const prevDealerId = prevDealerIdRef.current;

    if (dealerId && prevDealerId && dealerId !== prevDealerId && !hideMano) {
      if (isRevealOverlayActive) {
        // Queue the transfer — will be flushed when the overlay closes
        pendingManoRef.current = { fromId: prevDealerId, toId: dealerId };
        prevDealerIdRef.current = dealerId;
        return;
      }

      const newMano = players.find(p => p.id === dealerId);
      if (newMano) {
        pendingManoRef.current = null;
        setManoMessage(`${newMano.nickname} es la nueva mano`);
        setManoTransfer({ fromId: prevDealerId, toId: dealerId });
        const timer = setTimeout(() => {
          setManoMessage(null);
          setManoTransfer(null);
        }, 3500);
        prevDealerIdRef.current = dealerId;
        return () => clearTimeout(timer);
      }
    }

    prevDealerIdRef.current = dealerId;
  }, [manoId, players, hideMano, isRevealOverlayActive]);

  // Flush pending mano transfer when the reveal overlay closes
  useEffect(() => {
    if (isRevealOverlayActive || !pendingManoRef.current) return;

    const pending = pendingManoRef.current;
    pendingManoRef.current = null;

    const newMano = players.find(p => p.id === pending.toId);
    if (newMano) {
      setManoMessage(`${newMano.nickname} es la nueva mano`);
      setManoTransfer(pending);
      const timer = setTimeout(() => {
        setManoMessage(null);
        setManoTransfer(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isRevealOverlayActive, players]);

  useEffect(() => {
    const myId = room?.sessionId;

    // Skip animation diff on initial hydration (reconnect mid-game):
    // prevPlayersRef is empty but we already have players in an active phase.
    // Just snapshot the current state without firing spurious deal animations.
    const isActivePhase = !['LOBBY', 'STARTING'].includes(currentPhase);
    const isInitialHydration = prevPlayersRef.current.length === 0 && players.length > 0 && isActivePhase;

    if (isInitialHydration) {
      prevPlayersRef.current = players.map(p => ({ ...p }));
      prevMyCardsRef.current = myCards;
      awaitingInitialPrivateHydrationRef.current = !myCards;
      return;
    }

    players.forEach(p => {
      // Don't track empty/dummy players
      if (!p || !p.id) return;

      const prevP = prevPlayersRef.current.find(old => old.id === p.id);
      const isMe = p.id === myId;

      if (isMe) {
        // Track own cards via private message state (myCards prop)
        const oldCards = prevMyCardsRef.current ? prevMyCardsRef.current.split(',').filter(Boolean) : [];
        const newCards = myCards ? myCards.split(',').filter(Boolean) : [];

        // Suppress animation when cards arrive from resync (old was empty but
        // the server state already has cardCount > 0, meaning this is hydration
        // of existing cards, not a fresh deal).
        const isInitialPrivateHydration = awaitingInitialPrivateHydrationRef.current && oldCards.length === 0 && newCards.length > 0 && isActivePhase;
        const isResyncHydration = isInitialPrivateHydration || (oldCards.length === 0 && newCards.length > 0 && isActivePhase && (prevP?.cardCount ?? 0) > 0);

        const added = newCards.filter((c: string) => !oldCards.includes(c));
        const removed = oldCards.filter((c: string) => !newCards.includes(c));

        if (added.length > 0 && !isResyncHydration) {
          window.dispatchEvent(new CustomEvent('animate-deal', { detail: { 
            toPlayerId: p.id, 
            cards: added,
            isFaceUp: true
          }}));
        }
        if (removed.length > 0) {
          window.dispatchEvent(new CustomEvent('animate-discard', { detail: { fromPlayerId: p.id, cards: removed }}));
        }
        if (newCards.length > 0) awaitingInitialPrivateHydrationRef.current = false;
      } else {
        // For opponents: track revealedCards in reveal phases, else cardCount
        const isRevealPhase = currentPhase === 'SORTEO_MANO' || currentPhase === 'SHOWDOWN';

        if (isRevealPhase) {
          const oldRevealed = prevP?.revealedCards ? prevP.revealedCards.split(',').filter(Boolean) : [];
          const newRevealed = p.revealedCards ? p.revealedCards.split(',').filter(Boolean) : [];
          const added = newRevealed.filter((c: string) => !oldRevealed.includes(c));

          if (added.length > 0) {
            window.dispatchEvent(new CustomEvent('animate-deal', { detail: { 
              toPlayerId: p.id, 
              cards: added,
              isFaceUp: true
            }}));
          }
        } else {
          const oldCount = prevP?.cardCount || 0;
          const newCount = p.cardCount || 0;
          const addedCount = newCount - oldCount;

          if (addedCount > 0) {
            const fakeCards = Array.from({length: addedCount}, (_, i) => `back-${Date.now()}-${i}`);
            window.dispatchEvent(new CustomEvent('animate-deal', { detail: { 
              toPlayerId: p.id, 
              cards: fakeCards,
              isFaceUp: false
            }}));
          }
        }
      }
    });

    // Save copy of current state
    prevPlayersRef.current = players.map(p => ({ ...p }));
    prevMyCardsRef.current = myCards;
  }, [players, myCards, currentPhase, room?.sessionId]);

  // Listen for admin spectator presence
  useEffect(() => {
    if (!room) return;
    const handler = (msg: { active: boolean }) => setAdminWatching(msg.active);
    room.onMessage("admin:status", handler);
  }, [room]);

  if (!room) return null;

  // Define 6 fixed elliptical seat positions for opponents (slots for 7 players total)
  const opponentSeats = [
    "top-[38%] left-[0%] landscape:top-[6%] landscape:left-[0%] md:landscape:top-[30%] md:landscape:left-[2%] lg:top-[25%] lg:left-[3%]",
    "top-[12%] left-[10%] landscape:top-[2%] landscape:left-[18%] md:landscape:top-[8%] md:landscape:left-[10%] lg:top-[4%] lg:left-[15%]",
    "top-[2%] left-[30%] landscape:top-[2%] landscape:left-[38%] md:landscape:top-[2%] md:landscape:left-[30%] lg:top-[2%] lg:left-[34%]",
    "top-[2%] right-[30%] landscape:top-[2%] landscape:right-[38%] md:landscape:top-[2%] md:landscape:right-[30%] lg:top-[2%] lg:right-[34%]",
    "top-[12%] right-[10%] landscape:top-[2%] landscape:right-[18%] md:landscape:top-[8%] md:landscape:right-[10%] lg:top-[4%] lg:right-[15%]",
    "top-[38%] right-[0%] landscape:top-[6%] landscape:right-[0%] md:landscape:top-[30%] md:landscape:right-[2%] lg:top-[25%] lg:right-[3%]"
  ];

  const myHandDensity = isCompactViewport ? 'compact' : 'comfortable';

  const renderPlayerAtSeat = (p: any, seatIndex: number) => {
    const seatClass = opponentSeats[seatIndex];

    // For opponents: use revealedCards during SORTEO/SHOWDOWN or when explicitly set (e.g. pique fold reveal), cardCount for backs otherwise
    const isRevealPhase = phase === 'SORTEO_MANO' || phase === 'SHOWDOWN';
    const opponentVisibleCards = (isRevealPhase || p?.revealedCards) && p?.revealedCards
      ? p.revealedCards.split(',').filter(Boolean)
      : [];
    const opponentCardCount = p?.cardCount || 0;
    
    return (
      <div id={`seat-${p?.id || `empty-${seatIndex}`}`} key={p?.id || `empty-${seatIndex}`} className={`absolute ${seatClass} flex flex-col items-center z-20 transition-all duration-700`}>
        <PlayerBadge 
          player={p || { nickname: 'VACÍO', chips: null, connected: true }} 
          isActive={p && room.state.turnPlayerId === p.id} 
          isMe={false} 
          isDealer={!hideMano && p && manoId === p.id}
          points={undefined} /* Opponents don't show points, only for self */
          turnOrder={p?.turnOrder}
          isWaiting={p?.isWaiting}
          isAllIn={p?.isAllIn && !p?.passedWithJuego}
        />
        {/* Opponent's Cards: visible on mobile only during SORTEO_MANO, otherwise lg+ only */}
        {p ? (
          <div className={`${phase === 'SORTEO_MANO' ? 'flex' : 'hidden lg:flex'} relative justify-center mt-1 md:mt-2 z-0 h-28 w-48 md:h-32 md:w-56 scale-50 lg:scale-60 landscape:scale-50 lg:landscape:scale-60 origin-top`}>
            {opponentVisibleCards.length > 0
              ? opponentVisibleCards.map((cardStr: string, idx: number, arr: any[]) => {
                  const layout = getArcCardLayout({
                    index: idx,
                    count: arr.length,
                    variant: 'opponent',
                    density: 'compact',
                  });
                  const playerIdx = getPlayerIndex(p.id);
                  const dealDelay = phase === 'SORTEO_MANO' ? (playerIdx * 0.4) + (idx * 2) : (playerIdx * 0.4) + (idx * 0.2);
                  
                  return (
                    <m.div 
                      key={`${p.id}-${cardStr}-${idx}`}
                      initial={{ opacity: 0, scale: 0.82, x: layout.offsetX * 0.7, y: layout.offsetY + 14, rotate: layout.angle * 0.7 }}
                      animate={{ opacity: (p.isFolded && !isRevealPhase) ? 0.3 : 1, scale: (p.isFolded && !isRevealPhase) ? 0.88 : 1, x: layout.offsetX, y: layout.offsetY, rotate: layout.angle }}
                      transition={{ delay: 0.45, duration: 0.3 }}
                      style={{ 
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        transformOrigin: 'top center',
                        zIndex: layout.zIndex,
                      }}
                      className={(p.isFolded && !isRevealPhase) ? 'pointer-events-none grayscale' : 'drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]'}
                    >
                      <div className="-translate-x-1/2">
                        <Card 
                          suit={cardStr.split('-')[1] as any} 
                          value={parseInt(cardStr.split('-')[0])} 
                          delay={dealDelay}
                          isHidden={false}
                          originY={200}
                          priority={true}
                        />
                      </div>
                    </m.div>
                  )
                })
              : opponentCardCount > 0
                ? p.isFolded
                  ? /* Folded: single collapsed stack */
                    (<m.div
                      key={`${p.id}-folded-stack`}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0.25, scale: 0.7, y: 10 }}
                      transition={{ duration: 0.5 }}
                      className="relative pointer-events-none"
                    >
                      {/* Stacked card backs */}
                      <div className="absolute top-0 left-0 translate-x-[2px] translate-y-[2px]">
                        <Card isHidden={true} originY={200} priority={true} />
                      </div>
                      <Card isHidden={true} originY={200} priority={true} />
                    </m.div>)
                  : Array.from({ length: opponentCardCount }).map((_, idx) => {
                      const layout = getArcCardLayout({
                        index: idx,
                        count: opponentCardCount,
                        variant: 'opponent',
                        density: 'compact',
                      });
                    
                    return (
                      <m.div 
                        key={`${p.id}-back-${idx}`}
                        initial={{ opacity: 0, scale: 0.82, x: layout.offsetX * 0.7, y: layout.offsetY + 14, rotate: layout.angle * 0.7 }}
                        animate={{ opacity: 1, scale: 1, x: layout.offsetX, y: layout.offsetY, rotate: layout.angle }}
                        transition={{ delay: 0.45, duration: 0.3 }}
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
                          <Card 
                            isHidden={true}
                            originY={200}
                            priority={true}
                          />
                        </div>
                      </m.div>
                    )
                  })
                : null
            }
          </div>
        ) : null}
      </div>
    )
  }

  // Identify opponents and map them to seats
  const opponents = players.filter(p => p.id !== myId);

  return (
    <div
      data-testid="table-root"
      className="relative w-full h-full bg-surface-wood flex items-center justify-center overflow-hidden font-sans border-t-4 border-surface-wood-rim"
      style={{ backgroundColor: '#120806', borderTopColor: '#35180f' }}
    >
      {/* Base de nogal: las vetas quedan visibles en las esquinas y el perímetro. */}
      <div
        data-testid="table-wood-base"
        className="absolute inset-0 bg-surface-wood pointer-events-none"
        style={{
          backgroundColor: '#120806',
          backgroundImage: [
            'radial-gradient(ellipse at 50% -20%, rgba(168, 82, 42, 0.3) 0%, transparent 54%)',
            'repeating-linear-gradient(7deg, rgba(255, 190, 118, 0.08) 0 1px, transparent 1px 46px)',
            'url("/textures/noise.png")',
          ].join(', '),
          backgroundBlendMode: 'normal, normal, soft-light',
          backgroundSize: 'auto, auto, 128px 128px',
        }}
      />

      {/* Viñeta exterior para que la madera parezca una base profunda. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0, 0, 0, 0.58) 100%)',
        }}
      />

      {/* Canto elevado de la mesa. */}
      <div
        data-testid="table-wood-rim"
        className="absolute inset-[2.25%] rounded-[50%] pointer-events-none"
        style={{
          border: 'clamp(8px, 1.5vw, 20px) solid var(--color-surface-wood-rim, #35180f)',
          boxShadow: [
            '0 18px 30px rgba(0, 0, 0, 0.62)',
            'inset 0 1px 0 rgba(240, 170, 105, 0.34)',
            'inset 0 -5px 0 rgba(0, 0, 0, 0.42)',
          ].join(', '),
        }}
      />

      {/* Fieltro: volumen central, luz suave y trama discreta sin textura remota. */}
      <div
        data-testid="table-felt-surface"
        className="absolute inset-[4.25%] bg-surface-leather rounded-[50%] overflow-hidden pointer-events-none"
        style={{
          backgroundColor: '#0a2c20',
          backgroundImage: [
            'radial-gradient(ellipse at 50% 35%, rgba(69, 153, 108, 0.42) 0%, rgba(26, 94, 63, 0.34) 43%, rgba(2, 26, 16, 0.92) 100%)',
            'repeating-radial-gradient(ellipse at 18% 32%, rgba(148, 204, 169, 0.07) 0 1px, transparent 1px 11px)',
            'url("/textures/noise.png")',
          ].join(', '),
          backgroundBlendMode: 'normal, soft-light, soft-light',
          backgroundSize: 'auto, auto, 128px 128px',
          boxShadow: 'inset 0 0 72px rgba(0, 0, 0, 0.72), 0 5px 14px rgba(0, 0, 0, 0.65)',
        }}
      />

      {/* Filete interior que separa visualmente el fieltro del nogal. */}
      <div
        className="absolute inset-[4.25%] rounded-[50%] border border-[#d4af37]/35 pointer-events-none"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255, 226, 153, 0.18)' }}
      />

      <GameAnnouncer phase={phase} customMessage={manoMessage} />

      {/* Mano Transfer Animation: flying icon from old seat to new seat */}
      <AnimatePresence>
        {manoTransfer && (() => {
          const fromEl = document.getElementById(`seat-${manoTransfer.fromId}`);
          const toEl = document.getElementById(`seat-${manoTransfer.toId}`);

          if (fromEl && toEl) {
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            const startX = fromRect.left + fromRect.width / 2;
            const startY = fromRect.top + fromRect.height / 2;
            const endX = toRect.left + toRect.width / 2;
            const endY = toRect.top + toRect.height / 2;

            return (
              <m.div
                key={`mano-transfer-${manoTransfer.toId}`}
                className="fixed z-[95] pointer-events-none"
                initial={{ left: startX - 14, top: startY - 14, scale: 0.5, opacity: 0 }}
                animate={{ left: endX - 14, top: endY - 14, scale: [0.5, 1.4, 1], opacity: [0, 1, 1] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              >
                <ManoIcon size="md" animate />
              </m.div>
            );
          }

          // Fallback: centered pop if seats not found
          return (
            <m.div
              key={`mano-transfer-${manoTransfer.toId}`}
              className="absolute inset-0 z-[95] pointer-events-none flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <m.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.4, 1], opacity: [0, 1, 1] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              >
                <ManoIcon size="md" animate />
              </m.div>
            </m.div>
          );
        })()}
      </AnimatePresence>

      {/* Admin Spectator Banner */}
      <AnimatePresence>
        {adminWatching && (
          <m.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-[90] pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-red-900/80 backdrop-blur-md border border-red-500/50 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-200 text-[11px] md:text-xs font-bold uppercase tracking-wider">
                👮‍♂️ El equipo de soporte está observando la mesa
              </span>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* 🃏 SHUFFLE ANIMATION - GSAP professional shuffle during BARAJANDO */}
      <AnimatePresence>
        {phase === 'BARAJANDO' && <ShuffleAnimation key="shuffle" />}
      </AnimatePresence>

      {/* 🎬 INTRO TITLE ANIMATION - High-end cinematic entrance */}
      <AnimatePresence>
        {showIntro && (
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none bg-black/20 backdrop-blur-sm"
          >
            <m.div
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center gap-4"
            >
              {/* Decorative line top */}
              <m.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="h-px w-[100px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent origin-center" 
              />

              <h1 className="text-4xl md:text-7xl font-display font-bold italic uppercase tracking-[0.18em] text-center leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] px-4">
                <span className="block bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] bg-clip-text text-transparent pb-2">
                  Primera rebirada
                </span>
                <span className="block text-[#fdf0a6] text-xl md:text-3xl tracking-[0.4em] font-light mt-2 opacity-80">
                  los 4 ases
                </span>
              </h1>

              {/* Decorative line bottom */}
              <m.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="h-px w-[100px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent origin-center" 
              />
            </m.div>

            {/* Subtle light sweep animation */}
            <m.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
            />
          </m.div>
        )}
      </AnimatePresence>
      {/* OPPONENTS AREA */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* We map 6 slots for opponents */}
        {Array.from({ length: 6 }).map((_, slotIdx) => {
          // Simplistic assignment: just fill left to right
          const opponent = opponents[slotIdx];
          return renderPlayerAtSeat(opponent, slotIdx);
        })}
      </div>
      {/* TABLE CENTER - Unified double display with the deck embedded in the divider */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none mb-12 lg:mb-20">
        <div className="relative flex items-center justify-center pointer-events-auto px-2 py-2 md:px-8 md:py-4">
          {/* Independent smoked-glass displays */}
          <div
            data-testid="pot-displays"
            className="relative z-10 flex items-center gap-1 md:gap-2"
          >
            <div
              data-testid="pot-main"
              className="relative flex h-[58px] w-[112px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#8b6b2e] bg-[#160b08]/95 px-1.5 text-center shadow-[0_10px_20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(240,170,105,0.28),inset_0_-5px_12px_rgba(0,0,0,0.65)] backdrop-blur-md md:h-[76px] md:w-[154px] md:rounded-[18px] md:px-2"
            >
              <div className="pointer-events-none absolute inset-[3px] rounded-[11px] border border-[#d4af37]/20 md:rounded-[15px]" />
               <span className="relative z-10 text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-[#fdf0a6]/80 md:text-xs md:tracking-[0.1em]">Apuesta Principal</span>
              <span className={`relative z-10 whitespace-nowrap font-mono font-black leading-none text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.35)] ${getPotValueSizeClass(pot)}`}>{formatCurrency(pot)}</span>
            </div>
            <div data-testid="deck-pedestal" aria-hidden="true" className="relative h-[58px] w-16 shrink-0 pointer-events-none md:h-[94px] md:w-[168px]" />
            <div
              data-testid="pot-pique"
              className={`relative flex h-[58px] w-[112px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#8b6b2e] bg-[#160b08]/95 px-1.5 text-center shadow-[0_10px_20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(240,170,105,0.28),inset_0_-5px_12px_rgba(0,0,0,0.65)] backdrop-blur-md transition-opacity md:h-[76px] md:w-[154px] md:rounded-[18px] md:px-2 ${piquePot > 0 ? 'opacity-100' : 'opacity-55'}`}
            >
              <div className="pointer-events-none absolute inset-[3px] rounded-[11px] border border-[#d4af37]/20 md:rounded-[15px]" />
               <span className="relative z-10 text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-[#fdf0a6]/80 md:text-xs md:tracking-[0.1em]">Apuesta Pique</span>
              <span className={`relative z-10 whitespace-nowrap font-mono font-black leading-none text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.35)] ${getPotValueSizeClass(piquePot)}`}>{formatCurrency(piquePot)}</span>
            </div>
          </div>

          {/* Central deck overlaps the divider like a physical table insert. */}
          <div id="deck-center" className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2">
             {/* Deck stack effect */}
             <div className="absolute h-9 w-6 translate-x-0.5 translate-y-0.5 rounded-md bg-[#0a0a0a] shadow-[2px_2px_15px_rgba(0,0,0,0.9)] md:h-24 md:w-16 md:translate-x-1.5 md:translate-y-1.5 md:rounded-lg" />
             <div className="absolute h-9 w-6 translate-x-[1px] translate-y-[1px] rounded-md bg-[#1a1a1a] md:h-24 md:w-16 md:translate-x-1 md:translate-y-1 md:rounded-lg" />
             {/* Top Card */}
             <div data-testid="deck-card" className="relative z-10 h-9 w-6 overflow-hidden rounded-md border-[1.5px] border-[#d4af37]/40 bg-[url('/images/card-back-rooster.png')] bg-cover bg-center md:h-24 md:w-16 md:rounded-lg md:border-[2px]">
                <div className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] md:rounded-lg" />
                <div className="pointer-events-none absolute inset-0 rounded-md border border-white/10 md:rounded-lg" />
             </div>
             {/* Bottom card — slides out to the right of the deck */}
             {room.state.bottomCard && (
                 <div data-testid="bottom-card" className="absolute left-[58%] top-1/2 z-[5] h-9 w-6 -translate-y-1/2 rotate-[8deg] overflow-hidden rounded-md border border-[#d4af37]/30 shadow-[0_4px_16px_rgba(0,0,0,0.7)] md:left-[58%] md:h-24 md:w-16 md:rounded-lg">
                 <img
                   src={`/cards/${room.state.bottomCard.split('-')[0].padStart(2, '0')}-${({'O':'oros','C':'copas','E':'espadas','B':'bastos'} as Record<string,string>)[room.state.bottomCard.split('-')[1]] || room.state.bottomCard.split('-')[1]?.toLowerCase()}.png?v=3`}
                   alt=""
                   className="h-full w-full object-cover"
                 />
                 <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.4)]" />
               </div>
             )}
          </div>
        </div>
      </div>
      {/* UNIFIED PLAYER DASHBOARD - Split Left / Center / Right */}
      <div data-testid="player-dashboard" className="fixed bottom-0 left-0 z-50 w-full pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
        
        {me && (
          <>
            {/* Waiting indicator for spectators who joined mid-game */}
            {me.isWaiting && (
              <div className="flex items-center justify-center w-full mb-4 pointer-events-auto">
                <div className="bg-[#0a180e]/90 border border-dashed border-[#c0a060]/40 rounded-2xl px-6 py-3 backdrop-blur-md">
                  <p className="text-[#c0a060] text-xs md:text-sm font-bold uppercase tracking-widest animate-pulse">
                    Esperando próxima partida...
                  </p>
                </div>
              </div>
            )}

            {/* 🎮 ACTIVE LAYOUT: Left (HUD+Chips) | Center (Cards) | Right (Actions) */}
            {!me.isWaiting && (
            <div className="flex flex-row items-end w-full">

              {/* ◀ LEFT COLUMN: Chips stacked above + HUD (Saldo/Puntos) at bottom-left */}
              <div className="flex flex-col items-start shrink-0 pointer-events-auto z-[51]">
                {/* CHIPS: Stacked above the HUD during betting phases */}
                <AnimatePresence>
                  {isMyTurn && (phase === 'PIQUE' || phase === 'APUESTA_4_CARTAS' || phase === 'GUERRA' || phase === 'CANTICOS' || phase === 'GUERRA_JUEGO') && (
                    <m.div 
                      className="mb-2"
                      initial={{ scale: 0.9, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 10 }}
                    >
                      <ChipSelector
                        chipCounts={chipCounts}
                        totalBet={totalBet}
                        maxChips={me.chips || 0}
                        onAdd={addChip}
                        onRemove={removeChip}
                        disabledChips={disabledChips}
                      />
                    </m.div>
                  )}
                </AnimatePresence>

                {/* HUD: Saldo & Puntos */}
                <div
                  data-testid="player-hud"
                  id={`seat-${myId}`}
                  className={`relative flex min-w-[250px] flex-row items-center gap-3 overflow-hidden rounded-tr-[20px] border-r border-t border-[#8b6b2e] bg-[#160b08]/95 px-3 py-1.5 shadow-[0_-12px_30px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(240,170,105,0.28)] backdrop-blur-xl md:min-w-[340px] md:gap-4 md:px-4 md:py-2 ${isMyTurn ? 'bg-[#4ade80]/5' : ''}`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-[#fdf0a6]/80 md:text-xs">Saldo</span>
                    <span className="font-mono text-sm font-black leading-none text-[#4ade80] drop-shadow-[0_0_7px_rgba(74,222,128,0.3)] md:text-lg">{formatCurrency(me.chips || 0)}</span>
                  </div>

                  {myCards && (
                    <div className="flex flex-row items-center gap-3 border-l border-[#d4af37]/25 pl-3">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-[#fdf0a6]/80 md:text-xs">Puntos</span>
                        <span className="font-mono text-base font-black leading-none text-[#d4af37] drop-shadow-[0_0_7px_rgba(212,175,55,0.3)] md:text-xl">
                          {evaluateHand(myCards).points + (manoId === myId ? 1 : 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="ml-auto flex items-center gap-1.5 border-l border-[#d4af37]/25 pl-2">
                    {!hideMano && manoId === myId && <ManoIcon size="xs" className="ml-1" />}
                    {!hideMano && manoId !== myId && (me?.turnOrder ?? 0) > 1 && (
                      <div className="rounded border border-[#d4af37]/50 bg-[#0d2e1b] px-1 py-0.5 text-[11px] font-bold tracking-tighter text-[#d4af37]">{me.turnOrder}ª</div>
                    )}
                    {me.isAllIn && !me.passedWithJuego && (
                      <div className="rounded border border-amber-500/60 bg-amber-900/80 px-1 py-0.5 text-[11px] font-bold tracking-tighter text-amber-300">Resto</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 🃏 CENTER: My Cards (reduced 30% for mobile landscape) */}
              <div className="flex-1 flex flex-col justify-end items-center pointer-events-auto min-w-0" style={{ transform: 'translateX(-2rem)' }}>
                {/* Instrucción de descarte */}
                {phase === 'DESCARTE' && isMyTurn && !me?.passedWithJuego && (
                  <div className="mb-1 md:mb-2 px-3 py-1 bg-[#0a180e]/90 border border-[#d4af37]/40 rounded-full backdrop-blur-md animate-pulse">
                    <span className="text-[#fdf0a6] text-[11px] md:text-xs font-bold uppercase tracking-wider">
                      Selecciona las cartas que vas a botar
                    </span>
                  </div>
                )}
                <div className="relative h-20 md:h-44 w-full max-w-[350px] md:max-w-[500px] mb-0.5 md:mb-2">
                  <div className="relative w-full h-full flex justify-center items-end">
                    {myCards && myCards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
                        const isSelected = selectedCards.includes(cardStr);
                        const layout = getArcCardLayout({
                          index: idx,
                          count: arr.length,
                          variant: 'self',
                          density: myHandDensity,
                        });
                        
                        const isDescarteTurn = phase === 'DESCARTE' && room.state.turnPlayerId === myId && !me?.passedWithJuego;
                        const handleCardClick = () => {
                          if (!isDescarteTurn) return;
                          setSelectedCards(prev => prev.includes(cardStr) ? prev.filter(c => c !== cardStr) : [...prev, cardStr]);
                        };
        
                        return (
                           <m.div 
                             key={cardStr + '-' + idx}
                             onClick={handleCardClick}
                             initial={{ opacity: 0, y: 50 }}
                             animate={{ opacity: 1, y: 0 }}
                             style={{ 
                               position: 'absolute',
                               left: `calc(50% + ${layout.offsetX}px)`,
                               bottom: 0,
                               transform: `translate(-50%, ${layout.offsetY + (isSelected ? -45 : 0)}px) scale(${isSelected ? 0.85 : 0.77}) rotate(${layout.angle}deg)`,
                               transformOrigin: 'bottom center',
                               zIndex: isSelected ? 50 + idx : layout.zIndex,
                               transition: 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.35s ease'
                             }}
                             className={`
                               ${isSelected ? 'drop-shadow-[0_0_20px_rgba(212,175,55,1)]' : 'drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]'}
                               ${isDescarteTurn ? 'cursor-pointer' : ''}
                             `}
                           >
                             <Card 
                               suit={cardStr.split('-')[1] as any} 
                               value={parseInt(cardStr.split('-')[0])} 
                               isHidden={false}
                               priority={true}
                               originX={0}
                               originY={0}
                               className={`${isSelected ? 'border-2 border-[#d4af37] ring-2 ring-[#d4af37]/80 ring-offset-1 ring-offset-black' : 'border border-white/20'}`}
                             />
                           </m.div>
                         )
                    })}
                  </div>
                </div>
              </div>

              {/* ▶ RIGHT COLUMN: Action Buttons (Limpiar + IR + Botarse in same container) */}
              <div className="shrink-0 pointer-events-auto z-[51]">
                <ActionControls 
                  room={room} 
                  phase={phase} 
                  isMyTurn={isMyTurn} 
                  selectedCards={selectedCards}
                  onClearSelection={() => setSelectedCards([])}
                  totalBet={totalBet}
                  onBetConfirm={() => {
                    room.send('action', { action: 'voy', amount: totalBet });
                    setChipCounts({});
                  }}
                  onBetClear={() => setChipCounts({})}
                  minPique={minPique}
                  currentMaxBet={currentMaxBet}
                  myRoundBet={me?.roundBet ?? 0}
                  myChips={me?.chips ?? 0}
                  isAllIn={me?.isAllIn ?? false}
                  passedWithJuego={me?.passedWithJuego ?? false}
                  validJuegoOption={validJuegoOption}
                  piqueReopenActive={piqueReopenActive}
                   pasoJuegoChoice={pasoJuegoChoice}
                   onPasoJuegoResolved={onPasoJuegoResolved}
                   juegoValidation={juegoValidation}
                   onJuegoValidationResolved={onJuegoValidationResolved}
                 />
              </div>
            </div>
            )}
          </>
        )}
      </div>

      {/* PIQUE_REVEAL: Player-controlled card reveal overlay */}
      <AnimatePresence>
        {phase === 'PIQUE_REVEAL' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-60"
          >
            <PiqueRevealOverlay room={room} players={players} />
          </m.div>
        )}
      </AnimatePresence>

      {/* DECLARAR_JUEGO: handled via ActionControls buttons (no overlay) */}

      {/* SHOWDOWN / Pique Showdown Cinematic Overlay */}
      <AnimatePresence>
        {phase === 'SHOWDOWN' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-60"
          >
            <ShowdownCinematic
              players={players}
              pot={phase === 'SHOWDOWN' ? pot : 0}
              piquePot={piquePot}
              dealerId={manoId}
              onDismiss={() => room.send('dismiss-showdown')}
            />
          </m.div>
        )}
      </AnimatePresence>

      {/* SHOWDOWN_WAIT: Winner decides to show or hide cards */}
      <AnimatePresence>
        {phase === 'SHOWDOWN_WAIT' && room.state.turnPlayerId === myId && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="text-[#d4af37] text-xs uppercase tracking-[0.3em] font-black">¡Ganaste!</div>
              <div className="text-white/70 text-sm mb-2">¿Deseas mostrar tus cartas?</div>
              <div className="flex gap-4">
                <button
                  onClick={() => { room.send('show-muck', { action: 'show' }); }}
                  className="h-12 px-6 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[#2a1b04] rounded-xl font-black text-sm shadow-lg border-b-[3px] border-b-[#5c4613] hover:-translate-y-0.5 transition-all uppercase tracking-wider"
                >
                  Mostrar
                </button>
                <button
                  onClick={() => { room.send('show-muck', { action: 'hide' }); }}
                  className="h-12 px-6 bg-gradient-to-b from-[#6b7280] to-[#374151] text-white rounded-xl font-black text-sm shadow-lg border-b-[3px] border-b-[#1f2937] hover:-translate-y-0.5 transition-all uppercase tracking-wider"
                >
                  No Mostrar
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* SHOWDOWN_WAIT: Other players see blur overlay */}
      <AnimatePresence>
        {phase === 'SHOWDOWN_WAIT' && room.state.turnPlayerId !== myId && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="text-[#d4af37] text-xs uppercase tracking-[0.3em] font-black">{room.state.lastAction}</div>
              <div className="text-white/50 text-sm">Esperando decisión del ganador...</div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Global Card Animations Overlay */}
      <AnimationLayer />
    </div>
  )
}
