"use client"

import { m } from 'framer-motion'
import { useState } from 'react'

interface CardProps {
  suit?: 'Oros' | 'Copas' | 'Espadas' | 'Bastos';
  value?: number;
  isHidden?: boolean;
  className?: string;
  delay?: number; // for staggered deal animations
  originX?: number | string; // X-origin for dealing animations
  originY?: number | string; // Y-origin for dealing animations relative to deck center
  priority?: boolean;
}

export function Card({ suit, value, isHidden = false, className = '', delay = 0, originX = 0, originY = -200 }: CardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const getCardImage = () => {
    if (!suit || !value) return '';
    const paddedValue = value.toString().padStart(2, '0');

    // Convert 'O' to 'oros', 'C' to 'copas', etc.
    const suitNameObj: Record<string, string> = {
      'O': 'oros', 'Oros': 'oros',
      'C': 'copas', 'Copas': 'copas',
      'E': 'espadas', 'Espadas': 'espadas',
      'B': 'bastos', 'Bastos': 'bastos'
    };

    const mappedSuit = suitNameObj[suit as string] || suit.toLowerCase();

    return `/cards/${paddedValue}-${mappedSuit}.png?v=3`;
  }

  return (
    <m.div
      initial={{ x: originX, y: originY, opacity: 0, rotateY: 180, scale: 0.95, zIndex: 10 }}
      animate={{ x: 0, y: 0, opacity: 1, rotateY: isHidden ? 180 : 0, scale: 1, zIndex: 50 }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 14,
        delay: delay,
        rotateY: { duration: 0.6, ease: "easeInOut", delay: delay + 0.2 },
        zIndex: { delay: delay + 0.3 }
      }}
      className={`relative w-20 h-[8rem] md:w-28 md:h-[11rem] lg:w-32 lg:h-[13rem] landscape:h-[35vh] landscape:max-h-[140px] landscape:w-[24vh] landscape:max-w-[96px] lg:landscape:h-[13rem] lg:landscape:w-32 rounded-lg shadow-2xl transform-style-3d cursor-pointer ${className}`}
      style={{ perspective: 1000, willChange: 'transform, opacity' }}
    >
      <div
        className={`absolute inset-0 w-full h-full bg-white rounded-lg flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ backfaceVisibility: 'hidden' }}
      >
        {!isHidden && suit && value && (
          imgError ? (
            <span className="text-xl md:text-3xl font-black font-playfair text-slate-800 text-center uppercase">
              {value}<br />{suit.substring(0, 1)}
            </span>
          ) : (
            /* Using standard img instead of next/image to handle local query string cache busting without extra config */
            <img
              src={getCardImage()}
              alt={`${value} de ${suit}`}
              className={`w-full h-full object-fill transition-opacity duration-150 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="eager"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          )
        )}
      </div>

      {/* Back of Card - Premium Rooster Design */}
      <div
        className={`absolute inset-0 w-full h-full bg-[#0c1220] border-2 border-[#d4af37]/40 rounded-lg overflow-hidden bg-[url('/images/card-back-rooster.png')] bg-cover bg-center transition-opacity duration-300 ${isHidden ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none" />
      </div>
    </m.div>
  )
}
