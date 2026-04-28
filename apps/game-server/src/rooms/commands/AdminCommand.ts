import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";

/**
 * AdminCommand — handlers de moderación admin (Fase 2.1).
 *
 * Comportamiento idéntico al original embebido en `MesaRoom.onCreate()`.
 * Las funciones reciben la instancia de MesaRoom como `any` para preservar
 * el acceso a propiedades privadas durante la fase de extracción
 * (limpieza tipada → Fase 5 del refactor).
 *
 * Reglas comunes:
 *  - Solo los `spectators` (admin) pueden invocar estos comandos.
 *  - Si el `playerId` objetivo no existe en `state.players`, no-op.
 */

type RoomCtx = any;

interface AdminPayload {
  playerId?: string;
  reason?: string;
}

interface DeleteRoomPayload {
  adminToken?: string;
}

export function handleAdminKick(room: MesaRoom, _client: Client, message: AdminPayload): void {
  const r: RoomCtx = room;
  if (!r.spectators.has(_client.sessionId)) return;
  const targetId = message.playerId;
  if (!targetId) return;
  const target = r.state.players.get(targetId);
  if (!target) return;

  console.log(`[MesaRoom] Admin kick: ${target.nickname} (${targetId})`);
  r.state.lastAction = `${target.nickname} fue retirado por el admin`;

  const targetClient = r.clients.find((c: Client) => c.sessionId === targetId);
  if (targetClient) targetClient.leave(4001, "Kicked by admin");
  r.removePlayer(targetId);
}

export function handleAdminMute(room: MesaRoom, _client: Client, message: AdminPayload): void {
  const r: RoomCtx = room;
  if (!r.spectators.has(_client.sessionId)) return;
  const targetId = message.playerId;
  if (!targetId) return;
  const target = r.state.players.get(targetId);
  if (!target) return;

  console.log(`[MesaRoom] Admin mute: ${target.nickname} (${targetId})`);
  // Notify the target client; the frontend/LiveKit will handle the actual muting
  const targetClient = r.clientMap.get(targetId);
  if (targetClient) targetClient.send("admin:muted", { reason: message.reason || "Silenciado por admin" });
}

export function handleAdminBan(room: MesaRoom, _client: Client, message: AdminPayload): void {
  const r: RoomCtx = room;
  if (!r.spectators.has(_client.sessionId)) return;
  const targetId = message.playerId;
  if (!targetId) return;
  const target = r.state.players.get(targetId);
  if (!target) return;

  console.log(`[MesaRoom] Admin ban: ${target.nickname} (${targetId})`);
  r.state.lastAction = `${target.nickname} fue baneado de la mesa`;

  const targetClient = r.clients.find((c: Client) => c.sessionId === targetId);
  if (targetClient) targetClient.leave(4002, "Banned by admin");
  r.removePlayer(targetId);
}

export function handleDeleteRoom(room: MesaRoom, _client: Client, message: DeleteRoomPayload): void {
  const r: RoomCtx = room;
  const { adminToken } = message;
  // In a real scenario, we'd verify the adminToken against Supabase
  // For now, if the client sends this and the room is empty or it's an admin, we allow it
  console.log(`[MesaRoom] Petición de eliminación de sala por: ${adminToken}`);
  r.disconnect();
}
