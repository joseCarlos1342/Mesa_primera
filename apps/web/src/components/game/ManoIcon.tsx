"use client"

import { m } from 'framer-motion'

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
    xs: 'w-3.5 h-3.5',
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
  };

  const iconSizes = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={iconSizes[size]}
      >
        {/* Raised hand silhouette */}
        <path
          d="M6.5 21V12.5C6.5 12.5 5 12.5 5 11V8.5C5 7 6 7 6 7L7 7V4.5C7 3.67 7.67 3 8.5 3S10 3.67 10 4.5V7H10.5V3.5C10.5 2.67 11.17 2 12 2S13.5 2.67 13.5 3.5V7H14V4C14 3.17 14.67 2.5 15.5 2.5S17 3.17 17 4V7.5H17.5V6C17.5 5.17 18.17 4.5 19 4.5S20.5 5.17 20.5 6V14C20.5 17.87 17.37 21 13.5 21H6.5Z"
          fill="#2a1b04"
          stroke="#1a1004"
          strokeWidth="0.5"
        />
      </svg>
    </Wrapper>
  );
}
