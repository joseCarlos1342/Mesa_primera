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
import { useState, useEffect, useRef } from 'react'
import { AnimationLayer } from './AnimationLayer'
import { ShuffleAnimation } from './ShuffleAnimation'

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
}

export function Board({ room, phase, pot, piquePot, players, myCards = "", minPique = 500_000, currentMaxBet = 0 }: BoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [chipCounts, setChipCounts] = useState<Record<number, number>>({});
  const [adminWatching, setAdminWatching] = useState(false);
  const prevPlayersRef = useRef<any[]>([]);
  const prevMyCardsRef = useRef<string>("");

  const myId = room?.sessionId ?? "";
  const currentPhase = room?.state?.phase ?? phase;
  const isMyTurn = room ? room.state.turnPlayerId === myId : false;
  const me = players.find(p => p.id === myId);
  const getPlayerIndex = (id: string) => players.findIndex(p => p.id === id);

  const totalBet = Object.entries(chipCounts).reduce((sum, [denom, count]) => sum + Number(denom) * count, 0);

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

  useEffect(() => {
    const myId = room?.sessionId;

    players.forEach(p => {
      // Don't track empty/dummy players
      if (!p || !p.id) return;

      const prevP = prevPlayersRef.current.find(old => old.id === p.id);
      const isMe = p.id === myId;

      if (isMe) {
        // Track own cards via private message state (myCards prop)
        const oldCards = prevMyCardsRef.current ? prevMyCardsRef.current.split(',').filter(Boolean) : [];
        const newCards = myCards ? myCards.split(',').filter(Boolean) : [];

        const added = newCards.filter((c: string) => !oldCards.includes(c));
        const removed = oldCards.filter((c: string) => !newCards.includes(c));

        if (added.length > 0) {
          window.dispatchEvent(new CustomEvent('animate-deal', { detail: { 
            toPlayerId: p.id, 
            cards: added,
            isFaceUp: true
          }}));
        }
        if (removed.length > 0) {
          window.dispatchEvent(new CustomEvent('animate-discard', { detail: { fromPlayerId: p.id, cards: removed }}));
        }
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
    "top-[35%] left-[2%] landscape:top-[4%] landscape:left-[2%] md:landscape:top-[30%] md:landscape:left-[2%] lg:top-[25%] lg:left-[3%]",
    "top-[10%] left-[12%] landscape:top-[2%] landscape:left-[21%] md:landscape:top-[8%] md:landscape:left-[10%] lg:top-[4%] lg:left-[15%]",
    "top-[2%] left-[32%] landscape:top-[2%] landscape:left-[40%] md:landscape:top-[2%] md:landscape:left-[30%] lg:top-[2%] lg:left-[34%]",
    "top-[2%] right-[32%] landscape:top-[2%] landscape:right-[40%] md:landscape:top-[2%] md:landscape:right-[30%] lg:top-[2%] lg:right-[34%]",
    "top-[10%] right-[12%] landscape:top-[2%] landscape:right-[21%] md:landscape:top-[8%] md:landscape:right-[10%] lg:top-[4%] lg:right-[15%]",
    "top-[35%] right-[2%] landscape:top-[4%] landscape:right-[2%] md:landscape:top-[30%] md:landscape:right-[2%] lg:top-[25%] lg:right-[3%]"
  ];

  const renderPlayerAtSeat = (p: any, seatIndex: number) => {
    const seatClass = opponentSeats[seatIndex];
    
    // Determine card fan direction based on seat
    const isLeftSide = seatIndex < 3;

    // For opponents: use revealedCards during SORTEO/SHOWDOWN, cardCount for backs otherwise
    const isRevealPhase = phase === 'SORTEO_MANO' || phase === 'SHOWDOWN';
    const opponentVisibleCards = isRevealPhase && p?.revealedCards
      ? p.revealedCards.split(',').filter(Boolean)
      : [];
    const opponentCardCount = p?.cardCount || 0;
    
    return (
      <div id={`seat-${p?.id || `empty-${seatIndex}`}`} key={p?.id || `empty-${seatIndex}`} className={`absolute ${seatClass} flex flex-col items-center z-20 transition-all duration-700`}>
        <PlayerBadge 
          player={p || { nickname: 'VACÍO', chips: null, connected: true }} 
          isActive={p && room.state.turnPlayerId === p.id} 
          isMe={false} 
          isDealer={p && room.state.dealerId === p.id}
          points={undefined} /* Opponents don't show points, only for self */
          turnOrder={p?.turnOrder}
          isWaiting={p?.isWaiting}
          isAllIn={p?.isAllIn}
        />
        {/* Opponent's Cards: visible on mobile only during SORTEO_MANO, otherwise lg+ only */}
        {p ? (
          <div className={`${phase === 'SORTEO_MANO' ? 'flex' : 'hidden lg:flex'} justify-center mt-0.5 md:mt-2 z-0 scale-50 lg:scale-60 landscape:scale-50 lg:landscape:scale-60 origin-top`}>
            {isRevealPhase && opponentVisibleCards.length > 0
              ? opponentVisibleCards.map((cardStr: string, idx: number, arr: any[]) => {
                  const middle = (arr.length - 1) / 2;
                  const angle = (idx - middle) * 10;
                  const playerIdx = getPlayerIndex(p.id);
                  const dealDelay = phase === 'SORTEO_MANO' ? (playerIdx * 0.4) + (idx * 2) : (playerIdx * 0.4) + (idx * 0.2);
                  const transX = isLeftSide ? 30 : -30;
                  
                  return (
                    <m.div 
                      key={`${p.id}-${cardStr}-${idx}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: p.isFolded ? 0.3 : 1, scale: p.isFolded ? 0.85 : 1 }}
                      transition={{ delay: 0.45, duration: 0.3 }}
                      style={{ 
                        transform: `translateX(${transX}px) rotate(${angle}deg)`,
                        transformOrigin: 'top center',
                        marginRight: idx !== arr.length - 1 ? '-35px' : '0px',
                        zIndex: idx,
                        transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                      className={p.isFolded ? 'pointer-events-none grayscale' : 'drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]'}
                    >
                      <Card 
                        suit={cardStr.split('-')[1] as any} 
                        value={parseInt(cardStr.split('-')[0])} 
                        delay={dealDelay}
                        isHidden={false}
                        originY={200}
                        priority={true}
                      />
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
                    const middle = (opponentCardCount - 1) / 2;
                    const angle = (idx - middle) * 10;
                    const transX = isLeftSide ? 30 : -30;
                    
                    return (
                      <m.div 
                        key={`${p.id}-back-${idx}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.45, duration: 0.3 }}
                        style={{ 
                          transform: `translateX(${transX}px) rotate(${angle}deg)`,
                          transformOrigin: 'top center',
                          marginRight: idx !== opponentCardCount - 1 ? '-35px' : '0px',
                          zIndex: idx,
                          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                        className="drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]"
                      >
                        <Card 
                          isHidden={true}
                          originY={200}
                          priority={true}
                        />
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
    <div className="relative w-full h-full bg-[#073926] flex items-center justify-center overflow-hidden font-sans border-t-4 border-[#0a2e1b]">
      {/* Table Surface - Elegant Green Felt with Texture */}
      <div className="absolute inset-0 bg-[#073b24] opacity-100" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-40 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-[5%] border-[12px] border-black/10 rounded-[50%] blur-sm pointer-events-none" />
      
      {/* Decorative center ellipse */}
      <div className="absolute w-[85vw] h-[55vh] border-[1px] border-white/5 rounded-[50%] pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.3)]" />

      <GameAnnouncer phase={phase} />

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
              <span className="text-red-200 text-[10px] md:text-xs font-bold uppercase tracking-wider">
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
                initial={{ width: 0 }}
                animate={{ width: 100 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" 
              />

              <h1 className="text-4xl md:text-7xl font-serif font-black italic uppercase tracking-[0.25em] text-center leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] px-4">
                <span className="block bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] bg-clip-text text-transparent pb-2">
                  Primera rebirada
                </span>
                <span className="block text-[#fdf0a6] text-xl md:text-3xl tracking-[0.4em] font-light mt-2 opacity-80">
                  los 4 ases
                </span>
              </h1>

              {/* Decorative line bottom */}
              <m.div 
                initial={{ width: 0 }}
                animate={{ width: 100 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" 
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
      {/* TABLE CENTER - Refined side-by-side layout */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none mb-12 lg:mb-20">
        
        <div className="flex flex-row items-center gap-2 md:gap-10 pointer-events-auto px-2 md:px-8 py-2 md:py-4 rounded-3xl">
          
          {/* Column 1: Stacked Pots */}
          <div className="flex flex-col gap-1.5 md:gap-2 shrink-0">
            {/* Pozo Principal */}
            <div className="flex flex-col items-center bg-[#0a180e]/95 px-2.5 md:px-6 py-1 md:py-2 rounded-xl border border-[#d4af37]/30 backdrop-blur-md shadow-lg min-w-[85px] md:min-w-[160px]">
              <span className="text-[#fdf0a6] text-[6px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 opacity-60">Pozo Principal</span>
              <span className="text-[#4ade80] font-mono font-black text-xs md:text-xl">{formatCurrency(pot)}</span>
            </div>
            
            {/* Pote del Pique - solo visible cuando > 0 */}
            {piquePot > 0 && (
            <div className="flex flex-col items-center bg-[#0a180e]/95 px-2.5 md:px-6 py-1 md:py-2 rounded-xl border border-[#d4af37]/30 backdrop-blur-md shadow-lg min-w-[85px] md:min-w-[160px]">
              <span className="text-[#fdf0a6] text-[6px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 opacity-60">Pote del Pique</span>
              <span className="text-[#4ade80] font-mono font-black text-xs md:text-xl">{formatCurrency(piquePot)}</span>
            </div>
            )}
          </div>

          {/* Column 2: Central Deck (Mazo) + bottom card tucked under */}
          <div className="flex flex-col items-center gap-0">
            <div id="deck-center" className="relative shrink-0">
               {/* Deck stack effect */}
               <div className="w-7 h-10 md:w-16 md:h-24 bg-[#0a0a0a] rounded-lg absolute translate-x-1 translate-y-1 md:translate-x-1.5 md:translate-y-1.5 shadow-[2px_2px_15px_rgba(0,0,0,0.9)]" />
               <div className="w-7 h-10 md:w-16 md:h-24 bg-[#1a1a1a] rounded-lg absolute translate-x-0.5 translate-y-0.5 md:translate-x-1 md:translate-y-1" />
               
               {/* Top Card */}
               <div className="w-7 h-10 md:w-16 md:h-24 rounded-lg overflow-hidden border-[2px] border-[#d4af37]/40 bg-[url('/images/card-back-rooster.png')] bg-cover bg-center relative z-10">
                  <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] pointer-events-none rounded-lg" />
                  <div className="absolute inset-0 border border-white/10 rounded-lg pointer-events-none" />
               </div>

               {/* Bottom card — slides out to the right of the deck */}
               {room.state.bottomCard && (
                 <div className="absolute top-1/2 -translate-y-1/2 left-[70%] z-[5] w-7 h-10 md:w-16 md:h-24 rounded-lg overflow-hidden border border-[#d4af37]/30 shadow-[0_4px_16px_rgba(0,0,0,0.7)] rotate-[8deg]">
                   <img
                     src={`/cards/${room.state.bottomCard.split('-')[0].padStart(2, '0')}-${({'O':'oros','C':'copas','E':'espadas','B':'bastos'} as Record<string,string>)[room.state.bottomCard.split('-')[1]] || room.state.bottomCard.split('-')[1]?.toLowerCase()}.png?v=3`}
                     alt=""
                     className="w-full h-full object-cover"
                   />
                   <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.4)] pointer-events-none rounded-lg" />
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      {/* UNIFIED PLAYER DASHBOARD - Split Left / Center / Right */}
      <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none">
        
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
                  {isMyTurn && (phase === 'PIQUE' || phase === 'APUESTA_4_CARTAS' || phase === 'GUERRA' || phase === 'CANTICOS') && (
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
                      />
                    </m.div>
                  )}
                </AnimatePresence>

                {/* HUD: Saldo & Puntos */}
                <div id={`seat-${myId}`} className={`
                  flex flex-row items-center gap-4 md:gap-4 px-4 py-1 md:py-1.5 min-w-[340px] md:min-w-0
                  bg-[#0a180e]/95 rounded-tr-2xl border-t border-r border-[#d4af37]/30 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.6)]
                  ${isMyTurn ? 'bg-[#4ade80]/5' : ''}
                `}>
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] text-[#fdf0a6] uppercase tracking-[0.15em] font-black opacity-60 leading-none mb-1">Saldo</span>
                    <span className="text-[#4ade80] font-mono font-black text-xs md:text-lg leading-none">{formatCurrency(me.chips || 0)}</span>
                  </div>
                  
                  {myCards && (
                    <div className="flex flex-row items-center gap-3">
                      <div className="w-px h-6 bg-white/10" />
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] md:text-[9px] text-[#fdf0a6] uppercase tracking-[0.15em] font-black opacity-60 leading-none mb-1">Puntos</span>
                        <span className="text-[#d4af37] font-mono font-black text-sm md:text-xl leading-none">
                          {evaluateHand(myCards).points + (room.state.dealerId === myId ? 1 : 0)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Dealer Tag */}
                  {room.state.dealerId === myId && (
                     <div className="ml-1 bg-[#d4af37] text-black text-[7px] md:text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-tighter">Mano</div>
                  )}
                  {room.state.dealerId !== myId && (me?.turnOrder ?? 0) > 1 && (
                     <div className="ml-1 bg-[#0d2e1b] text-[#d4af37] border border-[#d4af37]/50 text-[7px] md:text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-tighter">{me.turnOrder}ª</div>
                  )}
                  {me.isAllIn && (
                     <div className="ml-1 bg-amber-900/80 text-amber-300 border border-amber-500/60 text-[7px] md:text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-tighter">Resto</div>
                  )}
                </div>
              </div>

              {/* 🃏 CENTER: My Cards (reduced 30% for mobile landscape) */}
              <div className="flex-1 flex justify-center items-end pointer-events-auto min-w-0" style={{ transform: 'translateX(-2rem)' }}>
                <div className="relative h-20 md:h-44 w-full max-w-[350px] md:max-w-[500px] mb-0.5 md:mb-2">
                  <div className="relative w-full h-full flex justify-center items-end">
                    {myCards && myCards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
                        const isSelected = selectedCards.includes(cardStr);
                        const middle = (arr.length - 1) / 2;
                        const angle = (idx - middle) * 8; 
                        const offsetX = (idx - middle) * (typeof window !== 'undefined' && window.innerWidth < 1000 ? 38 : 70); 
                        
                        const isDescarteTurn = phase === 'DESCARTE' && room.state.turnPlayerId === myId;
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
                               left: `calc(50% + ${offsetX}px)`,
                               bottom: 0,
                               transform: `translate(-50%, ${isSelected ? -45 : 0}px) scale(${isSelected ? 0.85 : 0.77}) rotate(${angle}deg)`,
                               transformOrigin: 'bottom center',
                               zIndex: isSelected ? 50 + idx : idx,
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
                  handType={myCards ? evaluateHand(myCards).type : undefined}
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
                />
              </div>
            </div>
            )}
          </>
        )}
      </div>

      {/* SHOWDOWN / Pique Showdown Cinematic Overlay */}
      <AnimatePresence>
        {(phase === 'SHOWDOWN' || (phase === 'CANTAR_JUEGO' && (room.state.showdownTimer ?? 0) > 0)) && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-60"
          >
            <ShowdownCinematic
              players={players}
              timer={room.state.showdownTimer ?? 10}
              pot={phase === 'SHOWDOWN' ? pot : 0}
              piquePot={piquePot}
              dealerId={room.state.dealerId}
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
              <div className="text-white font-mono font-black text-4xl md:text-6xl tabular-nums mb-2">{room.state.showdownTimer ?? 5}</div>
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
              <div className="text-white font-mono font-black text-3xl tabular-nums">{room.state.showdownTimer ?? 5}</div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Global Card Animations Overlay */}
      <AnimationLayer />
    </div>
  )
}
