'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ReplayViewer({ params }: { params: { gameId: string } }) {
  const [replay, setReplay] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    supabase.from('game_replays')
      .select('*')
      .eq('game_id', params.gameId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Error fetching replay:', error);
        if (data) setReplay(data);
      });
  }, [params.gameId]);

  if (!replay) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--text-secondary)]">
        Cargando repetición...
      </div>
    );
  }

  const timeline = replay.timeline || [];
  const event = timeline[currentStep];

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen text-[var(--text-primary)]">
      <h1 className="text-3xl font-bold text-[var(--accent-gold)] mb-6 flex items-center gap-3">
        <span>🎬</span> Repetición de Partida
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6 font-mono">
        Game ID: {replay.game_id} | Seed RNG: {replay.seed}
      </p>
      
      <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-xl p-6 mb-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-bold bg-[#1a1a2e] px-4 py-2 rounded-lg border border-[#2a2a4a]">
            Paso {currentStep + 1} de {timeline.length}
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(c => c - 1)}
              className="flex-1 md:flex-initial px-6 py-3 bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold rounded-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-transform"
            >
              ⏮ Anterior
            </button>
            <button 
              disabled={currentStep === timeline.length - 1}
              onClick={() => setCurrentStep(c => c + 1)}
              className="flex-1 md:flex-initial px-6 py-3 bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold rounded-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-transform"
            >
              Siguiente ⏭
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#1a1a2e] rounded-lg border border-[var(--border-glow)] shadow-inner">
          <div className="flex justify-between items-center mb-3 border-b border-[#2a2a4a] pb-2">
            <span className="font-bold text-[var(--accent-green)] capitalize">
              Evento: {event.event} {event.phase ? `(${event.phase})` : ''}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {new Date(event.time).toLocaleTimeString()}
            </span>
          </div>
          <pre className="text-sm font-mono text-[var(--text-primary)] overflow-x-auto bg-black/50 p-4 rounded">
            {JSON.stringify(event, null, 2)}
          </pre>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-xl p-6 shadow-xl">
         <h3 className="font-bold text-lg mb-4 text-[var(--accent-gold)]">Estado Final de Jugadores</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
           {replay.players?.map((p: any, i: number) => (
             <div key={i} className="p-4 bg-[#1a1a2e] rounded-lg border border-[#2a2a4a] flex flex-col gap-1">
               <div className="font-bold text-lg text-white">{p.nickname}</div>
               <div className="text-sm text-[var(--text-secondary)]">ID: <span className="font-mono text-xs">{p.userId}</span></div>
               <div className="text-sm mt-2 text-[#4ade80] font-bold">Fichas Finales: {p.chips}</div>
               <div className="text-sm text-[var(--accent-gold)] mt-1 font-mono bg-black/30 p-2 rounded">
                 Cartas: {p.cards || 'Ninguna'}
               </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
}
