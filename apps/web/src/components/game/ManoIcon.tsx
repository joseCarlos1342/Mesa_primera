"use client"

import { m } from 'framer-motion'
import { Hand } from 'lucide-react'

interface ManoIconProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  animate?: boolean;
}

/**
 * Circular hand icon for indicating "La Mano" (dealer).
 * Replaces the old text "Mano" badge across all surfaces.
 */
export function ManoIcon({ size = 'sm', className = '', animate = false }: ManoIconProps) {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
  };

  const iconSizes = {
    xs: 10,
    sm: 14,
    md: 20,
  };

  const Wrapper = animate ? m.div : 'div';
  const animateProps = animate
    ? {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0, opacity: 0 },
        transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
      }
    : {};

  return (
    <Wrapper
      className={`
        ${sizes[size]} rounded-full flex items-center justify-center shrink-0
        bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c]
        shadow-[0_0_8px_rgba(212,175,55,0.5)] border border-[#fdf0a6]/30
        ${className}
      `}
      {...animateProps}
    >
      <Hand
        size={iconSizes[size]}
        strokeWidth={2.5}
        stroke="#1a0f02"
        fill="#2a1b04"
        className="shrink-0"
      />
    </Wrapper>
  );
}
