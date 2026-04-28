/**
 * Fase 4.2 — REVELAR_CARTA.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhaseRevealBottomCard`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";

type Ctx = any;

export const revealBottomCardPhase: IGamePhase = {
  id: "REVELAR_CARTA",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    if (r.deck.length > 0) {
      r.state.bottomCard = r.deck.shift()!;
      console.log(`[MesaRoom] Carta revelada del fondo: ${r.state.bottomCard}`);
    }
    r.state.phase = "REVELAR_CARTA";

    r.clock.setTimeout(() => {
      r.startPhase5Guerra();
    }, 3000);
  },
};
