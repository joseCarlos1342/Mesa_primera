"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Room } from '@colyseus/sdk'
import { useState } from 'react'
import { Mic, Headphones } from 'lucide-react'

interface ActionControlsProps {
  room: Room;
  phase: string;
  isMyTurn: boolean;
  playerChips: number;
  selectedCards?: string[];
  onClearSelection?: () => void;
}

const EMPTY_CARDS: string[] = [];

export function ActionControls({ room, phase, isMyTurn, playerChips, selectedCards = EMPTY_CARDS, onClearSelection }: ActionControlsProps) {
  const CHIP_VALUES = [1000, 2000, 5000, 10000, 20000, 50000];
  const [selectedChip, setSelectedChip] = useState<number | null>(null);

  if (!isMyTurn) return null;

  const handleExecute = (action: string, droppedCards?: string[]) => {
    if (navigator.vibrate) navigator.vibrate(50);
    room.send('action', { action, amount: selectedChip || undefined, droppedCards });
    setSelectedChip(null);
    onClearSelection?.();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="absolute bottom-4 right-4 md:bottom-12 md:right-12 flex flex-col items-end gap-3 z-[60] pointer-events-auto"
      >

        {/* FASE: DESCARTE */}
        {phase === 'DESCARTE' && (
          <div className="flex flex-col items-center gap-2 bg-black/90 backdrop-blur-xl p-4 md:p-6 rounded-3xl border border-[#e2b044]/40 shadow-2xl w-full md:w-auto">
            <span className="text-[#e2b044] text-sm md:text-base font-bold uppercase tracking-widest text-center">
              {selectedCards.length > 0 ? 'Fichas a botar' : 'Toca cartas para descartar'}
            </span>
            <button 
              onClick={() => handleExecute('discard', selectedCards)}
              className={`
                w-full md:w-72 h-16 rounded-full font-black text-white text-lg shadow-lg hover:-translate-y-1 active:translate-y-2 transition-transform
                ${selectedCards.length > 0 
                  ? 'bg-gradient-to-br from-[#e74c3c] to-[#c0392b] border border-[#ff5252]/40' 
                  : 'bg-gradient-to-br from-[#2980b9] to-[#1c5980] border border-[#3498db]/40'}
              `}
            >
              {selectedCards.length > 0 ? `Botar ${selectedCards.length} y Pedir` : 'Mantener Juego (0)'}
            </button>
          </div>
        )}

        {/* FASE: PIQUE o GUERRA */}
        {/* FASE: PIQUE o GUERRA */}
        {/* FASE: PIQUE o GUERRA */}
        {(phase === 'PIQUE' || phase === 'GUERRA') && (
          <div className="flex flex-col items-end gap-3 p-2 w-full md:w-auto">
            
            {/* Chips Area (Horizontal Row floating above) */}
            <div className="flex flex-col items-end w-full md:w-auto mb-2">
              <div className="flex overflow-x-auto w-full md:w-auto items-center justify-end gap-2 pb-2 px-1 snap-x no-scrollbar">
                {CHIP_VALUES.map(val => {
                  const canAfford = playerChips >= val;
                  const isSelected = selectedChip === val;
                  
                  let colorClass = "bg-white text-black border-gray-300"; // 1k
                  let ringColor = "ring-white/50";
                  if (val === 2000) { colorClass = "bg-[#e53935] text-white border-red-800"; ringColor = "ring-red-500/50"; } // 2k
                  if (val === 5000) { colorClass = "bg-[#43a047] text-white border-green-800"; ringColor = "ring-green-500/50"; } // 5k
                  if (val === 10000) { colorClass = "bg-[#1e88e5] text-white border-blue-800"; ringColor = "ring-blue-500/50"; } // 10k
                  if (val === 20000) { colorClass = "bg-[#212121] text-white border-black"; ringColor = "ring-black/50"; } // 20k
                  if (val === 50000) { colorClass = "bg-[#fbc02d] text-black border-yellow-700"; ringColor = "ring-yellow-500/50"; } // 50k

                  return (
                    <button
                      key={val}
                      disabled={!canAfford}
                      onClick={() => setSelectedChip(isSelected ? null : val)}
                      className={`
                        flex-shrink-0 w-12 h-12 md:w-16 md:h-16 landscape:w-10 landscape:h-10 lg:landscape:w-16 lg:landscape:h-16 rounded-full flex items-center justify-center snap-center relative
                        font-black tracking-tighter shadow-xl transition-all border-[4px] border-dashed
                        ${colorClass}
                        ${canAfford 
                            ? `${isSelected ? `ring-[4px] ${ringColor} scale-110 -translate-y-2 shadow-[0_10px_20px_rgba(0,0,0,0.6)]` : 'hover:-translate-y-1'}` 
                            : 'opacity-30 cursor-not-allowed'}
                      `}
                    >
                      <div className="absolute inset-0 border-[3px] border-black/10 rounded-full pointer-events-none" />
                      <span className="relative z-10 text-xs md:text-sm drop-shadow-sm pb-px">
                        ${val >= 1000 ? `${val/1000}k` : val}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Action Buttons Grid */}
            <div className="flex flex-col gap-4 w-64 md:w-80 p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-[0_15px_30px_rgba(0,0,0,0.8)] landscape:w-56 landscape:p-2 landscape:gap-2">
              {/* CANTAR JUGADA Button (Huge Gold) */}
              <AnimatePresence mode="wait">
                {(selectedChip || phase === 'GUERRA') ? (
                  <motion.button 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={() => handleExecute(phase === 'PIQUE' ? 'voy' : 'bet')} 
                    className="w-full h-16 md:h-20 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] hover:from-[#fff7d6] hover:via-[#e2c161] hover:to-[#a17822] text-[#2a1b04] rounded-xl font-serif font-black text-xl md:text-2xl shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_2px_5px_rgba(255,255,255,0.8)] hover:-translate-y-1 transition-all uppercase tracking-widest border border-[#fff7d6]/80 border-b-[8px] border-b-[#5c4613] flex items-center justify-center gap-2"
                    style={{ textShadow: '0 1px 1px rgba(255,255,255,0.5)' }}
                  >
                    <Mic className="w-6 h-6 md:w-7 md:h-7 drop-shadow-md" />
                    CANTAR JUGADA!
                    {selectedChip && phase !== 'GUERRA' && (
                      <span className="text-sm border-l border-[#2a1b04]/50 pl-2 ml-1 opacity-80 font-mono">
                        +${selectedChip >= 1000 ? selectedChip/1000 + 'k' : selectedChip}
                      </span>
                    )}
                  </motion.button>
                ) : (
                  <button 
                    disabled
                    className="w-full h-16 md:h-20 bg-gradient-to-b from-[#8a6d1c]/40 via-[#5c4613]/40 to-[#2a1b04]/40 text-[#fdf0a6]/30 rounded-xl font-serif font-black text-xl md:text-2xl border border-white/10 flex items-center justify-center gap-2 cursor-not-allowed opacity-60 uppercase tracking-widest border-b-[6px] border-b-[#1a1103]"
                  >
                     <Mic className="w-6 h-6 md:w-7 md:h-7 opacity-50" />
                     CANTAR JUGADA!
                  </button>
                )}
              </AnimatePresence>

              {/* VOY / PASO split */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {/* VOY Button (Green) */}
                <button 
                  onClick={() => handleExecute(phase === 'PIQUE' ? 'voy' : 'bet')} 
                  className="h-14 md:h-16 bg-gradient-to-b from-[#4ade80] to-[#16a34a] hover:from-[#86efac] hover:to-[#15803d] text-white rounded-xl font-black text-lg md:text-xl shadow-[0_8px_15px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all uppercase tracking-widest border border-[#86efac]/50 border-b-[6px] border-b-[#064e3b]"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                >
                  Voy
                </button>
                
                {/* PASO Button (Red) */}
                <button 
                  onClick={() => handleExecute(phase === 'PIQUE' ? 'paso' : 'fold')} 
                  className="h-14 md:h-16 bg-gradient-to-b from-[#f87171] to-[#dc2626] hover:from-[#fca5a5] hover:to-[#b91c1c] text-white rounded-xl font-black text-lg md:text-xl shadow-[0_8px_15px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all uppercase tracking-widest border border-[#fca5a5]/50 border-b-[6px] border-b-[#7f1d1d]"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                >
                  Paso
                </button>
              </div>
              
              {/* Soporte Button (Beige) */}
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
                className="w-full h-12 md:h-14 mt-2 bg-gradient-to-b from-[#fef3c7] to-[#fcd34d] hover:from-[#fffbeb] hover:to-[#fde68a] text-[#78350f] rounded-xl font-bold text-sm md:text-base shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.8)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 border border-[#fef3c7] border-b-[5px] border-b-[#b45309]"
              >
                 <Headphones className="w-4 h-4 md:w-5 md:h-5" />
                 Soporte
              </button>

            </div>
          </div>
        )}      </motion.div>
    </AnimatePresence>
  )
}
