"use client"

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'

const CHIP_DENOMS = [100000, 200000, 500000, 1000000, 2000000, 5000000] as const;

const CHIP_COLORS: Record<number, string> = {
  100000: "bg-[#fbc02d] text-black border-yellow-700",
  200000: "bg-[#1e88e5] text-white border-blue-800",
  500000: "bg-[#e53935] text-white border-red-800",
  1000000: "bg-[#212121] text-white border-black",
  2000000: "bg-[#43a047] text-white border-green-800",
  5000000: "bg-white text-black border-gray-300",
};

interface ChipSelectorProps {
  chipCounts: Record<number, number>;
  totalBet: number;
  maxChips: number;
  onAdd: (val: number) => void;
  onRemove: (val: number) => void;
  disabledChips?: number[];
}

function formatDenom(val: number) {
  const v = val / 100;
  return v >= 1000 ? `${v / 1000}k` : String(v);
}

export function ChipSelector({ chipCounts, totalBet, maxChips, onAdd, onRemove, disabledChips = [] }: ChipSelectorProps) {
  const availableDenoms = CHIP_DENOMS.filter(d => !disabledChips.includes(d));
  const [activeChip, setActiveChip] = useState<number | null>(null);

  const handleChipTap = (val: number) => {
    if (activeChip === val) {
      setActiveChip(null);
    } else {
      setActiveChip(val);
    }
  };

  const handleAdd = () => {
    if (activeChip !== null) {
      onAdd(activeChip);
      if (navigator.vibrate) navigator.vibrate(20);
    }
  };

  const handleRemove = () => {
    if (activeChip !== null && (chipCounts[activeChip] || 0) > 0) {
      onRemove(activeChip);
      if (navigator.vibrate) navigator.vibrate(20);
    }
  };

  const activeCount = activeChip !== null ? (chipCounts[activeChip] || 0) : 0;
  const canAffordActive = activeChip !== null ? maxChips >= totalBet + activeChip : false;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Mini-modal for active chip */}
      <AnimatePresence>
        {activeChip !== null && (
          <m.div
            initial={{ scale: 0.8, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-row items-center gap-2 bg-[#0a180e]/95 border border-[#d4af37]/40 rounded-xl px-2.5 py-1.5 shadow-2xl backdrop-blur-xl z-[200]"
          >
            {/* Big minus */}
            <button
              onClick={handleRemove}
              disabled={activeCount <= 0}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white font-black text-lg md:text-xl shadow-md border-b-2 border-red-800 disabled:opacity-30 active:scale-90 transition-all"
            >
              −
            </button>

            {/* Count */}
            <span className="text-[#fdf0a6] font-black text-sm leading-none min-w-[20px] text-center">×{activeCount}</span>

            {/* Big plus */}
            <button
              onClick={handleAdd}
              disabled={!canAffordActive}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-white font-black text-lg md:text-xl shadow-md border-b-2 border-green-700 disabled:opacity-30 active:scale-90 transition-all"
            >
              +
            </button>

            {/* Close */}
            <button
              onClick={() => setActiveChip(null)}
              className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-white text-xs font-bold transition-colors"
            >
              ✕
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* Chip row */}
      <div className="flex flex-row gap-0.5 md:gap-1 px-1.5 pb-0.5">
        {availableDenoms.map(val => {
          const count = chipCounts[val] || 0;
          const canAfford = maxChips >= totalBet + val;
          const isActive = activeChip === val;

          return (
            <button
              key={val}
              onClick={() => handleChipTap(val)}
              className={`relative w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[7px] md:text-[9px] border-[1.5px] border-dashed transition-all ${CHIP_COLORS[val]} ${
                isActive 
                  ? 'ring-2 ring-[#d4af37] scale-110 -translate-y-0.5 shadow-lg' 
                  : canAfford 
                    ? (count > 0 ? 'ring-2 ring-white scale-105 shadow-md' : 'hover:-translate-y-0.5') 
                    : 'opacity-20 shadow-none'
              }`}
            >
              {formatDenom(val)}
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#d4af37] text-black text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none shadow">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
