/**
 * Fase 4.4 — COMPLETAR_DESCARTE.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhaseReemplazoDescarte`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";

type Ctx = any;

export const reemplazoDescartePhase: IGamePhase = {
  id: "COMPLETAR_DESCARTE",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    r.state.phase = "COMPLETAR_DESCARTE";
    console.log(`[MesaRoom] Repartiendo reemplazos por bloque desde el fondo del mazo...`);

    // Ordered by seatOrder starting from activeManoId
    const manoSeatIdx = r.seatOrder.indexOf(r.state.activeManoId);
    const startIdx = manoSeatIdx >= 0 ? manoSeatIdx : 0;
    const playersNeedingCards: { player: Player; sessionId: string }[] = [];
    for (let i = 0; i < r.seatOrder.length; i++) {
      const idx = (startIdx + i) % r.seatOrder.length;
      const sessionId = r.seatOrder[idx];
      const p = r.state.players.get(sessionId);
      if (p && !p.isFolded && p.connected && p.pendingDiscardCards.length > 0) {
        playersNeedingCards.push({ player: p, sessionId });
      }
    }

    if (playersNeedingCards.length === 0) {
      r.startPhaseRevealBottomCard();
      return;
    }

    // Block dealing: all pending cards for current player, then next player
    let currentPlayerIdx = 0;

    const dealInterval = r.clock.setInterval(() => {
      if (currentPlayerIdx >= playersNeedingCards.length) {
        dealInterval.clear();
        r.startPhaseRevealBottomCard();
        return;
      }

      const { player, sessionId } = playersNeedingCards[currentPlayerIdx];

      if (player.pendingDiscardCards.length > 0) {
        // Deal 1 card from bottom of deck
        const card = r.deck.shift();
        if (card) {
          const newCards = player.cards ? player.cards + "," + card : card;
          r.setPlayerCards(sessionId, newCards);
        }
        player.pendingDiscardCards = player.pendingDiscardCards.slice(1);

        // If this player got all their cards, move to next player
        if (player.pendingDiscardCards.length === 0) {
          currentPlayerIdx++;
        }
      } else {
        // Player already done, skip to next
        currentPlayerIdx++;
      }

      // Check if all done
      if (currentPlayerIdx >= playersNeedingCards.length) {
        dealInterval.clear();
        r.startPhaseRevealBottomCard();
      }
    }, 800); // 800ms between each individual card
  },
};
