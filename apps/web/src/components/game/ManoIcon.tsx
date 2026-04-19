"use client"

import { m } from 'framer-motion'

interface ManoIconProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  animate?: boolean;
}

/**
 * Gold badge showing "MANO" text for indicating the dealer.
 */
export function ManoIcon({ size = 'sm', className = '', animate = false }: ManoIconProps) {
  const sizes = {
    xs: 'px-1.5 py-0.5 text-[6px]',
    sm: 'px-2 py-0.5 text-[8px]',
    md: 'px-2.5 py-1 text-[10px]',
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
      <span className="font-black uppercase tracking-wider text-[#1a0f02] leading-none select-none">
        Mano
      </span>
    </Wrapper>
  );
}
