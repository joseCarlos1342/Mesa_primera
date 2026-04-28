/**
 * Fase 4.3 — CANTICOS.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhase4Canticos`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";

import type { MesaRoom } from "../MesaRoom";
type Ctx = MesaRoom;

export const canticosPhase: IGamePhase = {
  id: "CANTICOS",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    // Si nadie apostó en GUERRA (todos pasaron/check), saltar Cánticos
    // e ir directo a Declarar Juego — no tiene sentido una segunda ronda de paso.
    if (r.state.currentMaxBet === 0) {
      console.log(`[MesaRoom] Todos pasaron en GUERRA — saltando Cánticos, directo a Declarar Juego`);
      r.startPhaseDeclararJuego();
      return;
    }
    r.state.phase = "CANTICOS";
    console.log(`[MesaRoom] Iniciando Fase 4: Cánticos`);
    r.pendingPasoJuegoPlayerId = "";
    r.pendingPasoJuegoPhase = "";
    r.state.players.forEach((p: Player) => { p.hasActed = false; p.roundBet = 0; });
    r.state.currentMaxBet = 0;
    r.state.highestBetPlayerId = "";
    r.advanceTurnBetting(r.state.activeManoId, () => r.startPhaseDeclararJuego());
  },
};
