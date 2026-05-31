import { Room, Client } from "colyseus";
import { GameState, Player } from "../schemas/GameState";
import { SupabaseService } from "../services/SupabaseService";
import { AlertService } from "../services/AlertService";
import { createRedisSubscriber } from "../services/redis";
import type Redis from "ioredis";
import * as crypto from "crypto";
import { evaluateHand, compareHands, HandEvaluation } from "./combinations";
import { createDeck as createDeckPure, shuffleDeck as shuffleDeckPure } from "./core/DeckManager";
import { calculateSidePots as calculateSidePotsPure } from "./core/PotManager";
import { handleAdminKick, handleAdminMute, handleAdminBan, handleDeleteRoom } from "./commands/AdminCommand";
import { handleProposePique, handleVotePique } from "./commands/PiqueVotingCommand";
import { handleLookupPlayer } from "./commands/LookupCommand";
import { handleTransfer } from "./commands/TransferCommand";
import { handleToggleReady, handleAbandon, handleRequestResync } from "./commands/RoomLifecycleCommand";
import { handleDismissShowdown, handleShowMuck, handleDeclararJuego, handleDismissReveal, handleLlevoJuego, handlePasoJuegoResponse, handleJuegoValidationResponse } from "./commands/ShowdownCommand";
import { handlePlayerAction } from "./commands/PlayerActionCommand";
import { setupSessionKickListener, handleSessionKick } from "../services/SessionEnforcer";
import { handleConnectionJoin, handleConnectionLeave } from "./core/ConnectionManager";
import {
  revealBottomCardPhase,
  canticosPhase,
  reemplazoDescartePhase,
  completarPhase,
  descartePhase,
  declararJuegoPhase,
  apuesta4CartasPhase,
  guerraJuegoPhase,
  guerraPhase,
  showdownPhase,
  sorteoPhase,
  piquePhase,
  enterPhase,
} from "./phases";
import { SnapshotBuilder, type AnimationHint, type StateLike } from "../services/ReplayV2";
import { MIN_BALANCE_CENTS, COLYSEUS_CONSENTED_CLOSE_CODE, TURN_TIMEOUT_SECONDS, SHOWDOWN_TIMEOUT_SECONDS } from "./core/constants";

export interface MesaMetadata {
  tableName: string;
  minPlayers: number;
  maxPlayers: number;
  activePlayers: number;
  totalReservedSeats: number;
  /** Mínimo de saldo para entrar a la mesa (en centavos). 0 = usa el default global. */
  minEntry: number;
  /** Pique mínimo configurado por el admin (en centavos). */
  minPique: number;
  /** Fichas deshabilitadas (denominaciones en centavos). Lista vacía = todas habilitadas. */
  disabledChips: number[];
  /** Si fue creada como mesa personalizada por el admin. */
  isCustom: boolean;
}

export class MesaRoom extends Room<{ state: GameState, metadata: MesaMetadata }> {
  maxClients = 7;
  public countdownTimer?: any;
  /** Timer de auto-acción: al expirar, el servidor ejecuta la acción por defecto del jugador. */
  public turnTimer?: any;
  /** Timer de showdown: al expirar (30s), el servidor avanza automáticamente a LOBBY. */
  public showdownAutoTimer?: any;
  public currentGameId: string = crypto.randomUUID();
  public currentTimeline: any[] = [];
  /** Snapshots normalizados por evento para reconstruir visualmente la partida (Replay v2). */
  public snapshotBuilder = new SnapshotBuilder();
  /** RNG state tracker: incremented per action for admin audit trail */
  public rngCounter: number = 0;
  /**
   * Orden estable de asientos (por orden de entrada).
   * Garantiza que la rotación de La Mano sea siempre "al jugador de la derecha",
   * independientemente del orden interno del MapSchema.
   */
  public seatOrder: string[] = [];
  /** Mazo privado del servidor (nunca sincronizado a los clientes). */
  public deck: string[] = [];
  /** Mapa de clientes conectados para el envío de mensajes privados. */
  public clientMap = new Map<string, Client>();
  /** Espectadores admin (no reciben cartas, solo observan estado público). */
  public spectators = new Map<string, Client>();
  /** Jugadores que ganaron el pique por doble-paso con juego. */
  public juegoCallers: string[] = [];
  /** ID del ganador del pique pendiente de decidir mostrar/ocultar cartas. */
  public pendingPiqueWinnerId: string = "";
  /** Ganadores pendientes del pique diferido de APUESTA_4_CARTAS (1 o varios en empate). */
  public pendingPiqueWinnerIds: string[] = [];
  /** Contestants revelados del pique diferido de APUESTA_4_CARTAS. */
  public pendingPiqueContestantIds: string[] = [];
  /** Continuación tras cerrar el reveal del pique diferido. */
  public pendingPiqueContinuation: "DESCARTE" | "CLEANUP" | "REOPEN_BETTING" = "DESCARTE";
  /** Callers pendientes de aplicar cuando el pique se resolvió visualmente primero. */
  public pendingPiqueReopenCallers: { playerId: string; amount: number }[] = [];
  /** ID del jugador que declaró "llevo juego" en DESCARTE, pendiente de dismiss. */
  public pendingLlevoJuegoPlayerId: string = "";
  public pendingShowdownData: { overallWinnerId: string; potWinners: any[]; totalPayout: number; totalRake: number; activePlayers: Player[]; persisted?: boolean } | null = null;
  /** Votación democrática del pique fijo. */
  public piqueVoters = new Map<string, boolean>();
  public piqueProposerId: string = "";
  /** Jugadores que dijeron "paso" en la ronda de PIQUE actual (para cobro de Banda). */
  public piquePassPlayerIds = new Set<string>();
  /** Jugadores que pasaron ANTES de que hubiera apuesta fija (candidatos a reapertura). */
  public piquePreBetPasserIds = new Set<string>();
  /** Indica si estamos en reapertura de PIQUE (passers previos deben reconfirmar). */
  public piqueReopenActive = false;
  /** IDs de jugadores pendientes de reconfirmar durante la reapertura de PIQUE. */
  public piqueReopenPendingIds = new Set<string>();
  /** Bandera para evitar doble rotación si la Mano Definitiva ya rotó durante la partida */
  public dealerRotatedThisGame = false;
  /** Contador de reinicios consecutivos del pique para evitar bucle infinito */
  public piqueRestartCount = 0;
  private static readonly MAX_PIQUE_RESTARTS = 10;
  /** Tabla de transiciones puras entre fases de apuesta (consumida por getNextPhaseCallback). */
  private static readonly NEXT_PHASE_TRANSITIONS: Record<string, string> = {
    GUERRA: "CANTICOS",
    CANTICOS: "DECLARAR_JUEGO",
    GUERRA_JUEGO: "SHOWDOWN",
  };
  /** Contador de veces que cada jugador se botó en PIQUE (persistente entre reinicios) */
  public piqueFoldCount = new Map<string, number>();
  /** Jugadores con "paso provisional" en APUESTA_4_CARTAS cuando quedan jugadores detrás por actuar */
  public pasoPendienteIds = new Set<string>();
  /** Ganador único que debe mostrar obligatorio por llegar a showdown con juego declarado. */
  public forcedShowdownRevealWinnerId: string = "";
  /** Jugador pendiente de decidir Llevo Juego / No Llevo en resolución inmediata */
  public pendingPasoJuegoPlayerId: string = "";
  /** Fase en la que se inició la resolución inmediata de paso-juego */
  public pendingPasoJuegoPhase: string = "";
  /** Fase desde la que se entró a PIQUE_REVEAL para saber a dónde volver */
  public phaseBeforePiqueReveal: string = "";
  /** La Mano original al entrar a APUESTA_4_CARTAS, usada para desempates del pique. */
  public apuesta4OriginalManoId: string = "";
  // ── JUEGO_VALIDACION: re-pregunta a todos tras all-check con juego ──
  /** Jugadores pendientes de responder en la fase JUEGO_VALIDACION. */
  public juegoValidationPendingIds = new Set<string>();

  private getPlayers(): Player[] {
    return Array.from(this.state.players.values() as IterableIterator<Player>);
  }

  private getPlayerEntries(): Array<[string, Player]> {
    return Array.from(this.state.players.entries() as IterableIterator<[string, Player]>);
  }

  private getPlayerIds(): string[] {
    return Array.from(this.state.players.keys() as IterableIterator<string>);
  }
  /** Respuestas recibidas: playerId → { action, amount? } */
  public juegoValidationResponses = new Map<string, { action: string; amount?: number }>();
  /** IDs de jugadores con juego (para saber quiénes ven el botón "Cantar"). */
  public juegoValidationPlayersWithJuego: string[] = [];
  /** Timer de timeout para la fase JUEGO_VALIDACION. */
  public juegoValidationTimer?: any;
  /** Apuesta efectiva (minPique) del caller con juego en Caso B. */
  public juegoValidationEffectiveBet: number = 0;
  /** ID del caller que ganó el pique implícitamente en Caso B. */
  public juegoValidationCallerId: string = "";
  /** Redis subscriber for single-session kick events */
  public redisSub?: Redis;

  onCreate(options: any) {
    this.setState(new GameState());

    // Configuración personalizada del admin
    const customMinPique = options.minPique ? Number(options.minPique) : 500_000;
    const customMinEntry = options.minEntry ? Number(options.minEntry) : MIN_BALANCE_CENTS;
    const disabledChips: number[] = Array.isArray(options.disabledChips) ? options.disabledChips : [];
    const isCustom = !!options.isCustom;

    // Aplicar pique mínimo personalizado al estado
    this.state.minPique = customMinPique;

    // Configurar metadatos para el Lobby
    this.setMetadata({
      tableName: options.tableName || "Mesa VIP",
      minPlayers: (this.state as any).minPlayers,
      maxPlayers: (this.state as any).maxPlayers,
      activePlayers: 0,
      totalReservedSeats: 0,
      minEntry: customMinEntry,
      minPique: customMinPique,
      disabledChips,
      isCustom,
    });

    // Inicializar baraja de 28 cartas
    // Primera usa: 1 (As), 3, 4, 5, 6, 7, y figuras (10, 11, o 12) para completar 7 por palo
    // O según la variante más común de 28: 1, 2, 3, 4, 5, 6, 7
    this.createDeck();

    // ── Subscribe to single-session kick events ──
    setupSessionKickListener(this);

    this.onMessage("delete-room", async (client, message) => {
      handleDeleteRoom(this, client, message);
    });

    this.onMessage("toggleReady", (client, message) => {
      handleToggleReady(this, client, message);
    });

    // ── Pique Fijo: Propuesta y Votación Democrática ──

    this.onMessage("propose_pique", (client, message) => {
      handleProposePique(this, client, message);
    });

    this.onMessage("vote_pique", (client, message) => {
      handleVotePique(this, client, message);
    });

    // Abandono explícito: el jugador decidió irse voluntariamente
    this.onMessage("abandon", (client) => {
      handleAbandon(this, client);
    });

    this.onMessage("action", async (client, message) => {
      await handlePlayerAction(this, client, message);
    });

    this.onMessage("dismiss-reveal", (client) => {
      handleDismissReveal(this, client);
    });

    // ── Llevo Juego: jugador que pasó con juego reclama el pique durante DESCARTE ──
    this.onMessage("llevo-juego", (client) => {
      handleLlevoJuego(this, client);
    });

    // ── Resolución inmediata de Llevo Juego / No Llevo en cualquier fase de apuestas ──
    this.onMessage("paso-juego-response", (client, message) => {
      handlePasoJuegoResponse(this, client, message);
    });

    // ── Respuesta a la re-pregunta de juego tras all-check con juego detectado ──
    this.onMessage("juego-validation-response", (client, message) => {
      handleJuegoValidationResponse(this, client, message);
    });

    this.onMessage("dismiss-showdown", (client) => {
      handleDismissShowdown(this, client);
    });

    this.onMessage("declarar-juego", (client, message) => {
      handleDeclararJuego(this, client, message);
    });

    this.onMessage("show-muck", (client, message) => {
      handleShowMuck(this, client, message);
    });

    // ── Admin Moderation (spectator-only) ──

    this.onMessage("admin:kick", (client, message) => {
      handleAdminKick(this, client, message);
    });

    this.onMessage("admin:mute", (client, message) => {
      handleAdminMute(this, client, message);
    });

    this.onMessage("admin:ban", (client, message) => {
      handleAdminBan(this, client, message);
    });

    // ── Resincronización silenciosa de cartas privadas ──
    this.onMessage("request-resync", (client) => {
      handleRequestResync(this, client);
    });

    // ── Lookup de jugador por teléfono (para transferencia en mesa sin HTTP) ──
    this.onMessage("lookup-player", async (client, message) => {
      await handleLookupPlayer(this, client, message);
    });

    // ── Transferencia P2P entre jugadores ──
    this.onMessage("transfer", async (client, message) => {
      await handleTransfer(this, client, message);
    });
  }

  async onJoin(client: Client, options: any) {
    return handleConnectionJoin(this, client, options);
  }

  public updateLobbyMetadata() {
    const players = this.getPlayers();
    const activePlayers = players.filter(p => p.connected).length;
    const totalReservedSeats = players.length; // Includes disconnected but within grace period

    this.setMetadata({
      ...this.metadata,
      activePlayers,
      totalReservedSeats
    });
  }

  async onLeave(client: Client, code?: number) {
    return handleConnectionLeave(this, client, code);
  }

