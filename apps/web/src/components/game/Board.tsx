"use client"

import { Room } from '@colyseus/sdk'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayerBadge } from './PlayerBadge'
import { ActionControls } from './ActionControls'
import { GameAnnouncer } from './GameAnnouncer'
import { Card } from './Card'
import { useState } from 'react'

interface BoardProps {
  room: Room | null;
  phase: string;
  pot: number;
  players: any[];
}

export function Board({ room, phase, pot, players }: BoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  
  if (!room) return null;

  const myId = room.sessionId;
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
      <div key={p.id} className={`flex flex-col items-center gap-4 relative ${position === 'left' ? 'md:ml-4' : position === 'right' ? 'md:mr-4' : ''}`}>
        <PlayerBadge 
          player={p} 
          isActive={room.state.turnPlayerId === p.id} 
          isMe={false} 
        />
        {/* Opponent's Cards */}
        <div className="flex justify-center -mt-6 md:-mt-8 z-0">
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
    <div className="relative w-full h-full p-2 md:p-6 bg-[#0a0f18] flex items-center justify-center">
      
      {/* THE CASINO TABLE (Exact Match to User Reference) */}
      <div className="relative w-full h-full max-h-[95vh] bg-black rounded-[3rem] md:rounded-[4rem] border-[12px] md:border-[16px] border-[#5a3a22] shadow-2xl overflow-hidden">
      
        {/* Inner Gold border and subtle glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-2 border-[3px] border-[#a17822]/40 rounded-[2.5rem] md:rounded-[3.5rem]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        </div>

      <GameAnnouncer phase={phase} />

      {/* OPPONENTS AREA (Circular Absolute Layout) */}
      {/* TOP */}
      {topOpponents.length > 0 && (
        <div className="absolute top-4 md:top-10 left-1/2 transform -translate-x-1/2 flex justify-center gap-12 md:gap-32 z-10 w-full px-4">
          {topOpponents.map(p => renderOpponent(p, 'top'))}
        </div>
      )}
      
      {/* LEFT */}
      {leftOpponents.length > 0 && (
        <div className="absolute left-2 md:left-8 top-1/2 transform -translate-y-1/2 flex flex-col justify-between gap-16 md:gap-24 z-10">
          {leftOpponents.map(p => renderOpponent(p, 'left'))}
        </div>
      )}

      {/* RIGHT */}
      {rightOpponents.length > 0 && (
        <div className="absolute right-2 md:right-8 top-1/2 transform -translate-y-1/2 flex flex-col justify-between gap-16 md:gap-24 z-10">
          {rightOpponents.map(p => renderOpponent(p, 'right'))}
        </div>
      )}

      <AnimatePresence>
        {phase === 'SORTEO_MANO' && room.state.dealerId && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
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
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex gap-4 md:gap-16 items-center pointer-events-auto"
        >
          {/* Deck & Dealing Hands Area */}
          <div className="relative flex items-center justify-center pointer-events-auto">
             {/* Removed animated SVG hands as requested */}

             {/* Deck Representation */}
             <motion.div 
               animate={
                 (phase === 'SORTEO_MANO' || phase === 'PIQUE') 
                   ? { y: [0, -12, 0], rotate: [-5, -5, -5] } 
                   : { y: 0, rotate: -5 }
               }
               transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
               onClick={() => {
                  if (phase === 'DESCARTE' && room.state.turnPlayerId === myId) {
                     if (navigator.vibrate) navigator.vibrate(50);
                     room.send('action', { action: 'discard', droppedCards: selectedCards });
                     setSelectedCards([]);
                  }
               }}
               className={`w-14 h-20 md:w-16 md:h-24 bg-[#e0d6c0] border border-stone-400 rounded-md shadow-lg flex items-center justify-center relative transition-all z-20 ${phase === 'DESCARTE' && room.state.turnPlayerId === myId ? 'cursor-pointer hover:scale-110 shadow-[0_0_20px_rgba(74,222,128,0.6)]' : ''}`}
             >
               <div className="absolute inset-1 border border-[#a17822] rounded flex flex-col items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-80" />
               
               <AnimatePresence>
                 {phase === 'DESCARTE' && room.state.turnPlayerId === myId && (
                   <motion.div 
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1, y: [-4, 4, -4] }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                      className="absolute -top-10 text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.8)] filter"
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
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[#a17822] uppercase tracking-[0.2em] text-[10px] md:text-sm font-black pb-1 mb-2">
              Main Pot
            </span>
            <div className="bg-transparent border border-[#a17822]/40 rounded-lg px-6 py-2 md:px-10 md:py-4 shadow-inner">
               <h2 className="text-2xl md:text-4xl font-mono font-bold text-white tabular-nums drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                 ${pot.toLocaleString()}
               </h2>
            </div>
            
            <div className="mt-4 px-4 py-1 bg-[#a17822]/10 text-[#f2d06b] text-[9px] md:text-xs font-bold uppercase tracking-widest rounded-full border border-[#a17822]/40">
              Fase: {phase.replace('_', ' ')}
            </div>
          </div>
        </motion.div>
      </div>

      {/* PLAYER AREA (Bottom center) */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 z-30 w-full flex justify-center px-4">
        <div className="relative flex flex-col items-center justify-end w-full max-w-lg">
          
          {/* Action Controls Overlay (Absolute bottom right) */}
          <ActionControls 
            room={room} 
            phase={phase} 
            isMyTurn={room.state.turnPlayerId === myId} 
            playerChips={me?.chips || 0}
            selectedCards={selectedCards}
            onClearSelection={() => setSelectedCards([])}
          />

          {/* My Cards & Badge (Centered) */}
          {me && (
            <div className="relative flex items-end gap-0 md:gap-12">
              
              <div className="z-20 transform translate-y-4 md:translate-y-6">
                <PlayerBadge 
                  player={me} 
                  isActive={room.state.turnPlayerId === me.id} 
                  isMe={true} 
                />
              </div>

              {/* Spread cards */}
              <div className="relative z-10 flex ml-[-20px] md:ml-[0px]">
                {me.cards && me.cards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
                   const [val, suit] = cardStr.split('-');
                   // Fan out calculation
                   const middle = (arr.length - 1) / 2;
                   const angle = (idx - middle) * 8; // 8 degrees per card
                   
                   const isSelected = selectedCards.includes(cardStr);
                   const baseOffsetY = Math.abs(idx - middle) * 4;
                   // If selected, pop the card up by 40px
                   const finalOffsetY = isSelected ? baseOffsetY - 40 : baseOffsetY;
                   
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
                       key={idx}
                       onClick={handleCardClick}
                       style={{ 
                         transform: isFolded ? `translateY(-20vh) scale(0.4) rotate(${(idx * 15) - 30}deg)` : `rotate(${angle}deg) translateY(${finalOffsetY}px)`,
                         transformOrigin: 'bottom center',
                         marginRight: idx !== arr.length - 1 ? '-40px' : '0px',
                         zIndex: idx,
                         transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s'
                       }}
                       className={isFolded ? 'opacity-20 pointer-events-none' : `transition-transform duration-300 ${isDescarteTurn ? 'cursor-pointer hover:-translate-y-8' : 'hover:-translate-y-4'}`}
                     >
                       <Card 
                         suit={suit as any} 
                         value={parseInt(val)} 
                         delay={dealDelay}
                         className="" // removing the old -ml classes from Card component usage since we do it here
                         originY={-200}
                       />
                     </div>
                   )
                })}
              </div>
              
            </div>
          )}

        </div>
      </div>
    </div>
  </div>
  )
}
