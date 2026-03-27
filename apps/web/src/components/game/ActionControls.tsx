"use client"

import { m, AnimatePresence } from 'framer-motion'
import { Room } from '@colyseus/sdk'
import { useState } from 'react'
import { Mic, Headphones } from 'lucide-react'

interface ActionControlsProps {
  room: Room;
  phase: string;
  isMyTurn: boolean;
  selectedCards?: string[];
  onClearSelection?: () => void;
}

const EMPTY_CARDS: string[] = [];

export function ActionControls({ room, phase, isMyTurn, selectedCards = EMPTY_CARDS, onClearSelection }: ActionControlsProps) {
  if (!isMyTurn) return null;

  const handleExecute = (action: string, droppedCards?: string[]) => {
    if (navigator.vibrate) navigator.vibrate(50);
    room.send('action', { action, amount: undefined, droppedCards });
    onClearSelection?.();
  };

  return (
    <AnimatePresence>
  return (
    <AnimatePresence>
      <m.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-row items-center gap-2 md:gap-4 z-[60] pointer-events-auto shrink-0"
      >

        {/* FASE: DESCARTE */}
        {phase === 'DESCARTE' ? (
          <div className="flex flex-row items-center gap-2 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-[#e2b044]/30 shadow-xl">
            <span className="hidden md:block text-[#e2b044] text-[10px] font-bold uppercase tracking-widest px-2">
              {room.state.currentMaxBet > 0 ? 'Responder' : (selectedCards.length > 0 ? 'Descartar' : 'Pedir')}
            </span>
            <button 
              onClick={() => handleExecute(room.state.currentMaxBet > 0 ? 'paso' : 'discard', selectedCards)}
              className={`
                px-6 h-10 md:h-12 rounded-xl font-black text-white text-xs md:text-sm shadow-lg hover:-translate-y-0.5 active:translate-y-1 transition-all uppercase tracking-wider
                ${room.state.currentMaxBet > 0 
                  ? 'bg-gradient-to-br from-[#f87171] to-[#dc2626] border-b-2 border-[#7f1d1d]'
                  : (selectedCards.length > 0 
                    ? 'bg-gradient-to-br from-[#e74c3c] to-[#c0392b] border-b-2 border-[#962d22]' 
                    : 'bg-gradient-to-br from-[#2980b9] to-[#1c5980] border-b-2 border-[#154360]')
                }
              `}
            >
              {room.state.currentMaxBet > 0 ? 'Fallecer' : (selectedCards.length > 0 ? `Botar ${selectedCards.length}` : 'Pasar')}
            </button>
          </div>
        ) : null}

        {/* Main Action Buttons Side-by-Side */}
        {(phase === 'PIQUE' || phase === 'GUERRA') ? (
          <div className="flex flex-row items-center gap-1.5 md:gap-3 p-0.5">
              <AnimatePresence mode="wait">
                {phase === 'GUERRA' || phase === 'PIQUE' ? (
                  <m.button 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={() => handleExecute('cantar')} 
                    className="h-10 md:h-12 px-4 md:px-8 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[#2a1b04] rounded-xl font-serif font-black text-xs md:text-base shadow-lg border-b-[3px] border-b-[#5c4613] hover:-translate-y-0.5 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Cantar!
                  </m.button>
                ) : null}
              </AnimatePresence>

              <button 
                onClick={() => handleExecute(phase === 'PIQUE' ? 'paso' : 'fold')} 
                className="h-10 md:h-12 px-4 md:px-8 bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white rounded-xl font-black text-xs md:text-base shadow-lg border-b-[3px] border-b-[#7f1d1d] hover:-translate-y-0.5 transition-all uppercase tracking-widest"
              >
                Paso
              </button>
          </div>
        ) : null}
      </m.div>
    </AnimatePresence>
    </AnimatePresence>
  )
}
