import type { MesaRoom } from "../rooms/MesaRoom";
import type { Player } from "../schemas/GameState";
import { createRedisSubscriber } from "./redis";

/**
 * SessionEnforcer — Redis pub/sub para enforcement de sesión única (Fase 3).
 * Escucha el canal `session_kick` y desconecta clientes cuyo `supabaseUserId` haya
 * iniciado sesión desde otro `deviceId`. Lift-and-shift verbatim de MesaRoom.
 */

type RoomCtx = any;

export function setupSessionKickListener(room: MesaRoom): void {
  const r: RoomCtx = room;
  try {
    r.redisSub = createRedisSubscriber();
    r.redisSub.subscribe("session_kick").catch((err: Error) => {
      console.warn("[MesaRoom] Redis subscribe failed:", err.message);
    });

    r.redisSub.on("message", (_channel: string, message: string) => {
      try {
        const { userId, deviceId } = JSON.parse(message);
        handleSessionKick(room, userId, deviceId);
      } catch (e) {
        console.warn("[MesaRoom] Invalid session_kick payload:", message);
      }
    });

    r.redisSub.on("error", (err: Error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[MesaRoom] Redis sub error:", err.message);
      }
    });
  } catch (e) {
    console.warn("[MesaRoom] Could not setup session kick listener:", (e as Error).message);
  }
}

export function handleSessionKick(room: MesaRoom, userId: string, newDeviceId: string): void {
  const r: RoomCtx = room;
  // Find any connected clients with this userId but a DIFFERENT deviceId
  for (const [sessionId, player] of r.state.players.entries()) {
    if (
      (player as Player).supabaseUserId === userId &&
      (player as Player).deviceId !== newDeviceId
    ) {
      console.log(
        `[RECONNECT:SESSION_KICK] ${(player as Player).nickname} (session: ${sessionId}) — replaced by device ${newDeviceId}`
      );

      const targetClient = r.clientMap.get(sessionId) || r.clients.find((c: any) => c.sessionId === sessionId);
      if (targetClient) {
        targetClient.send("ForceLogout", {
          message: "Se ha iniciado sesión en otro dispositivo. Tu sesión actual ha expirado.",
        });
        // Small delay so the client receives the message before disconnect
        setTimeout(() => {
          targetClient.leave(4001, "Session replaced by new login");
        }, 500);
      }
    }
  }
}
