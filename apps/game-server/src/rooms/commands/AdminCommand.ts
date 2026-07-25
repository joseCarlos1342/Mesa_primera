import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";
import { LiveKitModerationService } from "../../services/LiveKitModerationService";
import { redis } from "../../services/redis";

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

type RoomCtx = MesaRoom;

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

export async function handleAdminMute(room: MesaRoom, _client: Client, message: AdminPayload): Promise<void> {
  const r: RoomCtx = room;
  if (!r.spectators.has(_client.sessionId)) return;
  const targetId = message.playerId;
  if (!targetId) return;
  const target = r.state.players.get(targetId);
  if (!target) return;
  if (!process.env.REDIS_URL || !target.supabaseUserId) {
    _client.send("admin:mute-failed", { playerId: targetId });
    return;
  }

  console.log(`[MesaRoom] Admin mute: ${target.nickname} (${targetId})`);
  const muteKey = target.supabaseUserId || targetId;
  r.mutedPlayerIds.add(muteKey);
  try {
    await redis.setex(`voice-muted:${r.roomId}:${target.supabaseUserId}`, 7200, "1");
  } catch {
    r.mutedPlayerIds.delete(muteKey);
    _client.send("admin:mute-failed", { playerId: targetId });
    return;
  }

  // Notify the target client so its LiveKit publication is disabled immediately.
  const targetClient = r.clientMap.get(targetId);
  if (targetClient) {
    targetClient.send("admin:muted", {
      reason: message.reason || "Silenciado por admin",
      muted: true,
    });
  }
  const liveKitMuted = target.supabaseUserId
    ? await LiveKitModerationService.muteParticipant(r.roomId, target.supabaseUserId)
    : false;
  if (!liveKitMuted) {
    _client.send("admin:mute-failed", { playerId: targetId });
  }
  broadcastModerationState(r);
}

function broadcastModerationState(room: MesaRoom): void {
  const mutedPlayerIds = Array.from(room.state.players.values())
    .filter((player) => room.mutedPlayerIds.has(player.supabaseUserId || player.id))
    .map((player) => player.id);
  room.spectators.forEach((spectator) => {
    if (typeof spectator !== "string" && typeof spectator.send === "function") {
      spectator.send("admin:moderation-state", { mutedPlayerIds });
    }
  });
}

export async function handleAdminUnmute(room: MesaRoom, _client: Client, message: AdminPayload): Promise<void> {
  const r: RoomCtx = room;
  if (!r.spectators.has(_client.sessionId)) return;
  const targetId = message.playerId;
  if (!targetId) return;
  const target = r.state.players.get(targetId);
  if (!target) return;
  if (!process.env.REDIS_URL || !target.supabaseUserId) {
    _client.send("admin:unmute-failed", { playerId: targetId });
    return;
  }

  const muteKey = target.supabaseUserId || targetId;
  const liveKitUnmuted = target.supabaseUserId
    ? await LiveKitModerationService.unmuteParticipant(r.roomId, target.supabaseUserId)
    : false;
  try {
    await redis.del(`voice-muted:${r.roomId}:${target.supabaseUserId}`);
  } catch {
    _client.send("admin:unmute-failed", { playerId: targetId });
    return;
  }
  r.mutedPlayerIds.delete(muteKey);
  const targetClient = r.clientMap.get(targetId);
  targetClient?.send("admin:unmuted", { playerId: targetId });
  _client.send("admin:unmuted", { playerId: targetId });
  if (!liveKitUnmuted) _client.send("admin:unmute-failed", { playerId: targetId });
  broadcastModerationState(r);
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
  if (!r.spectators.has(_client.sessionId)) return;

  const { adminToken } = message;
  console.log(`[MesaRoom] Petición de eliminación de sala por: ${adminToken}`);
  r.disconnect();
}
