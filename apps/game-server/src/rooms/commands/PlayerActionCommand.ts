import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";
import { evaluateHand } from "../combinations";
import { SupabaseService } from "../../services/SupabaseService";

/**
 * PlayerActionCommand — handler unificado del mensaje "action" extraído de MesaRoom.
 * Cubre acciones del jugador en fases PIQUE, DESCARTE, APUESTA_4_CARTAS, GUERRA,
 * CANTICOS y GUERRA_JUEGO. Lift-and-shift verbatim (Fase 2.5).
 */

type RoomCtx = any;

export async function handlePlayerAction(room: MesaRoom, client: Client, message: any): Promise<void> {
  const r: RoomCtx = room;
  if (r.state.turnPlayerId !== client.sessionId) return;

  const player = r.state.players.get(client.sessionId);
  if (!player) return;

  if (r.state.phase === "PIQUE") {
    const { action } = message; // "voy" o "paso"

    if (action !== "paso" && action !== "voy") {
      console.log(`[MesaRoom] Acción inválida '${action}' de ${player.nickname} en fase PIQUE. Rechazada.`);
      return;
    }

    // Guard contra doble procesamiento (race condition con async handler)
    if (player.hasActed) {
      console.warn(`[MesaRoom] ${player.nickname} ya actuó en esta ronda de PIQUE. Ignorando duplicado.`);
      return;
    }

    // Reiniciar contador de restarts cuando un jugador actúa
    r.piqueRestartCount = 0;

    player.hasActed = true;

    r.recordEvent({ event: 'action', phase: 'PIQUE', player: client.sessionId, action, time: Date.now(), rng_state: r.getRngState() });

    if (action === "paso") {
      player.isFolded = true;
      r.piquePassPlayerIds.add(client.sessionId);
      // Rastrear si pasó antes de que existiera apuesta fija (candidato a reapertura)
      if (!r.piqueReopenActive && r.state.currentMaxBet === 0) {
        r.piquePreBetPasserIds.add(client.sessionId);
      }

      // ── Reapertura: paso definitivo (sin doble-botada, misma mano) ──
      if (r.piqueReopenActive) {
        r.piqueReopenPendingIds.delete(client.sessionId);
        r.state.lastAction = `${player.nickname} pasa definitivamente`;
      } else {
      // ── Doble-botada: lógica especial al botarse por 2ª vez ──
      const prevFolds = r.piqueFoldCount.get(client.sessionId) || 0;
      const newFolds = prevFolds + 1;
      r.piqueFoldCount.set(client.sessionId, newFolds);

      if (newFolds >= 2) {
        // Verificar si "lleva juego" (2 cartas del mismo palo → potencial Segunda)
        const playerCards = player.cards ? player.cards.split(',').filter(Boolean) : [];
        const suits = playerCards.map((c: string) => c.split('-')[1]);
        const llevaJuego = suits.length >= 2 && suits.every((s: string) => s === suits[0]);

        if (llevaJuego) {
          // Mostrar cartas públicamente (lleva juego y se bota)
          // El jugador controlará cuándo cerrar con "dismiss-reveal"
          player.revealedCards = player.cards;
          r.state.lastAction = `${player.nickname} lleva juego y se bota (muestra cartas)`;
          r.state.phase = "PIQUE_REVEAL";
          r.state.turnPlayerId = client.sessionId;
          r.broadcast("pique-fold-reveal", { playerId: client.sessionId, llevaJuego: true, cards: player.cards });
        } else {
          r.state.lastAction = `${player.nickname} se bota (sin juego)`;
        }

        // Recoger cartas, barajarlas y ponerlas encima del naipe
        const foldedCards = playerCards.slice();
        for (let i = foldedCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [foldedCards[i], foldedCards[j]] = [foldedCards[j], foldedCards[i]];
        }
        for (const card of foldedCards) {
          r.deck.push(card);
        }
        r.setPlayerCards(client.sessionId, "");

        if (llevaJuego) {
          // No avanzar turno aquí — esperar a que el jugador cierre el reveal
          return;
        }
      } else {
        r.state.lastAction = `${player.nickname} pasa en el Pique`;
      }
      } // end else (!piqueReopenActive)

      r.attemptManoRotation(client.sessionId, "Mano pasa en Pique");
      if (player.id === r.state.activeManoId) r.transferMano();
    } else if (action === "voy") {
      // Durante reapertura, sacar al jugador del set de pendientes
      if (r.piqueReopenActive) {
        r.piqueReopenPendingIds.delete(client.sessionId);
      }
      const betAmount = message.amount || r.state.minPique;
      const actualBet = Math.min(betAmount, player.chips);

      // ── Privilegio de La Mano: fija el precio del pique ──
      if (player.id === r.state.activeManoId) {
        // La Mano debe respetar el pique mínimo de la mesa
        if (actualBet > 0 && actualBet < r.state.minPique) {
          player.hasActed = false;
          r.currentTimeline.pop();
          client.send("error", { message: `El pique mínimo es $${(r.state.minPique / 100).toLocaleString()}` });
          return;
        }
        // La Mano impone el monto obligatorio para todos los demás
        if (actualBet > 0) {
          r.state.currentMaxBet = actualBet;
          console.log(`[MesaRoom] La Mano (${player.nickname}) fija el pique en $${actualBet}`);
        }
      } else {
        // ── Los demás DEBEN igualar exactamente lo que picó La Mano ──
        const requiredBet = r.state.currentMaxBet > 0 ? r.state.currentMaxBet : r.state.minPique;
        // Permitir all-in si no le alcanzan las fichas
        if (actualBet > 0 && actualBet < requiredBet && actualBet !== player.chips) {
          player.hasActed = false;
          r.currentTimeline.pop();
          client.send("error", { message: `Debes apostar $${(requiredBet / 100).toLocaleString()} (lo que picó La Mano)` });
          return;
        }
      }

      if (actualBet <= 0) {
        player.isFolded = true;
        r.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
        if (player.id === r.state.activeManoId) r.transferMano();
      } else {
        // Persist bet to DB before modifying RAM state
        if (player.supabaseUserId) {
          const result = await SupabaseService.recordBet(player.supabaseUserId, actualBet, r.currentGameId, undefined, { roomId: r.roomId, tableName: r.metadata?.tableName, phase: 'PIQUE' });
          if (result && !result.success && result.isBalanceError) {
            player.isFolded = true;
            r.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
            if (player.id === r.state.activeManoId) r.transferMano();
            r.advanceTurnPhase2();
            return;
          }
        }
        player.chips -= actualBet;
        r.state.piquePot += actualBet;
        r.state.lastAction = `${player.nickname} va $${(actualBet / 100).toLocaleString()} para Pique`;
      }
    }

    r.advanceTurnPhase2();
  } else if (r.state.phase === "DESCARTE") {
    const { action, droppedCards } = message;
    player.hasActed = true;
    r.recordEvent({ event: 'action', phase: 'DESCARTE', player: client.sessionId, action, droppedCards, time: Date.now(), rng_state: r.getRngState() });

    if (action === "discard") {
      if (droppedCards && Array.isArray(droppedCards) && droppedCards.length > 0) {
        let currentHand = player.cards ? player.cards.split(',').filter(Boolean) : [];
        currentHand = currentHand.filter((c: string) => !droppedCards.includes(c));
        r.setPlayerCards(client.sessionId, currentHand.join(','));
        for (const c of droppedCards) { r.deck.push(c); }
        player.pendingDiscardCards = droppedCards;
        r.state.lastAction = `${player.nickname} bota ${droppedCards.length} carta${droppedCards.length !== 1 ? 's' : ''}`;
      } else {
        // Keep all cards (discard 0)
        player.pendingDiscardCards = [];
        r.state.lastAction = `${player.nickname} mantiene su mano`;
      }
    } else if (action === "paso") {
      player.isFolded = true;
      r.state.lastAction = `${player.nickname} se bota`;
      r.attemptManoRotation(client.sessionId, "Mano se bota en descarte");
      if (player.id === r.state.activeManoId) r.transferMano();
    }
    r.advanceTurnPhaseDescarte();
  } else if (r.state.phase === "APUESTA_4_CARTAS" || r.state.phase === "GUERRA" || r.state.phase === "CANTICOS" || r.state.phase === "GUERRA_JUEGO") {
    const { action, amount } = message;
    const phase = r.state.phase;
    const advanceNext = () => r.advanceTurnBetting(
      undefined,
      r.getNextPhaseCallback(phase)
    );

    if (!["paso", "voy", "igualar", "resto"].includes(action)) {
      console.log(`[MesaRoom] Acción inválida '${action}' de ${player.nickname} en fase ${phase}. Rechazada.`);
      return;
    }

    r.recordEvent({ event: 'action', phase, player: client.sessionId, action, amount, time: Date.now(), rng_state: r.getRngState() });

    if (action === "paso") {
      if (r.state.currentMaxBet === 0 || player.roundBet >= r.state.currentMaxBet) {
        // Check: nadie ha apostado o ya igualamos
        player.hasActed = true;
        r.state.lastAction = `${player.nickname} pasa (check)`;
      } else if (phase === "GUERRA_JUEGO") {
        // GUERRA_JUEGO: declinar la apuesta extra sin perder elegibilidad de showdown
        player.hasActed = true;
        player.declinedGuerraJuegoBet = true;
        r.state.lastAction = `${player.nickname} pasa (no iguala)`;
        console.log(`[MesaRoom] ${player.nickname} declina apuesta extra en GUERRA_JUEGO — sigue al showdown`);
      } else {
        // Hay apuesta activa y no hemos igualado

        const hand = evaluateHand(player.cards);
        if (hand.type !== 'NINGUNA') {
          // Resolución inmediata: preguntar Llevo Juego / No Llevo ahora mismo
          r.pendingPasoJuegoPlayerId = client.sessionId;
          r.pendingPasoJuegoPhase = phase;
          client.send('paso-juego-choice', { handType: hand.type });
          r.state.lastAction = `${player.nickname} decide si lleva juego...`;
          console.log(`[MesaRoom] ${player.nickname} paso definitivo con juego (${hand.type}) en ${phase} — esperando decisión inmediata`);
          // NO llamar advanceNext() — turn queda en este jugador hasta que responda
          return;
        } else {
          // No tiene juego: fold inmediato + recoger cartas al naipe
          const wasMano = player.id === r.state.activeManoId;
          player.isFolded = true;
          player.hasActed = true;
          r.state.lastAction = `${player.nickname} se bota`;

          // Recoger cartas del jugador al naipe
          r.collectPlayerCards(client.sessionId, phase === 'APUESTA_4_CARTAS' && wasMano && r.seatOrder.length === 7);

          r.attemptManoRotation(client.sessionId, "Mano se bota en apuestas");
          if (wasMano) r.transferMano();
        }
      }
      advanceNext();

    } else if (action === "voy") {
      r.pasoPendienteIds.delete(client.sessionId);
      const betIncrement = amount || 0;
      if (betIncrement <= 0) {
        console.log(`[MesaRoom] ${player.nickname} intentó IR con monto inválido.`);
        return;
      }
      // Validar que el nuevo total supere currentMaxBet (raise)
      if (player.roundBet + betIncrement <= r.state.currentMaxBet) {
        client.send("error", { message: `La apuesta debe superar $${(r.state.currentMaxBet / 100).toLocaleString()}` });
        return;
      }
      const actualBet = Math.min(betIncrement, player.chips);
      if (actualBet <= 0) {
        player.isFolded = true;
        player.hasActed = true;
        r.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
        r.attemptManoRotation(client.sessionId, "Mano sin fichas en apuestas");
        if (player.id === r.state.activeManoId) r.transferMano();
        advanceNext();
        return;
      }
      // Persist to DB
      if (player.supabaseUserId) {
        const result = await SupabaseService.recordBet(player.supabaseUserId, actualBet, r.currentGameId, undefined, { roomId: r.roomId, tableName: r.metadata?.tableName, phase });
        if (result && !result.success && result.isBalanceError) {
          player.isFolded = true;
          player.hasActed = true;
          r.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
          r.attemptManoRotation(client.sessionId, "Mano sin fondos en apuestas");
          if (player.id === r.state.activeManoId) r.transferMano();
          advanceNext();
          return;
        }
      }
      player.chips -= actualBet;
      player.roundBet += actualBet;
      player.totalMainBet += actualBet;
      r.state.pot += actualBet;
      r.state.currentMaxBet = player.roundBet;
      r.state.highestBetPlayerId = client.sessionId;
      player.hasActed = true;
      r.state.lastAction = `${player.nickname} va $${(actualBet / 100).toLocaleString()}`;
      advanceNext();

    } else if (action === "igualar") {
      r.pasoPendienteIds.delete(client.sessionId);
      const callAmount = r.state.currentMaxBet - player.roundBet;
      if (callAmount <= 0) {
        player.hasActed = true;
        advanceNext();
        return;
      }
      const actualCall = Math.min(callAmount, player.chips);
      // Persist to DB
      if (player.supabaseUserId) {
        const result = await SupabaseService.recordBet(player.supabaseUserId, actualCall, r.currentGameId, undefined, { roomId: r.roomId, tableName: r.metadata?.tableName, phase });
        if (result && !result.success && result.isBalanceError) {
          player.isFolded = true;
          player.hasActed = true;
          r.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
          r.attemptManoRotation(client.sessionId, "Mano sin fondos al igualar");
          if (player.id === r.state.activeManoId) r.transferMano();
          advanceNext();
          return;
        }
      }
      player.chips -= actualCall;
      player.roundBet += actualCall;
      player.totalMainBet += actualCall;
      r.state.pot += actualCall;
      if (actualCall < callAmount) {
        // Couldn't fully call → implicit all-in
        player.isAllIn = true;
        r.state.lastAction = `${player.nickname} iguala parcial $${(actualCall / 100).toLocaleString()} (resto)`;
      } else {
        r.state.lastAction = `${player.nickname} iguala $${(actualCall / 100).toLocaleString()}`;
      }
      player.hasActed = true;
      advanceNext();

    } else if (action === "resto") {
      r.pasoPendienteIds.delete(client.sessionId);
      const allInAmount = player.chips;
      if (allInAmount <= 0) {
        player.isFolded = true;
        player.hasActed = true;
        r.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
        r.attemptManoRotation(client.sessionId, "Mano sin fichas para resto");
        if (player.id === r.state.activeManoId) r.transferMano();
        advanceNext();
        return;
      }
      // Persist to DB
      if (player.supabaseUserId) {
        const result = await SupabaseService.recordBet(player.supabaseUserId, allInAmount, r.currentGameId, undefined, { roomId: r.roomId, tableName: r.metadata?.tableName, phase });
        if (result && !result.success && result.isBalanceError) {
          player.isFolded = true;
          player.hasActed = true;
          r.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
          r.attemptManoRotation(client.sessionId, "Mano sin fondos para resto");
          if (player.id === r.state.activeManoId) r.transferMano();
          advanceNext();
          return;
        }
      }
      player.chips -= allInAmount;
      player.roundBet += allInAmount;
      player.totalMainBet += allInAmount;
      r.state.pot += allInAmount;
      player.isAllIn = true;
      if (player.roundBet > r.state.currentMaxBet) {
        r.state.currentMaxBet = player.roundBet;
        r.state.highestBetPlayerId = client.sessionId;
      }
      player.hasActed = true;
      r.state.lastAction = `${player.nickname} va RESTO $${(allInAmount / 100).toLocaleString()}`;
      advanceNext();
    }
  }
}
