"use client"

import { Room } from '@colyseus/sdk'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayerBadge } from './PlayerBadge'
import { ActionControls } from './ActionControls'
import { GameAnnouncer } from './GameAnnouncer'
import { Card } from './Card'
import { RechargeButton } from './RechargeButton'
import { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

interface BoardProps {
  room: Room | null;
  phase: string;
  pot: number;
  players: any[];
}

export function Board({ room, phase, pot, players }: BoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  
  if (!room) return null;

  const myId = room.sessionId; // Reverted to original as the provided change was syntactically incorrect and likely unintended.
  
  const hasChivo = (cardsStr: string) => {
    if (!cardsStr) return false;
    const cards = cardsStr.split(',').filter(Boolean);
    if (cards.length < 3) return false;
    
    const suits = ['oros', 'copas', 'espadas', 'bastos'];
    for (const suit of suits) {
      if (
        cards.includes(`01-${suit}`) &&
        cards.includes(`06-${suit}`) &&
        cards.includes(`07-${suit}`)
      ) return true;
    }
    return false;
  }; // Corrected syntax: removed trailing `= players.find(...)`
  
  const me = players.find(p => p.id === myId);
  const opponents = players.filter(p => p.id !== myId);
  const getPlayerIndex = (id: string) => players.findIndex(p => p.id === id);

  // Split opponents for circular layout (Left, Top, Right max 5 in total)
  const leftOpponents: any[] = [];
  const topOpponents: any[] = [];
  const rightOpponents: any[] = [];

  if (opponents.length === 1) { 
    topOpponents.push(opponents[0]); 
  } else if (opponents.length === 2) { 
    leftOpponents.push(opponents[0]); 
    rightOpponents.push(opponents[1]); 
  } else if (opponents.length === 3) { 
    leftOpponents.push(opponents[0]); 
    topOpponents.push(opponents[1]); 
    rightOpponents.push(opponents[2]); 
  } else if (opponents.length === 4) { 
    leftOpponents.push(opponents[0], opponents[1]); 
    rightOpponents.push(opponents[2], opponents[3]); 
  } else if (opponents.length >= 5) { 
    leftOpponents.push(opponents[0], opponents[1]); 
    topOpponents.push(opponents[2]); 
    rightOpponents.push(opponents[3], opponents[4]); 
  }

  const renderOpponent = (p: any, position: 'top' | 'left' | 'right') => {
    const hideOpponentCards = phase !== 'SORTEO_MANO' && phase !== 'SHOWDOWN';
    return (
      <div key={p.id} className={`flex flex-col items-center gap-1 md:gap-4 relative ${position === 'left' ? 'md:ml-4' : position === 'right' ? 'md:mr-4' : ''}`}>
        <PlayerBadge 
          player={p} 
          isActive={room.state.turnPlayerId === p.id} 
          isMe={false} 
          isDealer={room.state.dealerId === p.id}
        />
        {/* Opponent's Cards */}
        <div className="flex justify-center -mt-8 md:-mt-10 z-0 scale-[0.6] md:scale-100 origin-top">
          {p.cards && p.cards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
             const [val, suit] = cardStr.split('-');
             const middle = (arr.length - 1) / 2;
             const angle = (idx - middle) * 10;
             const isFolded = p.isFolded;
             const playerIdx = getPlayerIndex(p.id);
             const dealDelay = phase === 'SORTEO_MANO' ? (playerIdx * 0.4) + (idx * 2) : (playerIdx * 0.4) + (idx * 0.2);
             
             return (
               <div 
                 key={idx}
                 style={{ 
                   transform: isFolded ? `translateY(12vh) scale(0.4) rotate(${(idx * 15) - 30}deg)` : `rotate(${angle}deg) scale(0.6)`,
                   transformOrigin: 'top center',
                   marginRight: idx !== arr.length - 1 ? '-20px' : '0px',
                   zIndex: idx,
                   transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s'
                 }}
                 className={isFolded ? 'opacity-20 pointer-events-none' : 'opacity-100'}
               >
                 <Card 
                   suit={suit as any} 
                   value={parseInt(val)} 
                   delay={dealDelay}
                   isHidden={hideOpponentCards}
                   originY={200}
                 />
               </div>
             )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-[#042f1f] flex items-center justify-center overflow-hidden shadow-inner font-sans">
      {/* ORIENTATION WARNING: Only visible on mobile in portrait */}
      <div className="fixed inset-0 z-[1000] bg-[#070b14] flex flex-col items-center justify-center p-8 text-center md:hidden portrait:flex landscape:hidden">
        <motion.div
          animate={{ rotate: 90 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20"
        >
          <RotateCcw className="w-16 h-16 text-emerald-500" />
        </motion.div>
        <h2 className="text-3xl font-black text-white mb-4 italic italic">GIRA TU DISPOSITIVO</h2>
        <p className="text-[#a8b2d1] text-lg leading-relaxed max-w-xs">
          Para jugar en <span className="text-emerald-400 font-bold uppercase tracking-wider">Mesa Primera</span>, necesitas usar tu pantalla en horizontal.
        </p>
      </div>

      {/* RECHARGE BUTTON: (Floating Top-Right for quick access) */}
      <div className="absolute top-4 right-4 z-50 md:top-6 md:right-32">
        <RechargeButton />
      </div>

      {/* Casino Spotight Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0a5236] via-[#042f1f] to-[#021810]" />

      <GameAnnouncer phase={phase} />

      {/* OPPONENTS AREA (Pushed to Edges) */}
      {/* TOP */}
      {topOpponents.length > 0 && (
        <div className="absolute top-4 md:top-6 left-1/2 transform -translate-x-1/2 flex justify-center gap-12 md:gap-48 z-10 w-full px-4">
          {topOpponents.map(p => renderOpponent(p, 'top'))}
        </div>
      )}
      
      {/* LEFT */}
      {leftOpponents.length > 0 && (
        <div className="absolute left-2 md:left-6 top-1/4 md:top-1/3 transform -translate-y-1/2 flex flex-col justify-between gap-16 md:gap-32 z-10">
          {leftOpponents.map(p => renderOpponent(p, 'left'))}
        </div>
      )}

      {/* RIGHT */}
      {rightOpponents.length > 0 && (
        <div className="absolute right-2 md:right-6 top-1/4 md:top-1/3 transform -translate-y-1/2 flex flex-col justify-between gap-16 md:gap-32 z-10">
          {rightOpponents.map(p => renderOpponent(p, 'right'))}
        </div>
      )}

      <AnimatePresence>
        {phase === 'SORTEO_MANO' && room.state.dealerId && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center"
          >
            <div className="bg-gradient-to-b from-[#d4af37] to-[#a17822] px-8 py-3 rounded-xl border-2 border-[#fff7d6] shadow-[0_0_40px_rgba(212,175,55,0.6)]">
              <span className="text-black font-black text-xl md:text-3xl uppercase tracking-widest drop-shadow-md">
                ¡Tenemos La Mano!
              </span>
            </div>
            <div className="mt-2 text-[#fff7d6] font-bold text-sm md:text-base drop-shadow-md tracking-wider bg-black/60 px-4 py-1 rounded-full border border-[#a17822]/50">
               Iniciando ronda oficial...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLE CENTER (Pots & Deck area) */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        
        {/* Pot Indicators Block (Match design specs) */}
        <div className="flex flex-row items-center justify-center gap-12 md:gap-32 pointer-events-auto">
          
          {/* Pique Pot (Left) */}
          <div className="flex flex-col items-center">
            <span className="text-[#4ade80] tracking-widest text-[9px] md:text-[11px] font-bold uppercase mb-1 drop-shadow-sm">Pote del Pique</span>
            <div className="flex items-center justify-center relative w-12 h-10 mb-1 z-10 scale-90 md:scale-100">
               {/* Chips */}
              <div className="absolute left-0 w-7 h-7 rounded-full border-[3px] border-dashed border-white/50 bg-[#1d4ed8] shadow-[0_4px_8px_rgba(0,0,0,0.5)] z-10" />
              <div className="absolute left-4 w-7 h-7 rounded-full border-[3px] border-dashed border-white/50 bg-[#16a34a] shadow-[0_4px_8px_rgba(0,0,0,0.5)] z-20" />
            </div>
            <div className="bg-black/60 border border-white/10 px-4 py-1 rounded shadow-md">
              <h2 className="text-sm md:text-xl font-bold text-white tracking-widest drop-shadow-md">
                $15.000
              </h2>
            </div>
          </div>

          {/* Main Pot (Right) */}
          <div className="flex flex-col items-center">
            <span className="text-[#4ade80] tracking-widest text-[9px] md:text-[11px] font-bold uppercase mb-1 drop-shadow-sm">Main Pot</span>
            <div className="bg-black/60 border border-white/10 px-4 py-1 rounded shadow-md relative z-10">
              <h2 className="text-sm md:text-xl font-bold text-white tracking-widest drop-shadow-md">
                ${pot.toLocaleString()}
              </h2>
            </div>
          </div>

        </div>

        {/* Phase Indicator */}
        <div className="mt-2 flex justify-center pointer-events-none">
            <span className="text-white/60 text-[8px] md:text-[9px] font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-sm">
              {phase.replace('_', ' ')}
            </span>
        </div>

         {/* Deck area and label (Below pots) */}
         <div className="mt-8 relative flex flex-col items-center justify-center pointer-events-auto">
             <motion.div 
               animate={
                 (phase === 'SORTEO_MANO' || phase === 'PIQUE') 
                   ? { y: [0, -4, 0], rotate: [-2, -2, -2] } 
                   : { y: 0, rotate: 0 }
               }
               transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
               onClick={() => {
                  if (phase === 'DESCARTE' && room.state.turnPlayerId === myId) {
                     if (navigator.vibrate) navigator.vibrate(50);
                     room.send('action', { action: 'discard', droppedCards: selectedCards });
                     setSelectedCards([]);
                  }
               }}
               className={`w-14 h-20 md:w-20 md:h-28 bg-[#991b1b] border-2 border-[#b91c1c] rounded-md md:rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex items-center justify-center relative transition-all z-20 ${phase === 'DESCARTE' && room.state.turnPlayerId === myId ? 'cursor-pointer hover:-translate-y-2 shadow-[0_0_20px_rgba(74,222,128,0.6)]' : ''}`}
             >
               <div className="absolute inset-1 md:inset-1.5 border border-[#ef4444]/40 rounded-sm flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                  <span className="text-[#fca5a5] font-playfair font-black text-3xl md:text-5xl opacity-60">P</span>
               </div>
               
               <AnimatePresence>
                 {phase === 'DESCARTE' && room.state.turnPlayerId === myId && (
                   <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1, y: [-4, 4, -4] }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                      className="absolute -top-12 text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.8)] filter"
                   >
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 md:w-10 md:h-10 fill-current/20">
                       <path d="M18 11V6a2 2 0 0 0-4 0v4" />
                       <path d="M14 10V4a2 2 0 0 0-4 0v6" />
                       <path d="M10 10.5V3a2 2 0 0 0-4 0v9" />
                       <path d="M6 12v-1a2 2 0 0 0-4 0v6c0 4.4 3.6 8 8 8h3c4 0 7-3.6 7-8v-2a2 2 0 0 0-4 0v2" />
                     </svg>
                   </motion.div>
                 )}
               </AnimatePresence>
             </motion.div>
             <span className="text-white/50 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-2 px-4 py-1 bg-black/40 rounded-sm">
                Mazo 28 Cartas <br /> (Solo AS-7, Depletado)
             </span>
         </div>
      </div>
      {/* PLAYER AREA (Bottom center-ish) */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 md:translate-x-0 md:left-24 lg:left-32 z-30 flex items-end gap-4 md:gap-8 w-full md:w-auto px-2 justify-center md:justify-start">
        
        {me && (
          <>
            {/* My Badge */}
            <div className="z-20 flex flex-col items-center relative mb-4 md:mb-8">
              {hasChivo(me.cards) && phase !== 'RESOLUCION' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute -top-10 md:-top-16 bg-gradient-to-r from-amber-600/90 to-amber-500/90 border-[3px] border-amber-300/50 text-white font-black px-4 py-2 md:py-3 rounded-full text-xs md:text-lg whitespace-nowrap shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse z-50 flex items-center gap-2"
                >
                  <span className="text-lg md:text-2xl">🐐</span> ¡CHIVO!
                </motion.div>
              )}
              <PlayerBadge 
                player={me} 
                isActive={room.state.turnPlayerId === me.id} 
                isMe={true}
                isDealer={room.state.dealerId === myId}
                vertical={false}
              />
            </div>

            {/* Desktop Horizontal Cards */}
            <div className="relative z-10 hidden md:flex flex-col items-stretch ml-4 mb-2 lg:mb-4">
              {/* HUD Labels */}
              <div className="flex justify-between w-full mb-2 bg-black/40 px-3 py-1 rounded-sm border border-white/10 blur-0">
                 <span className="text-white/60 font-bold text-xs uppercase tracking-wider">HUD Points:</span>
                 <span className="text-white/60 font-bold text-xs uppercase tracking-wider">Puntos Automat: 70</span>
              </div>
              <div className="flex items-end gap-2 md:gap-3 lg:gap-4 justify-center">
                {me.cards && me.cards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
                   const [val, suit] = cardStr.split('-');
                   
                   const isSelected = selectedCards.includes(cardStr);
                   const finalOffsetY = isSelected ? -30 : 0;
                   const angle = (Math.random() * 2 - 1) * 2; 
                   
                   const isDescarteTurn = phase === 'DESCARTE' && room.state.turnPlayerId === myId;
                   const handleCardClick = () => {
                     if (!isDescarteTurn) return;
                     setSelectedCards(prev => 
                       prev.includes(cardStr) ? prev.filter(c => c !== cardStr) : [...prev, cardStr]
                     );
                   };

                   const playerIdx = getPlayerIndex(myId);
                   const dealDelay = phase === 'SORTEO_MANO' ? (playerIdx * 0.4) + (idx * 2) : (playerIdx * 0.4) + (idx * 0.2);

                   const isFolded = me.isFolded;

                   return (
                     <div 
                       key={cardStr + '-' + idx}
                       onClick={handleCardClick}
                       style={{ 
                         transform: isFolded ? `translateY(40px) scale(0.6) rotate(${angle}deg)` : `rotate(${angle}deg) translateY(${finalOffsetY}px)`,
                         transformOrigin: 'bottom center',
                         zIndex: idx,
                         transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                       }}
                       className={`relative ${isFolded ? 'opacity-20 pointer-events-none' : `transition-transform duration-300 ${isDescarteTurn ? 'cursor-pointer hover:-translate-y-4' : ''}`}`}
                     >
                       <Card 
                         suit={suit as any} 
                         value={parseInt(val)} 
                         delay={dealDelay}
                         className="shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                         originY={-200}
                       />
                     </div>
                   )
                })}
              </div>
            </div>
            
            {/* Mobile horizontal cards fallback (smaller, overlapped) */}
            <div className="flex md:hidden relative z-10 w-[140px] h-[100px] ml-1">
               {me.cards && me.cards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
                 const [val, suit] = cardStr.split('-');
                 const isSelected = selectedCards.includes(cardStr);
                 const finalOffsetY = isSelected ? -15 : 0;
                 const angle = (idx - (arr.length-1)/2) * 5;
                 
                 const isDescarteTurn = phase === 'DESCARTE' && room.state.turnPlayerId === myId;
                 const handleCardClick = () => {
                   if (!isDescarteTurn) return;
                   setSelectedCards(prev => 
                     prev.includes(cardStr) ? prev.filter(c => c !== cardStr) : [...prev, cardStr]
                   );
                 };

                 const isFolded = me.isFolded;

                 return (
                   <div 
                     key={cardStr + '-' + idx}
                     onClick={handleCardClick}
                     style={{ 
                       position: 'absolute',
                       left: `${idx * 25}px`,
                       transform: isFolded ? `translateY(20px) scale(0.6)` : `rotate(${angle}deg) translateY(${finalOffsetY}px) scale(0.65)`,
                       transformOrigin: 'bottom left',
                       zIndex: idx,
                       transition: 'transform 0.4s'
                     }}
                     className={`${isFolded ? 'opacity-20 pointer-events-none' : ''}`}
                   >
                     <Card suit={suit as any} value={parseInt(val)} originY={-200} />
                   </div>
                 )
              })}
            </div>

          </>
        )}
      </div>

      {/* Action Controls Overlay (Absolute bottom right) */}
      <ActionControls 
        room={room} 
        phase={phase} 
        isMyTurn={room.state.turnPlayerId === myId} 
        playerChips={me?.chips || 0}
        selectedCards={selectedCards}
        onClearSelection={() => setSelectedCards([])}
      />

    </div>
  )
}
