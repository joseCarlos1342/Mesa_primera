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

  const myId = room.sessionId;
  
  const me = players.find(p => p.id === myId);
  const getPlayerIndex = (id: string) => players.findIndex(p => p.id === id);

  // Define 6 fixed elliptical seat positions for opponents (slots for 7 players total)
  const opponentSeats = [
    "top-[50%] left-[8%] landscape:top-[50%] landscape:left-[4%] lg:landscape:left-[8%]",   // Seat 1: Left
    "top-[28%] left-[18%] landscape:top-[12%] landscape:left-[15%] lg:landscape:top-[28%] lg:landscape:left-[18%]",  // Seat 2: Top-Left
    "top-[18%] left-[34%] landscape:top-[4%] landscape:left-[35%] lg:landscape:top-[18%] lg:landscape:left-[34%]",  // Seat 3: Top-Mid-Left
    "top-[18%] right-[34%] landscape:top-[4%] landscape:right-[35%] lg:landscape:top-[18%] lg:landscape:right-[34%]", // Seat 4: Top-Mid-Right
    "top-[28%] right-[18%] landscape:top-[12%] landscape:right-[15%] lg:landscape:top-[28%] lg:landscape:right-[18%]", // Seat 5: Top-Right
    "top-[50%] right-[8%] landscape:top-[50%] landscape:right-[4%] lg:landscape:right-[8%]"   // Seat 6: Right
  ];

  // We show 7 slots regardless of player count
  const allSlots = Array.from({ length: 7 });
  // Find my index in the 0-6 range to place others relative to me
  const mySlotIdx = 0; // In this UI logic, 'me' is always at the bottom, and others rotate around

  const renderPlayerAtSeat = (p: any, seatIndex: number) => {
    const hideOpponentCards = phase !== 'SORTEO_MANO' && phase !== 'SHOWDOWN';
    const seatClass = opponentSeats[seatIndex];
    
    // Determine card fan direction based on seat
    const isLeftSide = seatIndex < 3;
    
    return (
      <div key={p?.id || `empty-${seatIndex}`} className={`absolute ${seatClass} flex flex-col items-center z-20 transition-all duration-700`}>
        <PlayerBadge 
          player={p || { nickname: 'VACÍO', chips: null, connected: true }} 
          isActive={p && room.state.turnPlayerId === p.id} 
          isMe={false} 
          isDealer={p && room.state.dealerId === p.id}
        />
        {/* Opponent's Cards / Placeholder */}
        {p && (
          <div className={`flex justify-center -mt-6 md:-mt-10 z-0 scale-[0.22] md:scale-60 landscape:scale-[0.18] md:landscape:scale-60 origin-top`}>
            {p.cards && p.cards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
               const middle = (arr.length - 1) / 2;
               const angle = (idx - middle) * 10;
               const playerIdx = getPlayerIndex(p.id);
               const dealDelay = phase === 'SORTEO_MANO' ? (playerIdx * 0.4) + (idx * 2) : (playerIdx * 0.4) + (idx * 0.2);
               
               let transX = isLeftSide ? 30 : -30;
               
               return (
                 <div 
                   key={idx}
                   style={{ 
                     transform: p.isFolded ? `translateY(10vh) scale(0.4) rotate(${(idx * 15) - 30}deg)` : `translateX(${transX}px) rotate(${angle}deg)`,
                     transformOrigin: 'top center',
                     marginRight: idx !== arr.length - 1 ? '-35px' : '0px',
                     zIndex: idx,
                     transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s'
                   }}
                   className={p.isFolded ? 'opacity-20 pointer-events-none' : 'opacity-100 drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]'}
                 >
                   <Card 
                     suit={cardStr.split('-')[1] as any} 
                     value={parseInt(cardStr.split('-')[0])} 
                     delay={dealDelay}
                     isHidden={hideOpponentCards}
                     originY={200}
                   />
                 </div>
               )
            })}
          </div>
        )}
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
        <motion.div
          animate={{ rotate: 90 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20"
        >
          <RotateCcw className="w-16 h-16 text-emerald-500" />
        </motion.div>
        <h2 className="text-3xl font-black text-white mb-4 italic">GIRA TU DISPOSITIVO</h2>
        <p className="text-[#a8b2d1] text-lg leading-relaxed max-w-xs">
          Para jugar en <span className="text-emerald-400 font-bold uppercase tracking-wider">Mesa Primera</span>, necesitas usar tu pantalla en horizontal.
        </p>
      </div>

      <GameAnnouncer phase={phase} />

      {/* OPPONENTS AREA */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* We map 6 slots for opponents */}
        {Array.from({ length: 6 }).map((_, slotIdx) => {
          // Simplistic assignment: just fill left to right
          const opponent = opponents[slotIdx];
          return renderPlayerAtSeat(opponent, slotIdx);
        })}
      </div>

      {/* TABLE CENTER */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none mt-4">
        
        {/* Pot Indicators matching mockup */}
        <div className="flex flex-col items-center gap-1 md:gap-2 mb-2 md:mb-6 pointer-events-auto landscape:scale-[0.65] lg:landscape:scale-100 landscape:mt-8 lg:landscape:mt-0">
          <div className="flex items-center gap-8 md:gap-24 mb-1 md:mb-2">
             <div className="flex flex-col items-center">
                <span className="text-[#fdf0a6] text-[8px] md:text-xs font-bold uppercase tracking-widest mb-0.5 md:mb-1 drop-shadow-md">POZO PRINCIPAL:</span>
                <span className="text-[#4ade80] font-mono font-black text-sm md:text-2xl drop-shadow-md">${pot.toLocaleString().replace(/,/g, '.')}</span>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[#fdf0a6] text-[8px] md:text-xs font-bold uppercase tracking-widest mb-0.5 md:mb-1 drop-shadow-md">POTE DEL PIQUE:</span>
                <span className="text-[#4ade80] font-mono font-black text-sm md:text-2xl drop-shadow-md">$15.000</span>
             </div>
          </div>
          
          {/* Automatic Points Label */}
          <div className="bg-black/20 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
             <span className="text-[#fdf0a6]/60 text-[10px] md:text-xs font-bold uppercase tracking-wider">Puntos Automáticos: 70</span>
          </div>
        </div>

         {/* Center Cards area (Deck and Discard) */}
         <div className="relative flex items-center justify-center gap-4 md:gap-8 landscape:scale-[0.65] lg:landscape:scale-100 pointer-events-auto">
            {/* Draw Pile (Back) */}
            <div className="relative group cursor-pointer" onClick={() => {}}>
               <div className="w-12 h-18 md:w-20 md:h-28 bg-[#1a1103] rounded-lg absolute translate-x-1 translate-y-1 shadow-lg" />
               <div className="w-12 h-18 md:w-20 md:h-28 bg-[#991b1b] border border-[#b91c1c] rounded-lg shadow-xl flex items-center justify-center overflow-hidden transition-transform group-hover:-translate-y-1">
                  <div className="absolute inset-1.5 border border-[#ef4444]/20 rounded-sm flex items-center justify-center">
                     <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                     <span className="absolute text-[#fca5a5]/30 font-playfair font-black text-2xl md:text-4xl">P</span>
                  </div>
               </div>
            </div>

            {/* Public Card / Burn Pile (Revealed) */}
            <div className="w-12 h-18 md:w-20 md:h-28 bg-white border border-gray-300 rounded-lg shadow-xl p-1 md:p-1.5 flex flex-col items-center justify-center">
               <div className="flex flex-col items-center">
                  <span className="text-black font-black text-lg md:text-xl">7</span>
                  <div className="grid grid-cols-2 gap-0.5 md:gap-1 mt-0.5 md:mt-1">
                     <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500" />
                     <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500" />
                     <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500" />
                     <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500" />
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* MY PLAYER AREA */}
      <div className="absolute bottom-2 md:bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-4 md:gap-12 w-full max-w-5xl px-4 justify-center">
        {me && (
          <>
            <div className="shrink-0 mb-4 landscape:scale-75 lg:landscape:scale-100 origin-bottom-left">
              <PlayerBadge 
                player={me} 
                isActive={room.state.turnPlayerId === me.id} 
                isMe={true}
                isDealer={room.state.dealerId === myId}
              />
            </div>

            {/* My Cards - Closer to mockup fan */}
            <div className="relative flex items-end justify-center h-[80px] md:h-[180px] w-full md:w-[500px] landscape:h-[20vh] lg:landscape:h-[180px] mb-2 md:mb-4 origin-bottom overflow-visible">
              {me.cards && me.cards.split(',').filter(Boolean).map((cardStr: string, idx: number, arr: any[]) => {
                 const isSelected = selectedCards.includes(cardStr);
                 const middle = (arr.length - 1) / 2;
                 const angle = (idx - middle) * 8; 
                 const offsetX = (idx - middle) * (typeof window !== 'undefined' && window.innerWidth < 1000 ? (window.innerHeight < 500 ? 30 : 40) : 70); 
                 const baseOffsetY = Math.abs(idx - middle) * (typeof window !== 'undefined' && window.innerHeight < 500 ? 4 : 8);
                 
                 const isDescarteTurn = phase === 'DESCARTE' && room.state.turnPlayerId === myId;
                 const handleCardClick = () => {
                   if (!isDescarteTurn) return;
                   setSelectedCards(prev => 
                     prev.includes(cardStr) ? prev.filter(c => c !== cardStr) : [...prev, cardStr]
                   );
                 };
 
                 return (
                   <div 
                     key={cardStr + '-' + idx}
                     onClick={handleCardClick}
                     style={{ 
                       position: 'absolute',
                       left: `calc(50% + ${offsetX}px)`,
                       bottom: 0,
                       transform: `translate(-50%, ${baseOffsetY + (isSelected ? -20 : 0)}px) scale(${isSelected ? 1.2 : 1.1}) rotate(${angle}deg)`,
                       transformOrigin: 'bottom center',
                       zIndex: 10 + idx,
                       transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                     }}
                     className={`${isDescarteTurn ? 'cursor-pointer' : ''}`}
                   >
                     <Card 
                       suit={cardStr.split('-')[1] as any} 
                       value={parseInt(cardStr.split('-')[0])} 
                       originY={-100}
                       className="shadow-[0_10px_20px_rgba(0,0,0,0.8)] border border-white/10"
                     />
                   </div>
                 )
              })}
            </div>
          </>
        )}
      </div>

      {/* Action Controls */}
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
