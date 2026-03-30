"use client"

import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'

interface GameAnnouncerProps {
  phase: string;
}

export function GameAnnouncer({ phase }: GameAnnouncerProps) {
  const [announcement, setAnnouncement] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    if (phase === 'LOBBY') return;
    
    const messages: Record<string, string> = {
      'SORTEO_MANO': 'Sorteando La Mano',
      'PIQUE_DEAL': 'Repartiendo el Pique',
      'PIQUE': '¡A Picar!',
      'COMPLETAR': 'Completando Manos',
      'CANTAR_JUEGO': '¿Quién canta Juego?',
      'APUESTA_4_CARTAS': '¡Apuesta! — 4 cartas',
      'DESCARTE': 'La Bajada',
      'COMPLETAR_DESCARTE': 'Entregando reemplazos',
      'REVELAR_CARTA': '¡Carta del fondo!',
      'GUERRA': '¡Guerra!',
      'CANTICOS': '¡Cánticos!',
      'SHOWDOWN': '¡Cartas sobre la mesa!',
      'PAYOUT': 'Repartiendo el Pozo',
    };

    if (messages[phase]) {
      setAnnouncement({ text: messages[phase], id: Date.now() });
      const timer = setTimeout(() => setAnnouncement(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none mb-56 md:mb-72">
      <AnimatePresence mode="wait">
        {announcement && (
          <m.div
            key={announcement.id}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="flex flex-col items-center gap-0.5"
          >
            <div className="h-px w-10 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
            <span className="text-[#fdf0a6] font-serif font-black italic text-base md:text-2xl tracking-wide drop-shadow-[0_2px_8px_rgba(212,175,55,0.35)] px-5 py-1.5 text-center whitespace-nowrap">
              {announcement.text}
            </span>
            <div className="h-px w-10 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
