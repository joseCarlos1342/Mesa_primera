"use client"

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'

const CHIP_DENOMS = [100000, 200000, 500000, 1000000, 2000000, 5000000] as const;

interface ChipVisualStyle {
  face: string
  edge: string
  text: string
  bevel: string
}

const CHIP_VISUAL_STYLES: Record<number, ChipVisualStyle> = {
  100000: {
    face: 'from-[#ffe36a] via-[#fbc02d] to-[#c58b00]',
    edge: 'from-[#a36f00] to-[#6f4800] border-[#754d00]',
    text: 'text-[#1a1200]',
    bevel: 'border-[#fff1a3]/80',
  },
  200000: {
    face: 'from-[#64b5f6] via-[#1e88e5] to-[#0d47a1]',
    edge: 'from-[#125ca4] to-[#07316f] border-[#07316f]',
    text: 'text-white',
    bevel: 'border-[#b9e0ff]/65',
  },
  500000: {
    face: 'from-[#ff6b63] via-[#e53935] to-[#a71919]',
    edge: 'from-[#a92222] to-[#641010] border-[#641010]',
    text: 'text-white',
    bevel: 'border-[#ffb0ab]/65',
  },
  1000000: {
    face: 'from-[#4b4b4b] via-[#212121] to-[#080808]',
    edge: 'from-[#161616] to-[#000000] border-black',
    text: 'text-white',
    bevel: 'border-[#8d8d8d]/55',
  },
  2000000: {
    face: 'from-[#81c784] via-[#43a047] to-[#1b5e20]',
    edge: 'from-[#286d2d] to-[#103b14] border-[#103b14]',
    text: 'text-white',
    bevel: 'border-[#c0ebc2]/65',
  },
  5000000: {
    face: 'from-white via-[#f3f3f3] to-[#c8c8c8]',
    edge: 'from-[#9f9f9f] to-[#696969] border-[#555555]',
    text: 'text-[#161616]',
    bevel: 'border-white/90',
  },
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
          const visual = CHIP_VISUAL_STYLES[val];

          return (
            <button
              key={val}
              onClick={() => handleChipTap(val)}
              type="button"
              aria-pressed={isActive}
              data-chip-shape="casino-plate"
              data-selected={isActive}
               className={`group relative isolate h-7 w-11 md:h-9 md:w-[52px] rounded-[9px] p-0 font-bold text-[11px] md:text-xs transition-all duration-150 ${
                isActive
                  ? 'z-20 -translate-y-1 ring-2 ring-[#d4af37] shadow-[0_8px_16px_rgba(0,0,0,0.65),0_0_14px_rgba(212,175,55,0.35)]'
                  : canAfford
                    ? count > 0
                      ? 'ring-2 ring-white/90 shadow-[0_5px_12px_rgba(0,0,0,0.55)]'
                      : 'hover:-translate-y-0.5 hover:shadow-[0_5px_12px_rgba(0,0,0,0.5)]'
                    : 'opacity-25 grayscale shadow-none'
              }`}
            >
              <span
                data-testid="chip-edge"
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-[-3px] h-full rounded-[9px] border bg-gradient-to-b ${visual.edge} shadow-[0_3px_2px_rgba(0,0,0,0.65)]`}
              />
              <span
                data-testid="chip-face"
                className={`relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] border-[1.5px] border-black/35 bg-gradient-to-b ${visual.face} ${visual.text} shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.28)]`}
              >
                <span
                  data-testid="chip-bevel"
                  aria-hidden="true"
                  className={`absolute inset-[3px] rounded-[5px] border ${visual.bevel} opacity-70`}
                />
                <span className="relative z-10 tracking-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]">
                  {formatDenom(val)}
                </span>
                <span aria-hidden="true" className="absolute inset-x-2 top-0.5 h-px bg-white/35 blur-[0.5px]" />
              </span>
              {count > 0 && (
                 <span className="absolute -right-1 -top-1 z-30 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#f0d78c] bg-[#d4af37] px-0.5 text-[11px] font-bold leading-none text-black shadow-[0_2px_5px_rgba(0,0,0,0.7)]">
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
