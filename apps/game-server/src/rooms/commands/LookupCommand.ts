import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";
import { SupabaseService } from "../../services/SupabaseService";

/**
 * LookupCommand — handler `lookup-player` (Fase 2.3).
 * Busca un jugador por teléfono vía SupabaseService. Comportamiento idéntico
 * al original embebido en `MesaRoom.onCreate()`.
 *
 * Nota: vi.mock('../../services/SupabaseService') en los tests sigue aplicando
 * porque vitest resuelve por ruta absoluta del módulo, no por archivo importador.
 */

type RoomCtx = MesaRoom;

interface LookupPayload {
  phone?: string;
}

export async function handleLookupPlayer(
  room: MesaRoom,
  client: Client,
  message: LookupPayload,
): Promise<void> {
  const r: RoomCtx = room;
  if (r.spectators.has(client.sessionId)) return;
  const { phone } = message || {};
  if (!phone || typeof phone !== "string") {
    client.send("lookup-result", { success: false, error: "Número inválido" });
    return;
  }
  try {
    const result = await SupabaseService.lookupUserByPhone(phone);
    client.send("lookup-result", result);
  } catch (e) {
    client.send("lookup-result", { success: false, error: "Error al buscar usuario" });
  }
}
