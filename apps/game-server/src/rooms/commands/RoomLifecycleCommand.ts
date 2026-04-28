import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";

/**
 * RoomLifecycleCommand — handlers cortos de ciclo de vida del jugador en sala.
 * Agrupa: `toggleReady`, `abandon`, `request-resync` (Fase 2.3 extendida).
 * Comportamiento idéntico al original embebido en `MesaRoom.onCreate()`.
 */

type RoomCtx = MesaRoom;

interface ToggleReadyPayload {
  isReady?: boolean;
}

export function handleToggleReady(room: MesaRoom, client: Client, message: ToggleReadyPayload): void {
  const r: RoomCtx = room;
  if (r.state.phase !== "LOBBY") return;

  const player = r.state.players.get(client.sessionId);
  if (!player || player.isWaiting) return;

  // Bloquear "Listo" si el saldo es menor al pique mínimo
  if (message.isReady && player.chips < r.state.minPique) {
    const formatted = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(r.state.minPique / 100);
    client.send("insufficient-balance", {
      required: r.state.minPique,
      current: player.chips,
      message: `Tu saldo es insuficiente para el pique mínimo (${formatted}). Recarga tu cuenta para seguir jugando.`,
    });
    return;
  }

  player.isReady = !!message.isReady;

  r.checkStartCountdown();
}

export function handleAbandon(room: MesaRoom, client: Client): void {
  const r: RoomCtx = room;
  const player = r.state.players.get(client.sessionId);
  console.log(`[MesaRoom] Abandono voluntario de ${player?.nickname || client.sessionId}`);
  r.removePlayer(client.sessionId);
}

export function handleRequestResync(room: MesaRoom, client: Client): void {
  const r: RoomCtx = room;
  if (r.spectators.has(client.sessionId)) return; // Admin blindness: no cards for spectators
  const player = r.state.players.get(client.sessionId);
  if (!player || !player.cards) return;
  // Mantener clientMap actualizado: tras reconnect el transport cambia
  r.clientMap.set(client.sessionId, client);
  console.log(`[MesaRoom] Resync cartas privadas → ${player.nickname}`);
  // Enviar directamente por el client live (no depender de clientMap lookup)
  const cards = player.cards.split(",").filter(Boolean);
  client.send("private-cards", cards);
}
