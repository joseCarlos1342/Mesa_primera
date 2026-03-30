"use client"

import { Room } from '@colyseus/sdk'
import { getAvatarSvg } from '@/utils/avatars'
import { evaluateHand } from '@/utils/handEvaluation'
import { formatCurrency } from '@/utils/format'
import { m, AnimatePresence } from 'framer-motion'
import { PlayerBadge } from './PlayerBadge'
import { ActionControls } from './ActionControls'
import { GameAnnouncer } from './GameAnnouncer'
import { Card } from './Card'
import { RechargeButton } from './RechargeButton'
import { ShowdownCinematic } from './ShowdownCinematic'
import { useState, useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
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
}

export function Board({ room, phase, pot, piquePot, players, myCards = "" }: BoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [chipCounts, setChipCounts] = useState<Record<number, number>>({});
  const [adminWatching, setAdminWatching] = useState(false);

  const totalBet = Object.entries(chipCounts).reduce((sum, [denom, count]) => sum + Number(denom) * count, 0);

  const addChip = (val: number) => {
    if ((me?.chips || 0) < totalBet + val) return;
    setChipCounts(prev => ({ ...prev, [val]: (prev[val] || 0) + 1 }));
  };
  const removeChip = (val: number) => {
    setChipCounts(prev => {
      const newCount = (prev[val] || 0) - 1;
      if (newCount <= 0) { const { [val]: _removed, ...rest } = prev; return rest; }
      return { ...prev, [val]: newCount };
    });
  };

  // Intro shows only during the STARTING phase (server-controlled timing)
  const showIntro = phase === 'STARTING';
  
  if (!room) return null;

  const myId = room.sessionId;
  const currentPhase = room.state.phase; // Renamed to avoid shadowing prop 'phase'
  const isMyTurn = room.state.turnPlayerId === myId;
  
  const me = players.find(p => p.id === myId);
  const getPlayerIndex = (id: string) => players.findIndex(p => p.id === id);

  // Define 6 fixed elliptical seat positions for opponents (slots for 7 players total)
  // - On Mobile Landscape (landscape without md/lg): All 6 avatars align at the top edge
  // - On Desktop/Tablet: Placed higher and closer to the far edges of the screen
  const opponentSeats = [
    // Seat 1: Far Left (Moved up)
    "top-[35%] left-[2%] landscape:top-[4%] landscape:left-[2%] md:landscape:top-[30%] md:landscape:left-[2%] lg:top-[25%] lg:left-[3%]",
    // Seat 2: Top-Left (Moved up)
    "top-[10%] left-[12%] landscape:top-[2%] landscape:left-[21%] md:landscape:top-[8%] md:landscape:left-[10%] lg:top-[4%] lg:left-[15%]",
    // Seat 3: Top-Center-Left (Moved to the very top edge)
    "top-[2%] left-[32%] landscape:top-[2%] landscape:left-[40%] md:landscape:top-[2%] md:landscape:left-[30%] lg:top-[2%] lg:left-[34%]",
    // Seat 4: Top-Center-Right (Moved to the very top edge)
    "top-[2%] right-[32%] landscape:top-[2%] landscape:right-[40%] md:landscape:top-[2%] md:landscape:right-[30%] lg:top-[2%] lg:right-[34%]",
    // Seat 5: Top-Right (Moved up)
    "top-[10%] right-[12%] landscape:top-[2%] landscape:right-[21%] md:landscape:top-[8%] md:landscape:right-[10%] lg:top-[4%] lg:right-[15%]",
    // Seat 6: Far Right (Moved up)
    "top-[35%] right-[2%] landscape:top-[4%] landscape:right-[2%] md:landscape:top-[30%] md:landscape:right-[2%] lg:top-[25%] lg:right-[3%]"
  ];

  // We show 7 slots regardless of player count
  const allSlots = Array.from({ length: 7 });
  // Find my index in the 0-6 range to place others relative to me
  const mySlotIdx = 0; // In this UI logic, 'me' is always at the bottom, and others rotate around

  const prevPlayersRef = useRef<any[]>([]);
  const prevMyCardsRef = useRef<string>("");

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
  }, [players, myCards]);

  // Listen for admin spectator presence
  useEffect(() => {
    if (!room) return;
    const handler = (msg: { active: boolean }) => setAdminWatching(msg.active);
    room.onMessage("admin:status", handler);
  }, [room]);

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
        />
        {/* Opponent's Cards / Placeholder */}
        {p ? (
          <div className={`flex justify-center mt-1 md:mt-2 z-0 scale-[0.22] md:scale-60 landscape:scale-[0.18] md:landscape:scale-60 origin-top`}>
            {isRevealPhase && opponentVisibleCards.length > 0
              ? opponentVisibleCards.map((cardStr: string, idx: number, arr: any[]) => {
                  const middle = (arr.length - 1) / 2;
                  const angle = (idx - middle) * 10;
                  const playerIdx = getPlayerIndex(p.id);
                  const dealDelay = phase === 'SORTEO_MANO' ? (playerIdx * 0.4) + (idx * 2) : (playerIdx * 0.4) + (idx * 0.2);
                  let transX = isLeftSide ? 30 : -30;
                  
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
                    let transX = isLeftSide ? 30 : -30;
                    
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

      {/* ORIENTATION WARNING */}
      <div className="fixed inset-0 z-[1000] bg-[#073926] flex flex-col items-center justify-center p-8 text-center md:hidden portrait:flex landscape:hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 mix-blend-multiply pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#d4af37]/8 blur-[120px] rounded-full pointer-events-none" />
        
        <m.div
          animate={{ rotate: 90 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 mb-8 w-24 h-24 flex items-center justify-center bg-[#0a180e]/80 rounded-3xl border border-[#d4af37]/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
        >
          <RotateCcw className="w-14 h-14 text-[#d4af37]" />
        </m.div>
        <h2 className="relative z-10 text-3xl font-black text-[#fdf0a6] mb-3 italic uppercase tracking-wider">Gira tu Dispositivo</h2>
        <div className="relative z-10 h-px w-24 bg-[#d4af37]/30 mb-4" />
        <p className="relative z-10 text-[#8faa96] text-base leading-relaxed max-w-xs">
          Para jugar en <span className="text-[#d4af37] font-bold uppercase tracking-wider">Mesa Primera</span>, necesitas usar tu pantalla en horizontal.
        </p>
      </div>

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
        
        <div className="flex flex-row items-center gap-4 md:gap-10 pointer-events-auto px-4 md:px-8 py-4 rounded-3xl">
          
          {/* Column 1: Stacked Pots */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Pozo Principal */}
            <div className="flex flex-col items-center bg-[#0a180e]/95 px-4 md:px-6 py-1.5 md:py-2 rounded-xl border border-[#d4af37]/30 backdrop-blur-md shadow-lg min-w-[120px] md:min-w-[160px]">
              <span className="text-[#fdf0a6] text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 opacity-60">Pozo Principal</span>
              <span className="text-[#4ade80] font-mono font-black text-sm md:text-xl">{formatCurrency(pot)}</span>
            </div>
            
            {/* Pote del Pique - solo visible cuando > 0 */}
            {piquePot > 0 && (
            <div className="flex flex-col items-center bg-[#0a180e]/95 px-4 md:px-6 py-1.5 md:py-2 rounded-xl border border-[#d4af37]/30 backdrop-blur-md shadow-lg min-w-[120px] md:min-w-[160px]">
              <span className="text-[#fdf0a6] text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 opacity-60">Pote del Pique</span>
              <span className="text-[#4ade80] font-mono font-black text-sm md:text-xl">{formatCurrency(piquePot)}</span>
            </div>
            )}
          </div>

          {/* Column 2: Central Deck (Mazo) + bottom card tucked under */}
          <div className="flex flex-col items-center gap-0">
            <div id="deck-center" className="relative shrink-0">
               {/* Deck stack effect */}
               <div className="w-10 h-14 md:w-16 md:h-24 bg-[#0a0a0a] rounded-lg absolute translate-x-1 translate-y-1 md:translate-x-1.5 md:translate-y-1.5 shadow-[2px_2px_15px_rgba(0,0,0,0.9)]" />
               <div className="w-10 h-14 md:w-16 md:h-24 bg-[#1a1a1a] rounded-lg absolute translate-x-0.5 translate-y-0.5 md:translate-x-1 md:translate-y-1" />
               
               {/* Top Card */}
               <div className="w-10 h-14 md:w-16 md:h-24 rounded-lg overflow-hidden border-[2px] border-[#d4af37]/40 bg-[url('/images/card-back-rooster.png')] bg-cover bg-center relative z-10">
                  <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] pointer-events-none rounded-lg" />
                  <div className="absolute inset-0 border border-white/10 rounded-lg pointer-events-none" />
               </div>

               {/* Bottom card — slides out to the right of the deck */}
               {room.state.bottomCard && (
                 <div className="absolute top-1/2 -translate-y-1/2 left-[70%] z-[5] w-10 h-14 md:w-16 md:h-24 rounded-lg overflow-hidden border border-[#d4af37]/30 shadow-[0_4px_16px_rgba(0,0,0,0.7)] rotate-[8deg]">
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
      {/* UNIFIED PLAYER DASHBOARD - Sticky Bottom & More Compact */}
      <div className="fixed bottom-0 left-0 w-full flex flex-col items-center z-50 pointer-events-none px-0 box-border gap-0 shrink-0">
        
        {me && (
          <>
            {/* Waiting indicator for spectators who joined mid-game */}
            {me.isWaiting && (
              <div className="flex flex-col items-center gap-2 mb-4 pointer-events-auto">
                <div className="bg-[#0a180e]/90 border border-dashed border-[#c0a060]/40 rounded-2xl px-6 py-3 backdrop-blur-md">
                  <p className="text-[#c0a060] text-xs md:text-sm font-bold uppercase tracking-widest animate-pulse">
                    Esperando próxima partida...
                  </p>
                </div>
              </div>
            )}

            {/* 🃏 MY CARDS - Fan positioned strictly above the dashboard bar */}
            {!me.isWaiting && (
            <div className="relative h-28 md:h-44 w-full max-w-[500px] mb-1 md:mb-2 pointer-events-auto">
              <div className="relative w-full h-full flex justify-center items-end">
                {myCards && myCards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
                    const isSelected = selectedCards.includes(cardStr);
                    const middle = (arr.length - 1) / 2;
                    const angle = (idx - middle) * 8; 
                    const offsetX = (idx - middle) * (typeof window !== 'undefined' && window.innerWidth < 1000 ? 35 : 70); 
                    
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
                           transform: `translate(-50%, ${isSelected ? -65 : 0}px) scale(${isSelected ? 1.22 : 1.1}) rotate(${angle}deg)`,
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
                           className={`${isSelected ? 'border-2 border-[#d4af37] ring-2 ring-[#d4af37]/80 ring-offset-1 ring-offset-black' : 'border border-white/20'}`}
                         />
                       </m.div>
                     )
                })}
              </div>
            </div>
            )}

            {/* 🕹️ CONSOLIDATED CONTROLS BAR - Smaller & Stick to Bottom */}
            {!me.isWaiting && (
            <div className="flex flex-row items-center gap-2 md:gap-4 bg-[#0a180e]/95 p-1 md:p-1.5 rounded-t-2xl border-x border-t border-[#d4af37]/30 backdrop-blur-xl shadow-[0_-15px_40px_rgba(0,0,0,0.8)] pointer-events-auto max-w-full md:max-w-none overflow-x-auto no-scrollbar">
              
              {/* HUD: Saldo & Puntos */}
              <div id={`seat-${myId}`} className={`
                flex flex-row items-center gap-2 md:gap-4 px-2 py-0.5 rounded-xl border-r border-white/10 shrink-0
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
              </div>

              {/* CHIPS: Only show in betting phases and on my turn */}
              <AnimatePresence>
                {isMyTurn && (phase === 'PIQUE' || phase === 'APUESTA_4_CARTAS' || phase === 'GUERRA' || phase === 'CANTICOS') && (
                  <m.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="flex flex-row items-center gap-1.5 shrink-0 px-2 border-r border-white/10"
                  >
                    <div className="flex flex-row gap-1">
                      {[100000, 200000, 500000, 1000000, 2000000, 5000000].map(val => {
                        const count = chipCounts[val] || 0;
                        const canAfford = (me.chips || 0) >= totalBet + val;
                        const visualVal = val / 100;
                        let colorClass = "bg-white text-black border-gray-300";
                        if (val === 200000) colorClass = "bg-[#e53935] text-white border-red-800";
                        if (val === 500000) colorClass = "bg-[#43a047] text-white border-green-800";
                        if (val === 1000000) colorClass = "bg-[#1e88e5] text-white border-blue-800";
                        if (val === 2000000) colorClass = "bg-[#212121] text-white border-black";
                        if (val === 5000000) colorClass = "bg-[#fbc02d] text-black border-yellow-700";
                        
                        return (
                          <div key={val} className="flex flex-col items-center gap-0.5">
                            {count > 0 ? (
                              <button onClick={() => removeChip(val)}
                                className="w-5 h-4 md:w-6 md:h-5 flex items-center justify-center text-[#f87171] text-xs font-black hover:text-red-300 transition-colors bg-black/40 rounded-sm leading-none">−</button>
                            ) : <div className="h-4 md:h-5" />}
                            <button disabled={!canAfford} onClick={() => addChip(val)}
                              className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[7px] md:text-[9px] border-[1.5px] border-dashed transition-all ${colorClass} ${canAfford ? (count > 0 ? 'ring-2 ring-white scale-110 -translate-y-1 shadow-lg' : 'hover:-translate-y-0.5') : 'opacity-20 shadow-none'}`}>
                              {visualVal >= 1000 ? `${visualVal/1000}k` : visualVal}
                            </button>
                            {count > 0 ? (
                              <span className="text-[#fdf0a6] font-black text-[9px] leading-none">×{count}</span>
                            ) : <div className="h-3" />}
                          </div>
                        );
                      })}
                    </div>
                    {totalBet > 0 && (
                      <div className="flex flex-col items-center gap-1 ml-1">
                        <span className="text-[#4ade80] font-mono font-black text-[9px] leading-none">${(totalBet / 100).toLocaleString()}</span>
                        <button 
                          onClick={() => { 
                            room.send('action', { action: 'voy', amount: totalBet }); 
                            setChipCounts({});
                          }}
                          className="h-8 md:h-10 px-3 md:px-4 bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-white rounded-lg font-black shadow-lg uppercase tracking-tight text-[10px] md:text-sm border-b-[3px] border-green-700">
                          IR!
                        </button>
                        <button
                          onClick={() => setChipCounts({})}
                          className="text-[#f87171] text-[8px] font-bold hover:text-red-300 transition-colors uppercase tracking-tight leading-none">
                          ✕ limpiar
                        </button>
                      </div>
                    )}

                  </m.div>
                )}
              </AnimatePresence>

              {/* ACTION BUTTONS (Cantar/Paso) */}
              <div className="flex shrink-0">
                <ActionControls 
                  room={room} 
                  phase={phase} 
                  isMyTurn={isMyTurn} 
                  selectedCards={selectedCards}
                  onClearSelection={() => setSelectedCards([])}
                  handType={myCards ? evaluateHand(myCards).type : undefined}
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
