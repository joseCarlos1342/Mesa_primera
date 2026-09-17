/**
 * Fase 4.11 — SHOWDOWN.
 *
 * Lift-and-shift verbatim de `MesaRoom.startPhase6Showdown`.
 * `persistShowdownResults`, `calculateSidePots`, `endHandEarlyAfterFoldOut`,
 * `notifyInsufficientBalance`, `promoteWaitingPlayers`, `recordEvent`, `getRngState`,
 * `snapshotBuilder` y `pendingShowdownData` permanecen como miembros de MesaRoom.
 */
import type { IGamePhase, PhaseContext } from "./IGamePhase";
import { Player } from "../../schemas/GameState";
import { evaluateHand, resolveHandWinners, splitAmount } from "../combinations";

import type { MesaRoom } from "../MesaRoom";
type Ctx = MesaRoom;

export const showdownPhase: IGamePhase = {
  id: "SHOWDOWN",
  enter(ctx: Ctx) {
    const r: Ctx = ctx;
    r.state.phase = "SHOWDOWN";
    console.log(`[MesaRoom] Iniciando Fase 6: Showdown`);

    // Include isAllIn players (they stay to compete) + non-folded connected
    const activePlayers = (Array.from(r.state.players.values()) as Player[])
      .filter((p: Player) => !p.isFolded && (p.connected || p.isAllIn));

    if (activePlayers.length === 0) {
      r.state.pot = 0;
      r.state.piquePot = 0;
      r.promoteWaitingPlayers();
      r.state.phase = "LOBBY";
      r.notifyInsufficientBalance();
      return;
    }

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      if (r.forcedShowdownRevealWinnerId === winner.id) {
        console.log(`[MesaRoom] ${winner.nickname} debe mostrar obligatorio por juego declarado`);
        winner.revealedCards = winner.cards;
        r.state.lastAction = `¡${winner.nickname} gana con ${evaluateHand(winner.cards).type}!`;
        r.state.turnPlayerId = winner.id;
        r.state.showdownTimer = 0;
        r.clearTurnTimer();
        r.startShowdownAutoTimer();
        return;
      }

      if (r.state.pot === 0) {
        // Pot=0 (apuesta devuelta) pero queda un ganador con cartas:
        // Revelar obligatoriamente su mano antes de cerrar.
        if (winner.cards) {
          console.log(`[MesaRoom] Solo queda ${winner.nickname} con pot=0 — revelación obligatoria de mano`);
          winner.revealedCards = winner.cards;
          r.state.lastAction = `¡${winner.nickname} gana! (${evaluateHand(winner.cards).type})`;
          r.state.showdownTimer = 0;
          // ── No awardPot ni stats para pot=0 (victoria fantasma) ──
          r.recordEvent({ event: 'end', winner: winner.id, pot: 0, payout: 0, rake: 0, time: Date.now(), rng_state: r.getRngState() });
          // Auto-avance a LOBBY tras timeout
          r.startShowdownAutoTimer();
          return;
        }
        // Sin cartas: nada que mostrar, cerrar directamente
        console.log(`[MesaRoom] Solo queda ${winner.nickname} con pot=0 y sin cartas — terminando`);
        r.endHandEarlyAfterFoldOut();
        return;
      }
      r.state.lastAction = `¡${winner.nickname} gana!`;
      // Dar opción de mostrar o no mostrar cartas (sin timer automático)
      r.state.phase = "SHOWDOWN_WAIT";
      r.state.turnPlayerId = winner.id;
      r.state.showdownTimer = 0;
      r.clearTurnTimer();
      // Auto-avance si no hay respuesta del cliente
      r.startShowdownAutoTimer();
      return;
    }

    // Revelar cartas de TODOS los jugadores activos (obligatorio cuando 2+ compiten).
    activePlayers.forEach((p: Player) => {
      p.revealedCards = p.cards;
    });
    console.log(`[MesaRoom] Showdown: revelando cartas de ${activePlayers.length} jugadores activos`);

    // Calculate side pots
    const sidePots = r.calculateSidePots(activePlayers);

    // Evaluate hands — La Mano activa (activeManoId) gets +1 point tiebreaker.
    // If the bonus still leaves a tie, the corresponding pot is split.
    const manoId = r.state.activeManoId || r.state.dealerId;

    // Award each side pot to its best eligible hand
    let overallWinnerId = "";
    let totalPayout = 0;
    let totalRake = 0;
    let lastPotWinnerCount = 0;
    const potWinners: { winnerId: string; potAmount: number; payout: number; rake: number }[] = [];

    for (const sp of sidePots) {
      const eligible = sp.eligiblePlayerIds
        .map((id: string) => activePlayers.find((p: Player) => p.id === id))
        .filter(Boolean) as Player[];

      if (eligible.length === 0) continue;

      const rake = Math.ceil(sp.amount * 0.05 / 100) * 100;
      const payout = sp.amount - rake;
      totalPayout += payout;
      totalRake += rake;
      const winnerIds = resolveHandWinners(eligible, manoId).sort((left, right) => {
        const leftSeat = r.seatOrder.indexOf(left);
        const rightSeat = r.seatOrder.indexOf(right);
        return (leftSeat === -1 ? Number.MAX_SAFE_INTEGER : leftSeat)
          - (rightSeat === -1 ? Number.MAX_SAFE_INTEGER : rightSeat);
      });
      lastPotWinnerCount = winnerIds.length;
      const payoutShares = splitAmount(payout, winnerIds);
      const rakeShares = splitAmount(rake, winnerIds);

      for (let i = 0; i < payoutShares.length; i++) {
        const share = payoutShares[i];
        const winner = r.state.players.get(share.playerId);
        if (winner) winner.chips += share.amount;
        potWinners.push({
          winnerId: share.playerId,
          potAmount: sp.amount,
          payout: share.amount,
          rake: rakeShares[i]?.amount ?? 0,
        });
      }

      overallWinnerId = winnerIds[0] ?? overallWinnerId;
      const winnerNames = winnerIds
        .map((id) => r.state.players.get(id)?.nickname)
        .filter(Boolean)
        .join(' y ');
      const tieLabel = winnerIds.length > 1 ? ' (pozo dividido)' : '';
      console.log(`[MesaRoom] Side pot $${sp.amount}: ${winnerNames} gana(n) $${payout}${tieLabel}`);
    }

    // Determine overall winner for display (last/largest pot winner)
    const mainWinner = r.state.players.get(overallWinnerId);
    if (mainWinner) {
       const bestHand = evaluateHand(mainWinner.cards);
       r.state.lastAction = lastPotWinnerCount > 1
         ? `¡Pozo dividido entre ${lastPotWinnerCount} jugadores!`
         : `¡${mainWinner.nickname} gana con ${bestHand.type}! (${bestHand.points} pts)`;
    }

    // Sin timer automático — se espera "dismiss-showdown" de cualquier jugador
    r.state.showdownTimer = 0;
    r.clearTurnTimer();
    // Auto-avance a LOBBY si nadie envía dismiss-showdown en 30s
    r.startShowdownAutoTimer();
    // Guardar datos del showdown para finalizar cuando alguien cierre
    r.pendingShowdownData = { overallWinnerId, potWinners, totalPayout, totalRake, activePlayers };

    // Persist payout immediately — don't wait for dismiss
    r.persistShowdownResults(overallWinnerId, potWinners, totalPayout, totalRake, activePlayers);
  },
};
