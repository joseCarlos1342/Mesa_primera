"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Room } from '@colyseus/sdk'
import { useState } from 'react'

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
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="absolute bottom-[22vh] md:bottom-8 left-0 right-0 md:left-auto flex flex-col items-center md:items-end gap-2 md:gap-4 z-[60] py-2 pointer-events-auto px-1 md:px-2"
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
        {(phase === 'PIQUE' || phase === 'GUERRA') && (
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 p-2 w-full md:w-auto">
            
            {/* Chips Area (Horizontal Row) */}
            <div className="flex flex-col items-center w-full md:w-auto">
              {/* Note: The user reference doesn't have a label above chips, keeping it clean */}
              
              <div className="flex overflow-x-auto w-full md:w-auto items-center justify-center gap-2 md:gap-4 pb-2 md:pb-0 px-1 snap-x no-scrollbar">
                {CHIP_VALUES.map(val => {
                  const canAfford = playerChips >= val;
                  const isSelected = selectedChip === val;
                  
                  // Match colors from reference image
                  let colorClass = "bg-white text-black border-gray-300"; // 1k White
                  let ringColor = "ring-white/50";
                  if (val === 2000) { colorClass = "bg-[#e53935] text-white border-red-800"; ringColor = "ring-red-500/50"; } // 2k Red
                  if (val === 5000) { colorClass = "bg-[#43a047] text-white border-green-800"; ringColor = "ring-green-500/50"; } // 5k Green
                  if (val === 10000) { colorClass = "bg-[#1e88e5] text-white border-blue-800"; ringColor = "ring-blue-500/50"; } // 10k Blue
                  if (val === 20000) { colorClass = "bg-[#212121] text-white border-black"; ringColor = "ring-black/50"; } // 20k Black
                  if (val === 50000) { colorClass = "bg-[#fbc02d] text-black border-yellow-700"; ringColor = "ring-yellow-500/50"; } // 50k Yellow

                  return (
                    <button
                      key={val}
                      disabled={!canAfford}
                      onClick={() => setSelectedChip(isSelected ? null : val)}
                      className={`
                        flex-shrink-0 w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center snap-center relative
                        font-black tracking-tighter shadow-xl transition-all border-[6px] border-dashed
                        ${colorClass}
                        ${canAfford 
                            ? `${isSelected ? `ring-[8px] ${ringColor} scale-110 -translate-y-3 shadow-[0_20px_40px_rgba(0,0,0,0.6)]` : 'hover:-translate-y-2'}` 
                            : 'opacity-30 cursor-not-allowed'}
                      `}
                    >
                      {/* Inner solid border to make the dashed border look like a casino chip ring */}
                      <div className="absolute inset-0 border-4 border-black/10 rounded-full pointer-events-none" />
                      <span className="relative z-10 text-sm md:text-xl drop-shadow-sm pb-px">
                        ${val >= 1000 ? `${val/1000}k` : val}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row md:flex-row gap-3 md:gap-6 items-center w-full md:w-auto justify-center mt-2 md:mt-0">
              
              {/* Botón PASO (Rojo Grueso) */}
              <button 
                onClick={() => handleExecute(phase === 'PIQUE' ? 'paso' : 'fold')} 
                className="w-32 h-16 md:w-40 md:h-20 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-xl md:rounded-2xl font-black text-base md:text-2xl shadow-[0_8px_20px_rgba(231,76,60,0.4)] hover:-translate-y-1 transition-transform uppercase tracking-widest border-b-[6px] border-[#922b21]"
              >
                Paso
              </button>

              {/* Botón VOY / CANTAR JUGADA (Amarillo/Dorado Grueso) */}
              <AnimatePresence>
                {/* En Pique normal, este botón sale cuando seleccionas una ficha */}
                {(selectedChip || phase === 'GUERRA') && (
                  <motion.button 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={() => handleExecute(phase === 'PIQUE' ? 'voy' : 'bet')} 
                    className="w-48 h-16 md:w-64 md:h-20 bg-[#e2b044] hover:bg-[#d49a36] text-[#1a1a2e] rounded-xl md:rounded-2xl font-black text-base md:text-xl shadow-[0_8px_20px_rgba(226,176,68,0.4)] hover:-translate-y-1 transition-transform uppercase tracking-widest border-b-[6px] border-[#b8860b] flex items-center justify-center gap-2"
                  >
                    ¡VOY!
                    {selectedChip && phase !== 'GUERRA' && (
                      <span className="text-sm md:text-base opacity-90 bg-black/10 px-2 py-1 rounded ml-1 font-bold">
                        +${selectedChip >= 1000 ? selectedChip/1000 + 'k' : selectedChip}
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}      </motion.div>
    </AnimatePresence>
  )
}
