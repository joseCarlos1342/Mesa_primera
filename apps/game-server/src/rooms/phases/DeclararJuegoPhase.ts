/**
 * Fase 4.7 — DECLARAR_JUEGO.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhaseDeclararJuego`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";
import { evaluateHand } from "../combinations";

import type { MesaRoom } from "../MesaRoom";
type Ctx = MesaRoom;

export const declararJuegoPhase: IGamePhase = {
  id: "DECLARAR_JUEGO",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    const activePlayers = (Array.from(r.state.players.values()) as Player[])
      .filter((p: Player) => !p.isFolded && p.connected && !p.isWaiting);

    // Si solo queda 1 jugador o menos, ir directo al showdown
    if (activePlayers.length <= 1) {
      r.clearTurnTimer();
      r.startPhase6Showdown();
      return;
    }

    // Si hubo apuestas en CANTICOS (alguien subió), ir directo al showdown
    // porque ya se resolvió con dinero
    if (r.state.currentMaxBet > 0) {
      r.clearTurnTimer();
      r.startPhase6Showdown();
      return;
    }

    r.state.phase = "DECLARAR_JUEGO";
    console.log(`[MesaRoom] Iniciando Declaración de Juego`);
    r.state.players.forEach((p: Player) => { p.hasActed = false; p.declaredJuego = null; });

    // Send each player their valid option via private message
    for (const p of activePlayers) {
      const hand = evaluateHand(p.cards);
      const hasJuego = hand.type !== 'NINGUNA';
      const client = r.clientMap.get(p.id);
      if (client) {
        client.send("declarar-juego-option", { hasJuego, handType: hand.type });
      }
    }

    // Iniciar desde La Mano
    r.advanceTurnDeclarar(r.state.activeManoId);
  },
};
