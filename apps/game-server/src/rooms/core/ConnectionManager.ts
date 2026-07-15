import { Client } from "colyseus";
import type { MesaRoom } from "../MesaRoom";
import { Player } from "../../schemas/GameState";
import { SupabaseService } from "../../services/SupabaseService";
import { AlertService } from "../../services/AlertService";
import { MIN_BALANCE_CENTS, COLYSEUS_CONSENTED_CLOSE_CODE } from "./constants";

/**
 * ConnectionManager — lift-and-shift de los métodos lifecycle `onJoin` y `onLeave`
 * de MesaRoom (Fase 3). Comportamiento idéntico al original. Fase 5 consolida
 * `MIN_BALANCE_CENTS` y `COLYSEUS_CONSENTED_CLOSE_CODE` en `./constants`.
 */

type RoomCtx = MesaRoom;

interface MesaMetadataLike {
  tableName?: string;
  minEntry?: number;
  minPique?: number;
  disabledChips?: number[];
  isCustom?: boolean;
}

const NICKNAME_MAX_LENGTH = 30;
const AVATAR_ID_MAX_LENGTH = 40;

function normalizeNickname(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value : "";
  const sanitized = raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NICKNAME_MAX_LENGTH);

  return sanitized || fallback;
}

function normalizeAvatarUrl(value: unknown) {
  if (typeof value !== "string") return "default";
  const avatar = value.trim();
  if (!avatar || avatar.length > AVATAR_ID_MAX_LENGTH) return "default";
  return /^[a-z0-9_-]+$/i.test(avatar) ? avatar : "default";
}

function normalizeJoinChips(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error("Saldo inválido");
  }
  return value;
}