  public removePlayer(sessionId: string) {
    this.state.players.delete(sessionId);
    this.clientMap.delete(sessionId);
    // Liberar el asiento del jugador del orden estable
    const seatIdx = this.seatOrder.indexOf(sessionId);
    if (seatIdx !== -1) this.seatOrder.splice(seatIdx, 1);
    this.updateLobbyMetadata();

    // ── Sanitizar IDs huérfanos tras remoción ──
    // dealerId
    if (this.state.dealerId === sessionId && this.state.players.size > 0) {
      if (this.seatOrder.length > 0) {
        this.state.dealerId = this.seatOrder[0];
      } else {
        this.state.dealerId = this.getPlayerIds()[0] ?? "";
      }
    }
    // activeManoId: si el jugador removido era La Mano, transferir al siguiente activo
    if (this.state.activeManoId === sessionId && this.state.players.size > 0 && this.state.phase !== "LOBBY") {
      this.transferMano();
      // Si transferMano no encontró candidato (devuelve sin efecto), usar dealerId como fallback
      if (this.state.activeManoId === sessionId) {
        this.state.activeManoId = this.state.dealerId;
      }
    }
    // turnPlayerId: limpiar si corresponde al jugador removido
    if (this.state.turnPlayerId === sessionId) {
      this.state.turnPlayerId = "";
      this.clearTurnTimer();
    }

    // ── Ajustar votación de pique si hay propuesta activa ──
    if (this.state.proposedPique > 0) {
      if (this.piqueProposerId === sessionId) {
        this.clearPiqueProposal();
      } else {
        if (this.piqueVoters.has(sessionId)) {
          const wasFor = this.piqueVoters.get(sessionId)!;
          if (wasFor) this.state.piqueVotesFor--;
          else this.state.piqueVotesAgainst--;
          this.piqueVoters.delete(sessionId);
        }
        const voters = Array.from(this.state.players.values() as IterableIterator<Player>)
          .filter(p => p.connected && !p.isWaiting && p.id !== this.piqueProposerId);
        this.state.piqueVotersTotal = voters.length;
        if (this.state.piqueVotersTotal === 0) {
          this.state.minPique = this.state.proposedPique;
          this.broadcast("pique_approved", { amount: this.state.proposedPique });
          this.clearPiqueProposal();
        } else {
          this.resolvePiqueVoteIfReady();
        }
      }
    }

    this.checkStartCountdown();

    // Si nadie queda en la mesa, limpiar por si acaso
    if (this.state.players.size === 0) {
      this.resetRoomState();
    }
  }

  /**
   * Resetea el estado completo de la sala: fase, pot, isFirstGame, etc.
   * Se usa cuando todos los jugadores se desconectan o cuando la sala se vacía.
   */
  public resetRoomState() {
    console.log(`[MesaRoom] Reseteando estado completo de la sala.`);
    this.clearTurnTimer();
    this.clearShowdownAutoTimer();

    // Refundar apuestas pendientes si hay partida en curso
    if (this.state.phase !== "LOBBY") {
      const tableName = (this as any).metadata?.tableName || 'Mesa VIP';
      for (const [, player] of this.state.players) {
        const p = player as Player;
        if (!p.supabaseUserId || p.totalMainBet <= 0) continue;
        console.log(`[MesaRoom] Refunding ${p.nickname}: $${p.totalMainBet} (reset room)`);
        SupabaseService.refundPlayer(
          p.supabaseUserId,
          p.totalMainBet,
          this.currentGameId,
          { roomId: this.roomId, tableName, reason: 'Reembolso: todos los jugadores se desconectaron' }
        ).catch(err => AlertService.refundFailed(p.supabaseUserId, p.totalMainBet, this.currentGameId, String(err), this.roomId));
      }
    }

    this.state.phase = "LOBBY";
    this.state.countdown = -1;
    this.state.isFirstGame = true;
    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.bottomCard = "";
    this.state.activeManoId = "";
    this.state.showdownTimer = 0;
    this.state.lastAction = "";
    this.state.turnPlayerId = "";
    this.stopCountdown();

    // Resetear estado de cada jugador fantasma para la próxima sesión
    for (const [sessionId, player] of this.state.players) {
      const p = player as Player;
      p.isReady = false;
      p.isFolded = false;
      p.hasActed = false;
      p.roundBet = 0;
      p.isAllIn = false;
      p.passedWithJuego = false;
      p.declinedGuerraJuegoBet = false;
      p.totalMainBet = 0;
      p.revealedCards = "";
      p.declaredJuego = null;
      this.setPlayerCards(sessionId, "");
    }
  }

  /**
   * Promueve jugadores en espera a jugadores activos.
   * Se llama cada vez que la partida vuelve a LOBBY para
   * que los espectadores que entraron mid-game puedan participar en la siguiente ronda.
   */
  public promoteWaitingPlayers() {
    this.state.players.forEach((p: Player, sessionId: string) => {
      if (p.isWaiting) {
        p.isWaiting = false;
        if (!this.seatOrder.includes(sessionId)) {
          this.seatOrder.push(sessionId);
        }
        console.log(`[MesaRoom] ${p.nickname} promovido de espera a jugador activo.`);
      }
    });
  }

  /**
   * Notifica a los jugadores cuyo saldo es menor al pique mínimo que deben recargar.
   * Se llama cada vez que la partida vuelve a LOBBY.
   */
  public notifyInsufficientBalance() {
    const minRequired = this.state.minPique;
    this.state.players.forEach((p: Player, sessionId: string) => {
      if (!p.connected) return;
      if (p.chips < minRequired) {
        const formatted = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(minRequired / 100);
        const client = this.clientMap.get(sessionId);
        if (client) {
          client.send("insufficient-balance", { required: minRequired, current: p.chips, message: `Tu saldo es insuficiente para el pique mínimo (${formatted}). Recarga tu cuenta para seguir jugando.` });
        }
      }
    });
  }

  public checkStartCountdown() {
    if (this.state.phase !== "LOBBY") return;

    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => p.connected && !p.isWaiting);
    const readyPlayers = activePlayers.filter(p => p.isReady);

    // Primera partida: exigir minPlayers (3). Siguientes partidas: basta con 2.
    const requiredMin = this.state.isFirstGame ? this.state.minPlayers : 2;

