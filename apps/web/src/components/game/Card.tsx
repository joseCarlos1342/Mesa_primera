"use client"

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

interface CardProps {
  suit?: 'Oros' | 'Copas' | 'Espadas' | 'Bastos';
  value?: number;
  isHidden?: boolean;
  className?: string;
  delay?: number; // for staggered deal animations
  originX?: number | string; // X-origin for dealing animations
  originY?: number | string; // Y-origin for dealing animations relative to deck center
}

export function Card({ suit, value, isHidden = false, className = '', delay = 0, originX = 0, originY = -200 }: CardProps) {
  const [imgError, setImgError] = useState(false);

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
    
    return `/cards/${paddedValue}-${mappedSuit}.png`;
  }

  return (
    <motion.div
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
      className={`relative w-20 h-[8rem] md:w-32 md:h-[13rem] rounded-xl md:rounded-2xl shadow-2xl transform-style-3d cursor-pointer ${className}`}
      style={{ perspective: 1000 }}
    >
      {/* Front of Card */}
      <div 
        className="absolute inset-0 w-full h-full bg-slate-50 border-[3px] border-slate-300 rounded-xl md:rounded-2xl backface-hidden flex flex-col items-center justify-center p-2 md:p-3 overflow-hidden"
      >
        {!isHidden && suit && value && (
          imgError ? (
            <span className="text-xl md:text-3xl font-black font-playfair text-slate-800 text-center uppercase">
              {value}<br/>{suit.substring(0,1)}
            </span>
          ) : (
            <Image 
              src={getCardImage()} 
              alt={`${value} de ${suit}`} 
              fill
              sizes="(max-width: 768px) 15vw, 10vw"
              className="object-contain filter drop-shadow-md"
              onError={() => setImgError(true)}
            />
          )
        )}
      </div>

      {/* Back of Card */}
      <div 
        className="absolute inset-0 w-full h-full bg-[#0c1220] border-2 border-emerald-500/30 rounded-lg md:rounded-xl backface-hidden rotate-y-180 flex items-center justify-center overflow-hidden"
      >
        {/* Nice geometric pattern for the back */}
        <div className="absolute inset-1 border border-emerald-500/20 rounded md:rounded-lg opacity-50" />
        <div className="absolute inset-2 border border-emerald-500/10 rounded-sm md:rounded-md bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-80" />
        <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-emerald-500/40 rotate-45 flex items-center justify-center bg-[#1b253b]/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <div className="w-4 h-4 md:w-6 md:h-6 bg-emerald-500/20 -rotate-45" />
        </div>
      </div>
    </motion.div>
  )
}
