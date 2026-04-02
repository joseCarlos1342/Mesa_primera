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
  /** Total bet amount in internal units (e.g. 1000000 = $10,000). */
  totalBet?: number;
  /** Callback to send bet and clear chips. */
  onBetConfirm?: () => void;
  /** Callback to clear chip selection. */
  onBetClear?: () => void;
  /** Pique mínimo configurado (en centavos). */
  minPique?: number;
  /** Apuesta máxima actual en la ronda (synced desde el server). */
  currentMaxBet?: number;
  /** Apuesta del jugador local en esta ronda. */
  myRoundBet?: number;
  /** Fichas disponibles del jugador local. */
  myChips?: number;
  /** Si el jugador ya está restiado (all-in). */
  isAllIn?: boolean;
}

const EMPTY_CARDS: string[] = [];
const ACTIVE_PHASES = ['PIQUE', 'APUESTA_4_CARTAS', 'DESCARTE', 'GUERRA', 'CANTICOS', 'CANTAR_JUEGO'];
const BETTING_PHASES_4CARDS = ['APUESTA_4_CARTAS', 'GUERRA', 'CANTICOS'];

export function ActionControls({
  room, phase, isMyTurn, selectedCards = EMPTY_CARDS, onClearSelection, handType,
  totalBet = 0, onBetConfirm, onBetClear, minPique = 500_000,
  currentMaxBet = 0, myRoundBet = 0, myChips = 0, isAllIn = false,
}: ActionControlsProps) {
  if (!isMyTurn || !ACTIVE_PHASES.includes(phase)) return null;
  if (isAllIn) return null; // Restiado players don't see controls

  const is4CardBetting = BETTING_PHASES_4CARDS.includes(phase);
  const isPique = phase === 'PIQUE';
  const isBetBelowMin = isPique && totalBet > 0 && totalBet < minPique;

  // Pique obligatorio: La Mano ya fijó el monto y yo no soy La Mano
  const piqueFixed = isPique && currentMaxBet > 0;
  const canAffordPique = piqueFixed && myChips >= currentMaxBet;

  // For 4-card phases: determine call amount and affordability
  const callAmount = is4CardBetting ? Math.max(0, currentMaxBet - myRoundBet) : 0;
  const canAffordCall = myChips >= callAmount;
  const hasActiveBet = is4CardBetting && currentMaxBet > 0 && myRoundBet < currentMaxBet;
  // Show IR/Limpiar for pique always when chips selected, for 4-card only as raise
  const showPiqueBet = isPique && totalBet > 0;
  const showRaiseBet = is4CardBetting && totalBet > 0;

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
        className="flex flex-row items-center gap-1 z-[60] pointer-events-auto shrink-0 bg-[#0a180e]/95 rounded-tl-2xl border-t border-l border-[#d4af37]/30 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.6)] px-2 py-1 md:p-2"
      >
        {/* ── PIQUE: Monto fijo impuesto por La Mano ── */}
        {piqueFixed && canAffordPique && (
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50);
              room.send('action', { action: 'voy', amount: currentMaxBet });
              onClearSelection?.();
            }}
            className="h-7 md:h-10 px-3 md:px-5 bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-white rounded-lg font-black text-[9px] md:text-xs shadow uppercase tracking-wider border-b-2 border-green-700 active:scale-95 transition-all"
          >
            VOY ${(currentMaxBet / 100).toLocaleString()}
          </button>
        )}
        {piqueFixed && !canAffordPique && myChips > 0 && (
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50);
              room.send('action', { action: 'voy', amount: myChips });
              onClearSelection?.();
            }}
            className="h-7 md:h-10 px-3 md:px-5 bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-[#1a0a00] rounded-lg font-black text-[9px] md:text-xs shadow border-b-2 border-b-[#92400e] active:scale-95 transition-all uppercase tracking-widest"
          >
            Resto ${(myChips / 100).toLocaleString()}
          </button>
        )}

        {/* ── PIQUE: Limpiar + IR (selección libre, solo La Mano o si no hay pique fijado) ── */}
        {showPiqueBet && !piqueFixed && (
          <button
            onClick={onBetClear}
            className="h-7 md:h-10 px-2 md:px-3 bg-gradient-to-b from-[#6b7280] to-[#374151] text-white rounded-lg font-black text-[8px] md:text-xs shadow border-b-2 border-b-[#1f2937] active:scale-95 transition-all uppercase tracking-wider">
            Limpiar
          </button>
        )}
        {showPiqueBet && !piqueFixed && (
          <button 
            onClick={onBetConfirm}
            disabled={isBetBelowMin}
            className={`h-7 md:h-10 px-3 md:px-5 rounded-lg font-black text-[9px] md:text-xs shadow uppercase tracking-wider border-b-2 active:scale-95 transition-all ${
              isBetBelowMin
                ? 'bg-gradient-to-b from-gray-500 to-gray-700 text-gray-300 border-gray-800 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-white border-green-700'
            }`}>
            IR! ${(totalBet / 100).toLocaleString()}
          </button>
        )}
        {isPique && isBetBelowMin && !piqueFixed && (
          <span className="text-[7px] md:text-[9px] text-red-400 font-bold uppercase tracking-wider whitespace-nowrap">
            Mín: ${(minPique / 100).toLocaleString()}
          </span>
        )}

        {/* ── 4-CARD PHASES: Igualar / Raise / Resto ── */}
        {/* Igualar (Call) — visible when there's an active bet and player can afford it */}
        {is4CardBetting && hasActiveBet && canAffordCall && callAmount > 0 && (
          <button
            onClick={() => send('igualar')}
            className="h-7 md:h-10 px-3 md:px-5 bg-gradient-to-b from-[#60a5fa] to-[#2563eb] text-white rounded-lg font-black text-[9px] md:text-xs shadow border-b-2 border-b-[#1e40af] active:scale-95 transition-all uppercase tracking-wider"
          >
            Igualar ${(callAmount / 100).toLocaleString()}
          </button>
        )}

        {/* Resto (All-in) — visible when there's an active bet and player can't afford to call */}
        {is4CardBetting && hasActiveBet && !canAffordCall && myChips > 0 && (
          <button
            onClick={() => send('resto')}
            className="h-7 md:h-10 px-3 md:px-5 bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-[#1a0a00] rounded-lg font-black text-[9px] md:text-xs shadow border-b-2 border-b-[#92400e] active:scale-95 transition-all uppercase tracking-widest"
          >
            Resto ${(myChips / 100).toLocaleString()}
          </button>
        )}

        {/* Raise (IR) — for 4-card phases, when chips are selected */}
        {showRaiseBet && (
          <>
            <button
              onClick={onBetClear}
              className="h-7 md:h-10 px-2 md:px-3 bg-gradient-to-b from-[#6b7280] to-[#374151] text-white rounded-lg font-black text-[8px] md:text-xs shadow border-b-2 border-b-[#1f2937] active:scale-95 transition-all uppercase tracking-wider">
              Limpiar
            </button>
            <button
              onClick={onBetConfirm}
              className="h-7 md:h-10 px-3 md:px-5 bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-white rounded-lg font-black text-[9px] md:text-xs shadow uppercase tracking-wider border-b-2 border-green-700 active:scale-95 transition-all"
            >
              IR! ${(totalBet / 100).toLocaleString()}
            </button>
          </>
        )}

        {/* ── DESCARTE: confirm card discard (or keep all) ── */}
        {phase === 'DESCARTE' && (
          <button
            onClick={() => send('discard', { droppedCards: selectedCards })}
            className="h-7 md:h-10 px-3 md:px-5 bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] text-[#2a1b04] rounded-lg font-black text-[9px] md:text-xs shadow border-b-2 border-b-[#5c4613] active:scale-95 transition-all uppercase tracking-wider"
          >
            {selectedCards.length > 0 ? `Botar ${selectedCards.length}` : 'Quedar'}
          </button>
        )}

        {/* ── CANTAR JUEGO: simplified "Cantar" button (no pulsing gold) ── */}
        {phase === 'CANTAR_JUEGO' && handType && handType !== 'NINGUNA' && (
          <button
            onClick={() => send('juego')}
            className="h-7 md:h-10 px-3 md:px-5 bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-[#1a0a00] rounded-lg font-black text-[9px] md:text-sm shadow border-b-2 border-b-[#92400e] active:scale-95 transition-all uppercase tracking-widest"
          >
            Cantar
          </button>
        )}

        {/* ── PASO — contextual label & style ── */}
        <button
          onClick={() => send('paso')}
          className={`h-7 md:h-10 px-3 md:px-6 rounded-lg font-black text-[9px] md:text-sm shadow border-b-2 active:scale-95 transition-all uppercase tracking-widest ${
            // Check style (green/neutral) when no active bet in 4-card phases
            is4CardBetting && !hasActiveBet
              ? 'bg-gradient-to-b from-[#6b7280] to-[#4b5563] text-white border-b-[#374151]'
              // Fold/Stay style (red) otherwise
              : 'bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white border-b-[#7f1d1d]'
          }`}
        >
          Paso
        </button>
      </m.div>
    </AnimatePresence>
  )
}
