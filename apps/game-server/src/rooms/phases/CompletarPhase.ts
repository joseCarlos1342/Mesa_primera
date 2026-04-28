/**
 * Fase 4.5 — COMPLETAR.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhase3CompletarMano`.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";

type Ctx = any;

export const completarPhase: IGamePhase = {
  id: "COMPLETAR",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    r.state.phase = "COMPLETAR";
    console.log(`[MesaRoom] Iniciando Fase 3: Completar`);

    // Collect cards from folded players back onto the top of the deck
    for (const id of r.seatOrder) {
      const p = r.state.players.get(id);
      if (p && p.isFolded && p.cards) {
        for (const card of p.cards.split(',').filter(Boolean)) {
          r.deck.push(card);
        }
        r.setPlayerCards(id, "");
      }
    }

    // Build ordered active players starting from La Mano
    const dealerSeatIdx = r.seatOrder.indexOf(r.state.activeManoId);
    const startIdx = dealerSeatIdx >= 0 ? dealerSeatIdx : 0;
    const orderedActivePlayers: { player: Player; sessionId: string }[] = [];
    for (let i = 0; i < r.seatOrder.length; i++) {
      const idx = (startIdx + i) % r.seatOrder.length;
      const sessionId = r.seatOrder[idx];
      const p = r.state.players.get(sessionId);
      if (p && !p.isFolded && p.connected) {
        orderedActivePlayers.push({ player: p, sessionId });
      }
    }

    if (orderedActivePlayers.length === 0) {
      r.afterPiqueResolution();
      return;
    }

    let currentPlayerIndex = 0;
    let roundsDealt = 0;

    const dealInterval = r.clock.setInterval(() => {
      if (roundsDealt >= 2) {
        dealInterval.clear();
        r.clock.setTimeout(() => {
          r.afterPiqueResolution();
        }, 1000);
        return;
      }

      const { player, sessionId } = orderedActivePlayers[currentPlayerIndex];
      const currentCardsCount = player.cards ? player.cards.split(',').filter(Boolean).length : 0;

      if (currentCardsCount < 4) {
        // Repartir desde el fondo del mazo para evitar dar las cartas
        // recién devueltas por jugadores que pasaron (están en el tope)
        const card = r.deck.shift();
        if (card) {
          const newCards = player.cards ? player.cards + "," + card : card;
          r.setPlayerCards(sessionId, newCards);
        }
      }

      currentPlayerIndex++;
      if (currentPlayerIndex >= orderedActivePlayers.length) {
        currentPlayerIndex = 0;
        roundsDealt++;
      }
    }, 3000);
  },
};
