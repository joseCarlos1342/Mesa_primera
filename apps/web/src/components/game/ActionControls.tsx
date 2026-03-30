"use client"

import { m, AnimatePresence } from 'framer-motion'
import { Room } from '@colyseus/sdk'

interface ActionControlsProps {
  room: Room;
  phase: string;
  isMyTurn: boolean;
  selectedCards?: string[];
  onClearSelection?: () => void;
  /** Tipo de mano del jugador (para habilitar botón Juego). */
  handType?: string;
}

const EMPTY_CARDS: string[] = [];
const ACTIVE_PHASES = ['PIQUE', 'APUESTA_4_CARTAS', 'DESCARTE', 'GUERRA', 'CANTICOS', 'CANTAR_JUEGO'];

export function ActionControls({ room, phase, isMyTurn, selectedCards = EMPTY_CARDS, onClearSelection, handType }: ActionControlsProps) {
  if (!isMyTurn || !ACTIVE_PHASES.includes(phase)) return null;

  const send = (action: string, extra?: object) => {
    if (navigator.vibrate) navigator.vibrate(50);
    room.send('action', { action, ...extra });
    onClearSelection?.();
  };

  return (
    <AnimatePresence>
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-row items-center gap-2 z-[60] pointer-events-auto shrink-0"
      >
        {/* DESCARTE: confirm card discard (or keep all) */}
        {phase === 'DESCARTE' && (
          <button
            onClick={() => send('discard', { droppedCards: selectedCards })}
            className="h-10 md:h-12 px-4 md:px-6 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[#2a1b04] rounded-xl font-black text-xs md:text-sm shadow-lg border-b-[3px] border-b-[#5c4613] hover:-translate-y-0.5 transition-all uppercase tracking-wider"
          >
            {selectedCards.length > 0 ? `Botar ${selectedCards.length}` : 'Quedar'}
          </button>
        )}

        {/* CANTAR JUEGO: declarar juego para ganar el pique o en cánticos */}
        {(phase === 'CANTAR_JUEGO' || phase === 'CANTICOS') && handType && handType !== 'NINGUNA' && (
          <button
            onClick={() => send('juego')}
            className="h-10 md:h-12 px-4 md:px-6 bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-[#1a0a00] rounded-xl font-black text-xs md:text-base shadow-lg border-b-[3px] border-b-[#92400e] hover:-translate-y-0.5 transition-all uppercase tracking-widest animate-pulse"
          >
            ¡Juego!
          </button>
        )}

        {/* BOTARSE / PASO */}
        <button
          onClick={() => send('paso')}
          className="h-10 md:h-12 px-4 md:px-8 bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white rounded-xl font-black text-xs md:text-base shadow-lg border-b-[3px] border-b-[#7f1d1d] hover:-translate-y-0.5 transition-all uppercase tracking-widest"
        >
          {phase === 'CANTAR_JUEGO' ? 'Paso' : 'Botarse'}
        </button>
      </m.div>
    </AnimatePresence>
  )
}
