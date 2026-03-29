"use client"

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { evaluateHand } from '@/utils/handEvaluation'
import { formatCurrency } from '@/utils/format'

interface ShowdownPlayer {
  id: string;
  nickname: string;
  revealedCards: string;
  isFolded: boolean;
}

interface ShowdownCinematicProps {
  players: ShowdownPlayer[];
  timer: number;
  pot: number;
  piquePot: number;
  dealerId: string;
}

const HAND_RANK: Record<string, number> = { 'SEGUNDA': 3, 'CHIVO': 2, 'PRIMERA': 1, 'NINGUNA': 0 };

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

export function ShowdownCinematic({ players, timer, pot, piquePot, dealerId }: ShowdownCinematicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const activePlayers = players.filter(p => !p.isFolded && p.revealedCards);

  // Compute winner client-side (same logic as server: hand rank > points, La Mano +1)
  const winnerId = (() => {
    if (activePlayers.length === 0) return '';
    let best = activePlayers[0];
    let bestHand = evaluateHand(best.revealedCards);
    let bestPoints = bestHand.points + (best.id === dealerId ? 1 : 0);
    let bestRank = HAND_RANK[bestHand.type] ?? 0;

    for (let i = 1; i < activePlayers.length; i++) {
      const p = activePlayers[i];
      const h = evaluateHand(p.revealedCards);
      const pts = h.points + (p.id === dealerId ? 1 : 0);
      const rank = HAND_RANK[h.type] ?? 0;
      if (rank > bestRank || (rank === bestRank && pts > bestPoints)) {
        best = p; bestHand = h; bestPoints = pts; bestRank = rank;
      }
    }
    return best.id;
  })();

  useEffect(() => {
    if (hasAnimated.current || !containerRef.current) return;
    hasAnimated.current = true;

    const header = containerRef.current.querySelector('.showdown-header');

    const tl = gsap.timeline();

    // Fade in the backdrop
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });

    // Header entrance
    if (header) {
      tl.fromTo(header, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.2');
    }

    // Stagger card flips per player group
    activePlayers.forEach((_, pIdx) => {
      const playerCards = containerRef.current!.querySelectorAll(`.player-${pIdx}-card`);
      const playerLabel = containerRef.current!.querySelector(`.player-${pIdx}-label`);

      // Cards flip in with stagger
      tl.fromTo(playerCards, 
        { rotateY: 180, scale: 0.6, opacity: 0 },
        { rotateY: 0, scale: 1, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(1.4)' },
        pIdx === 0 ? '-=0.1' : '-=0.3'
      );

      // Player label fades in after their cards
      if (playerLabel) {
        tl.fromTo(playerLabel, 
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
          '-=0.2'
        );
      }
    });

    return () => { tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (activePlayers.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-60 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-none"
      style={{ opacity: 0 }}
    >
      {/* Header: Timer + Title */}
      <div className="showdown-header flex flex-col items-center mb-6 md:mb-8">
        <div className="text-[#d4af37] text-[10px] md:text-xs uppercase tracking-[0.3em] font-black mb-2">
          Mostrando Cartas
        </div>
        <div className="relative">
          <div className="text-white font-mono font-black text-5xl md:text-7xl tabular-nums">
            {timer}
          </div>
          <div className="absolute -inset-4 border border-[#d4af37]/20 rounded-xl" />
        </div>
      </div>

      {/* Players Grid */}
      <div className={`flex flex-wrap justify-center gap-6 md:gap-10 px-4 max-w-5xl ${activePlayers.length <= 2 ? 'flex-row' : 'flex-row'}`}>
        {activePlayers.map((player, pIdx) => {
          const cards = player.revealedCards.split(',').filter(Boolean);
          const hand = evaluateHand(player.revealedCards);
          const isMano = player.id === dealerId;
          const displayPoints = isMano ? hand.points + 1 : hand.points;
          const isWinner = player.id === winnerId;

          return (
            <div 
              key={player.id}
              className={`flex flex-col items-center ${isWinner ? 'order-first' : ''}`}
            >
              {/* Cards */}
              <div className="flex gap-1 md:gap-2 mb-3" style={{ perspective: 800 }}>
                {cards.map((cardStr, cIdx) => {
                  const card = parseCard(cardStr);
                  return (
                    <div
                      key={`${player.id}-${cardStr}-${cIdx}`}
                      className={`showdown-card player-${pIdx}-card relative w-14 h-22 md:w-20 md:h-32 lg:w-24 lg:h-38 rounded-lg shadow-2xl overflow-hidden bg-white
                        ${isWinner ? 'ring-2 ring-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.4)]' : ''}`}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <img 
                        src={card.src}
                        alt={`${card.value} de ${card.suit}`}
                        className="w-full h-full object-fill"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Player Label */}
              <div className={`showdown-label player-${pIdx}-label flex flex-col items-center`}>
                <div className={`text-sm md:text-base font-black tracking-wide ${isWinner ? 'text-[#d4af37]' : 'text-white/90'}`}>
                  {player.nickname}
                  {isMano && <span className="ml-1.5 text-[10px] text-[#d4af37]/70">(La Mano)</span>}
                </div>
                <div className={`text-xs md:text-sm font-mono ${isWinner ? 'text-[#4ade80]' : 'text-white/60'}`}>
                  {hand.type} &middot; {displayPoints} pts
                </div>
                {isWinner && (
                  <div className="mt-1 text-[#4ade80] text-xs md:text-sm font-black animate-pulse">
                    &#9733; GANADOR &middot; {formatCurrency(pot + piquePot)} &#9733;
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pot Summary */}
      <div className="mt-6 md:mt-8 flex gap-4">
        <div className="bg-[#0a180e]/90 px-4 py-2 rounded-xl border border-[#d4af37]/20">
          <span className="text-[#fdf0a6] text-[8px] uppercase tracking-widest opacity-60">Pozo</span>
          <div className="text-[#4ade80] font-mono font-black text-sm md:text-lg">{formatCurrency(pot)}</div>
        </div>
        {piquePot > 0 && (
          <div className="bg-[#0a180e]/90 px-4 py-2 rounded-xl border border-[#d4af37]/20">
            <span className="text-[#fdf0a6] text-[8px] uppercase tracking-widest opacity-60">Pique</span>
            <div className="text-[#4ade80] font-mono font-black text-sm md:text-lg">{formatCurrency(piquePot)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
