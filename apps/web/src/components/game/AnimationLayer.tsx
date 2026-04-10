"use client"

import { useEffect, useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Card } from './Card'

interface FlyingCard {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  value: string;
  isFaceUp: boolean;
}

export function AnimationLayer() {
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const scheduleRemoval = (newFlyers: FlyingCard[]) => {
      const timer = setTimeout(() => {
        setFlyingCards(prev => prev.filter(fc => !newFlyers.find(nf => nf.id === fc.id)));
        timersRef.current.delete(timer);
      }, 600);
      timersRef.current.add(timer);
    };

    const handleDeal = (e: Event) => {
      const customEvent = e as CustomEvent<{ toPlayerId: string; cards: string[]; isFaceUp?: boolean }>;
      const { toPlayerId, cards, isFaceUp = false } = customEvent.detail;
      
      const deckEl = document.getElementById('deck-center');
      const seatEl = document.getElementById(`seat-${toPlayerId}`);
      
      if (!deckEl || !seatEl) return;
      
      const deckRect = deckEl.getBoundingClientRect();
      const seatRect = seatEl.getBoundingClientRect();
      
      // We want to center the flying card on the source and destination
      const startX = deckRect.left + deckRect.width / 2;
      const startY = deckRect.top + deckRect.height / 2;
      
      const endX = seatRect.left + seatRect.width / 2;
      const endY = seatRect.top + seatRect.height / 2;

      const newFlyers = cards.map((c, i) => ({
        id: `deal-${toPlayerId}-${c}-${Date.now()}-${i}`,
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        value: c,
        isFaceUp: isFaceUp, 
      }));

      setFlyingCards(prev => [...prev, ...newFlyers]);

      // Remove after animation completes (duration ~0.5s)
      scheduleRemoval(newFlyers);
    };

    const handleDiscard = (e: Event) => {
      const customEvent = e as CustomEvent<{ fromPlayerId: string; cards: string[] }>;
      const { fromPlayerId, cards } = customEvent.detail;
      
      const deckEl = document.getElementById('deck-center');
      const seatEl = document.getElementById(`seat-${fromPlayerId}`);
      
      if (!deckEl || !seatEl) return;
      
      const deckRect = deckEl.getBoundingClientRect();
      const seatRect = seatEl.getBoundingClientRect();
      
      const startX = seatRect.left + seatRect.width / 2;
      const startY = seatRect.top + seatRect.height / 2;
      
      const endX = deckRect.left + deckRect.width / 2;
      const endY = deckRect.top + deckRect.height / 2;

      const newFlyers = cards.map((c, i) => ({
        id: `discard-${fromPlayerId}-${c}-${Date.now()}-${i}`,
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        value: c,
        isFaceUp: true, 
      }));

      setFlyingCards(prev => [...prev, ...newFlyers]);

      scheduleRemoval(newFlyers);
    };

    window.addEventListener('animate-deal', handleDeal);
    window.addEventListener('animate-discard', handleDiscard);
    
    return () => {
      window.removeEventListener('animate-deal', handleDeal);
      window.removeEventListener('animate-discard', handleDiscard);
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  if (flyingCards.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {flyingCards.map(fc => (
          <m.div
            key={fc.id}
            initial={{ 
              x: fc.start.x, 
              y: fc.start.y, 
              scale: 0.5, 
              opacity: 0,
              top: '-40px', // Center offset based on estimated card height 80px width 56px
              left: '-28px',
              rotateX: fc.id.startsWith('deal') ? 180 : 0
            }}
            animate={{ 
              x: fc.end.x, 
              y: fc.end.y, 
              scale: 1, 
              opacity: 1,
              rotateX: 0
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 0.5, 
              ease: [0.25, 1, 0.5, 1] // Custom spring-like easing
            }}
            className="absolute shadow-2xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
          >
            <div className="w-14 h-20 md:w-20 md:h-28 landscape:scale-[0.8] lg:landscape:scale-100">
              {fc.isFaceUp ? (
                 <Card 
                   suit={fc.value.split('-')[1] as any}
                   value={parseInt(fc.value.split('-')[0])}
                   isHidden={false}
                   priority={true}
                 />
              ) : (
                 <div className="w-full h-full rounded-xl border-[2px] border-[#d4af37]/40 bg-[url('/images/card-back-rooster.png')] bg-cover bg-center shadow-md relative overflow-hidden">
                    <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] cursor-pointer" />
                 </div>
              )}
            </div>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
