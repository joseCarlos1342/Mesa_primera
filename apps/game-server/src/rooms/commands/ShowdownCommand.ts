import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";
import type { Player } from "../../schemas/GameState";
import { evaluateHand } from "../combinations";
import { SupabaseService } from "../../services/SupabaseService";

/**
 * ShowdownCommand — handlers de fase final y revelación: Fase 2.4.
 * Agrupa: `dismiss-showdown`, `show-muck`, `declarar-juego`, `dismiss-reveal`,
 * `llevo-juego`, `paso-juego-response`. Comportamiento idéntico al original.
 */

type RoomCtx = any;

interface ShowMuckPayload { action?: "show" | "muck" }
interface DeclararJuegoPayload { tiene?: boolean }
interface PasoJuegoResponsePayload { llevaJuego?: boolean }

export function handleDismissShowdown(room: MesaRoom, _client: Client): void {
  const r: RoomCtx = room;
  if (r.state.phase !== "SHOWDOWN") return;

  // Caso 1: Showdown del pique (después de completar 4 cartas)
  if (r.pendingPiqueWinnerId) {
    r.state.players.forEach((p: Player) => { p.revealedCards = ""; });
    const winnerId = r.pendingPiqueWinnerId;
    r.attemptManoRotation(winnerId, "Mano ganó Pique");
    r.awardPiqueAndContinue(winnerId);
    return;
  }

  // Caso 2: Showdown de un solo jugador que eligió mostrar cartas
  if (!r.pendingShowdownData) {
    r.state.players.forEach((p: Player) => { p.revealedCards = ""; });
    const winner = Array.from(r.state.players.values() as IterableIterator<Player>)
      .find((p: Player) => !p.isFolded && p.connected);
    if (winner) {
      r.awardPot(winner.id);
    }
    return;
  }

  // Caso 3: Showdown multi-jugador — payout already persisted, just cleanup
  const { overallWinnerId, potWinners, totalPayout, totalRake, activePlayers } = r.pendingShowdownData;
  r.pendingShowdownData = null;
  r.finalizeShowdown(overallWinnerId, potWinners, totalPayout, totalRake, activePlayers);
}

export function handleShowMuck(room: MesaRoom, client: Client, message: ShowMuckPayload): void {
  const r: RoomCtx = room;
  if (r.state.phase !== "SHOWDOWN_WAIT") return;
  const player = r.state.players.get(client.sessionId);
  if (!player) return;
  // Solo el ganador puede decidir
  if (client.sessionId !== r.state.turnPlayerId) return;

  // Check if this is a pique show/muck or main pot show/muck
  if (r.pendingPiqueWinnerId) {
    if (message.action === "show") {
      r.state.lastAction = `${player.nickname} muestra sus cartas del Pique`;
      player.revealedCards = player.cards;
      r.state.phase = "SHOWDOWN";
      r.state.showdownTimer = 0;
      // Sin timer — esperar "dismiss-showdown"
    } else {
      r.state.lastAction = `${player.nickname} no muestra las cartas`;
      r.awardPiqueAndContinue(client.sessionId);
    }
    return;
  }

  if (message.action === "show") {
    r.state.lastAction = `${player.nickname} muestra sus cartas`;
    player.revealedCards = player.cards;
    // Mostrar cartas sin timer automático — esperar "dismiss-showdown"
    r.state.phase = "SHOWDOWN";
    r.state.showdownTimer = 0;
  } else {
    r.state.lastAction = `${player.nickname} no muestra las cartas`;
    r.awardPot(client.sessionId);
  }
}

