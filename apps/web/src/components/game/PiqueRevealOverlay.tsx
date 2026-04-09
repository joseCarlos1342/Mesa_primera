"use client"

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { Room } from '@colyseus/sdk'

interface PiqueRevealOverlayProps {
  room: Room;
  players: { id: string; nickname: string; revealedCards: string; isFolded: boolean; passedWithJuego?: boolean }[];
}

function parseCard(cardStr: string) {
  const parts = cardStr.split('-');
  const value = parseInt(parts[0]);
  const suit = parts[1];
  const suitMap: Record<string, string> = {
    'Oros': 'oros', 'Copas': 'copas', 'Espadas': 'espadas', 'Bastos': 'bastos',
    'O': 'oros', 'C': 'copas', 'E': 'espadas', 'B': 'bastos'
  };
  const mappedSuit = suitMap[suit] || suit?.toLowerCase();
  const paddedValue = value.toString().padStart(2, '0');
  return { value, suit, src: `/cards/${paddedValue}-${mappedSuit}.png?v=3` };
}

export function PiqueRevealOverlay({ room, players }: PiqueRevealOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const revealedPlayer = players.find(p => p.revealedCards && (p.isFolded || p.passedWithJuego));
  const cards = revealedPlayer?.revealedCards
    ? revealedPlayer.revealedCards.split(',').filter(Boolean)
    : [];

  useEffect(() => {
    if (hasAnimated.current || !containerRef.current || cards.length === 0) return;
    hasAnimated.current = true;

    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });

    const header = containerRef.current.querySelector('.reveal-header');
    if (header) {
      tl.fromTo(header, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' }, '-=0.1');
    }

    const cardEls = containerRef.current.querySelectorAll('.reveal-card');
    tl.fromTo(cardEls,
      { rotateY: 180, scale: 0.5, opacity: 0 },
      { rotateY: 0, scale: 1, opacity: 1, duration: 0.5, stagger: 0.12, ease: 'back.out(1.3)' },
      '-=0.2'
    );

    const label = containerRef.current.querySelector('.reveal-label');
    if (label) {
      tl.fromTo(label, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, '-=0.1');
    }

    return () => { tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!revealedPlayer || cards.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-60 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto overflow-y-auto landscape:justify-start landscape:pt-4"
      style={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="reveal-header flex flex-col items-center mb-4 md:mb-6 landscape:mb-2 px-4 text-center">
        <div className="text-[#d4af37] text-[10px] md:text-xs uppercase tracking-[0.25em] font-black mb-1">
          Muestra de Juego
        </div>
        <div className="text-white/90 text-sm md:text-base font-bold">
          {revealedPlayer.nickname} <span className="text-white/50 font-normal">lleva juego y se bota</span>
        </div>
      </div>

      {/* Cards — responsive grid with proper sizing */}
      <div className="flex justify-center items-end gap-2 md:gap-3 px-4" style={{ perspective: 800 }}>
        {cards.map((cardStr, idx) => {
          const card = parseCard(cardStr);
          return (
            <div
              key={`${revealedPlayer.id}-${cardStr}-${idx}`}
              className="reveal-card relative rounded-lg overflow-hidden bg-white ring-1 ring-[#d4af37]/40 shadow-[0_0_24px_rgba(212,175,55,0.25)]
                w-16 h-24
                min-[360px]:w-20 min-[360px]:h-30
                landscape:w-14 landscape:h-[84px]
                md:w-24 md:h-36
                lg:w-28 lg:h-42"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <img
                src={card.src}
                alt={`${card.value} de ${card.suit}`}
                className="w-full h-full object-fill"
                loading="eager"
              />
            </div>
          );
        })}
      </div>

      {/* Player label + suit info */}
      <div className="reveal-label flex flex-col items-center mt-4 md:mt-6 landscape:mt-2">
        <div className="text-[#fdf0a6] text-xs md:text-sm font-black tracking-wide uppercase">
          {cards.length} cartas del mismo palo
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => room.send('dismiss-reveal')}
        className="mt-6 md:mt-8 landscape:mt-3 h-10 md:h-12 landscape:h-9 px-6 md:px-8
          bg-[#0a180e]/90 text-[#d4af37] border border-[#d4af37]/40
          rounded-xl font-black text-xs md:text-sm
          shadow-lg hover:bg-[#0a180e] hover:border-[#d4af37]/70
          active:scale-95 transition-all uppercase tracking-wider"
      >
        Continuar
      </button>
    </div>
  );
}
