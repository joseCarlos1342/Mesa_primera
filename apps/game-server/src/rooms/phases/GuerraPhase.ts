/**
 * Fase 4.10 — GUERRA.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhase5Guerra`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";

import type { MesaRoom } from "../MesaRoom";
type Ctx = MesaRoom;

export const guerraPhase: IGamePhase = {
  id: "GUERRA",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    r.clearTurnTimer();
    r.state.phase = "GUERRA";
    console.log(`[MesaRoom] Iniciando Fase 5: Guerra Principal`);
    r.pendingPasoJuegoPlayerId = "";
    r.pendingPasoJuegoPhase = "";
    r.state.players.forEach((p: Player) => { p.hasActed = false; p.roundBet = 0; });
    r.state.currentMaxBet = 0;
    r.state.highestBetPlayerId = "";
    r.advanceTurnBetting(r.state.activeManoId, () => r.startPhase4Canticos());
  },
};
