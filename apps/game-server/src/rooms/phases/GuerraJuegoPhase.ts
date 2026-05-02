/**
 * Fase 4.9 — GUERRA_JUEGO.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhaseGuerraJuego`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";

import type { MesaRoom } from "../MesaRoom";
type Ctx = MesaRoom;

export const guerraJuegoPhase: IGamePhase = {
  id: "GUERRA_JUEGO",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    r.clearTurnTimer();
    r.state.phase = "GUERRA_JUEGO";
    console.log(`[MesaRoom] Iniciando Guerra de Juego — apuestas entre jugadores con juego`);
    r.state.players.forEach((p: Player) => { p.hasActed = false; p.roundBet = 0; p.declinedGuerraJuegoBet = false; });
    r.state.currentMaxBet = 0;
    r.state.highestBetPlayerId = "";
    r.advanceTurnBetting(r.state.activeManoId, () => r.startPhase6Showdown());
  },
};
