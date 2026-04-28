import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";
import { SupabaseService } from "../../services/SupabaseService";

/**
 * TransferCommand — handler `transfer` (P2P entre jugadores) — Fase 2.3.
 *
 * Comportamiento idéntico al original embebido en `MesaRoom.onCreate()`.
 * Mantenemos el cast `any` para acceso a privates durante la fase de extracción.
 */

type RoomCtx = MesaRoom;

interface TransferPayload {
  recipientUserId?: string;
  amountCents?: number;
}

export async function handleTransfer(
  room: MesaRoom,
  client: Client,
  message: TransferPayload,
): Promise<void> {
  const r: RoomCtx = room;
  // Solo jugadores reales pueden transferir (no spectators)
  if (r.spectators.has(client.sessionId)) return;

  const sender = r.state.players.get(client.sessionId);
  if (!sender || !sender.supabaseUserId) {
    client.send("transfer-result", { success: false, error: "Jugador no válido" });
    return;
  }

  const { recipientUserId, amountCents } = message;

  if (!recipientUserId || typeof amountCents !== "number") {
    client.send("transfer-result", { success: false, error: "Datos inválidos" });
    return;
  }

  // Validar monto mínimo
  if (amountCents < 10000) {
    client.send("transfer-result", { success: false, error: "El monto mínimo es $100" });
    return;
  }

  // Validar que el sender tiene suficientes chips
  if (amountCents > sender.chips) {
    client.send("transfer-result", { success: false, error: "Saldo insuficiente en la mesa" });
    return;
  }

  // No auto-transferencia
  if (sender.supabaseUserId === recipientUserId) {
    client.send("transfer-result", { success: false, error: "No puedes transferirte a ti mismo" });
    return;
  }

  try {
    const result = await SupabaseService.transferBetweenPlayers(
      sender.supabaseUserId,
      recipientUserId,
      amountCents,
      { roomId: r.roomId },
    );

    if (!result.success) {
      client.send("transfer-result", {
        success: false,
        error: result.error || "Error en la transferencia",
      });
      return;
    }

    // Actualizar chips del sender inmediatamente
    sender.chips -= amountCents;

    // Buscar si el recipient está en esta room y actualizar sus chips
    let recipientSessionId: string | null = null;
    r.state.players.forEach((player: any, sessionId: string) => {
      if (player.supabaseUserId === recipientUserId) {
        player.chips += amountCents;
        recipientSessionId = sessionId;
      }
    });

    // Notificar al sender
    client.send("transfer-result", {
      success: true,
      recipientName: result.recipientName,
      amountCents,
      newBalance: sender.chips,
    });

    // Notificar al recipient si está en la room
    if (recipientSessionId) {
      const recipientClient = r.clientMap.get(recipientSessionId);
      if (recipientClient) {
        recipientClient.send("transfer-received", {
          senderName: sender.nickname,
          amountCents,
          newBalance: r.state.players.get(recipientSessionId)?.chips || 0,
        });
      }
    }

    console.log(`[MesaRoom] Transfer: ${sender.nickname} → ${result.recipientName}, $${amountCents / 100}`);
  } catch (e) {
    console.error("[MesaRoom] Transfer error:", e);
    client.send("transfer-result", {
      success: false,
      error: "Error interno al procesar la transferencia",
    });
  }
}
