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
      'BARAJANDO': 'Barajando las cartas...',
      'SORTEO_MANO': 'Sorteando La Mano...',
      'PIQUE_DEAL': 'Repartiendo el Pique...',
      'PIQUE': '¡A Picar!',
      'COMPLETAR': 'Completando Manos...',
      'APUESTA_4_CARTAS': '¡Apuesta! — 4 cartas',
      'DESCARTE': 'La Bajada — Descarta lo que no sirve',
      'COMPLETAR_DESCARTE': 'Entregando reemplazos...',
      'REVELAR_CARTA': '¡Carta del fondo!',
      'GUERRA': '¡Guerra — Apuesta fuerte!',
      'CANTICOS': '¡Cánticos — Declara y apuesta!',
      'SHOWDOWN': '¡Cartas sobre la mesa!',
      'PAYOUT': 'Repartiendo el Pozo...'
    };

    if (messages[phase]) {
      setAnnouncement({ text: messages[phase], id: Date.now() });
      const timer = setTimeout(() => setAnnouncement(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-sm flex justify-center landscape:top-12">
      <AnimatePresence mode="wait">
        {announcement && (
          <m.div
            key={announcement.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-[#1b253b]/90 backdrop-blur-md border border-emerald-500/30 text-white px-6 py-2 md:px-8 md:py-3 rounded-full font-playfair font-bold text-lg md:text-2xl shadow-[0_10px_40px_rgba(16,185,129,0.2)] landscape:text-base landscape:py-1"
          >
            {announcement.text}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
