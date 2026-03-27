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
import { useState, useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { AnimationLayer } from './AnimationLayer'

interface BoardProps {
  room: Room | null;
  phase: string;
  pot: number;
  piquePot: number;
  players: any[];
}

export function Board({ room, phase, pot, piquePot, players }: BoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Hide intro after 5 seconds automatically
    const timer = setTimeout(() => setShowIntro(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  
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

  useEffect(() => {
    players.forEach(p => {
      // Don't track empty/dummy players
      if (!p || !p.id) return;

      const prevP = prevPlayersRef.current.find(old => old.id === p.id);
      const oldCards = prevP && prevP.cards ? prevP.cards.split(',').filter(Boolean) : [];
      const newCards = p.cards ? p.cards.split(',').filter(Boolean) : [];

      const added = newCards.filter((c: string) => !oldCards.includes(c));
      const removed = oldCards.filter((c: string) => !newCards.includes(c));

      if (added.length > 0) {
        window.dispatchEvent(new CustomEvent('animate-deal', { detail: { 
          toPlayerId: p.id, 
          cards: added,
          isFaceUp: currentPhase === 'SORTEO_MANO' || currentPhase === 'SHOWDOWN'
        }}));
      }
      if (removed.length > 0) {
        window.dispatchEvent(new CustomEvent('animate-discard', { detail: { fromPlayerId: p.id, cards: removed }}));
      }
    });

    // Save copy of current state
    prevPlayersRef.current = players.map(p => ({ ...p }));
  }, [players]);

  const renderPlayerAtSeat = (p: any, seatIndex: number) => {
    const hideOpponentCards = phase !== 'SORTEO_MANO' && phase !== 'SHOWDOWN';
    const seatClass = opponentSeats[seatIndex];
    
    // Determine card fan direction based on seat
    const isLeftSide = seatIndex < 3;
    
    return (
      <div id={`seat-${p?.id || `empty-${seatIndex}`}`} key={p?.id || `empty-${seatIndex}`} className={`absolute ${seatClass} flex flex-col items-center z-20 transition-all duration-700`}>
        <PlayerBadge 
          player={p || { nickname: 'VACÍO', chips: null, connected: true }} 
          isActive={p && room.state.turnPlayerId === p.id} 
          isMe={false} 
          isDealer={p && room.state.dealerId === p.id}
          points={undefined} /* Opponents don't show points, only for self */
        />
        {/* Opponent's Cards / Placeholder */}
        {p ? (
          <div className={`flex justify-center mt-1 md:mt-2 z-0 scale-[0.22] md:scale-60 landscape:scale-[0.18] md:landscape:scale-60 origin-top`}>
            {p.cards ? p.cards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
               const middle = (arr.length - 1) / 2;
               const angle = (idx - middle) * 10;
               const playerIdx = getPlayerIndex(p.id);
               const dealDelay = phase === 'SORTEO_MANO' ? (playerIdx * 0.4) + (idx * 2) : (playerIdx * 0.4) + (idx * 0.2);
               
               let transX = isLeftSide ? 30 : -30;
               
               return (
                 <m.div 
                   key={`${p.id}-${cardStr}-${idx}`}
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: p.isFolded ? 0.2 : 1, scale: 1 }}
                   transition={{ delay: 0.45, duration: 0.3 }}
                   style={{ 
                     transform: p.isFolded ? `translateY(10vh) scale(0.4) rotate(${(idx * 15) - 30}deg)` : `translateX(${transX}px) rotate(${angle}deg)`,
                     transformOrigin: 'top center',
                     marginRight: idx !== arr.length - 1 ? '-35px' : '0px',
                     zIndex: idx,
                     transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                   }}
                   className={p.isFolded ? 'pointer-events-none' : 'drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]'}
                 >
                   <Card 
                     suit={cardStr.split('-')[1] as any} 
                     value={parseInt(cardStr.split('-')[0])} 
                     delay={dealDelay}
                     isHidden={hideOpponentCards}
                     originY={200}
                    priority={true}
                   />
                 </m.div>
               )
            }) : null}
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
      <div className="fixed inset-0 z-[1000] bg-[#070b14] flex flex-col items-center justify-center p-8 text-center md:hidden portrait:flex landscape:hidden">
        <m.div
          animate={{ rotate: 90 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20"
        >
          <RotateCcw className="w-16 h-16 text-emerald-500" />
        </m.div>
        <h2 className="text-3xl font-black text-white mb-4 italic">GIRA TU DISPOSITIVO</h2>
        <p className="text-[#a8b2d1] text-lg leading-relaxed max-w-xs">
          Para jugar en <span className="text-emerald-400 font-bold uppercase tracking-wider">Mesa Primera</span>, necesitas usar tu pantalla en horizontal.
        </p>
      </div>

      <GameAnnouncer phase={phase} />

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
            
            {/* Pote del Pique */}
            <div className="flex flex-col items-center bg-[#0a180e]/95 px-4 md:px-6 py-1.5 md:py-2 rounded-xl border border-[#d4af37]/30 backdrop-blur-md shadow-lg min-w-[120px] md:min-w-[160px]">
              <span className="text-[#fdf0a6] text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 opacity-60">Pote del Pique</span>
              <span className="text-[#4ade80] font-mono font-black text-sm md:text-xl">{formatCurrency(piquePot)}</span>
            </div>
          </div>

          {/* Column 2: Central Deck (Mazo) */}
          <div id="deck-center" className="relative group cursor-pointer hover:drop-shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all shrink-0">
             {/* Deck stack effect */}
             <div className="w-10 h-14 md:w-16 md:h-24 bg-[#0a0a0a] rounded-lg absolute translate-x-1 translate-y-1 md:translate-x-1.5 md:translate-y-1.5 shadow-[2px_2px_15px_rgba(0,0,0,0.9)]" />
             <div className="w-10 h-14 md:w-16 md:h-24 bg-[#1a1a1a] rounded-lg absolute translate-x-0.5 translate-y-0.5 md:translate-x-1 md:translate-y-1" />
             
             {/* Top Card */}
             <div className="w-10 h-14 md:w-16 md:h-24 rounded-lg overflow-hidden transition-transform group-hover:-translate-y-2 border-[2px] border-[#d4af37]/40 bg-[url('/images/card-back-rooster.png')] bg-cover bg-center relative z-10">
                <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] pointer-events-none rounded-lg" />
                <div className="absolute inset-0 border border-white/10 rounded-lg pointer-events-none" />
             </div>
          </div>
        </div>
      </div>
      {/* UNIFIED PLAYER DASHBOARD - Sticky Bottom & More Compact */}
      <div className="fixed bottom-0 left-0 w-full flex flex-col items-center z-50 pointer-events-none px-0 box-border gap-0 shrink-0">
        
        {me && (
          <>
            {/* 🃏 MY CARDS - Fan positioned strictly above the dashboard bar */}
            <div className="relative h-28 md:h-44 w-full max-w-[500px] mb-1 md:mb-2 pointer-events-auto">
              <div className="relative w-full h-full flex justify-center items-end">
                {me.cards && me.cards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
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
                           transform: `translate(-50%, ${isSelected ? -40 : 0}px) scale(${isSelected ? 1.15 : 1.1}) rotate(${angle}deg)`,
                           transformOrigin: 'bottom center',
                           zIndex: idx,
                           transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                         }}
                         className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] ${isDescarteTurn ? 'cursor-pointer' : ''}`}
                       >
                         <Card 
                           suit={cardStr.split('-')[1] as any} 
                           value={parseInt(cardStr.split('-')[0])} 
                           isHidden={false}
                           priority={true}
                           className="border border-white/20"
                         />
                       </m.div>
                     )
                })}
              </div>
            </div>

            {/* 🕹️ CONSOLIDATED CONTROLS BAR - Smaller & Stick to Bottom */}
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
                
                {me.cards && (
                  <div className="flex flex-row items-center gap-3">
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] md:text-[9px] text-[#fdf0a6] uppercase tracking-[0.15em] font-black opacity-60 leading-none mb-1">Puntos</span>
                      <span className="text-[#d4af37] font-mono font-black text-sm md:text-xl leading-none">
                        {evaluateHand(me.cards).points}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Dealer Tag */}
                {room.state.dealerId === myId && (
                   <div className="ml-1 bg-[#d4af37] text-black text-[7px] md:text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-tighter">Mano</div>
                )}
              </div>

              {/* CHIPS: Only show if it matches turn and betting/discard phase */}
              <AnimatePresence>
                {isMyTurn && (phase === 'PIQUE' || phase === 'GUERRA' || phase === 'DESCARTE') && (
                  <m.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="flex flex-row items-center gap-1.5 shrink-0 px-2 border-r border-white/10"
                  >
                    <div className="flex flex-row gap-1">
                      {[100000, 200000, 500000, 1000000, 2000000, 5000000].map(val => {
                        const canAfford = (me.chips || 0) >= val;
                        const isSelected = selectedChip === val;
                        const visualVal = val / 100;
                        let colorClass = "bg-white text-black border-gray-300";
                        if (val === 200000) colorClass = "bg-[#e53935] text-white border-red-800";
                        if (val === 500000) colorClass = "bg-[#43a047] text-white border-green-800";
                        if (val === 1000000) colorClass = "bg-[#1e88e5] text-white border-blue-800";
                        if (val === 2000000) colorClass = "bg-[#212121] text-white border-black";
                        if (val === 5000000) colorClass = "bg-[#fbc02d] text-black border-yellow-700";
                        
                        return (
                          <button key={val} disabled={!canAfford} onClick={() => setSelectedChip(isSelected ? null : val)}
                            className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[7px] md:text-[9px] border-[1.5px] border-dashed transition-all ${colorClass} ${canAfford ? (isSelected ? 'ring-1 ring-white scale-110 -translate-y-1' : 'hover:-translate-y-0.5') : 'opacity-20 shadow-none'}`}>
                            {visualVal >= 1000 ? `${visualVal/1000}k` : visualVal}
                          </button>
                        );
                      })}
                    </div>
                    {selectedChip && (
                      <button 
                        onClick={() => { 
                          if (phase === 'DESCARTE') {
                             room.send('action', { action: 'discard', amount: selectedChip, droppedCards: selectedCards });
                             setSelectedCards([]);
                          } else {
                             room.send('action', { action: phase === 'PIQUE' ? 'voy' : 'bet', amount: selectedChip }); 
                          }
                          setSelectedChip(null); 
                        }}
                        className="h-10 md:h-12 px-4 bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-white rounded-lg font-black shadow-lg uppercase tracking-tight text-[10px] md:text-sm border-b-[3px] border-green-700 ml-1">
                        IR!
                      </button>
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
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Global Card Animations Overlay */}
      <AnimationLayer />
    </div>
  )
}
