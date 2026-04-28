/**
 * Fase 4.8 — APUESTA_4_CARTAS.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhaseApuesta4Cartas`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";

import type { MesaRoom } from "../MesaRoom";
type Ctx = MesaRoom;

export const apuesta4CartasPhase: IGamePhase = {
  id: "APUESTA_4_CARTAS",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    r.state.phase = "APUESTA_4_CARTAS";
    console.log(`[MesaRoom] Iniciando APUESTA_4_CARTAS: ronda de apuestas con 4 cartas`);
    r.pasoPendienteIds.clear();
    r.state.players.forEach((p: Player) => { p.hasActed = false; p.roundBet = 0; });
    r.state.currentMaxBet = 0;
    r.state.highestBetPlayerId = "";
    r.advanceTurnBetting(r.state.activeManoId, () => r.startPhaseDescarte());
  },
};