    // Auto-start: todos los jugadores activos están listos Y superan el mínimo
    if (
      readyPlayers.length >= requiredMin &&
      readyPlayers.length === activePlayers.length &&
      activePlayers.length > 0
    ) {
      // Solo arrancar si no hay ya un countdown activo
      if (this.state.countdown === -1) {
        console.log(`[MesaRoom] All ${readyPlayers.length} players ready. Starting 5s countdown.`);
        this.state.countdown = 5;
        this.countdownTimer = this.clock.setInterval(() => {
          this.state.countdown -= 1;

          if (this.state.countdown <= 0) {
            this.stopCountdown();
            console.log(`[MesaRoom] Countdown reached 0. Auto-starting game.`);
            this.startNewGame();
          }
        }, 1000);
      }
    } else {
      // Condiciones no cumplidas: cancelar countdown si estaba activo
      if (this.state.countdown !== -1) {
        console.log(`[MesaRoom] Conditions unmet (${readyPlayers.length}/${activePlayers.length} ready). Canceling countdown.`);
      }
      this.stopCountdown();
    }
  }

  public stopCountdown() {
    if (this.countdownTimer) {
      this.countdownTimer.clear();
      this.countdownTimer = undefined;
    }
    this.state.countdown = -1;
  }

  /**
   * Inicia el timer de auto-acción para el jugador con el turno actual.
   * Al expirar, el servidor ejecuta la acción por defecto según la fase:
   * - Fases de apuesta (APUESTA_4_CARTAS, GUERRA, CANTICOS, GUERRA_JUEGO):
   *   Check si currentMaxBet === 0 o roundBet >= currentMaxBet, sino Fold.
   * - DESCARTE: descartar 0 cartas.
   * - PIQUE: paso (fold).
   * - DECLARAR_JUEGO: declarar "no tengo juego" (server-validated).
   */
  public startTurnTimer() {
    this.clearTurnTimer();
    const currentPlayer = this.state.players.get(this.state.turnPlayerId);
    if (!currentPlayer || !currentPlayer.connected) return;

    console.log(`[MesaRoom] Turn timer started: ${TURN_TIMEOUT_SECONDS}s for ${currentPlayer.nickname} in ${this.state.phase}`);
    this.turnTimer = this.clock.setTimeout(() => {
      this.executeTimeoutAction();
    }, TURN_TIMEOUT_SECONDS * 1000);
  }

  /** Limpia el timer de turno sin ejecutar acción. */
  public clearTurnTimer() {
    if (this.turnTimer) {
      this.turnTimer.clear();
      this.turnTimer = undefined;
    }
  }

  /**
   * Inicia el timer de auto-avance de showdown (30s).
   * Si nadie envía "dismiss-showdown" o "show-muck" en ese tiempo,
   * el servidor avanza automáticamente a LOBBY.
   */
  public startShowdownAutoTimer() {
    this.clearShowdownAutoTimer();
    console.log(`[MesaRoom] Showdown auto-timer started: ${SHOWDOWN_TIMEOUT_SECONDS}s`);
    this.showdownAutoTimer = this.clock.setTimeout(() => {
      console.log(`[MesaRoom] Showdown auto-timer expired — advancing to LOBBY`);
      this.showdownAutoTimer = undefined;
      if (this.state.phase === "SHOWDOWN" || this.state.phase === "SHOWDOWN_WAIT") {
        if (this.pendingShowdownData) {
          const { overallWinnerId, potWinners, totalPayout, totalRake, activePlayers } = this.pendingShowdownData;
          this.pendingShowdownData = null;
          this.finalizeShowdown(overallWinnerId, potWinners, totalPayout, totalRake, activePlayers);
        } else if (this.forcedShowdownRevealWinnerId) {
          const winnerId = this.forcedShowdownRevealWinnerId;
          this.forcedShowdownRevealWinnerId = "";
          this.awardPot(winnerId);
        } else {
          // No pending showdown data — use endHandEarlyAfterFoldOut or direct LOBBY transition
          this.endHandEarlyAfterFoldOut();
        }
      }
    }, SHOWDOWN_TIMEOUT_SECONDS * 1000);
  }

  /** Limpia el timer de auto-avance de showdown. */
  public clearShowdownAutoTimer() {
    if (this.showdownAutoTimer) {
      this.showdownAutoTimer.clear();
      this.showdownAutoTimer = undefined;
    }
  }

  /**
   * Ejecuta la acción por defecto cuando el timer de turno expira.
   * La acción depende de la fase y del estado del jugador.
   */
  private executeTimeoutAction() {
    this.turnTimer = undefined;
    const playerId = this.state.turnPlayerId;
    const player = this.state.players.get(playerId);
    if (!player || !player.connected) return;

    // Verificar que sigue siendo el turno de este jugador (pudo cambiar mientras el timer corría)
    if (this.state.turnPlayerId !== playerId) return;

    const phase = this.state.phase;
    console.log(`[MesaRoom] TURN TIMEOUT: ${player.nickname} no actuó en ${phase} — ejecutando auto-acción`);

    const client = this.clientMap.get(playerId);
    if (!client) return;

    if (phase === 'APUESTA_4_CARTAS' || phase === 'GUERRA' || phase === 'CANTICOS' || phase === 'GUERRA_JUEGO') {
      if (this.state.currentMaxBet === 0 || player.roundBet >= this.state.currentMaxBet) {
        handlePlayerAction(this, client, { action: 'paso' });
      } else {
        handlePlayerAction(this, client, { action: 'paso' });
      }
    } else if (phase === 'DESCARTE') {
      handlePlayerAction(this, client, { action: 'discard', droppedCards: [] });
    } else if (phase === 'PIQUE') {
      handlePlayerAction(this, client, { action: 'paso' });
    } else if (phase === 'DECLARAR_JUEGO') {
      handleDeclararJuego(this, client, { tiene: false });
    } else if (phase === 'PIQUE_REVEAL') {
      handleDismissReveal(this, client);
    }
  }

  public createDeck() {
    // Delegado a core/DeckManager (refactor Fase 1.1). Comportamiento idéntico.
    this.deck = createDeckPure();
  }

  /**
   * Inicializa un nuevo estado para la partida actual.
   * Genera el seed de encriptación aleatorio y reparte el mazo.
   */
  public startNewGame() {
    this.stopCountdown();
    this.clearTurnTimer();

    // Limpiar propuesta de pique pendiente al iniciar la partida
    if (this.state.proposedPique > 0) this.clearPiqueProposal();

    const seed = crypto.randomBytes(16).toString('hex');
    console.log(`[MesaRoom] Iniciando partida con seed: ${seed}`);
    this.state.lastSeed = seed;

    this.dealerRotatedThisGame = false;
    this.piqueRestartCount = 0;
    this.piqueFoldCount.clear();
    this.pendingPiqueWinnerId = "";
    this.pendingPiqueWinnerIds = [];
    this.pendingPiqueContestantIds = [];
    this.pendingPiqueContinuation = "DESCARTE";
    this.pendingPiqueReopenCallers = [];
    this.pendingShowdownData = null;
    this.forcedShowdownRevealWinnerId = "";
    this.apuesta4OriginalManoId = "";
    this.currentGameId = crypto.randomUUID();
    this.currentTimeline = [];
    this.snapshotBuilder.reset();
    this.rngCounter = 0;
    this.recordEvent({ event: 'start', seed, time: Date.now() });

    // Reset pots and visual state to guarantee no carry-over from previous games
    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.currentMaxBet = 0;
    this.state.bottomCard = "";

    SupabaseService.createGameSession(this.currentGameId, this.metadata?.tableName || "Mesa VIP");

    // Resetear el estado de los jugadores para la nueva ronda
    // M1: Validación de saldo mínimo — jugadores sin saldo suficiente se sientan como espectadores
    this.getPlayerEntries().forEach(([sessionId, p]) => {
      if (!p.isReady || p.isWaiting) {
        p.isFolded = true;
      } else if (p.chips < this.state.minPique) {
        // M1: Jugador listo pero sin saldo mínimo — auto-fold y notificar
        p.isFolded = true;
        p.isReady = false;
        p.isWaiting = true;
        const client = this.clientMap.get(sessionId);
        if (client) {
          client.send("insufficient-balance", {
            required: this.state.minPique,
            current: p.chips,
            message: `Tu saldo ($${(p.chips / 100).toLocaleString()}) es insuficiente para el pique mínimo. Recarga tu cuenta.`
          });
        }
        console.log(`[MesaRoom] ${p.nickname} movido a espectador por saldo insuficiente ($${p.chips} < $${this.state.minPique})`);
      } else {
        p.isFolded = false;
      }
      p.hasActed = false;
      p.roundBet = 0;
      p.isAllIn = false;
      p.passedWithJuego = false;
      p.declinedGuerraJuegoBet = false;
      p.totalMainBet = 0;
      p.declaredJuego = null;
      this.setPlayerCards(sessionId, "");
      p.revealedCards = "";
    });

    // Fase 1: Sorteo de la mano (solo la primera vez de la sesión)
    if (this.state.isFirstGame) {
      this.state.isFirstGame = false;
      this.startPhase1Sorteo();
    } else {
      // Siguientes rondas: el dealer ya rotó en awardPot
      this.startPhase2Pique();
    }
  }

  /**
   * Fase 1: Sorteo de La Mano
   */
  public startPhase1Sorteo() {
    sorteoPhase.enter(this);
  }

  /**
   * Fase 2: El Pique
   */
  public async startPhase2Pique(skipAnte: boolean = false) {
    await piquePhase.enter(this, { skipAnte });
  }


  public advanceTurnPhase2(startFromId?: string) {
    // If only 1 active SEATED player remains AND no one is pending to act,
    // resolve immediately (restart or reopen).
    // IMPORTANT: Exclude isWaiting players — they are spectators and cannot act
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected && !p.isWaiting);
    const pendingToAct = activePlayers.some(p => !p.hasActed);
    if (activePlayers.length < 2 && !pendingToAct) {
      // ── REAPERTURA: solo si hay passers previos a la apuesta y no estamos ya en reapertura ──
      if (!this.piqueReopenActive && this.piquePreBetPasserIds.size > 0) {
        this.reopenPiqueForPassers();
        return;
      }
      this.restartPique();
      return;
    }

    let startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1) {
      if (startFromId) {
        startSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      }
      if (startSeatIdx === -1) {
        this.clearTurnTimer();
        return this.startPhase3CompletarMano();
      }
    }
    const total = this.seatOrder.length;
    const loopStart = startFromId ? 0 : 1;

    for (let i = loopStart; i <= total; i++) {
      const idx = (startSeatIdx + i) % total;
      const id = this.seatOrder[idx];
      const p = this.state.players.get(id);
      // M6: Si el jugador está desconectado y no ha actuado, auto-foldearlo
      // y agregarlo a piquePassPlayerIds para cobrar banda.
      if (p && !p.connected && !p.isFolded && !p.hasActed && !p.isWaiting) {
        p.isFolded = true;
        p.hasActed = true;
        this.piquePassPlayerIds.add(id);
        console.log(`[MesaRoom] ${p.nickname} autofold (desconectado) en PIQUE — banda cobrada`);
        continue;
      }
      if (p && p.connected && !p.isFolded && !p.hasActed) {
        this.state.turnPlayerId = id;
        this.startTurnTimer();
        return;
      }
    }
    // Nadie más necesita actuar
    const activeInPique = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected && !p.isWaiting);

    if (activeInPique.length < 2) {
      // ── REAPERTURA: solo si hay passers previos a la apuesta y no estamos ya en reapertura ──
      if (!this.piqueReopenActive && this.piquePreBetPasserIds.size > 0) {
        this.reopenPiqueForPassers();
        return;
      }
      this.restartPique();
      return;
    }

    // Limpiar estado de reapertura al avanzar a Completar
    this.piqueReopenActive = false;
    this.piqueReopenPendingIds.clear();
    this.piquePreBetPasserIds.clear();
    this.startPhase3CompletarMano();
  }

  /**
   * Reabre la fase PIQUE para jugadores que previamente pasaron,
   * dándoles la oportunidad de igualar o confirmar paso definitivo
   * antes de cobrar banda.
   */
  public reopenPiqueForPassers() {
    this.piqueReopenActive = true;
    this.piqueReopenPendingIds.clear();

    // Solo reabrir a los que pasaron ANTES de que existiera apuesta fija
    const previousPassers = new Set(this.piquePreBetPasserIds);
    this.piquePreBetPasserIds.clear();
    // Limpiar piquePassPlayerIds de los passers pre-apuesta (se repoblarán si confirman paso)
    for (const id of previousPassers) {
      this.piquePassPlayerIds.delete(id);
    }

    // Restaurar elegibilidad en orden de asiento
    for (const id of this.seatOrder) {
      if (!previousPassers.has(id)) continue;
      const p = this.state.players.get(id);
      if (!p || !p.connected || p.isWaiting) continue;

      p.isFolded = false;
      p.hasActed = false;
      this.piqueReopenPendingIds.add(id);
    }

    if (this.piqueReopenPendingIds.size === 0) {
      // Nadie conectado para reabrir — cobrar banda directamente
      // Restaurar passers originales para que restartPique los cobre
      for (const id of previousPassers) {
        this.piquePassPlayerIds.add(id);
      }
      this.restartPique();
      return;
    }

    // Fijar turno al primer passer pendiente según seatOrder
    for (const id of this.seatOrder) {
      if (this.piqueReopenPendingIds.has(id)) {
        this.state.turnPlayerId = id;
        this.startTurnTimer();
        break;
      }
    }

    console.log(`[MesaRoom] Reapertura de PIQUE: ${this.piqueReopenPendingIds.size} jugador(es) deben confirmar (igualar o paso definitivo).`);
    this.state.lastAction = `Se reabre el Pique: los que pasaron deben decidir si igualan o pasan definitivamente.`;
    this.broadcast("pique-reopen", {
      pendingPlayerIds: Array.from(this.piqueReopenPendingIds),
      currentMaxBet: this.state.currentMaxBet,
    });
  }

  /**
   * Reinicia la fase PIQUE cuando menos de 2 jugadores fueron "voy".
   * - Devuelve apuestas del pique a quienes apostaron
   * - Rota La Mano al siguiente jugador en seatOrder
   * - Recoge cartas, rebaraja y reparte 2 nuevas cartas
   * - NO vuelve a cobrar el ante (ya fue pagado)
   */
  public restartPique() {
    this.piqueRestartCount++;
    console.log(`[MesaRoom] Menos de 2 jugadores fueron voy en PIQUE. Reinicio #${this.piqueRestartCount}...`);

    // ── GUARD: Prevenir bucle infinito de reinicios ──
    const seatedConnected = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => p.connected && !p.isWaiting);

    if (seatedConnected.length < 2 || this.piqueRestartCount > MesaRoom.MAX_PIQUE_RESTARTS) {
      console.log(`[MesaRoom] Abortando pique: ${seatedConnected.length} jugadores sentados, ${this.piqueRestartCount} reinicios. Volviendo a LOBBY.`);

      // Devolver pot al único jugador que quede (si existe)
      if (seatedConnected.length === 1 && this.state.pot > 0) {
        const soloPlayer = seatedConnected[0];
        soloPlayer.chips += this.state.pot;
        if (soloPlayer.supabaseUserId) {
          SupabaseService.awardPot(soloPlayer.supabaseUserId, this.state.pot, 0, this.currentGameId).catch(console.error);
        }
        this.state.lastAction = `${soloPlayer.nickname} recupera el pozo por falta de jugadores.`;
      }

      // Devolver piquePot si hay
      if (this.state.piquePot > 0) {
        const voyP = seatedConnected.find(p => !p.isFolded);
        if (voyP) {
          voyP.chips += this.state.piquePot;
          if (voyP.supabaseUserId) {
            SupabaseService.awardPot(voyP.supabaseUserId, this.state.piquePot, 0, this.currentGameId).catch(console.error);
          }
        }
      }

      this.state.pot = 0;
      this.state.piquePot = 0;
      this.state.turnPlayerId = "";
      this.state.activeManoId = "";
      this.state.showdownTimer = 0;
      this.piqueRestartCount = 0;

      Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => {
        p.isReady = false;
        p.hasActed = false;
        p.isFolded = false;
        p.revealedCards = "";
        p.declaredJuego = null;
      });
      this.state.players.forEach((p: Player, sessionId: string) => {
        this.setPlayerCards(sessionId, "");
      });

      this.promoteWaitingPlayers();
      this.state.phase = "LOBBY";
      this.notifyInsufficientBalance();
      return;
    }

    // Identificar al único jugador que fue "voy" (si lo hay)
    const voyPlayer = Array.from(this.state.players.values() as IterableIterator<Player>)
      .find(p => !p.isFolded && p.connected && !p.isWaiting);

    // Devolver apuestas del pique al que fue "voy"
    if (this.state.piquePot > 0 && voyPlayer) {
      voyPlayer.chips += this.state.piquePot;
      if (voyPlayer.supabaseUserId) {
        SupabaseService.awardPot(voyPlayer.supabaseUserId, this.state.piquePot, 0, this.currentGameId).catch(console.error);
      }
      this.state.lastAction = `${voyPlayer.nickname} recupera su apuesta del Pique ($${(this.state.piquePot / 100).toLocaleString()})`;
    }
    this.state.piquePot = 0;

    // ── COBRO DE BANDA ──
    // Si un jugador fue "voy" y otros pasaron, los que pasaron pagan banda
    // Se usa transfer_pique_banda RPC para garantizar atomicidad en el ledger
    if (voyPlayer && this.piquePassPlayerIds.size > 0) {
      const bandaAmount = this.state.minPique >= 1_000_000 ? 500_000 : 200_000;
      const bandaDetails: { playerId: string; nickname: string; amount: number }[] = [];
      const losers: { userId: string; amountCents: number }[] = [];

      for (const passedId of this.piquePassPlayerIds) {
        const passedPlayer = this.state.players.get(passedId);
        if (!passedPlayer) continue;
        // M6: Cobrar banda incluso a jugadores desconectados.
        // Si están desconectados, se cobra de su saldo en memoria (se persistirá al reconnect o onDispose).
        // Si no tienen suficiente saldo, se cobra lo que tengan (all-in parcial).
        const actualBanda = Math.min(bandaAmount, passedPlayer.chips);
        if (actualBanda <= 0) continue;

        passedPlayer.chips -= actualBanda;
        bandaDetails.push({ playerId: passedId, nickname: passedPlayer.nickname, amount: actualBanda });

        if (passedPlayer.supabaseUserId) {
          losers.push({ userId: passedPlayer.supabaseUserId, amountCents: actualBanda });
        }
      }

      const totalBanda = bandaDetails.reduce((sum, d) => sum + d.amount, 0);

      if (totalBanda > 0) {
        voyPlayer.chips += totalBanda;

        if (voyPlayer.supabaseUserId && losers.length > 0) {
          SupabaseService.transferPiqueBanda(
            voyPlayer.supabaseUserId,
            losers,
            this.currentGameId,
            { roomId: this.roomId, tableName: (this as any).metadata?.tableName }
          ).then(result => {
            if (!result.success) {
              console.warn(`[MesaRoom] Banda RPC failed (fallback applied): ${result.error}`);
            }
          }).catch(console.error);
        } else if (voyPlayer.supabaseUserId) {
          // No losers with supabaseUserId — just award the pot directly
          SupabaseService.awardPot(voyPlayer.supabaseUserId, totalBanda, 0, this.currentGameId).catch(console.error);
        }

        this.state.lastAction = `${voyPlayer.nickname} cobra Banda: $${(totalBanda / 100).toLocaleString()} de ${bandaDetails.length} jugador(es)`;

        this.broadcast("banda", {
          winnerId: voyPlayer.id,
          winnerNickname: voyPlayer.nickname,
          bandaPerPlayer: bandaAmount,
          totalBanda,
          details: bandaDetails
        });

        this.recordEvent({
          event: 'banda',
          winner: voyPlayer.id,
          bandaPerPlayer: bandaAmount,
          totalBanda,
          details: bandaDetails,
          time: Date.now(),
          rng_state: this.getRngState()
        });
      }
    }

    this.piquePassPlayerIds.clear();
    this.piquePreBetPasserIds.clear();
    this.piqueReopenActive = false;
    this.piqueReopenPendingIds.clear();

    // Rotar La Mano solo si no rotó ya durante esta partida
    if (!this.dealerRotatedThisGame) {
      const dealerSeatIdx = this.seatOrder.indexOf(this.state.dealerId);
      if (dealerSeatIdx !== -1 && this.seatOrder.length > 1) {
        const nextSeatIdx = (dealerSeatIdx + 1) % this.seatOrder.length;
        this.state.dealerId = this.seatOrder[nextSeatIdx];
      }
    }
    this.dealerRotatedThisGame = true;
    this.assignTurnOrders();

    const newMano = this.state.players.get(this.state.dealerId);
    this.state.lastAction = `Pocos jugadores fueron. La Mano pasa a ${newMano?.nickname}. Repartiendo...`;

    this.recordEvent({ event: 'pique_restart', reason: 'less_than_2_voy', newDealerId: this.state.dealerId, time: Date.now(), rng_state: this.getRngState() });

    // Reiniciar pique sin cobrar ante de nuevo
    this.startPhase2Pique(true);
  }

  /**
   * Fase 3: Completar Mano
   * Primero recoge las cartas de quienes pasaron en PIQUE, luego reparte las 2 cartas restantes a los activos.
   */
  public startPhase3CompletarMano() {
    completarPhase.enter(this);
  }

  /**
   * Entrega el pique al ganador único y continúa con el juego principal.
   * Se llama cuando un jugador gana el pique en la ronda de 3 cartas.
   */
  public awardPiqueAndContinue(winnerId: string) {
    const winner = this.state.players.get(winnerId);
    if (!winner) {
      this.pendingPiqueWinnerId = "";
      this.afterPiqueResolution();
      return;
    }

    const piqueRake = Math.ceil(this.state.piquePot * 0.05 / 100) * 100;
    const piquePayout = this.state.piquePot - piqueRake;
    winner.chips += piquePayout;
    console.log(`[MesaRoom] ${winner.nickname} gana el pique: $${piquePayout} (Rake: $${piqueRake})`);
    this.state.lastAction = `¡${winner.nickname} gana el Pique! (+$${piquePayout})`;

    if (winner.supabaseUserId) {
      SupabaseService.awardPot(winner.supabaseUserId, piquePayout, piqueRake, this.currentGameId).catch(console.error);
    }
    this.recordEvent({ event: 'pique_won', winner: winnerId, piquePot: this.state.piquePot, payout: piquePayout, rake: piqueRake, time: Date.now(), rng_state: this.getRngState() });
    this.state.piquePot = 0;

    // El ganador del pique ya no juega por el pot principal — se retira
    winner.isFolded = true;
    winner.revealedCards = "";
    // Devolver cartas del ganador al mazo
    if (winner.cards) {
      for (const card of winner.cards.split(',').filter(Boolean)) {
        this.deck.push(card);
      }
    }
    this.setPlayerCards(winnerId, "");
    if (winner.id === this.state.activeManoId) this.transferMano();

    this.pendingPiqueWinnerId = "";
    this.afterPiqueResolution();
  }

  /**
   * Después de completar las 4 cartas (o resolver el pique de 3 cartas),
   * verificar cuántos jugadores quedan para el pot principal.
   * - 0 jugadores → abortar
   * - 1 jugador → devolver su apuesta del pot principal y terminar
   * - 2+ jugadores → continuar a APUESTA_4_CARTAS
   */
  public afterPiqueResolution() {
    const remaining = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);

    console.log(`[MesaRoom] Jugadores restantes para pot principal: ${remaining.length}`);

    if (remaining.length === 0) {
      this.state.pot = 0;
      this.state.piquePot = 0;
      this.promoteWaitingPlayers();
      this.state.phase = "LOBBY";
      this.notifyInsufficientBalance();
      Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => p.isReady = false);
      return;
    }

    if (remaining.length === 1) {
      // Solo queda 1 jugador → devolver su apuesta del pot principal
      const soloPlayer = remaining[0];
      if (this.state.pot > 0) {
        soloPlayer.chips += this.state.pot;
        this.state.lastAction = `${soloPlayer.nickname} recupera su apuesta ($${(this.state.pot / 100).toLocaleString()})`;
        console.log(`[MesaRoom] Devolviendo $${this.state.pot} a ${soloPlayer.nickname} (único jugador restante)`);

        // Revertir la apuesta en el ledger
        if (soloPlayer.supabaseUserId) {
          SupabaseService.awardPot(soloPlayer.supabaseUserId, this.state.pot, 0, this.currentGameId).catch(console.error);
        }
      }
      this.state.pot = 0;

      // Terminar la mano limpiamente
      this.clock.setTimeout(() => {
        Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => {
          p.isReady = false;
          p.revealedCards = "";
        });
        this.state.bottomCard = "";
        this.state.activeManoId = "";
        this.state.showdownTimer = 0;
        this.promoteWaitingPlayers();
        this.state.phase = "LOBBY";
        this.notifyInsufficientBalance();

        // Rotar La Mano solo si no rotó ya durante esta partida
        if (!this.dealerRotatedThisGame) {
          const dealerSeatIdx = this.seatOrder.indexOf(this.state.dealerId);
          if (dealerSeatIdx !== -1 && this.seatOrder.length > 1) {
            const nextSeatIdx = (dealerSeatIdx + 1) % this.seatOrder.length;
            this.state.dealerId = this.seatOrder[nextSeatIdx];
          }
        }
        this.assignTurnOrders();
      }, 3000);
      return;
    }

    // 2+ jugadores → continuar partida normalmente (el pique se resuelve en el showdown final)
    this.startPhaseApuesta4Cartas();
  }

  /**
   * Fase Intermedia: DESCARTE
   * Cada jugador activo descarta las cartas que no le sirven (sin apuestas — las apuestas ya ocurrieron en APUESTA_4_CARTAS).
   */
  public startPhaseDescarte() {
    descartePhase.enter(this);
  }

  /**
   * NUEVA Fase: APUESTA_4_CARTAS
   * Ronda de apuestas con 4 cartas antes del descarte. Inicia en La Mano activa.
   */
  public startPhaseApuesta4Cartas() {
    apuesta4CartasPhase.enter(this);
  }

  /**
   * Calcula y devuelve al jugador la porción de su apuesta de ronda que nadie igualó.
   * Retorna el monto reembolsado (0 si no aplica).
   */
  public refundUncalledBet(): number {
    const allPlayers = Array.from(this.state.players.values() as IterableIterator<Player>);
    // Incluir roundBets de TODOS los jugadores conectados (incluidos foldeados que apostaron esta ronda)
    const roundBets = allPlayers
      .filter(p => p.connected || p.roundBet > 0)
      .map(p => p.roundBet)
      .sort((a, b) => b - a);

    if (roundBets.length < 1) return 0;

    const highest = roundBets[0];
    const secondHighest = roundBets.length > 1 ? roundBets[1] : 0;
    const uncalled = highest - secondHighest;

    if (uncalled <= 0) return 0;

    // Encontrar al jugador activo con la apuesta más alta
    const highBetter = allPlayers.find(p => p.roundBet === highest && !p.isFolded);
    if (!highBetter) return 0;

    highBetter.chips += uncalled;
    highBetter.roundBet -= uncalled;
    highBetter.totalMainBet -= uncalled;
    this.state.pot = Math.max(0, this.state.pot - uncalled);

    console.log(`[MesaRoom] Devolviendo apuesta no igualada: $${uncalled} a ${highBetter.nickname}`);
    this.state.lastAction = `${highBetter.nickname} recupera $${(uncalled / 100).toLocaleString()} (nadie igualó)`;

    // Revertir la porción no igualada en el ledger
    if (highBetter.supabaseUserId) {
      SupabaseService.refundPlayer(highBetter.supabaseUserId, uncalled, this.currentGameId, { reason: 'Apuesta no igualada' }).catch(console.error);
    }

    return uncalled;
  }

  /**
   * Termina la mano prematuramente cuando nadie igualó la apuesta y el pot principal queda en 0.
   * Resuelve el pique (si hay piquePot > 0) comparando las manos, limpia el estado y rota La Mano.
   */
  public endHandEarlyAfterFoldOut() {
    this.clearTurnTimer();
    const remaining = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);

    // Incluir jugadores desconectados no foldeados para scenarios de 1 jugador desconectado
    const allNonFolded = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && !p.isWaiting);

    // Si no queda ningún jugador conectado, reembolsar todas las apuestas activas
    // y volver al lobby. Esto previene que los botes queden varados en memoria.
    if (remaining.length === 0) {
      this.refundAllActiveBets();
      return;
    }

    // Caso especial: 1 jugador conectado pero existe 1+ desconectado(s) no foldeado(s)
    // El conectado gana, pero los desconectados no compiten (ya no pueden).
    // Si hay exactamente 1 no-folded total (que es el conectado), entrega normal.

    // Entregar el pot principal al ultimo jugador restante antes de resetear
    if (remaining.length === 1 && this.state.pot > 0) {
      const soloPlayer = remaining[0];
      const potRake = Math.ceil(this.state.pot * 0.05 / 100) * 100;
      const potPayout = this.state.pot - potRake;
      soloPlayer.chips += potPayout;
      this.state.lastAction = `${soloPlayer.nickname} gana el pozo ($${(this.state.pot / 100).toLocaleString()})`;
      console.log(`[MesaRoom] Fin de mano prematuro — ${soloPlayer.nickname} gana el pot: $${potPayout} (Rake: $${potRake})`);

      if (soloPlayer.supabaseUserId) {
        SupabaseService.awardPot(soloPlayer.supabaseUserId, potPayout, potRake, this.currentGameId).catch(console.error);
      }
      this.recordEvent({ event: 'pot_won_early', winner: soloPlayer.id, pot: this.state.pot, payout: potPayout, rake: potRake, time: Date.now(), rng_state: this.getRngState() });
    }

    // Resolución del pique: otorgar al mejor mano entre los jugadores restantes
    if (this.state.piquePot > 0 && remaining.length > 0) {
      const manoId = this.state.activeManoId || this.state.dealerId;
      let winner = remaining[0];
      let bestHand = evaluateHand(winner.cards);
      let bestPoints = bestHand.points + (winner.id === manoId ? 1 : 0);

      for (let i = 1; i < remaining.length; i++) {
        const p = remaining[i];
        const h = evaluateHand(p.cards);
        const pts = h.points + (p.id === manoId ? 1 : 0);
        const hWithBonus = { ...h, points: pts };
        const bestWithBonus = { ...bestHand, points: bestPoints };
        if (compareHands(hWithBonus, bestWithBonus) > 0) {
          winner = p; bestHand = h; bestPoints = pts;
        }
      }

      const piqueRake = Math.ceil(this.state.piquePot * 0.05 / 100) * 100;
      const piquePayout = this.state.piquePot - piqueRake;
      winner.chips += piquePayout;
      console.log(`[MesaRoom] Fin de mano prematuro — ${winner.nickname} gana el pique: $${piquePayout} (Rake: $${piqueRake})`);
      this.state.lastAction = `${winner.nickname} gana el Pique ($${(piquePayout / 100).toLocaleString()})`;

      if (winner.supabaseUserId) {
        SupabaseService.awardPot(winner.supabaseUserId, piquePayout, piqueRake, this.currentGameId).catch(console.error);
      }
      this.recordEvent({ event: 'pique_won_early', winner: winner.id, piquePot: this.state.piquePot, payout: piquePayout, rake: piqueRake, time: Date.now(), rng_state: this.getRngState() });
    }

    // Limpiar estado y volver al lobby tras un breve delay para que el cliente vea el mensaje
    this.clock.setTimeout(() => {
      this.cleanupRound();
    }, 3000);
  }

  // ── Resolución de pique diferido tras APUESTA_4_CARTAS ──

  /** Resuelve el pique diferido y luego inicia DESCARTE o finaliza la mano. */
  public resolveAndStartDescarte() {
    const remaining = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);

    if (remaining.length <= 1) {
      this.resolvePiqueAfterApuesta4();
      if (this.state.phase === 'SHOWDOWN') {
        return;
      }
      this.endHandEarlyAfterFoldOut();
      return;
    }

    // ── NUEVO: validación de juego cuando todos hicieron check ──
    if (this.state.currentMaxBet === 0) {
      const playersWithJuego = remaining.filter(p => {
        const hand = evaluateHand(p.cards);
        return hand.type !== 'NINGUNA';
      });

      if (playersWithJuego.length > 0) {
        // Hay juego sin reclamar → re-preguntar a todos antes de DESCARTE
        this.startJuegoValidation(remaining, playersWithJuego);
        return;
      }
    }
    // ──────────────────────────────────────────────────────────

    // Flujo normal (sin juego, o ya se resolvió)
    this.resolvePiqueAfterApuesta4();
    if (this.state.phase === 'SHOWDOWN') {
      return;
    }
    this.startPhaseDescarte();
  }

  private compareHandsForPique(playerId: string, hand: HandEvaluation): HandEvaluation {
    const manoId = this.apuesta4OriginalManoId || this.state.dealerId || this.state.activeManoId;
    if (playerId !== manoId) {
      return hand;
    }

    return { ...hand, points: hand.points + 1 };
  }

  private startApuesta4PiqueShowdown(
    contestantIds: string[],
    winnerIds: string[],
    continuation: "DESCARTE" | "CLEANUP" | "REOPEN_BETTING" = "DESCARTE",
    reopenCallers: { playerId: string; amount: number }[] = [],
  ) {
    this.pendingPiqueWinnerIds = [...winnerIds];
    this.pendingPiqueContestantIds = [...contestantIds];
    this.pendingPiqueContinuation = continuation;
    this.pendingPiqueReopenCallers = [...reopenCallers];
    this.pendingPiqueWinnerId = winnerIds.length === 1 ? winnerIds[0] : "";
    this.state.phase = 'SHOWDOWN';
    this.state.turnPlayerId = winnerIds[0] ?? "";
    this.state.showdownTimer = 0;
  }

  public finalizeApuesta4PiqueShowdown() {
    const contestantIds = [...this.pendingPiqueContestantIds];
    const winnerIds = [...this.pendingPiqueWinnerIds];
    const continuation = this.pendingPiqueContinuation;
    const reopenCallers = [...this.pendingPiqueReopenCallers];

    this.pendingPiqueContestantIds = [];
    this.pendingPiqueWinnerIds = [];
    this.pendingPiqueWinnerId = "";
    this.pendingPiqueContinuation = "DESCARTE";
    this.pendingPiqueReopenCallers = [];

    if (winnerIds.length === 1) {
      this.awardPiqueToContestant(winnerIds[0]);
    } else if (winnerIds.length > 1) {
      this.awardSplitPiqueToContestants(winnerIds);
    }

    for (const contestantId of contestantIds) {
      const contestant = this.state.players.get(contestantId);
      if (!contestant) continue;
      contestant.revealedCards = "";
      this.collectPlayerCards(contestantId, false);
    }

    const remaining = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);

    if (remaining.length === 1 && this.state.pot > 0) {
      const soloPlayer = remaining[0];
      soloPlayer.chips += this.state.pot;
      this.state.lastAction = `${soloPlayer.nickname} recupera su apuesta ($${(this.state.pot / 100).toLocaleString()})`;
      console.log(`[MesaRoom] Devolviendo $${this.state.pot} a ${soloPlayer.nickname} tras resolver pique diferido`);

      if (soloPlayer.supabaseUserId) {
        SupabaseService.awardPot(soloPlayer.supabaseUserId, this.state.pot, 0, this.currentGameId).catch(console.error);
      }

      this.state.pot = 0;
    }

    if (remaining.length <= 1) {
      this.clock.setTimeout(() => {
        this.cleanupRound();
      }, 3000);
      return;
    }

    if (continuation === "REOPEN_BETTING") {
      this.applyCallersAndReopenBetting(reopenCallers);
      return;
    }

    if (continuation === "CLEANUP") {
      this.clock.setTimeout(() => {
        this.cleanupRound();
      }, 3000);
      return;
    }

    this.startPhaseDescarte();
  }

  // ── JUEGO_VALIDACION: re-pregunta tras all-check con juego detectado ──

  /**
   * Inicia la fase JUEGO_VALIDACION cuando todos hicieron check en APUESTA_4_CARTAS
   * y al menos un jugador tiene juego (PRIMERA, CHIVO o SEGUNDA).
   * Broadcast a TODOS los jugadores activos: deben elegir Pass, Ir (call) o Cantar Juego.
   */
  public startJuegoValidation(activePlayers: Player[], playersWithJuego: Player[]) {
    this.clearTurnTimer();
    this.state.phase = "JUEGO_VALIDACION";
    console.log(`[MesaRoom] JUEGO_VALIDACION: ${playersWithJuego.length} jugador(es) con juego detectado(s) tras all-check`);

    // Inicializar tracking
    this.juegoValidationPendingIds.clear();
    this.juegoValidationResponses.clear();
    this.juegoValidationPlayersWithJuego = playersWithJuego.map(p => p.id);
    this.juegoValidationEffectiveBet = 0;
    this.juegoValidationCallerId = "";

    for (const p of activePlayers) {
      this.juegoValidationPendingIds.add(p.id);
      p.hasActed = false;
    }

    // Broadcast a todos
    this.broadcast("juego-validation-start", {
      playersWithJuego: playersWithJuego.map(p => p.id),
      minPique: this.state.minPique,
      timeLimit: 30,
    });

    // Timeout: si no responden en 30s, auto-pass para todos
    this.juegoValidationTimer = this.clock.setTimeout(() => {
      console.log(`[MesaRoom] JUEGO_VALIDACION timeout — auto-pass`);
      for (const id of this.juegoValidationPendingIds) {
        this.juegoValidationResponses.set(id, { action: 'pass' });
      }
      this.juegoValidationPendingIds.clear();
      this.resolveJuegoValidation(activePlayers, playersWithJuego);
    }, 30_000);
  }

  /**
   * Resuelve la fase JUEGO_VALIDACION tras recibir todas las respuestas (o timeout).
   */
  public resolveJuegoValidation(activePlayers: Player[], playersWithJuego: Player[]) {
    // Limpiar timer
    if (this.juegoValidationTimer) {
      this.juegoValidationTimer.clear();
      this.juegoValidationTimer = undefined;
    }

    const claimants: string[] = [];
    const callers: { playerId: string; amount: number }[] = [];

    for (const [playerId, response] of this.juegoValidationResponses) {
      if (response.action === 'claim-juego') {
        claimants.push(playerId);
      } else if (response.action === 'call') {
        callers.push({
          playerId,
          amount: response.amount || this.state.minPique,
        });
      }
    }

    // ── CASO: Hay claimant(s) ──
    if (claimants.length > 0) {
      this.resolveClaimantsWithCallers(claimants, callers, activePlayers);
      return;
    }

    // ── CASO: Solo callers, sin claimants ──
    if (callers.length > 0) {
      this.resolveCallersOnly(callers, activePlayers, playersWithJuego);
      return;
    }

    // ── CASO: Todos pasaron ──
    // Flujo normal: Mano gana pique por defecto → DESCARTE
    this.resolvePiqueAfterApuesta4();
    this.startPhaseDescarte();
  }

  /**
   * Resuelve cuando al menos un jugador reclamó juego (claim-juego).
   * 1. Determina el claimant ganador (jerarquía SEGUNDA > CHIVO > PRIMERA)
   * 2. Paga el pique al ganador (con 5% rake)
   * 3. Todos los claimants salen del pot principal (isFolded = true)
   * 4. Si hay callers, reabre la ronda de apuestas
   * 5. Si no hay callers y solo queda 1 → devolución + nueva ronda
   * 6. Si 2+ quedan → DESCARTE
   */
  private resolveClaimantsWithCallers(
    claimants: string[],
    callers: { playerId: string; amount: number }[],
    _activePlayers: Player[]
  ) {
    // 1. Determinar claimant ganador por jerarquía
    let winnerId = claimants[0];
    if (claimants.length > 1) {
      const typeRank: Record<string, number> = { 'SEGUNDA': 3, 'CHIVO': 2, 'PRIMERA': 1 };
      const manoSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      let bestRank = 0;
      let bestDist = Infinity;

      for (const cid of claimants) {
        const p = this.state.players.get(cid);
        if (!p) continue;
        const h = evaluateHand(p.cards);
        const rank = typeRank[h.type] || 0;
        const dist = ((this.seatOrder.indexOf(cid) - manoSeatIdx) + this.seatOrder.length) % this.seatOrder.length;
        if (rank > bestRank || (rank === bestRank && dist < bestDist)) {
          winnerId = cid;
          bestRank = rank;
          bestDist = dist;
        }
      }
    }

    // 2. Todos los claimants: folded, revelar cartas
    for (const cid of claimants) {
      const p = this.state.players.get(cid);
      if (!p) continue;
      p.isFolded = true;
      p.passedWithJuego = true;
      p.revealedCards = p.cards;
      if (p.id === this.state.activeManoId) this.transferMano();
    }

    // Broadcast reveal para todos los claimants
    for (const cid of claimants) {
      const p = this.state.players.get(cid);
      if (p) {
        this.broadcast("pique-fold-reveal", {
          playerId: cid,
          llevaJuego: true,
          cards: p.cards,
        });
      }
    }

    if (callers.length === 0) {
      const remaining = Array.from(this.state.players.values() as IterableIterator<Player>)
        .filter(p => !p.isFolded && p.connected);
      this.startApuesta4PiqueShowdown(claimants, [winnerId], remaining.length <= 1 ? "CLEANUP" : "DESCARTE");
      return;
    }

    this.startApuesta4PiqueShowdown(claimants, [winnerId], "REOPEN_BETTING", callers);
    return;

    // 5. Sin callers: verificar cuántos quedan
    const remaining = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);

    if (remaining.length <= 1) {
      // Solo 1 jugador (o 0) → devolver apuesta sin rake, nueva ronda
      if (remaining.length === 1 && this.state.pot > 0) {
        const soloPlayer = remaining[0];
        soloPlayer.chips += this.state.pot;
        console.log(`[MesaRoom] Devolviendo $${this.state.pot} a ${soloPlayer.nickname} — sin oponentes (sin rake)`);
        if (soloPlayer.supabaseUserId) {
          SupabaseService.awardPot(soloPlayer.supabaseUserId, this.state.pot, 0, this.currentGameId).catch(console.error);
        }
        this.state.lastAction = `${soloPlayer.nickname} recupera su apuesta ($${(this.state.pot / 100).toLocaleString()})`;
        this.state.pot = 0;
      }
      this.clock.setTimeout(() => {
        this.cleanupRound();
      }, 3000);
      return;
    }

    // 6. 2+ jugadores → DESCARTE
    this.startPhaseDescarte();
  }

  /**
   * Resuelve cuando nadie reclamó juego pero hay jugadores que apostaron (callers).
   * Si el caller tiene juego → gana el pique implícitamente.
   * Devuelve el exceso de apuesta sobre minPique SIN rake.
   */
  private resolveCallersOnly(
    callers: { playerId: string; amount: number }[],
    _activePlayers: Player[],
    _playersWithJuego: Player[]
  ) {
    const mainCaller = callers[0];
    const callerPlayer = this.state.players.get(mainCaller.playerId);
    if (!callerPlayer) {
      this.resolvePiqueAfterApuesta4();
      this.startPhaseDescarte();
      return;
    }

    // Verificar si el caller tiene juego
    const callerHand = evaluateHand(callerPlayer.cards);
    const callerHasJuego = callerHand.type !== 'NINGUNA';

    if (!callerHasJuego) {
      // Caller no tiene juego → solo apostó, reabrir ronda normalmente
      this.applyCallersAndReopenBetting(callers);
      return;
    }

    // ── CASO B: Caller tiene juego y es el único que fue ──
    // Gana el pique implícitamente
    if (this.state.piquePot > 0) {
      this.awardPiqueToContestant(mainCaller.playerId);
    }

    // Devolver exceso sobre minPique SIN rake
    const excessBet = Math.max(0, mainCaller.amount - this.state.minPique);

    // Aplicar la apuesta del caller (deducir de chips, agregar al pot)
    const actualBet = Math.min(mainCaller.amount, callerPlayer.chips);
    callerPlayer.chips -= actualBet;
    callerPlayer.roundBet += actualBet;
    callerPlayer.totalMainBet += actualBet;
    this.state.pot += actualBet;
    callerPlayer.hasActed = true;

    if (callerPlayer.roundBet > this.state.currentMaxBet) {
      this.state.currentMaxBet = callerPlayer.roundBet;
      this.state.highestBetPlayerId = callerPlayer.id;
    }

    // Devolver exceso al caller SIN rake
    if (excessBet > 0) {
      callerPlayer.chips += excessBet;
      callerPlayer.roundBet -= excessBet;
      callerPlayer.totalMainBet -= excessBet;
      this.state.pot = Math.max(0, this.state.pot - excessBet);
      console.log(`[MesaRoom] ${callerPlayer.nickname} recupera exceso: $${excessBet} (sin rake)`);
    }

    // Ir a PIQUE_REVEAL para que el caller decida mostrar/ocultar cartas
    this.juegoValidationEffectiveBet = mainCaller.amount - excessBet; // = minPique
    this.juegoValidationCallerId = mainCaller.playerId;

    this.pendingPiqueWinnerId = mainCaller.playerId;
    this.phaseBeforePiqueReveal = "APUESTA_4_CARTAS";

    callerPlayer.revealedCards = callerPlayer.cards;
    this.state.phase = "PIQUE_REVEAL";
    this.state.turnPlayerId = mainCaller.playerId;

    this.broadcast("pique-fold-reveal", {
      playerId: mainCaller.playerId,
      llevaJuego: true,
      cards: callerPlayer.cards,
    });
  }

  /**
   * Aplica las apuestas de los callers y reabre la ronda de apuestas.
   * Los jugadores que no igualaron deberán actuar (igualar, subir o pasar).
   */
  private applyCallersAndReopenBetting(callers: { playerId: string; amount: number }[]) {
    this.state.phase = "APUESTA_4_CARTAS";

    for (const c of callers) {
      const p = this.state.players.get(c.playerId);
      if (!p || p.chips <= 0) continue;

      const actualBet = Math.min(c.amount, p.chips);
      p.chips -= actualBet;
      p.roundBet += actualBet;
      p.totalMainBet += actualBet;
      this.state.pot += actualBet;
      p.hasActed = true;

      if (p.roundBet > this.state.currentMaxBet) {
        this.state.currentMaxBet = p.roundBet;
        this.state.highestBetPlayerId = p.id;
      }
    }

    // Reabrir ronda: los que no han actuado o no igualaron deben hacerlo
    // Empezar desde La Mano para mantener orden correcto
    this.state.turnPlayerId = this.state.activeManoId;
    this.advanceTurnBetting(this.state.activeManoId, () => this.resolveAndStartDescarte());
  }

  /** Resuelve la competencia de pique entre jugadores que pasaron con juego en APUESTA_4_CARTAS. */
  public resolvePiqueAfterApuesta4() {
    if (this.state.piquePot <= 0) return;

    const contestants = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => p.passedWithJuego);

    if (contestants.length === 0) {
      const unresolvedPiquePot = this.state.piquePot;
      this.state.pot += unresolvedPiquePot;
      this.state.piquePot = 0;
      this.recordEvent({ event: 'pique_added_to_main_pot', piquePot: unresolvedPiquePot, time: Date.now(), rng_state: this.getRngState() });
      console.log(`[MesaRoom] Nadie ganó el pique — $${unresolvedPiquePot} se suma al pozo principal`);
      return;
    }

    if (contestants.length === 1) {
      contestants[0].revealedCards = contestants[0].cards;
      this.startApuesta4PiqueShowdown([contestants[0].id], [contestants[0].id]);
      return;
    }

    const evaluations = contestants.map((contestant) => {
      const hand = evaluateHand(contestant.cards);
      return {
        contestant,
        comparedHand: this.compareHandsForPique(contestant.id, hand),
      };
    });

    let best = evaluations[0].comparedHand;
    let winnerIds = [evaluations[0].contestant.id];

    for (let i = 1; i < evaluations.length; i++) {
      const current = evaluations[i];
      const result = compareHands(current.comparedHand, best);

      if (result > 0) {
        best = current.comparedHand;
        winnerIds = [current.contestant.id];
      } else if (result === 0) {
        winnerIds.push(current.contestant.id);
      }
    }

    for (const contestant of contestants) {
      contestant.revealedCards = contestant.cards;
    }

    this.startApuesta4PiqueShowdown(
      contestants.map((contestant) => contestant.id),
      winnerIds,
    );
  }

  /** Paga el pique al ganador con 5% rake. */
  public awardPiqueToContestant(winnerId: string) {
    const winner = this.state.players.get(winnerId);
    if (!winner || this.state.piquePot <= 0) return;

    const piqueRake = Math.ceil(this.state.piquePot * 0.05 / 100) * 100;
    const piquePayout = this.state.piquePot - piqueRake;
    winner.chips += piquePayout;
    console.log(`[MesaRoom] ${winner.nickname} gana el pique (APUESTA_4_CARTAS): $${piquePayout} (Rake: $${piqueRake})`);
    this.state.lastAction = `¡${winner.nickname} gana el Pique! (+$${(piquePayout / 100).toLocaleString()})`;

    if (winner.supabaseUserId) {
      SupabaseService.awardPot(winner.supabaseUserId, piquePayout, piqueRake, this.currentGameId).catch(console.error);
    }
    this.recordEvent({ event: 'pique_won_apuesta4', winner: winnerId, piquePot: this.state.piquePot, payout: piquePayout, rake: piqueRake, time: Date.now(), rng_state: this.getRngState() });
    this.state.piquePot = 0;
  }

  public awardSplitPiqueToContestants(winnerIds: string[]) {
    if (winnerIds.length === 0 || this.state.piquePot <= 0) return;

    const totalPique = this.state.piquePot;
    const shareBase = Math.floor(totalPique / winnerIds.length);
    let remainder = totalPique % winnerIds.length;
    let paidOut = 0;
    const winnerNicknames: string[] = [];

    for (const winnerId of winnerIds) {
      const winner = this.state.players.get(winnerId);
      if (!winner) continue;

      const grossShare = shareBase + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      const piqueRake = Math.min(grossShare, Math.ceil(grossShare * 0.05 / 100) * 100);
      const piquePayout = grossShare - piqueRake;
      winner.chips += piquePayout;
      paidOut += piquePayout;
      winnerNicknames.push(winner.nickname);

      if (winner.supabaseUserId) {
        SupabaseService.awardPot(winner.supabaseUserId, piquePayout, piqueRake, this.currentGameId).catch(console.error);
      }

      this.recordEvent({
        event: 'pique_split_apuesta4',
        winner: winnerId,
        piquePot: totalPique,
        payout: piquePayout,
        rake: piqueRake,
        winners: winnerIds,
        time: Date.now(),
        rng_state: this.getRngState(),
      });
    }

    this.state.lastAction = `¡Pique dividido entre ${winnerNicknames.join(' y ')}! (+$${(paidOut / 100).toLocaleString()})`;
    this.state.piquePot = 0;
  }

  /** Recoge las cartas del jugador y las devuelve al naipe. Si shuffle=true, las baraja antes. */
  public collectPlayerCards(playerId: string, shuffle: boolean) {
    const player = this.state.players.get(playerId);
    if (!player || !player.cards) return;

    const cards = player.cards.split(',').filter(Boolean);
    if (shuffle) {
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
    }
    for (const card of cards) {
      this.deck.push(card);
    }
    this.setPlayerCards(playerId, "");

    this.broadcast("fold-return-cards", {
      playerId,
      cardCount: cards.length
    });
  }

  /**
   * Avance de turno unificado para todas las fases de apuesta (APUESTA_4_CARTAS, GUERRA, CANTICOS).
   * Un jugador "necesita actuar" si:
  /**
   * Retorna el callback de siguiente fase según la fase de apuestas actual.
   */
  /**
   * Retorna el callback de siguiente fase según la fase de apuestas actual.
   * Usa el PhaseRouter como fuente de verdad para las transiciones puras
   * (CANTICOS → DECLARAR_JUEGO, GUERRA → CANTICOS, GUERRA_JUEGO → SHOWDOWN).
   * APUESTA_4_CARTAS conserva su helper específico porque resuelve estado intermedio.
   */
  public getNextPhaseCallback(phase: string): () => void {
    if (phase === "APUESTA_4_CARTAS") return () => this.resolveAndStartDescarte();
    const nextId = MesaRoom.NEXT_PHASE_TRANSITIONS[phase] ?? "SHOWDOWN";
    return () => { enterPhase(this, nextId); };
  }

  /**
   *  - no se botó, no está restiado, está conectado
   *  - Y no ha actuado aún O su apuesta de ronda es menor que la máxima (ronda reabierta por raise)
   */
  public advanceTurnBetting(startFromId?: string, nextPhaseCallback?: () => void) {
    // Si solo queda 1 jugador activo (no folded), ir directo a showdown o siguiente fase
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);
    if (activePlayers.length <= 1) {
      // Devolver apuesta no igualada antes de avanzar
      this.refundUncalledBet();

      // En APUESTA_4_CARTAS, resolver pique diferido antes de avanzar
      const wasApuesta4 = this.state.phase === 'APUESTA_4_CARTAS';
      if (wasApuesta4) {
        this.resolvePiqueAfterApuesta4();
        if (this.pendingPiqueWinnerIds.length > 0) {
          return;
        }
      }

      if (this.state.pot === 0 && activePlayers.length === 0 && this.state.piquePot === 0) {
        this.endHandEarlyAfterFoldOut();
        return;
      }
      // 1 jugador restante: usar nextPhaseCallback si existe (respeta pique diferido en APUESTA_4_CARTAS),
      // o ir a showdown para revelacion obligatoria
      if (nextPhaseCallback) nextPhaseCallback();
      else this.startPhase6Showdown();
      return;
    }

    let startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    // Guard: si el ID no se encuentra en seatOrder, intentar con activeManoId
    if (startSeatIdx === -1) {
      if (startFromId) {
        startSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      }
      if (startSeatIdx === -1) {
        if (nextPhaseCallback) nextPhaseCallback();
        else this.startPhase6Showdown();
        return;
      }
    }
    const total = this.seatOrder.length;
    const loopStart = startFromId ? 0 : 1;

    for (let i = loopStart; i <= total; i++) {
      const idx = (startSeatIdx + i) % total;
      const id = this.seatOrder[idx];
      const p = this.state.players.get(id);
      if (p && p.connected && !p.isFolded && !p.isAllIn && !p.passedWithJuego && !p.declinedGuerraJuegoBet &&
          (!p.hasActed || p.roundBet < this.state.currentMaxBet)) {
        this.state.turnPlayerId = id;
        this.startTurnTimer();
        return;
      }
    }
    // Nadie más necesita actuar — verificar apuesta no igualada

    this.refundUncalledBet();
    {
      const remainingAfterRefund = Array.from(this.state.players.values() as IterableIterator<Player>)
        .filter(p => !p.isFolded && p.connected);
      if (remainingAfterRefund.length === 0) {
        this.clearTurnTimer();
        this.endHandEarlyAfterFoldOut();
        return;
      }
    }
    this.clearTurnTimer();
    if (nextPhaseCallback) nextPhaseCallback();
    else this.startPhase6Showdown();
  }

  public advanceTurnPhaseDescarte(startFromId?: string) {
    let startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1) {
      if (startFromId) {
        startSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      }
      if (startSeatIdx === -1) {
        this.clearTurnTimer();
        return this.startPhaseReemplazoDescarte();
      }
    }
    const total = this.seatOrder.length;
    const loopStart = startFromId ? 0 : 1;

    for (let i = loopStart; i <= total; i++) {
      const idx = (startSeatIdx + i) % total;
      const id = this.seatOrder[idx];
      const p = this.state.players.get(id);
      if (p && p.connected && !p.isFolded && !p.hasActed) {
        this.state.turnPlayerId = id;
        this.startTurnTimer();
        return;
      }
    }
    this.clearTurnTimer();
    this.startPhaseReemplazoDescarte();
  }

  /**
   * Repartir reemplazos: todas las cartas de un jugador antes de pasar al siguiente (reparto por bloque),
   * en orden desde activeManoId, tomando del fondo del mazo.
   */
  public startPhaseReemplazoDescarte() {
    reemplazoDescartePhase.enter(this);
  }

  /**
   * NUEVA Fase: REVELAR_CARTA
   * Revela la última carta del mazo boca arriba. Queda visible el resto de la partida.
   */
  public startPhaseRevealBottomCard() {
    revealBottomCardPhase.enter(this);
  }

  /**
   * Fase 4: Cánticos
   * Ronda de declaraciones y apuestas finales antes del Showdown.
   * Cuando todos pasan (check), se activa DECLARAR_JUEGO para que
   * cada jugador declare si lleva juego o no.
   */
  public startPhase4Canticos() {
    canticosPhase.enter(this);
  }

  /**
   * Fase de Declaración de Juego.
   * Después de que todos pasan en CANTICOS, cada jugador declara:
   * - "Tengo Juego" → sigue compitiendo (puede seguir apostando)
   * - "No Tengo Juego" → se foldea
   * Luego los que tienen juego pueden apostar entre sí hasta que
   * decidan parar, momento en el que se van al showdown.
   */
  public startPhaseDeclararJuego() {
    declararJuegoPhase.enter(this);
  }

  /**
   * Avanza el turno en la fase DECLARAR_JUEGO.
   * Busca el siguiente jugador activo que aún no ha declarado.
   * When all have declared: if 2+ have juego → GUERRA_JUEGO;
   * if 1 has juego → that player wins (standard showdown);
   * if 0 have juego → points-based resolution (all non-folded players compete).
   */
  public advanceTurnDeclarar(startFromId?: string) {
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected && !p.isWaiting);

    if (activePlayers.length <= 1) {
      this.clearTurnTimer();
      this.startPhase6Showdown();
      return;
    }

    let startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1) {
      startSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      if (startSeatIdx === -1) {
        this.clearTurnTimer();
        this.startPhase6Showdown();
        return;
      }
    }
    const total = this.seatOrder.length;
    const loopStart = startFromId ? 0 : 1;

    for (let i = loopStart; i <= total; i++) {
      const idx = (startSeatIdx + i) % total;
      const id = this.seatOrder[idx];
      const p = this.state.players.get(id);
      if (p && p.connected && !p.isFolded && !p.hasActed && !p.isWaiting) {
        this.state.turnPlayerId = id;
        this.startTurnTimer();
        return;
      }
    }

    this.clearTurnTimer();

    // All players have declared — evaluate outcomes
    const withJuego = activePlayers.filter(p => p.declaredJuego === true);
    const withoutJuego = activePlayers.filter(p => p.declaredJuego === false);
    this.forcedShowdownRevealWinnerId = "";

    if (withJuego.length >= 2) {
      // 2+ players with juego → fold the "no tengo juego" players, then betting round
      for (const p of withoutJuego) {
        p.isFolded = true;
        if (p.id === this.state.activeManoId) this.transferMano();
      }
      this.startPhaseGuerraJuego();
    } else if (withJuego.length === 1) {
      // 1 player with juego → fold the rest (standard showdown win)
      for (const p of withoutJuego) {
        p.isFolded = true;
        if (p.id === this.state.activeManoId) this.transferMano();
      }
      this.forcedShowdownRevealWinnerId = withJuego[0].id;
      this.startPhase6Showdown();
    } else {
      // Nobody has juego → points-based resolution among all active players
      console.log(`[MesaRoom] Nadie tiene juego — resolución por puntos`);
      this.startPhase6Showdown();
    }
  }

  /**
   * Ronda de apuestas entre jugadores que declararon tener juego.
   * Cuando termina → Showdown directo.
   */
  public startPhaseGuerraJuego() {
    guerraJuegoPhase.enter(this);
  }

  /**
   * Fase 5: Guerra Principal
   * Ronda de apuestas del pozo. Inicia en La Mano activa (activeManoId).
   */
  public startPhase5Guerra() {
    guerraPhase.enter(this);
  }

  /**
   * Fase 6: Showdown
   * Muestra las cartas por 20 segundos, luego premia al ganador.
   * Soporta side pots básicos cuando hay jugadores restiados (all-in).
   */
  public startPhase6Showdown() {
    showdownPhase.enter(this);
  }

  /**
   * Calcula side pots basados en las contribuciones totales de cada jugador.
   * Ordena por totalMainBet ascendente y crea pots proporcionales.
   */
  public calculateSidePots(activePlayers: Player[]): { amount: number; eligiblePlayerIds: string[] }[] {
    // Delegado a core/PotManager (refactor Fase 1.2). Comportamiento idéntico.
    const sidePots = calculateSidePotsPure(activePlayers);
    const allocatedPot = sidePots.reduce((sum, sidePot) => sum + sidePot.amount, 0);
    const unallocatedPot = this.state.pot - allocatedPot;

    if (unallocatedPot > 0 && activePlayers.length > 0) {
      sidePots.push({
        amount: unallocatedPot,
        eligiblePlayerIds: activePlayers.map(player => player.id),
      });
    }

    return sidePots;
  }

  /**
   * Persists payout, replay, and stats to Supabase immediately when the winner is determined.
   * Called from startPhase6Showdown — does NOT transition to LOBBY.
   */
  public persistShowdownResults(
    overallWinnerId: string,
    potWinners: { winnerId: string; potAmount: number; payout: number; rake: number }[],
    totalPayout: number,
    totalRake: number,
    activePlayers: Player[]
  ) {
    const winner = this.state.players.get(overallWinnerId);
    if (!winner) return;

    const totalPot = this.state.pot + this.state.piquePot;
    // Also award pique pot to overall winner
    const piqueRake = Math.ceil(this.state.piquePot * 0.05 / 100) * 100;
    const piquePayout = this.state.piquePot - piqueRake;
    if (piquePayout > 0) {
      winner.chips += piquePayout;
      totalPayout += piquePayout;
      totalRake += piqueRake;
    }

    this.recordEvent({ event: 'end', winner: overallWinnerId, pot: totalPot, payout: totalPayout, rake: totalRake, sidePots: potWinners, time: Date.now(), rng_state: this.getRngState() });

    const playersSnapshot = this.getPlayers().map(p => ({
      userId: p.supabaseUserId || p.id,
      sessionId: p.id,
      nickname: p.nickname,
      cards: p.cards,
      chips: p.chips
    }));

    // Persist aggregate payout per unique winner
    const winnerPayouts = new Map<string, { payout: number; rake: number }>();
    for (const pw of potWinners) {
      const existing = winnerPayouts.get(pw.winnerId) || { payout: 0, rake: 0 };
      existing.payout += pw.payout;
      existing.rake += pw.rake;
      winnerPayouts.set(pw.winnerId, existing);
    }
    // Add pique pot to overall winner
    if (piquePayout > 0) {
      const existing = winnerPayouts.get(overallWinnerId) || { payout: 0, rake: 0 };
      existing.payout += piquePayout;
      existing.rake += piqueRake;
      winnerPayouts.set(overallWinnerId, existing);
    }

    for (const [wId, { payout, rake }] of winnerPayouts) {
      const w = this.state.players.get(wId);
      if (w?.supabaseUserId) {
        SupabaseService.awardPot(w.supabaseUserId, payout, rake, this.currentGameId, undefined, {
          roomId: this.roomId,
          tableName: (this as any).metadata?.tableName || 'Mesa VIP',
          playersPresent: playersSnapshot.map(p => ({ odisplayName: p.nickname }))
        }).then(result => {
          if (!result.success) {
            AlertService.settlementFailed(w.nickname, w.supabaseUserId, this.currentGameId, result.error || 'unknown', this.roomId);
          }
        }).catch(console.error);
      }
    }

    // Build enriched pot_breakdown and final_hands for the replay record
    const potBreakdown = {
      totalPot,
      mainPot: this.state.pot,
      piquePot: this.state.piquePot,
      payout: totalPayout,
      rake: totalRake,
      sidePots: potWinners
    };
    const finalHands: Record<string, any> = {};
    const lastKnownCardsByPlayerId = this.snapshotBuilder.lastKnownCards;
    this.getPlayers().forEach(p => {
      const cardsCsv = (p.cards && p.cards.length > 0)
        ? p.cards
        : (lastKnownCardsByPlayerId.get(p.id) ?? '');
      if (cardsCsv) {
        const hand = evaluateHand(cardsCsv);
        finalHands[p.supabaseUserId || p.id] = {
          cards: cardsCsv,
          handType: hand.type,
          handPoints: hand.points,
          nickname: p.nickname,
          isFolded: p.isFolded,
        };
      }
    });

    // Save replay
    const adminTimeline = [...this.currentTimeline];
    const playerTimeline = this.currentTimeline.map(({ rng_state, ...event }) => event);
    const replayFrames = this.snapshotBuilder.build();
    SupabaseService.saveReplay(this.currentGameId, this.state.lastSeed, playerTimeline, playersSnapshot, adminTimeline, potBreakdown, finalHands, this.roomId, this.metadata?.tableName || 'Mesa VIP', replayFrames).catch(console.error);

    // Update stats for all participating players
    this.getPlayers().forEach(p => {
      const isWinner = winnerPayouts.has(p.id);
      const wp = winnerPayouts.get(p.id);
      const playerPayout = isWinner ? (wp?.payout || 0) : -p.totalMainBet;
      const playerRake = isWinner ? (wp?.rake || 0) : 0;

      let specialPlay: string | null = null;
      if (p.cards) {
        const pHand = evaluateHand(p.cards);
        const typeLower = pHand.type.toLowerCase();
        if (['primera', 'chivo', 'segunda'].includes(typeLower)) {
          specialPlay = typeLower;
        }
      }

      if (p.supabaseUserId) {
        SupabaseService.updatePlayerStats(p.supabaseUserId, isWinner, playerPayout, playerRake, specialPlay).catch(console.error);
      }
    });

    // Mark as persisted so dismiss-showdown doesn't re-persist
    if (this.pendingShowdownData) {
      this.pendingShowdownData.persisted = true;
    }
  }

  /**
   * Handles visual cleanup after dismiss-showdown. Transitions to LOBBY.
   * Financial settlement already happened in persistShowdownResults.
   */
  public finalizeShowdown(
    overallWinnerId: string,
    potWinners: { winnerId: string; potAmount: number; payout: number; rake: number }[],
    totalPayout: number,
    totalRake: number,
    activePlayers: Player[]
  ) {

    this.clearTurnTimer();
    this.clearShowdownAutoTimer();
    this.cleanupRound();
  }

