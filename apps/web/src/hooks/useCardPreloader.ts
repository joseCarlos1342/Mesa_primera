"use client"

import { useEffect } from 'react'

const SUITS = ['oros', 'copas', 'espadas', 'bastos'] as const;
const VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

const preloaded = new Set<string>();

export function useCardPreloader() {
  useEffect(() => {
    if (preloaded.size > 0) return;

    for (const suit of SUITS) {
      for (const value of VALUES) {
        const src = `/cards/${value.toString().padStart(2, '0')}-${suit}.webp?v=4`;
        if (preloaded.has(src)) continue;
        preloaded.add(src);
        const img = new Image();
        img.src = src;
      }
    }

    // Preload card back
    const backSrc = '/cards/dorso.svg';
    if (!preloaded.has(backSrc)) {
      preloaded.add(backSrc);
      const img = new Image();
      img.src = backSrc;
    }
  }, []);
}
