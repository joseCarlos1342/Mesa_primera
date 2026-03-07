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
        className="absolute bottom-[22vh] md:bottom-8 left-0 right-0 md:left-auto md:right-8 flex flex-col items-center md:items-end gap-2 md:gap-3 z-[60] py-2 pointer-events-auto px-1 md:px-2"
      >
        
        {/* FASE: DESCARTE */}
        {phase === 'DESCARTE' && (
          <div className="flex flex-col items-center gap-2 bg-black/90 backdrop-blur-xl p-3 md:p-4 rounded-3xl border border-[#a17822]/40 shadow-2xl w-full md:w-auto">
            <span className="text-[#f2d06b] text-[10px] md:text-xs font-bold uppercase tracking-widest text-center">
              {selectedCards.length > 0 ? 'Fichas a botar' : 'Toca cartas para descartar'}
            </span>
            <button 
              onClick={() => handleExecute('discard', selectedCards)}
              className={`
                w-[90%] md:w-64 h-12 rounded-full font-black text-white text-sm shadow-lg hover:-translate-y-1 active:translate-y-2 transition-transform
                ${selectedCards.length > 0 
                  ? 'bg-gradient-to-br from-[#c62828] to-[#6c1414] border border-[#ff5252]/40' 
                  : 'bg-gradient-to-br from-[#1976d2] to-[#0d47a1] border border-[#4fc3f7]/40'}
              `}
            >
              {selectedCards.length > 0 ? `Botar ${selectedCards.length} y Pedir` : 'Mantener Juego (0)'}
            </button>
          </div>
        )}

        {/* FASE: PIQUE o GUERRA */}
        {(phase === 'PIQUE' || phase === 'GUERRA') && (
          <div className="flex flex-col md:flex-row items-center md:items-end gap-3 bg-black/90 backdrop-blur-xl p-3 md:p-4 rounded-[2rem] border border-[#a17822]/40 shadow-2xl w-full md:w-auto">
            
            {/* Controles Principales */}
            <div className="flex flex-row md:flex-col gap-2 items-center w-full md:w-auto justify-between md:justify-center">
              
              {/* Botón PASO (Pequeño y optimizado) */}
              <button 
                onClick={() => handleExecute(phase === 'PIQUE' ? 'paso' : 'fold')} 
                className="w-12 h-12 md:w-20 md:h-16 bg-gradient-to-br from-[#c62828] to-[#6c1414] border border-[#ff5252]/40 rounded-xl md:rounded-2xl font-bold text-white text-[9px] md:text-xs shadow-lg hover:-translate-y-1 transition-transform flex flex-col items-center justify-center uppercase tracking-wider flex-shrink-0"
              >
                Paso
              </button>

              {/* Botón VOY (Solo sale al presionar una ficha, o si el usuario simplemente decide Igualar en Guerra) */}
              <AnimatePresence>
                {selectedChip && (
                  <motion.button 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={() => handleExecute(phase === 'PIQUE' ? 'voy' : 'bet')} 
                    className="w-14 h-14 md:w-24 md:h-16 bg-gradient-to-br from-[#2e7d32] to-[#124215] border border-[#4ade80]/40 rounded-xl md:rounded-2xl font-bold text-white text-[10px] md:text-sm shadow-[0_0_15px_rgba(46,125,50,0.6)] hover:-translate-y-1 transition-transform flex flex-col items-center justify-center uppercase tracking-wider flex-shrink-0"
                  >
                    Voy
                    <span className="text-[8px] md:text-[9px] opacity-70">${selectedChip >= 1000 ? selectedChip/1000 + 'k' : selectedChip}</span>
                  </motion.button>
                )}
                
                {/* En guerra, permitir VOY (Igualar) sin seleccionar ficha extra, si no ha seleccionado ninguna */}
                {phase === 'GUERRA' && !selectedChip && (
                  <motion.button 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => handleExecute('call')} 
                    className="w-14 h-14 md:w-20 md:h-16 bg-gradient-to-br from-[#1976d2] to-[#0d47a1] border border-[#4fc3f7]/40 rounded-xl md:rounded-2xl font-bold text-white text-[10px] md:text-xs shadow-lg hover:-translate-y-1 transition-transform flex flex-col items-center justify-center uppercase tracking-wider flex-shrink-0"
                  >
                    Voy
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Divisor Visual en Desktop */}
            <div className="hidden md:block w-px h-16 bg-[#a17822]/20 mx-2" />

            {/* Chips Area (Fichas sobre la mesa) */}
            <div className="flex flex-col items-center w-full md:w-auto mt-2 md:mt-0">
              <span className="text-[#f2d06b] text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80">
                Toca una ficha para apostar
              </span>
              
              {/* Contenedor horizontal scrolleable para móviles para evitar que ocupe toda la pantalla */}
              <div className="flex overflow-x-auto w-full md:w-auto items-center justify-start md:justify-center gap-2 md:gap-3 pb-2 md:pb-0 px-1 snap-x no-scrollbar">
                {CHIP_VALUES.map(val => {
                  const canAfford = playerChips >= val;
                  const isSelected = selectedChip === val;
                  
                  // Map values to chip colors roughly like standard casino chips
                  let colorClass = "from-gray-300 to-gray-500 text-black"; // Default
                  if (val === 1000) colorClass = "from-blue-100 to-blue-300 text-black"; // White/Blueish
                  if (val === 2000) colorClass = "from-red-400 to-red-600 text-white"; // Red
                  if (val === 5000) colorClass = "from-green-400 to-green-600 text-white"; // Green
                  if (val === 10000) colorClass = "from-black via-gray-800 to-black text-white border-dashed border-white/50"; // Black
                  if (val === 20000) colorClass = "from-purple-400 to-purple-600 text-white"; // Purple
                  if (val === 50000) colorClass = "from-yellow-400 to-yellow-600 text-black"; // Orange/Gold

                  return (
                    <button
                      key={val}
                      disabled={!canAfford}
                      onClick={() => setSelectedChip(isSelected ? null : val)}
                      className={`
                        flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center snap-center
                        text-[9px] md:text-xs font-black tracking-tighter shadow-lg
                        bg-gradient-to-br transition-all border
                        ${canAfford 
                            ? `${colorClass} ${isSelected ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)] -translate-y-2' : 'border-black/50 hover:-translate-y-1'}` 
                            : 'from-gray-800 to-gray-900 text-gray-600 cursor-not-allowed border-gray-700 opacity-40'}
                      `}
                    >
                      <div className="w-[85%] h-[85%] rounded-full border-[2px] border-dashed border-black/20 flex flex-col items-center justify-center leading-none pt-0.5">
                        {val >= 1000 ? `${val/1000}k` : val}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