export async function handleConnectionJoin(room: MesaRoom, client: Client, options: any): Promise<void> {
  const r: RoomCtx = room;

  // ── Spectator (admin) mode ──
  if (options.spectator === true) {
    // Validate supervision token for authorized spectator access
    const { valid } = await SupabaseService.validateSupervisionToken(
      options.supervisionToken,
      r.roomId
    );
    if (!valid) {
      throw new Error("Token de supervisión inválido o expirado (code: 4003)");
    }
    console.log(`[MesaRoom] Espectador (admin) conectado: ${client.sessionId}`);
    r.spectators.set(client.sessionId, client);
    // Spectators do NOT get a Player schema entry and NEVER receive private cards (Admin Blindness)
    client.send("spectator:joined", { roomId: r.roomId, phase: r.state.phase });
    // Notify all players that an admin is watching
    r.broadcast("admin:status", { active: true, count: r.spectators.size });
    return;
  }

  if (r.recoveryLocked && (!options.userId || !r.recoveryRosterUserIds.includes(options.userId))) {
    throw new Error("Sala en recuperación: solo puede volver el roster original");
  }

  const requestedNickname = normalizeNickname(options.nickname, `Jugador_${client.sessionId}`);
  const avatarUrl = normalizeAvatarUrl(options.avatarUrl);
  const chips = normalizeJoinChips(options.chips ?? 0);
  const deviceId = options.deviceId;

  // ── Sanction enforcement: block players with active game/full/permanent sanctions ──
  if (options.userId) {
    const access = await SupabaseService.checkTableAccess(options.userId);
    if (access.blocked) {
      throw new Error(
        `Acceso denegado: ${access.reason || 'sanción activa'} (code: 4004)`
      );
    }
  }

  // Registrar cliente para mensajería privada
  r.clientMap.set(client.sessionId, client);

  // Ghost player cleanup and state restoration:
  // Match by deviceId first, then fall back to userId (handles enforceSessionPolicy
  // scenario where profiles.last_device_id differs from the original localStorage deviceId)
  const playerEntries = Array.from(r.state.players.entries()) as Array<[string, Player]>;
  console.log(`[MesaRoom] onJoin: buscando ghost para deviceId=${deviceId}, userId=${options.userId}. Players: ${playerEntries.map(([id, p]) => `${p.nickname}(${id},dev=${p.deviceId},uid=${p.supabaseUserId},conn=${p.connected})`).join(', ')}`);

  const existingPlayerEntry = playerEntries.find(
    ([_, p]) => (deviceId && p.deviceId === deviceId) ||
                (options.userId && p.supabaseUserId === options.userId)
  );

  if (existingPlayerEntry) {
    const [oldSessionId, oldPlayer] = existingPlayerEntry;
    console.log(`[RECONNECT:GHOST] ${oldPlayer.nickname} (${oldSessionId}→${client.sessionId}), connected=${oldPlayer.connected}, phase=${r.state.phase}, hasCards=${!!oldPlayer.cards}, dealerId=${r.state.dealerId}, activeManoId=${r.state.activeManoId}`);

    // Forzar cierre del socket viejo si seguía atascado
    if (oldPlayer.connected) {
      try {
        const oldClient = r.clients.find((c: Client) => c.sessionId === oldSessionId);
        if (oldClient) oldClient.leave(4000, "Replaced by new connection");
      } catch (e) { }
    }

    const newPlayer = new Player();
    newPlayer.id = client.sessionId;
    newPlayer.nickname = oldPlayer.nickname;
    newPlayer.avatarUrl = oldPlayer.avatarUrl;
    newPlayer.chips = oldPlayer.chips;
    newPlayer.cards = oldPlayer.cards;
    newPlayer.cardCount = oldPlayer.cardCount;
    newPlayer.revealedCards = oldPlayer.revealedCards;
    newPlayer.isWaiting = oldPlayer.isWaiting;
    newPlayer.isAllIn = oldPlayer.isAllIn;
    newPlayer.passedWithJuego = oldPlayer.passedWithJuego;
    newPlayer.roundBet = oldPlayer.roundBet;
    newPlayer.turnOrder = oldPlayer.turnOrder;
    newPlayer.pendingDiscardCards = [...oldPlayer.pendingDiscardCards];
    newPlayer.totalMainBet = oldPlayer.totalMainBet;
    newPlayer.declaredJuego = oldPlayer.declaredJuego;
    newPlayer.declinedGuerraJuegoBet = oldPlayer.declinedGuerraJuegoBet;
    // Si la sala fue reseteada (LOBBY), el jugador debe estar listo de nuevo
    newPlayer.isReady = r.state.phase === "LOBBY" ? false : oldPlayer.isReady;
    newPlayer.hasActed = r.state.phase === "LOBBY" ? false : oldPlayer.hasActed;
    newPlayer.isFolded = r.state.phase === "LOBBY" ? false : oldPlayer.isFolded;
    newPlayer.connected = true;
    newPlayer.deviceId = oldPlayer.deviceId;
    // Prefer fresh userId from options (fixes ghost players created without auth)
    newPlayer.supabaseUserId = options.userId || oldPlayer.supabaseUserId;

    if (!newPlayer.supabaseUserId) {
      AlertService.identity(requestedNickname, client.sessionId, r.roomId);
    }

    // Si reconecta en LOBBY, actualizar chips con el saldo actual de opciones
    if (r.state.phase === "LOBBY") {
      newPlayer.chips = chips;
    }

    r.state.players.delete(oldSessionId);
    r.clientMap.delete(oldSessionId);
    r.state.players.set(client.sessionId, newPlayer);

    // Actualizar el asiento en el orden estable para mantener la rotación correcta
    const ghostSeatIdx = r.seatOrder.indexOf(oldSessionId);
    if (ghostSeatIdx !== -1) {
      r.seatOrder[ghostSeatIdx] = client.sessionId;
    }

    if (r.state.dealerId === oldSessionId) {
      r.state.dealerId = client.sessionId;
      console.log(`[MesaRoom] Ghost restore: dealerId remapped ${oldSessionId} → ${client.sessionId}`);
    }
    if (r.state.activeManoId === oldSessionId) {
      r.state.activeManoId = client.sessionId;
      console.log(`[MesaRoom] Ghost restore: activeManoId remapped ${oldSessionId} → ${client.sessionId}`);
    }
    if (r.state.turnPlayerId === oldSessionId) {
      r.state.turnPlayerId = client.sessionId;
    }

    // Re-enviar las cartas privadas al cliente reconectado (solo si hay partida activa)
    // Actualizar clientMap primero: el client del ghost restore tiene transport nuevo
    r.clientMap.set(client.sessionId, client);
    if (r.state.phase !== "LOBBY") {
      const cards = newPlayer.cards ? newPlayer.cards.split(',').filter(Boolean) : [];
      client.send("private-cards", cards);
    }

    // Re-enviar configuración de la sala al cliente reconectado
    const meta = r.metadata as MesaMetadataLike;
    client.send("room-config", {
      disabledChips: meta?.disabledChips || [],
      minEntry: meta?.minEntry || MIN_BALANCE_CENTS,
      minPique: meta?.minPique || 500_000,
      isCustom: meta?.isCustom || false,
    });

    r.updateLobbyMetadata();
    await r.unlockRecoveryWhenRosterReturns();
    if (!r.recoveryLocked) r.checkStartCountdown();
    return;
  }

  // ── Validación de saldo mínimo (usa minEntry personalizado si existe) ──
  const roomMinEntry = (r.metadata as MesaMetadataLike)?.minEntry || MIN_BALANCE_CENTS;
  if (chips < roomMinEntry) {
    const formatted = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(roomMinEntry / 100);
    throw new Error(`Fondos insuficientes. Se requiere un saldo mínimo de ${formatted} para entrar a esta mesa. Por favor, recargue su cuenta.`);
  }

  console.log(`[MesaRoom] Cliente unido: ${client.sessionId} -> ${requestedNickname}`);

  const newPlayer = new Player();
  newPlayer.id = client.sessionId;
  newPlayer.nickname = requestedNickname;
  newPlayer.avatarUrl = avatarUrl;
  newPlayer.chips = chips;
  newPlayer.connected = true;
  newPlayer.deviceId = deviceId;
  newPlayer.supabaseUserId = options.userId || "";

  if (!newPlayer.supabaseUserId) {
    AlertService.identity(requestedNickname, client.sessionId, r.roomId);
  }

  // Si la partida está en curso, el jugador entra como "esperando"
  if (r.state.phase !== "LOBBY") {
    newPlayer.isWaiting = true;
    console.log(`[MesaRoom] ⚠️ FRESH JOIN mid-game: ${requestedNickname} (deviceId=${deviceId}, userId=${options.userId}) entra como espectador (phase=${r.state.phase}). NO HUBO ghost match — este jugador no fue reconocido como existente.`);
  }

  r.state.players.set(client.sessionId, newPlayer);

  // Solo agregar al seatOrder si no está esperando (los que esperan se agregan al volver a LOBBY)
  if (!newPlayer.isWaiting) {
    r.seatOrder.push(client.sessionId);
  }
  r.updateLobbyMetadata();

  // El primer jugador es el dealer por defecto, o si el dealer actual no es válido
  const currentDealer = r.state.players.get(r.state.dealerId);
  if (r.state.players.size === 1 || !currentDealer || !currentDealer.connected) {
    r.state.dealerId = client.sessionId;
  }

  // Enviar configuración de la sala al cliente (chips deshabilitados, min entry, etc.)
  const meta = r.metadata as MesaMetadataLike;
  client.send("room-config", {
    disabledChips: meta?.disabledChips || [],
    minEntry: meta?.minEntry || MIN_BALANCE_CENTS,
    minPique: meta?.minPique || 500_000,
    isCustom: meta?.isCustom || false,
  });

  // Cancelar/revalidar countdown en caso de que un nuevo jugador descuadre el "todos listos"
  r.checkStartCountdown();
}