/**
   * Limpieza centralizada de fin de ronda (M2).
   * Se llama desde TODOS los caminos de finalización: showdown, early fold, refund, etc.
   * Resetea pots, cartas, flags, rota La Mano y promueve espectadores.
   */
  public cleanupRound() {
    this.clearTurnTimer();
    this.clearShowdownAutoTimer();
    this.pendingPiqueWinnerId = "";
    this.pendingPiqueWinnerIds = [];
    this.pendingPiqueContestantIds = [];
    this.pendingPiqueContinuation = "DESCARTE";
    this.pendingPiqueReopenCallers = [];
    this.forcedShowdownRevealWinnerId = "";
    this.apuesta4OriginalManoId = "";

    Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => {
      p.isReady = false;
      p.revealedCards = "";
    });

    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.bottomCard = "";
    this.state.activeManoId = "";
    this.state.showdownTimer = 0;

    this.promoteWaitingPlayers();
    this.state.phase = "LOBBY";
    this.notifyInsufficientBalance();

    // Rotar La Mano solo si no rotó ya durante esta partida
    if (!this.dealerRotatedThisGame) {
      const dealerSeatIdx = this.seatOrder.indexOf(this.state.dealerId);
      if (dealerSeatIdx !== -1 && this.seatOrder.length > 1) {
        const nextSeatIdx = (dealerSeatIdx + 1) % this.seatOrder.length;
        this.state.dealerId = this.seatOrder[nextSeatIdx];
      }
    }
    this.assignTurnOrders();
  }

  /**
    * Entrega el pot completo a un único ganador (usado en SHOWDOWN_WAIT cuando solo queda 1 jugador).
    * Delegación simple a finalizeShowdown con un solo pot.
    */
  public awardPot(winnerId: string) {
    const winner = this.state.players.get(winnerId);
    if (!winner) return;

    const totalPot = this.state.pot + this.state.piquePot;
    const potRake = Math.ceil(this.state.pot * 0.05 / 100) * 100;
    const piqueRake = Math.ceil(this.state.piquePot * 0.05 / 100) * 100;
    const potPayout = this.state.pot - potRake;
    const piquePayout = this.state.piquePot - piqueRake;
    const rake = potRake + piqueRake;
    const payout = potPayout + piquePayout;

    winner.chips += payout;
    console.log(`[MesaRoom] Ganador único: ${winner.nickname} ganó $${payout} (Rake: $${rake})`);

    this.recordEvent({ event: 'end', winner: winnerId, pot: totalPot, payout, rake, time: Date.now(), rng_state: this.getRngState() });

    const playersSnapshot = this.getPlayers().map(p => ({
      userId: p.supabaseUserId || p.id,
      sessionId: p.id,
      nickname: p.nickname,
      cards: p.cards,
      chips: p.chips
    }));

    if (winner.supabaseUserId) {
      SupabaseService.awardPot(winner.supabaseUserId, payout, rake, this.currentGameId, undefined, {
        roomId: this.roomId,
        tableName: (this as any).metadata?.tableName || 'Mesa VIP',
        playersPresent: playersSnapshot.map(p => ({ odisplayName: p.nickname }))
      }).then(result => {
        if (!result.success) {
          AlertService.settlementFailed(winner.nickname, winner.supabaseUserId, this.currentGameId, result.error || 'unknown', this.roomId);
        }
      }).catch(console.error);
    }

    const potBreakdown = { totalPot, mainPot: this.state.pot, piquePot: this.state.piquePot, payout, rake };
    const finalHands: Record<string, any> = {};
    this.getPlayers().forEach(p => {
      if (p.cards) {
        const hand = evaluateHand(p.cards);
        finalHands[p.supabaseUserId || p.id] = { cards: p.cards, handType: hand.type, handPoints: hand.points, nickname: p.nickname };
      }
    });
    const adminTimeline = [...this.currentTimeline];
    const playerTimeline = this.currentTimeline.map(({ rng_state, ...event }) => event);
    SupabaseService.saveReplay(this.currentGameId, this.state.lastSeed, playerTimeline, playersSnapshot, adminTimeline, potBreakdown, finalHands, this.roomId, this.metadata?.tableName || 'Mesa VIP', this.snapshotBuilder.build()).catch(console.error);

    // Update stats
    this.getPlayers().forEach(p => {
      const isWinner = p.id === winner.id;
      const playerPayout = isWinner ? payout : -p.totalMainBet;
      const playerRake = isWinner ? rake : 0;
      let specialPlay: string | null = null;
      if (p.cards) {
        const pHand = evaluateHand(p.cards);
        const typeLower = pHand.type.toLowerCase();
        if (['primera', 'chivo', 'segunda'].includes(typeLower)) specialPlay = typeLower;
      }
      if (p.supabaseUserId) {
        SupabaseService.updatePlayerStats(p.supabaseUserId, isWinner, playerPayout, playerRake, specialPlay).catch(console.error);
      }
    });

    Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => p.isReady = false);
    this.cleanupRound();
  }

  public endRound() {
    console.log(`[MesaRoom] Fin de la ronda (Showdown/Muck finalizado).`);
    this.clock.setTimeout(() => {
      this.restartLobby();
    }, 5000); // 5s to see winners
  }

  public restartLobby() {
    this.promoteWaitingPlayers();
    this.state.players.forEach((p: Player, sessionId: string) => {
      p.isReady = false;
      this.setPlayerCards(sessionId, "");
      p.revealedCards = "";
    });
    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.phase = "LOBBY";
    this.notifyInsufficientBalance();
  }

  public endHandEarly() {
    const winner = Array.from(this.state.players.values() as IterableIterator<Player>).find(p => !p.isFolded && p.connected);
    if (winner) {
      console.log(`[MesaRoom] Ganador sin showdown (Rival retirado/Farol). Ofreciendo mostrar cartas a ${winner.id}...`);
      this.state.lastAction = `¡${winner.nickname} gana!`;
      this.state.phase = "SHOWDOWN_WAIT";
      this.state.turnPlayerId = winner.id;
      this.state.showdownTimer = 0;
    } else {
      console.log(`[MesaRoom] Fin de mano prematuro, pero no hay un ganador claro. Se aborta partida.`);
      Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => p.isReady = false);
      this.state.pot = 0;
      this.state.piquePot = 0;
      this.promoteWaitingPlayers();
      this.state.phase = "LOBBY";
      this.notifyInsufficientBalance();
    }
  }

  /**
   * Asigna el número de turno relativo a La Mano a cada jugador activo.
   * La Mano recibe turnOrder = 1, el siguiente jugador a la derecha = 2, y así sucesivamente.
   * Permite que el cliente muestre visualmente el orden de rotación de la mano.
   */
  public assignTurnOrders(): void {
    const manoSeatIdx = this.seatOrder.indexOf(this.state.activeManoId || this.state.dealerId);
    if (manoSeatIdx === -1) return;

    this.state.players.forEach((player: Player) => {
      const playerSeatIdx = this.seatOrder.indexOf(player.id);
      if (playerSeatIdx === -1) {
        player.turnOrder = 0;
        return;
      }
      player.turnOrder = ((playerSeatIdx - manoSeatIdx + this.seatOrder.length) % this.seatOrder.length) + 1;
    });
  }

  /**
   * Transfiere la Mano activa al siguiente jugador activo en seatOrder.
   * Se llama cuando el activeManoId se retira en cualquier fase de apuesta.
   */
  /**
   * Rota dealerId inmediatamente si el jugador es la Mano actual y aún no rotó en esta partida.
   * Usado para "Mano Definitiva" (pasa/se bota) y "Mano Ganadora" (gana pique mostrando).
   */
  public attemptManoRotation(playerId: string, reason: string): void {
    if (playerId === this.state.dealerId && !this.dealerRotatedThisGame) {
      console.log(`[MesaRoom] Rotación de Mano (${reason}). Pasa al siguiente.`);
      this.dealerRotatedThisGame = true;
      const dealerSeatIdx = this.seatOrder.indexOf(this.state.dealerId);
      if (dealerSeatIdx !== -1 && this.seatOrder.length > 1) {
        const nextSeatIdx = (dealerSeatIdx + 1) % this.seatOrder.length;
        this.state.dealerId = this.seatOrder[nextSeatIdx];
        this.assignTurnOrders();
      }
    }
  }

  /**
   * Marca a los jugadores desconectados que no pueden igualar la apuesta máxima
   * como All-In implícito, para que el PotManager calcule los Side Pots correctamente.
   * Se llama después de cualquier Raise que suba currentMaxBet.
   */
  public markDisconnectedAsImplicitAllIn() {
    const maxBet = this.state.currentMaxBet;
    for (const [id, player] of this.state.players) {
      const p = player as Player;
      // Solo jugadores desconectados, no foldeados, que ya apostaron algo
      // pero no pueden igualar la nueva apuesta máxima
      if (!p.connected && !p.isFolded && !p.isAllIn && p.roundBet < maxBet && p.roundBet > 0) {
        p.isAllIn = true;
        console.log(`[MesaRoom] ${p.nickname} marcado como All-In implícito por desconexión (roundBet=$${p.roundBet}, maxBet=$${maxBet})`);
      }
    }
  }

  public transferMano(): void {
    const currentSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
    if (currentSeatIdx === -1) return;
    const total = this.seatOrder.length;
    for (let i = 1; i <= total; i++) {
      const idx = (currentSeatIdx + i) % total;
      const id = this.seatOrder[idx];
      const p = this.state.players.get(id);
      if (p && p.connected && !p.isFolded) {
        this.state.activeManoId = id;
        return;
      }
    }
  }

  /**
   * Reembolsa todas las apuestas activas (pot + piquePot) a los jugadores
   * que contribuyeron, cuando la mano se cancela por desconexión masiva.
   * Usa totalMainBet como registro de contribución para el pot principal.
   * Devuelve la sala a LOBBY después del reembolso.
   */
  public refundAllActiveBets() {
    console.log(`[MesaRoom] Reembolsando todas las apuestas activas (desconexión masiva o sin jugadores conectados)`);

    const tableName = (this as any).metadata?.tableName || 'Mesa VIP';

    // Reembolsar contribuciones al pot principal (totalMainBet)
    for (const [, player] of this.state.players) {
      const p = player as Player;
      if (!p.supabaseUserId || p.totalMainBet <= 0) continue;
      console.log(`[MesaRoom] Refunding pot: ${p.nickname}: $${p.totalMainBet}`);
      p.chips += p.totalMainBet;
      SupabaseService.refundPlayer(
        p.supabaseUserId,
        p.totalMainBet,
        this.currentGameId,
        { roomId: this.roomId, tableName, reason: 'Reembolso: mano cancelada (sin jugadores conectados)' }
      ).catch(err => AlertService.refundFailed(p.supabaseUserId, p.totalMainBet, this.currentGameId, String(err), this.roomId));
    }

    // Reembolsar piquePot: distribuir entre los jugadores que contribuyeron
    // (no tenemos tracking individual de quién puso qué en el pique, pero los
    // que no están folded contribuyeron. Distribuir proporcionalmente.)
    if (this.state.piquePot > 0) {
      const piqueContributors = Array.from(this.state.players.values() as IterableIterator<Player>)
        .filter(p => !p.isFolded && p.supabaseUserId);
      if (piqueContributors.length > 0) {
        const share = Math.floor(this.state.piquePot / piqueContributors.length);
        const remainder = this.state.piquePot - (share * piqueContributors.length);
        piqueContributors.forEach((p, i) => {
          const refundAmount = share + (i === 0 ? remainder : 0);
          if (refundAmount > 0) {
            p.chips += refundAmount;
            SupabaseService.refundPlayer(
              p.supabaseUserId,
              refundAmount,
              this.currentGameId,
              { roomId: this.roomId, tableName, reason: 'Reembolso pique: mano cancelada (sin jugadores conectados)' }
            ).catch(err => AlertService.refundFailed(p.supabaseUserId, refundAmount, this.currentGameId, String(err), this.roomId));
          }
        });
      }
    }

    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.turnPlayerId = "";
    this.state.activeManoId = "";
    this.state.showdownTimer = 0;

    Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => {
      p.isReady = false;
      p.hasActed = false;
      p.isFolded = false;
      p.revealedCards = "";
      p.totalMainBet = 0;
      p.roundBet = 0;
    });

    this.promoteWaitingPlayers();
    this.state.phase = "LOBBY";
    this.notifyInsufficientBalance();
  }

  public shuffleDeck() {
    // Delegado a core/DeckManager (refactor Fase 1.1). Comportamiento idéntico.
    shuffleDeckPure(this.deck);
  }

  /**
   * Actualiza las cartas de un jugador de forma segura:
   * 1. Almacena en la propiedad privada del servidor (nunca sincronizada).
   * 2. Actualiza el conteo público de cartas (cardCount) para que los demás dibujen dorsos.
   * 3. Envía las cartas reales SOLO al dueño vía mensaje privado.
   * @param reveal Si true, también establece revealedCards (para SORTEO/SHOWDOWN).
   */
  public setPlayerCards(sessionId: string, cards: string, reveal: boolean = false): void {
    const player = this.state.players.get(sessionId);
    if (!player) return;
    player.cards = cards;
    player.cardCount = cards ? cards.split(',').filter(Boolean).length : 0;
    if (reveal) player.revealedCards = cards;
    this.sendPrivateCards(sessionId);
  }

  /**
   * Envía las cartas reales a un solo cliente mediante mensaje privado de Colyseus.
   * Ningún otro navegador recibe este dato.
   */
  public sendPrivateCards(sessionId: string): void {
    const client = this.clientMap.get(sessionId);
    const player = this.state.players.get(sessionId);
    if (client && player) {
      const cards = player.cards ? player.cards.split(',').filter(Boolean) : [];
      client.send("private-cards", cards);
    }
  }

  /**
   * Generates a deterministic RNG state hash for the current action.
   * Used in the admin timeline for step-by-step cryptographic auditing.
   */
  public getRngState(): string {
    this.rngCounter++;
    return crypto
      .createHash('sha256')
      .update(`${this.state.lastSeed}:${this.rngCounter}`)
      .digest('hex')
      .substring(0, 16);
  }

  // ── Pique Fijo: helpers de votación ──

  public clearPiqueProposal() {
    this.state.proposedPique = 0;
    this.state.proposedPiqueBy = "";
    this.state.piqueVotesFor = 0;
    this.state.piqueVotesAgainst = 0;
    this.state.piqueVotersTotal = 0;
    this.piqueVoters.clear();
    this.piqueProposerId = "";
  }

  public resolvePiqueVoteIfReady() {
    if (this.state.proposedPique === 0 || this.state.piqueVotersTotal === 0) return;

    const majority = Math.floor(this.state.piqueVotersTotal / 2) + 1;

    if (this.state.piqueVotesFor >= majority) {
      this.state.minPique = this.state.proposedPique;
      this.state.lastAction = `¡Pique Fijo aprobado! Nuevo mínimo: $${(this.state.minPique / 100).toLocaleString()}`;
      console.log(`[MesaRoom] Pique fijo aprobado: $${this.state.minPique / 100}`);
      this.broadcast("pique_approved", { amount: this.state.minPique });
      this.clearPiqueProposal();
    } else if (this.state.piqueVotesAgainst >= majority) {
      this.state.lastAction = "Propuesta de Pique Fijo rechazada";
      console.log(`[MesaRoom] Pique fijo rechazado`);
      this.broadcast("pique_rejected", {});
      this.clearPiqueProposal();
    }
    // Si no hay mayoría aún, seguir esperando
  }

  // ── Single-session policy: Redis pub/sub ──

  // ── Wrappers para preservar compatibilidad con tests existentes ──
  public setupSessionKickListener() {
    setupSessionKickListener(this);
  }

  public handleSessionKick(userId: string, newDeviceId: string) {
    handleSessionKick(this, userId, newDeviceId);
  }

  onDispose() {
    // ── Settlement: refund unsettled bets if a game was in progress ──
    if (this.state.phase !== "LOBBY") {
      console.log(`[MesaRoom] Room disposing during active game (phase: ${this.state.phase}). Refunding unsettled bets...`);
      const tableName = (this as any).metadata?.tableName || 'Mesa VIP';
      for (const [sessionId, player] of this.state.players) {
        const p = player as Player;
        if (!p.supabaseUserId || p.totalMainBet <= 0) continue;
        console.log(`[MesaRoom] Refunding ${p.nickname}: $${p.totalMainBet} (totalMainBet)`);
        SupabaseService.refundPlayer(
          p.supabaseUserId,
          p.totalMainBet,
          this.currentGameId,
          { roomId: this.roomId, tableName, reason: 'Reembolso por cierre de sala en partida activa' }
        ).catch(err => AlertService.refundFailed(p.supabaseUserId, p.totalMainBet, this.currentGameId, String(err), this.roomId));
      }
      // Refund pique pot contributions (tracked via piquePot but not via totalMainBet in some phases)
      // piquePot is separate from main pot — if players contributed to pique but it wasn't settled
      // those amounts were already debited via recordBet but not awarded via awardPot
      // The piquePot contributions ARE included in totalMainBet only for ante-phase;
      // for pique phase they are separate bets. We need to track who contributed what.
      // For simplicity, if there's remaining piquePot we distribute it back proportionally.
      // However, pique bets go through recordBet() too, so they are already debited.
      // The totalMainBet does NOT include pique contributions (pique goes to piquePot, not pot).
      // We'll refund the piquePot to connected non-folded players proportionally.
      if (this.state.piquePot > 0) {
        const piqueContributors = this.getPlayers()
          .filter((p) => Boolean(p.supabaseUserId) && !p.isFolded && p.connected);
        if (piqueContributors.length > 0) {
          const share = Math.floor(this.state.piquePot / piqueContributors.length);
          const remainder = this.state.piquePot - (share * piqueContributors.length);
          piqueContributors.forEach((p, i) => {
            const refundAmount = share + (i === 0 ? remainder : 0);
            if (refundAmount > 0) {
              SupabaseService.refundPlayer(
                p.supabaseUserId,
                refundAmount,
                this.currentGameId,
                { roomId: this.roomId, tableName, reason: 'Reembolso de pique por cierre de sala' }
              ).catch(err => AlertService.refundFailed(p.supabaseUserId, refundAmount, this.currentGameId, String(err), this.roomId));
            }
          });
        }
      }
    }

    // Cleanup Redis subscriber when room is destroyed
    if (this.redisSub) {
      this.redisSub.unsubscribe("session_kick").catch(() => {});
      this.redisSub.disconnect();
      this.redisSub = undefined;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Replay v2 — captura de eventos + frames para reconstruccion visual
  // ──────────────────────────────────────────────────────────────────

  /**
   * Empuja un evento al timeline y captura un frame con el estado actual.
   * Sustituye el uso directo de `this.currentTimeline.push(...)`.
   */
  public recordEvent(event: any): void {
    this.currentTimeline.push(event);
    const hint = this.deriveHint(event);
    this.snapshotBuilder.captureFrame(
      this.state as unknown as StateLike,
      this.currentTimeline.length - 1,
      hint,
    );
  }

  /** Deriva una pista de animacion a partir del evento para el reproductor visual. */
  public deriveHint(event: any): AnimationHint | undefined {
    if (!event || typeof event !== 'object') return undefined;
    switch (event.event) {
      case 'start':
        return { kind: 'phase_change' };
      case 'action': {
        if (Array.isArray(event.droppedCards) && event.droppedCards.length > 0) {
          return { kind: 'discard', targetPlayerId: event.player, cards: event.droppedCards };
        }
        if (event.action === 'bote' || event.action === 'botarse' || event.action === 'me-boto') {
          return { kind: 'fold', targetPlayerId: event.player };
        }
        if (event.action === 'paso' || event.action === 'pasar') {
          return { kind: 'pass', targetPlayerId: event.player };
        }
        if (typeof event.amount === 'number' && event.amount > 0) {
          return { kind: 'bet', targetPlayerId: event.player, amount: event.amount };
        }
        return { kind: 'pass', targetPlayerId: event.player };
      }
      case 'declarar_juego':
        return { kind: 'reveal', targetPlayerId: event.player };
      case 'pique_won':
      case 'pique_won_early':
      case 'pique_won_apuesta4':
        return { kind: 'pique_award', targetPlayerId: event.winner, amount: event.payout };
      case 'pique_restart':
        return { kind: 'phase_change' };
      case 'banda':
        return { kind: 'pot_award', targetPlayerId: event.winner, amount: event.totalBanda };
      case 'end':
        return { kind: 'pot_award', targetPlayerId: event.winner, amount: event.payout };
      default:
        return undefined;
    }
  }
}
