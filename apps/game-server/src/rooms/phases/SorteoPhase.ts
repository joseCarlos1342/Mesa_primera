import type { IGamePhase, PhaseContext } from "./IGamePhase";
import type { Player } from "../../schemas/GameState";

import type { MesaRoom } from "../MesaRoom";
type Ctx = MesaRoom;

/**
 * Fase 1: Sorteo de La Mano
 * STARTING (5s intro) → BARAJANDO (12s shuffle) → SORTEO_MANO (3s/carta hasta encontrar oro)
 * → encadenado a startPhase2Pique tras 3s.
 */
export const sorteoPhase: IGamePhase = {
  id: "STARTING",
  enter(ctx: PhaseContext) {
    const r: Ctx = ctx;

    r.clearTurnTimer();
    r.state.phase = "STARTING";
    console.log(`[MesaRoom] Fase STARTING: mostrando intro animación...`);

    r.clock.setTimeout(() => {
      r.state.phase = "BARAJANDO";
      console.log(`[MesaRoom] Barajando para Sorteo Mano...`);

      r.createDeck();
      r.shuffleDeck();

      r.clock.setTimeout(() => {
        r.state.phase = "SORTEO_MANO";
        console.log(`[MesaRoom] Fase 1: Sorteo de La Mano buscando un Oro...`);

        let manoPlayerId = "";

        const playerIds = Array.from(r.state.players.keys()) as string[];
        const hostIdx = playerIds.indexOf(r.state.dealerId) >= 0 ? playerIds.indexOf(r.state.dealerId) : 0;

        const orderedActivePlayers: { player: Player; sessionId: string }[] = [];
        for (let i = 0; i < playerIds.length; i++) {
          const idx = (hostIdx + i) % playerIds.length;
          const sessionId = playerIds[idx];
          const p = r.state.players.get(sessionId);
          if (p && !p.isFolded && p.connected) {
            orderedActivePlayers.push({ player: p, sessionId });
          }
        }

        let currentPlayerIndex = 0;

        const dealInterval = r.clock.setInterval(() => {
          if (manoPlayerId || r.deck.length === 0) {
            dealInterval.clear();
            if (manoPlayerId) {
              r.state.dealerId = manoPlayerId;
              r.state.lastAction = `¡${r.state.players.get(manoPlayerId)?.nickname} sacó ORO y es La Mano!`;
              r.assignTurnOrders();
            }

            r.clock.setTimeout(() => {
              piquePhase.enter(r);
            }, 3000);
            return;
          }

          const { player, sessionId } = orderedActivePlayers[currentPlayerIndex];
          const card = r.deck.pop();

          if (card) {
            const newCards = player.cards ? player.cards + "," + card : card;
            r.setPlayerCards(sessionId, newCards, true);

            const suit = card.split('-')[1];
            if (suit === 'O') {
              manoPlayerId = sessionId;
            }
          }

          currentPlayerIndex = (currentPlayerIndex + 1) % orderedActivePlayers.length;
        }, 3000);
      }, 12000);
    }, 5000);
  },
};

/**
 * Fase 2: El Pique
 * BARAJANDO (12s) → PIQUE_DEAL (2 cartas/jugador, 3s entre cada uno)
 * → PIQUE (turnos de apuesta) iniciado en advanceTurnPhase2
 *
 * opts.skipAnte: si true, no muestra "Nueva mano iniciada" (usado en restartPique).
 */
export const piquePhase: IGamePhase = {
  id: "PIQUE",
  async enter(ctx: PhaseContext, opts?: { skipAnte?: boolean }) {
    const r: Ctx = ctx;
    const skipAnte = opts?.skipAnte === true;

    r.state.phase = "BARAJANDO";
    console.log(`[MesaRoom] Barajando para el Pique...`);

    r.piquePassPlayerIds.clear();
    r.piquePreBetPasserIds.clear();
    r.piqueReopenActive = false;
    r.piqueReopenPendingIds.clear();

    r.state.currentMaxBet = 0;

    r.createDeck();
    r.shuffleDeck();
    r.state.players.forEach((p: Player, sessionId: string) => {
      r.setPlayerCards(sessionId, "");
      p.revealedCards = "";
    });

    r.state.activeManoId = r.state.dealerId;

    const dealerPlayer = r.state.players.get(r.state.activeManoId);
    if (dealerPlayer && !dealerPlayer.connected) {
      console.log(`[MesaRoom] startPhase2Pique: dealer ${dealerPlayer.nickname} desconectado, transfiriendo mano activa...`);
      r.transferMano();
    }

    for (const [, p] of r.state.players) {
      (p as Player).isFolded = !(p as Player).connected || (p as Player).isWaiting;
    }
    if (!skipAnte) {
      r.state.lastAction = `Nueva mano iniciada.`;
    }

    r.clock.setTimeout(() => {
      r.state.phase = "PIQUE_DEAL";
      console.log(`[MesaRoom] Repartiendo 2 cartas de pique por jugador...`);

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

      let currentPlayerIndex = 0;

      const dealInterval = r.clock.setInterval(() => {
        if (currentPlayerIndex >= orderedActivePlayers.length) {
          dealInterval.clear();
          r.clock.setTimeout(() => {
            r.state.phase = "PIQUE";
            r.state.players.forEach((p: Player) => { p.hasActed = false; });
            r.advanceTurnPhase2(r.state.activeManoId);
          }, 1000);
          return;
        }

        const { sessionId } = orderedActivePlayers[currentPlayerIndex];
        const card1 = r.deck.pop();
        const card2 = r.deck.pop();
        let newCards = "";
        if (card1) newCards = card1;
        if (card2) newCards = newCards ? newCards + "," + card2 : card2;
        r.setPlayerCards(sessionId, newCards);

        currentPlayerIndex++;
      }, 3000);
    }, 12000);
  },
};
