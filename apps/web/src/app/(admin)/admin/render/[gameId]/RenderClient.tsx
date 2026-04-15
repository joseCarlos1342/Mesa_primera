"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatAmount } from "@/utils/format";

type TimelineEvent = {
  event: string;
  phase?: string;
  player?: string;
  action?: string;
  amount?: number;
  combination?: string;
  droppedCards?: string[];
  winner?: string;
  pot?: number;
  payout?: number;
  rake?: number;
  seed?: string;
  time: number;
};

type PlayerSnapshot = {
  userId: string;
  nickname: string;
  cards?: string;
  chips?: number;
};

type ReplayData = {
  game_id: string;
  timeline: TimelineEvent[];
  admin_timeline: TimelineEvent[];
  players: PlayerSnapshot[];
  pot_breakdown: Record<string, any>;
  final_hands: Record<string, any>;
  rng_seed: string;
  created_at: string;
};

const PHASE_COLORS: Record<string, string> = {
  PIQUE: "border-blue-500 bg-blue-950",
  DESCARTE: "border-purple-500 bg-purple-950",
  APUESTA_4_CARTAS: "border-amber-500 bg-amber-950",
  CANTICOS: "border-pink-500 bg-pink-950",
  GUERRA: "border-red-500 bg-red-950",
};

/**
 * Componente de reproducción automática para captura de MP4.
 *
 * - Usa viewport fijo 1280x720
 * - Sin controles interactivos
 * - Auto-play a 2x velocidad
 * - Señaliza data-render-done="true" al finalizar
 */
export function RenderClient({ replay }: { replay: ReplayData }) {
  const timeline = replay.admin_timeline?.length ? replay.admin_timeline : (replay.timeline || []);
  const players = replay.players || [];
  const hands = replay.final_hands || {};
  const pot = replay.pot_breakdown || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const event = timeline[currentStep];
  const progress = timeline.length > 1 ? (currentStep / (timeline.length - 1)) * 100 : 100;

  // Observable render state for Playwright worker
  const renderState: 'playing' | 'done' = done ? 'done' : 'playing';

  const getPlayerName = useCallback(
    (sessionId?: string) => {
      if (!sessionId) return "?";
      return players.find((p) => p.userId === sessionId)?.nickname || sessionId.substring(0, 8);
    },
    [players],
  );

  const getEventDescription = useCallback(
    (ev: TimelineEvent): string => {
      if (ev.event === "start") return "Inicio de Partida";
      if (ev.event === "end")
        return `${getPlayerName(ev.winner)} gana ${ev.payout ? `$${formatAmount(ev.payout)}` : ""}`;
      const name = getPlayerName(ev.player);
      const actionLabel =
        ev.action === "voy"
          ? "Apuesta"
          : ev.action === "paso"
            ? "Pasa"
            : ev.action === "discard"
              ? "Descarta"
              : ev.action || "";
      const amountStr = ev.amount ? ` $${formatAmount(ev.amount)}` : "";
      const comboStr = ev.combination ? ` (${ev.combination})` : "";
      return `${name} → ${actionLabel}${amountStr}${comboStr}`;
    },
    [getPlayerName],
  );

  // Auto-play: avanzar cada 250ms (captura rápida para MP4)
  useEffect(() => {
    if (done) return;
    if (currentStep >= timeline.length - 1) {
      // Mantener el último frame 2 segundos antes de señalizar done
      const timer = setTimeout(() => setDone(true), 2000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), 250);
    return () => clearTimeout(timer);
  }, [currentStep, done, timeline.length]);

  if (!event) {
    return (
      <div data-render-done="true" className="flex items-center justify-center h-screen bg-black text-red-500">
        No hay eventos en el timeline
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-render-done={done ? "true" : "false"}
      data-render-state={renderState}
      data-render-step={String(currentStep)}
      data-render-total={String(timeline.length)}
      className="w-[1280px] h-[720px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/50 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-widest text-purple-400">Mesa Primera</span>
          <span className="text-[10px] text-slate-500 font-mono">{replay.game_id.substring(0, 12)}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span>
            {new Date(replay.created_at).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span>Seed: {replay.rng_seed?.substring(0, 12)}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 bg-white/5 shrink-0">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Players column */}
        <div className="w-64 shrink-0 space-y-2 overflow-y-auto">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
            Jugadores ({players.length})
          </p>
          {players.map((p) => {
            const hand = hands[p.userId];
            const isActive = event.player === p.userId;
            return (
              <div
                key={p.userId}
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  isActive
                    ? "border-purple-500 bg-purple-500/10 scale-[1.02]"
                    : "border-white/5 bg-white/3"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-white">{p.nickname}</span>
                  <span className="text-xs font-mono text-slate-400">${formatAmount(p.chips || 0)}</span>
                </div>
                {p.cards && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {p.cards.split(",").filter(Boolean).map((card, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-black/50 rounded text-[10px] font-black text-amber-400 border border-amber-500/20"
                      >
                        {card.trim()}
                      </span>
                    ))}
                  </div>
                )}
                {hand && (
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mt-1">
                    {hand.handType}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Center: current event */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Phase badge */}
          {event.phase && (
            <div
              className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest mb-4 ${
                PHASE_COLORS[event.phase] || "border-slate-500 bg-slate-900"
              }`}
            >
              {event.phase}
            </div>
          )}

          {/* Event description */}
          <p className="text-2xl font-black italic tracking-tight text-center leading-tight">
            {getEventDescription(event)}
          </p>

          {/* Dropped cards */}
          {event.droppedCards && event.droppedCards.length > 0 && (
            <div className="flex gap-2 mt-4">
              {event.droppedCards.map((card, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-purple-500/20 rounded-xl text-sm font-black text-purple-300 border border-purple-500/30"
                >
                  {card}
                </span>
              ))}
            </div>
          )}

          {/* End event: pot info */}
          {event.event === "end" && (
            <div className="flex gap-8 mt-6">
              <div className="text-center">
                <p className="text-[9px] font-black uppercase text-slate-500">Pozo</p>
                <p className="text-3xl font-black text-white">${formatAmount(event.pot || pot.totalPot || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase text-slate-500">Pago</p>
                <p className="text-3xl font-black text-emerald-400">${formatAmount(event.payout || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase text-slate-500">Rake</p>
                <p className="text-3xl font-black text-blue-400">${formatAmount(event.rake || 0)}</p>
              </div>
            </div>
          )}

          {/* Step counter */}
          <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-600">
            Paso {currentStep + 1} / {timeline.length}
          </p>
        </div>

        {/* Right: pot summary */}
        <div className="w-48 shrink-0 flex flex-col justify-center">
          <div className="bg-black/30 rounded-2xl border border-white/5 p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Pozo</p>
            <p className="text-xl font-black text-white">${formatAmount(pot.totalPot || 0)}</p>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Principal</span>
                <span>${formatAmount(pot.mainPot || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pique</span>
                <span>${formatAmount(pot.piquePot || 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 border-t border-white/5 pt-1 mt-1">
                <span>Rake</span>
                <span>${formatAmount(pot.rake || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center px-6 py-2 bg-black/50 border-t border-white/10 shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">
          Mesa Primera — Auditoría de Partida — Render Automático
        </span>
      </div>
    </div>
  );
}
