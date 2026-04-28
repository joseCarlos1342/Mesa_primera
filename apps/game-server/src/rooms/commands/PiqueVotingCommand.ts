import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";
import type { Player } from "../../schemas/GameState";

/**
 * PiqueVotingCommand — handlers de propuesta y votación de pique fijo (Fase 2.2).
 *
 * Comportamiento idéntico al original embebido en `MesaRoom.onCreate()`.
 * Se preserva el acceso a privates vía cast `any` (limpieza tipada → Fase 5).
 */

type RoomCtx = MesaRoom;

interface ProposePiquePayload {
  amount?: number;
}

interface VotePiquePayload {
  approve?: boolean;
}

export function handleProposePique(room: MesaRoom, client: Client, message: ProposePiquePayload): void {
  const r: RoomCtx = room;
  if (r.state.phase !== "LOBBY") return;
  const player = r.state.players.get(client.sessionId) as Player | undefined;
  if (!player || player.isWaiting) return;
  if (r.state.proposedPique > 0) return; // Ya hay una propuesta activa

  const amount = message.amount;
  if (typeof amount !== "number" || amount < 500_000 || amount > 50_000_000) return;
  if (amount === r.state.minPique) return; // No tiene sentido proponer el mismo valor

  r.piqueProposerId = client.sessionId;
  r.piqueVoters.clear();
  r.state.proposedPique = amount;
  r.state.proposedPiqueBy = client.sessionId;
  r.state.piqueVotesFor = 0;
  r.state.piqueVotesAgainst = 0;

  // Votantes = jugadores activos conectados que no son el proponente ni están en espera
  const voters = Array.from(r.state.players.values() as IterableIterator<Player>)
    .filter((p: Player) => p.connected && !p.isWaiting && p.id !== client.sessionId);
  r.state.piqueVotersTotal = voters.length;

  r.state.lastAction = `${player.nickname} propone Pique Fijo de $${(amount / 100).toLocaleString()}`;
  console.log(`[MesaRoom] ${player.nickname} propone pique fijo: $${amount / 100}`);

  // Si es el único jugador, auto-aprobar
  if (voters.length === 0) {
    r.state.minPique = amount;
    r.broadcast("pique_approved", { amount });
    r.clearPiqueProposal();
  }
}

export function handleVotePique(room: MesaRoom, client: Client, message: VotePiquePayload): void {
  const r: RoomCtx = room;
  if (r.state.phase !== "LOBBY") return;
  if (r.state.proposedPique === 0) return;
  if (client.sessionId === r.piqueProposerId) return; // El proponente no vota
  if (r.piqueVoters.has(client.sessionId)) return; // Ya votó

  const player = r.state.players.get(client.sessionId) as Player | undefined;
  if (!player || player.isWaiting) return;

  const approve = !!message.approve;
  r.piqueVoters.set(client.sessionId, approve);

  if (approve) {
    r.state.piqueVotesFor++;
  } else {
    r.state.piqueVotesAgainst++;
  }

  r.resolvePiqueVoteIfReady();
}