export async function handleConnectionLeave(room: MesaRoom, client: Client, code?: number): Promise<void> {
  const r: RoomCtx = room;

  // Clean up spectator if applicable
  if (r.spectators.has(client.sessionId)) {
    console.log(`[MesaRoom] Espectador desconectado: ${client.sessionId}`);
    r.spectators.delete(client.sessionId);
    // Notify players that admin left
    r.broadcast("admin:status", { active: r.spectators.size > 0, count: r.spectators.size });
    return;
  }

  const consented = (code === COLYSEUS_CONSENTED_CLOSE_CODE);
  const player = r.state.players.get(client.sessionId);

  if (!player) return;

  const shouldTransferActiveMano = r.state.activeManoId === client.sessionId && r.state.phase !== "LOBBY";

  console.log(`[MesaRoom] Cliente desconectado: ${player.nickname} (${client.sessionId}). Code: ${code}, Consented: ${consented}, Phase: ${r.state.phase}, dealerId: ${r.state.dealerId}, activeManoId: ${r.state.activeManoId}`);
  player.connected = false;
  r.updateLobbyMetadata();

  // Si TODOS los jugadores están desconectados, resetear la sala a estado limpio
  const playerValues = Array.from(r.state.players.values()) as Player[];
  const anyoneConnected = playerValues.some((p: Player) => p.connected);
  if (!r.recoveryLocked && !anyoneConnected && r.state.players.size > 0) {
    console.log(`[MesaRoom] Todos los jugadores se desconectaron. Reseteando sala a estado limpio.`);
    r.resetRoomState();
  }

  r.checkStartCountdown();

  if (consented) {
    if (shouldTransferActiveMano) {
      console.log(`[MesaRoom] activeManoId era ${player.nickname}, transfiriendo mano activa por salida definitiva...`);
      r.transferMano();
    }

    // Solo en desconexión explícita (CloseCode.CONSENTED = 4000): transferir dealerId y remover jugador
    if (r.state.dealerId === client.sessionId) {
      const currentSeatIdx = r.seatOrder.indexOf(client.sessionId);
      let replaced = false;
      if (currentSeatIdx !== -1) {
        for (let i = 1; i < r.seatOrder.length; i++) {
          const nextIdx = (currentSeatIdx + i) % r.seatOrder.length;
          const nextId = r.seatOrder[nextIdx];
          const p = r.state.players.get(nextId);
          if (p && p.connected) {
            r.state.dealerId = nextId;
            r.dealerRotatedThisGame = true;
            console.log(`[MesaRoom] El anfitrión se fue (consented). Mano pasa a ${p.nickname}.`);
            replaced = true;
            break;
          }
        }
      }
      if (!replaced) {
        const fallback = (Array.from(r.state.players.values()) as Player[]).find((p: Player) => p.connected && p.id !== client.sessionId);
        if (fallback) {
          r.state.dealerId = fallback.id;
          r.dealerRotatedThisGame = true;
        }
      }
    }
    console.log(`[RECONNECT:ABANDON] ${player.nickname} (${client.sessionId}) — desconexión explícita (code=${code}), phase=${r.state.phase}`);
    r.removePlayer(client.sessionId);
    return;
  }

  // Non-consented: dealerId NO se transfiere. Se preserva durante el grace period.
  console.log(`[MesaRoom] dealerId preservado en ${r.state.dealerId} durante grace period para ${player.nickname}.`);

  try {
    console.log(`[MesaRoom] Otorgando 120s de reconexión para ${player.nickname}...`);
    await r.allowReconnection(client, 120);

    player.connected = true;
    r.clientMap.set(client.sessionId, client);
    r.updateLobbyMetadata();
    console.log(`[RECONNECT:NATIVE] ${player.nickname} (${client.sessionId}), phase=${r.state.phase}, hasCards=${!!player.cards}, dealerId=${r.state.dealerId}, activeManoId=${r.state.activeManoId}`);

    if (r.state.phase !== "LOBBY" && player.cards) {
      const cards = player.cards.split(',').filter(Boolean);
      client.send("private-cards", cards);
    }

    const meta = r.metadata as MesaMetadataLike;
    client.send("room-config", {
      disabledChips: meta?.disabledChips || [],
      minEntry: meta?.minEntry || MIN_BALANCE_CENTS,
      minPique: meta?.minPique || 500_000,
      isCustom: meta?.isCustom || false,
    });

  } catch (e) {
    console.log(`[RECONNECT:GRACE_EXPIRED] ${player.nickname} (${client.sessionId}) — grace period agotado, phase=${r.state.phase}`);

    // Guard: si el jugador logró reconectarse justo antes de la expiración
    // (race condition), no expulsarlo. allowReconnection puede resolver la promesa
    // por reconexión exitosa y luego rechazar por timeout casi simultáneamente.
    // Verificar si el Player sigue en la sala Y está conectado antes de remover.
    const existingPlayer = r.state.players.get(client.sessionId);
    if (existingPlayer && existingPlayer.connected) {
      console.log(`[RECONNECT:GRACE_EXPIRED] ${player.nickname} — reconectado apenas, cancelando expulsión (race condition mitigada)`);
      return;
    }

    if (shouldTransferActiveMano) {
      console.log(`[MesaRoom] Grace period agotado para ${player.nickname}, transfiriendo mano activa...`);
      r.transferMano();
    }

    r.removePlayer(client.sessionId);
  }
}