export function handleDeclararJuego(room: MesaRoom, client: Client, message: DeclararJuegoPayload): void {
  const r: RoomCtx = room;
  if (r.state.phase !== "DECLARAR_JUEGO") return;
  if (r.state.turnPlayerId !== client.sessionId) return;
  const player = r.state.players.get(client.sessionId);
  if (!player) return;

  // Server-side validation: determine if the player actually has juego
  const hand = evaluateHand(player.cards);
  const actuallyHasJuego = hand.type !== 'NINGUNA';
  // Force the correct value regardless of what the client sent
  const tiene = actuallyHasJuego;

  player.hasActed = true;
  player.declaredJuego = tiene;
  r.recordEvent({ event: 'declarar_juego', player: client.sessionId, tiene, clientClaimed: message?.tiene, serverOverride: message?.tiene !== tiene, time: Date.now(), rng_state: r.getRngState() });

  if (tiene) {
    const hand2 = evaluateHand(player.cards);
    r.state.lastAction = `${player.nickname} declara: ¡Tengo ${hand2.type}!`;
    console.log(`[MesaRoom] ${player.nickname} declara tener juego (${hand2.type}, ${hand2.points} pts)`);
  } else {
    r.state.lastAction = `${player.nickname} declara: No tengo juego`;
    console.log(`[MesaRoom] ${player.nickname} declara no tener juego`);
  }

  r.advanceTurnDeclarar();
}

export function handleDismissReveal(room: MesaRoom, _client: Client): void {
  const r: RoomCtx = room;
  if (r.state.phase !== "PIQUE_REVEAL") return;

  // ── Caso: Llevo Juego durante DESCARTE (o cualquier fase de apuestas) ──
  if (r.pendingLlevoJuegoPlayerId) {
    const playerId = r.pendingLlevoJuegoPlayerId;
    r.pendingLlevoJuegoPlayerId = "";
    const player = r.state.players.get(playerId);

    if (player) {
      player.revealedCards = "";

      // Barajar cartas del jugador y ponerlas encima del naipe
      const playerCards = player.cards ? player.cards.split(',').filter(Boolean) : [];
      for (let i = playerCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playerCards[i], playerCards[j]] = [playerCards[j], playerCards[i]];
      }
      for (const card of playerCards) {
        r.deck.push(card);
      }
      r.setPlayerCards(playerId, "");

      // Pagar pique menos comisión
      const piqueRake = Math.ceil(r.state.piquePot * 0.05 / 100) * 100;
      const piquePayout = r.state.piquePot - piqueRake;
      player.chips += piquePayout;
      console.log(`[MesaRoom] ${player.nickname} gana el pique por Llevo Juego: $${piquePayout} (Rake: $${piqueRake})`);
      r.state.lastAction = `¡${player.nickname} gana el Pique! (+$${(piquePayout / 100).toLocaleString()})`;

      if (player.supabaseUserId) {
        SupabaseService.awardPot(player.supabaseUserId, piquePayout, piqueRake, r.currentGameId).catch(console.error);
      }
      r.recordEvent({ event: 'pique_won', winner: playerId, piquePot: r.state.piquePot, payout: piquePayout, rake: piqueRake, time: Date.now(), rng_state: r.getRngState() });
      r.state.piquePot = 0;

      // Retirar al jugador del pot principal
      player.isFolded = true;
      if (player.id === r.state.activeManoId) r.transferMano();
    }

    // Reanudar la fase de origen
    const returnPhase = r.phaseBeforePiqueReveal || "DESCARTE";
    r.phaseBeforePiqueReveal = "";

    if (returnPhase === "DESCARTE") {
      r.state.phase = "DESCARTE";
      r.advanceTurnPhaseDescarte();
    } else {
      // APUESTA_4_CARTAS, GUERRA, CANTICOS, etc.
      r.state.phase = returnPhase;
      const nextPhaseCallback = r.getNextPhaseCallback(returnPhase);
      r.advanceTurnBetting(undefined, nextPhaseCallback);
    }
    return;
  }

  // ── Caso original: reveal durante PIQUE ──
  const revealedPlayer = Array.from(r.state.players.values() as IterableIterator<Player>)
    .find((p: Player) => p.revealedCards && p.isFolded);
  if (revealedPlayer) {
    revealedPlayer.revealedCards = "";
  }
  // Restaurar la fase PIQUE y continuar el turno
  r.state.phase = "PIQUE";
  r.advanceTurnPhase2();
}

