/**
 * Fase 4.6 — DESCARTE.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhaseDescarte`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";

type Ctx = any;

export const descartePhase: IGamePhase = {
  id: "DESCARTE",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    r.state.phase = "DESCARTE";
    console.log(`[MesaRoom] Iniciando Fase: Descarte`);
    r.pasoPendienteIds.clear();
    r.pendingPasoJuegoPlayerId = "";
    r.pendingPasoJuegoPhase = "";
    r.state.players.forEach((p: Player) => p.hasActed = false);

    // Start from La Mano activa
    r.advanceTurnPhaseDescarte(r.state.activeManoId);
  },
};