export function handleLlevoJuego(room: MesaRoom, client: Client): void {
  const r: RoomCtx = room;
  if (r.state.phase !== "DESCARTE") return;
  if (r.state.turnPlayerId !== client.sessionId) return;
  const player = r.state.players.get(client.sessionId);
  if (!player || !player.passedWithJuego) return;

  player.hasActed = true;
  player.revealedCards = player.cards;
  r.state.lastAction = `¡${player.nickname} lleva juego!`;
  console.log(`[MesaRoom] ${player.nickname} declara Llevo Juego en DESCARTE`);

  r.recordEvent({ event: 'action', phase: 'DESCARTE', player: client.sessionId, action: 'llevo-juego', time: Date.now(), rng_state: r.getRngState() });

  // Guardar referencia para procesar en dismiss-reveal
  r.pendingLlevoJuegoPlayerId = client.sessionId;
  r.phaseBeforePiqueReveal = "DESCARTE";

  // Cambiar a PIQUE_REVEAL para mostrar las cartas
  r.state.phase = "PIQUE_REVEAL";
  r.state.turnPlayerId = client.sessionId;

  r.broadcast("pique-fold-reveal", {
    playerId: client.sessionId,
    llevaJuego: true,
    cards: player.cards
  });
}

export function handlePasoJuegoResponse(room: MesaRoom, client: Client, message: PasoJuegoResponsePayload): void {
  const r: RoomCtx = room;
  if (r.pendingPasoJuegoPlayerId !== client.sessionId) return;
  const resolvePhase = r.pendingPasoJuegoPhase;
  if (r.state.phase !== resolvePhase) return;

  const player = r.state.players.get(client.sessionId);
  if (!player) return;

  const { llevaJuego } = message;
  r.pendingPasoJuegoPlayerId = "";
  r.pendingPasoJuegoPhase = "";

  r.recordEvent({ event: 'action', phase: resolvePhase, player: client.sessionId, action: llevaJuego ? 'llevo-juego-inmediato' : 'no-llevo-juego', time: Date.now(), rng_state: r.getRngState() });

  // Callback de siguiente fase según la fase actual
  const nextPhaseCallback = r.getNextPhaseCallback(resolvePhase);

  if (llevaJuego) {
    player.hasActed = true;
    player.passedWithJuego = true;

    if (resolvePhase === 'APUESTA_4_CARTAS') {
      // En APUESTA_4_CARTAS: sale del pozo principal, compite solo por pique (diferido)
      player.isFolded = true;
      player.revealedCards = player.cards;
      r.state.lastAction = `¡${player.nickname} lleva juego!`;
      console.log(`[MesaRoom] ${player.nickname} lleva juego en APUESTA_4_CARTAS — sale del pozo principal, pique diferido`);

      r.broadcast("pique-fold-reveal", {
        playerId: client.sessionId,
        llevaJuego: true,
        cards: player.cards
      });

      r.attemptManoRotation(client.sessionId, "Lleva juego — sale del pozo principal");
      if (player.id === r.state.activeManoId) r.transferMano();

      // Continuar la ronda de apuestas (pique se resuelve al final)
      r.advanceTurnBetting(undefined, nextPhaseCallback);
    } else {
      // Otras fases: revelar cartas, resolver pique inmediatamente via PIQUE_REVEAL
      player.revealedCards = player.cards;
      r.state.lastAction = `¡${player.nickname} lleva juego!`;
      console.log(`[MesaRoom] ${player.nickname} lleva juego inmediatamente en ${resolvePhase}`);

      r.pendingLlevoJuegoPlayerId = client.sessionId;
      r.phaseBeforePiqueReveal = resolvePhase;

      r.state.phase = "PIQUE_REVEAL";
      r.state.turnPlayerId = client.sessionId;

      r.broadcast("pique-fold-reveal", {
        playerId: client.sessionId,
        llevaJuego: true,
        cards: player.cards
      });
    }
  } else {
    // No lleva juego: fold y devolver cartas al mazo
    player.isFolded = true;
    player.hasActed = true;
    r.state.lastAction = `${player.nickname} no lleva juego — se bota`;
    console.log(`[MesaRoom] ${player.nickname} no lleva juego — fold inmediato en ${resolvePhase}`);

    const wasMano = player.id === r.state.activeManoId;
    r.collectPlayerCards(client.sessionId, resolvePhase === 'APUESTA_4_CARTAS' && wasMano && r.seatOrder.length === 7);

    r.attemptManoRotation(client.sessionId, "Mano no lleva juego");
    if (wasMano) r.transferMano();

    // Continuar la ronda de apuestas con el callback correcto
    r.advanceTurnBetting(undefined, nextPhaseCallback);
  }
}
