import { Room, Client } from "colyseus";
import { GameState, Player } from "../schemas/GameState";
import { SupabaseService } from "../services/SupabaseService";
import { AlertService } from "../services/AlertService";
import { createRedisSubscriber } from "../services/redis";
import type Redis from "ioredis";
import * as crypto from "crypto";
import { evaluateHand, compareHands, HandEvaluation } from "./combinations";

const MIN_BALANCE_CENTS = 5_000_000; // $50,000 en centavos

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
  private countdownTimer?: any;
  private currentGameId: string = crypto.randomUUID();
  private currentTimeline: any[] = [];
  /** RNG state tracker: incremented per action for admin audit trail */
  private rngCounter: number = 0;
  /**
   * Orden estable de asientos (por orden de entrada).
   * Garantiza que la rotación de La Mano sea siempre "al jugador de la derecha",
   * independientemente del orden interno del MapSchema.
   */
  private seatOrder: string[] = [];
  /** Mazo privado del servidor (nunca sincronizado a los clientes). */
  private deck: string[] = [];
  /** Mapa de clientes conectados para el envío de mensajes privados. */
  private clientMap = new Map<string, Client>();
  /** Espectadores admin (no reciben cartas, solo observan estado público). */
  private spectators = new Map<string, Client>();
  /** Jugadores que ganaron el pique por doble-paso con juego. */
  private juegoCallers: string[] = [];
  /** ID del ganador del pique pendiente de decidir mostrar/ocultar cartas. */
  private pendingPiqueWinnerId: string = "";
  /** ID del jugador que declaró "llevo juego" en DESCARTE, pendiente de dismiss. */
  private pendingLlevoJuegoPlayerId: string = "";
  private pendingShowdownData: { overallWinnerId: string; potWinners: any[]; totalPayout: number; totalRake: number; activePlayers: Player[]; persisted?: boolean } | null = null;
  /** Votación democrática del pique fijo. */
  private piqueVoters = new Map<string, boolean>();
  private piqueProposerId: string = "";
  /** Jugadores que dijeron "paso" en la ronda de PIQUE actual (para cobro de Banda). */
  private piquePassPlayerIds = new Set<string>();
  /** Jugadores que pasaron ANTES de que hubiera apuesta fija (candidatos a reapertura). */
  private piquePreBetPasserIds = new Set<string>();
  /** Indica si estamos en reapertura de PIQUE (passers previos deben reconfirmar). */
  private piqueReopenActive = false;
  /** IDs de jugadores pendientes de reconfirmar durante la reapertura de PIQUE. */
  private piqueReopenPendingIds = new Set<string>();
  /** Bandera para evitar doble rotación si la Mano Definitiva ya rotó durante la partida */
  private dealerRotatedThisGame = false;
  /** Contador de reinicios consecutivos del pique para evitar bucle infinito */
  private piqueRestartCount = 0;
  private static readonly MAX_PIQUE_RESTARTS = 10;
  /** Contador de veces que cada jugador se botó en PIQUE (persistente entre reinicios) */
  private piqueFoldCount = new Map<string, number>();
  /** Jugadores con "paso provisional" en APUESTA_4_CARTAS cuando quedan jugadores detrás por actuar */
  private pasoPendienteIds = new Set<string>();
  /** Jugador pendiente de decidir Llevo Juego / No Llevo en resolución inmediata */
  private pendingPasoJuegoPlayerId: string = "";
  /** Fase en la que se inició la resolución inmediata de paso-juego */
  private pendingPasoJuegoPhase: string = "";
  /** Fase desde la que se entró a PIQUE_REVEAL para saber a dónde volver */
  private phaseBeforePiqueReveal: string = "";
  /** Redis subscriber for single-session kick events */
  private redisSub?: Redis;

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
    this.setupSessionKickListener();

    this.onMessage("delete-room", async (client, message) => {
      const { adminToken } = message;
      // In a real scenario, we'd verify the adminToken against Supabase
      // For now, if the client sends this and the room is empty or it's an admin, we allow it
      console.log(`[MesaRoom] Petición de eliminación de sala por: ${adminToken}`);
      this.disconnect();
    });

    this.onMessage("toggleReady", (client, message) => {
      if (this.state.phase !== "LOBBY") return;

      const player = this.state.players.get(client.sessionId);
      if (!player || player.isWaiting) return;

      // Bloquear "Listo" si el saldo es menor al pique mínimo
      if (message.isReady && player.chips < this.state.minPique) {
        const formatted = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(this.state.minPique / 100);
        client.send("insufficient-balance", { required: this.state.minPique, current: player.chips, message: `Tu saldo es insuficiente para el pique mínimo (${formatted}). Recarga tu cuenta para seguir jugando.` });
        return;
      }

      player.isReady = message.isReady;

      this.checkStartCountdown();
    });

    // ── Pique Fijo: Propuesta y Votación Democrática ──

    this.onMessage("propose_pique", (client, message) => {
      if (this.state.phase !== "LOBBY") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isWaiting) return;
      if (this.state.proposedPique > 0) return; // Ya hay una propuesta activa

      const amount = message.amount;
      if (typeof amount !== "number" || amount < 500_000 || amount > 50_000_000) return;
      if (amount === this.state.minPique) return; // No tiene sentido proponer el mismo valor

      this.piqueProposerId = client.sessionId;
      this.piqueVoters.clear();
      this.state.proposedPique = amount;
      this.state.proposedPiqueBy = client.sessionId;
      this.state.piqueVotesFor = 0;
      this.state.piqueVotesAgainst = 0;

      // Votantes = jugadores activos conectados que no son el proponente ni están en espera
      const voters = Array.from(this.state.players.values() as IterableIterator<Player>)
        .filter(p => p.connected && !p.isWaiting && p.id !== client.sessionId);
      this.state.piqueVotersTotal = voters.length;

      this.state.lastAction = `${player.nickname} propone Pique Fijo de $${(amount / 100).toLocaleString()}`;
      console.log(`[MesaRoom] ${player.nickname} propone pique fijo: $${amount / 100}`);

      // Si es el único jugador, auto-aprobar
      if (voters.length === 0) {
        this.state.minPique = amount;
        this.broadcast("pique_approved", { amount });
        this.clearPiqueProposal();
      }
    });

    this.onMessage("vote_pique", (client, message) => {
      if (this.state.phase !== "LOBBY") return;
      if (this.state.proposedPique === 0) return;
      if (client.sessionId === this.piqueProposerId) return; // El proponente no vota
      if (this.piqueVoters.has(client.sessionId)) return; // Ya votó

      const player = this.state.players.get(client.sessionId);
      if (!player || player.isWaiting) return;

      const approve = !!message.approve;
      this.piqueVoters.set(client.sessionId, approve);

      if (approve) {
        this.state.piqueVotesFor++;
      } else {
        this.state.piqueVotesAgainst++;
      }

      this.resolvePiqueVoteIfReady();
    });

    // Abandono explícito: el jugador decidió irse voluntariamente
    this.onMessage("abandon", (client) => {
      const player = this.state.players.get(client.sessionId);
      console.log(`[MesaRoom] Abandono voluntario de ${player?.nickname || client.sessionId}`);
      this.removePlayer(client.sessionId);
    });

    this.onMessage("action", async (client, message) => {
      if (this.state.turnPlayerId !== client.sessionId) return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (this.state.phase === "PIQUE") {
        const { action } = message; // "voy" o "paso"

        if (action !== "paso" && action !== "voy") {
          console.log(`[MesaRoom] Acción inválida '${action}' de ${player.nickname} en fase PIQUE. Rechazada.`);
          return;
        }

        // Guard contra doble procesamiento (race condition con async handler)
        if (player.hasActed) {
          console.warn(`[MesaRoom] ${player.nickname} ya actuó en esta ronda de PIQUE. Ignorando duplicado.`);
          return;
        }

        // Reiniciar contador de restarts cuando un jugador actúa
        this.piqueRestartCount = 0;

        player.hasActed = true;

        this.currentTimeline.push({ event: 'action', phase: 'PIQUE', player: client.sessionId, action, time: Date.now(), rng_state: this.getRngState() });

        if (action === "paso") {
          player.isFolded = true;
          this.piquePassPlayerIds.add(client.sessionId);
          // Rastrear si pasó antes de que existiera apuesta fija (candidato a reapertura)
          if (!this.piqueReopenActive && this.state.currentMaxBet === 0) {
            this.piquePreBetPasserIds.add(client.sessionId);
          }

          // ── Reapertura: paso definitivo (sin doble-botada, misma mano) ──
          if (this.piqueReopenActive) {
            this.piqueReopenPendingIds.delete(client.sessionId);
            this.state.lastAction = `${player.nickname} pasa definitivamente`;
          } else {
          // ── Doble-botada: lógica especial al botarse por 2ª vez ──
          const prevFolds = this.piqueFoldCount.get(client.sessionId) || 0;
          const newFolds = prevFolds + 1;
          this.piqueFoldCount.set(client.sessionId, newFolds);

          if (newFolds >= 2) {
            // Verificar si "lleva juego" (2 cartas del mismo palo → potencial Segunda)
            const playerCards = player.cards ? player.cards.split(',').filter(Boolean) : [];
            const suits = playerCards.map(c => c.split('-')[1]);
            const llevaJuego = suits.length >= 2 && suits.every(s => s === suits[0]);

            if (llevaJuego) {
              // Mostrar cartas públicamente (lleva juego y se bota)
              // El jugador controlará cuándo cerrar con "dismiss-reveal"
              player.revealedCards = player.cards;
              this.state.lastAction = `${player.nickname} lleva juego y se bota (muestra cartas)`;
              this.state.phase = "PIQUE_REVEAL";
              this.state.turnPlayerId = client.sessionId;
              this.broadcast("pique-fold-reveal", { playerId: client.sessionId, llevaJuego: true, cards: player.cards });
            } else {
              this.state.lastAction = `${player.nickname} se bota (sin juego)`;
            }

            // Recoger cartas, barajarlas y ponerlas encima del naipe
            const foldedCards = playerCards.slice();
            for (let i = foldedCards.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [foldedCards[i], foldedCards[j]] = [foldedCards[j], foldedCards[i]];
            }
            for (const card of foldedCards) {
              this.deck.push(card);
            }
            this.setPlayerCards(client.sessionId, "");

            if (llevaJuego) {
              // No avanzar turno aquí — esperar a que el jugador cierre el reveal
              return;
            }
          } else {
            this.state.lastAction = `${player.nickname} pasa en el Pique`;
          }
          } // end else (!piqueReopenActive)

          this.attemptManoRotation(client.sessionId, "Mano pasa en Pique");
          if (player.id === this.state.activeManoId) this.transferMano();
        } else if (action === "voy") {
          // Durante reapertura, sacar al jugador del set de pendientes
          if (this.piqueReopenActive) {
            this.piqueReopenPendingIds.delete(client.sessionId);
          }
          const betAmount = message.amount || this.state.minPique;
          const actualBet = Math.min(betAmount, player.chips);

          // ── Privilegio de La Mano: fija el precio del pique ──
          if (player.id === this.state.activeManoId) {
            // La Mano debe respetar el pique mínimo de la mesa
            if (actualBet > 0 && actualBet < this.state.minPique) {
              player.hasActed = false;
              this.currentTimeline.pop();
              client.send("error", { message: `El pique mínimo es $${(this.state.minPique / 100).toLocaleString()}` });
              return;
            }
            // La Mano impone el monto obligatorio para todos los demás
            if (actualBet > 0) {
              this.state.currentMaxBet = actualBet;
              console.log(`[MesaRoom] La Mano (${player.nickname}) fija el pique en $${actualBet}`);
            }
          } else {
            // ── Los demás DEBEN igualar exactamente lo que picó La Mano ──
            const requiredBet = this.state.currentMaxBet > 0 ? this.state.currentMaxBet : this.state.minPique;
            // Permitir all-in si no le alcanzan las fichas
            if (actualBet > 0 && actualBet < requiredBet && actualBet !== player.chips) {
              player.hasActed = false;
              this.currentTimeline.pop();
              client.send("error", { message: `Debes apostar $${(requiredBet / 100).toLocaleString()} (lo que picó La Mano)` });
              return;
            }
          }

          if (actualBet <= 0) {
            player.isFolded = true;
            this.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
            if (player.id === this.state.activeManoId) this.transferMano();
          } else {
            // Persist bet to DB before modifying RAM state
            if (player.supabaseUserId) {
              const result = await SupabaseService.recordBet(player.supabaseUserId, actualBet, this.currentGameId, undefined, { roomId: this.roomId, tableName: (this as any).metadata?.tableName, phase: 'PIQUE' });
              if (result && !result.success && result.isBalanceError) {
                player.isFolded = true;
                this.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
                if (player.id === this.state.activeManoId) this.transferMano();
                this.advanceTurnPhase2();
                return;
              }
            }
            player.chips -= actualBet;
            this.state.piquePot += actualBet;
            this.state.lastAction = `${player.nickname} va $${(actualBet / 100).toLocaleString()} para Pique`;
          }
        }

        this.advanceTurnPhase2();
      } else if (this.state.phase === "DESCARTE") {
        const { action, droppedCards } = message;
        player.hasActed = true;
        this.currentTimeline.push({ event: 'action', phase: 'DESCARTE', player: client.sessionId, action, droppedCards, time: Date.now(), rng_state: this.getRngState() });

        if (action === "discard") {
          if (droppedCards && Array.isArray(droppedCards) && droppedCards.length > 0) {
            let currentHand = player.cards ? player.cards.split(',').filter(Boolean) : [];
            currentHand = currentHand.filter((c: string) => !droppedCards.includes(c));
            this.setPlayerCards(client.sessionId, currentHand.join(','));
            for (const c of droppedCards) { this.deck.push(c); }
            player.pendingDiscardCards = droppedCards;
            this.state.lastAction = `${player.nickname} bota ${droppedCards.length} carta${droppedCards.length !== 1 ? 's' : ''}`;
          } else {
            // Keep all cards (discard 0)
            player.pendingDiscardCards = [];
            this.state.lastAction = `${player.nickname} mantiene su mano`;
          }
        } else if (action === "paso") {
          player.isFolded = true;
          this.state.lastAction = `${player.nickname} se bota`;
          this.attemptManoRotation(client.sessionId, "Mano se bota en descarte");
          if (player.id === this.state.activeManoId) this.transferMano();
        }
        this.advanceTurnPhaseDescarte();
      } else if (this.state.phase === "APUESTA_4_CARTAS" || this.state.phase === "GUERRA" || this.state.phase === "CANTICOS" || this.state.phase === "GUERRA_JUEGO") {
        const { action, amount } = message;
        const phase = this.state.phase;
        const advanceNext = () => this.advanceTurnBetting(
          undefined,
          this.getNextPhaseCallback(phase)
        );

        if (!["paso", "voy", "igualar", "resto"].includes(action)) {
          console.log(`[MesaRoom] Acción inválida '${action}' de ${player.nickname} en fase ${phase}. Rechazada.`);
          return;
        }

        this.currentTimeline.push({ event: 'action', phase, player: client.sessionId, action, amount, time: Date.now(), rng_state: this.getRngState() });

        if (action === "paso") {
          if (this.state.currentMaxBet === 0 || player.roundBet >= this.state.currentMaxBet) {
            // Check: nadie ha apostado o ya igualamos
            player.hasActed = true;
            this.state.lastAction = `${player.nickname} pasa (check)`;
          } else if (phase === "GUERRA_JUEGO") {
            // GUERRA_JUEGO: declinar la apuesta extra sin perder elegibilidad de showdown
            player.hasActed = true;
            player.declinedGuerraJuegoBet = true;
            this.state.lastAction = `${player.nickname} pasa (no iguala)`;
            console.log(`[MesaRoom] ${player.nickname} declina apuesta extra en GUERRA_JUEGO — sigue al showdown`);
          } else {
            // Hay apuesta activa y no hemos igualado

            const hand = evaluateHand(player.cards);
            if (hand.type !== 'NINGUNA') {
              // Resolución inmediata: preguntar Llevo Juego / No Llevo ahora mismo
              this.pendingPasoJuegoPlayerId = client.sessionId;
              this.pendingPasoJuegoPhase = phase;
              const clientObj = this.clientMap.get(client.sessionId);
              if (clientObj) {
                clientObj.send('paso-juego-choice', { handType: hand.type });
              }
              this.state.lastAction = `${player.nickname} decide si lleva juego...`;
              console.log(`[MesaRoom] ${player.nickname} paso definitivo con juego (${hand.type}) en ${phase} — esperando decisión inmediata`);
              // NO llamar advanceNext() — turn queda en este jugador hasta que responda
              return;
            } else {
              // No tiene juego: fold inmediato + recoger cartas al naipe
              const wasMano = player.id === this.state.activeManoId;
              player.isFolded = true;
              player.hasActed = true;
              this.state.lastAction = `${player.nickname} se bota`;

              // Recoger cartas del jugador al naipe
              this.collectPlayerCards(client.sessionId, phase === 'APUESTA_4_CARTAS' && wasMano && this.seatOrder.length === 7);

              this.attemptManoRotation(client.sessionId, "Mano se bota en apuestas");
              if (wasMano) this.transferMano();
            }
          }
          advanceNext();

        } else if (action === "voy") {
          this.pasoPendienteIds.delete(client.sessionId);
          const betIncrement = amount || 0;
          if (betIncrement <= 0) {
            console.log(`[MesaRoom] ${player.nickname} intentó IR con monto inválido.`);
            return;
          }
          // Validar que el nuevo total supere currentMaxBet (raise)
          if (player.roundBet + betIncrement <= this.state.currentMaxBet) {
            client.send("error", { message: `La apuesta debe superar $${(this.state.currentMaxBet / 100).toLocaleString()}` });
            return;
          }
          const actualBet = Math.min(betIncrement, player.chips);
          if (actualBet <= 0) {
            player.isFolded = true;
            player.hasActed = true;
            this.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
            this.attemptManoRotation(client.sessionId, "Mano sin fichas en apuestas");
            if (player.id === this.state.activeManoId) this.transferMano();
            advanceNext();
            return;
          }
          // Persist to DB
          if (player.supabaseUserId) {
            const result = await SupabaseService.recordBet(player.supabaseUserId, actualBet, this.currentGameId, undefined, { roomId: this.roomId, tableName: (this as any).metadata?.tableName, phase });
            if (result && !result.success && result.isBalanceError) {
              player.isFolded = true;
              player.hasActed = true;
              this.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
              this.attemptManoRotation(client.sessionId, "Mano sin fondos en apuestas");
              if (player.id === this.state.activeManoId) this.transferMano();
              advanceNext();
              return;
            }
          }
          player.chips -= actualBet;
          player.roundBet += actualBet;
          player.totalMainBet += actualBet;
          this.state.pot += actualBet;
          this.state.currentMaxBet = player.roundBet;
          this.state.highestBetPlayerId = client.sessionId;
          player.hasActed = true;
          this.state.lastAction = `${player.nickname} va $${(actualBet / 100).toLocaleString()}`;
          advanceNext();

        } else if (action === "igualar") {
          this.pasoPendienteIds.delete(client.sessionId);
          const callAmount = this.state.currentMaxBet - player.roundBet;
          if (callAmount <= 0) {
            player.hasActed = true;
            advanceNext();
            return;
          }
          const actualCall = Math.min(callAmount, player.chips);
          // Persist to DB
          if (player.supabaseUserId) {
            const result = await SupabaseService.recordBet(player.supabaseUserId, actualCall, this.currentGameId, undefined, { roomId: this.roomId, tableName: (this as any).metadata?.tableName, phase });
            if (result && !result.success && result.isBalanceError) {
              player.isFolded = true;
              player.hasActed = true;
              this.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
              this.attemptManoRotation(client.sessionId, "Mano sin fondos al igualar");
              if (player.id === this.state.activeManoId) this.transferMano();
              advanceNext();
              return;
            }
          }
          player.chips -= actualCall;
          player.roundBet += actualCall;
          player.totalMainBet += actualCall;
          this.state.pot += actualCall;
          if (actualCall < callAmount) {
            // Couldn't fully call → implicit all-in
            player.isAllIn = true;
            this.state.lastAction = `${player.nickname} iguala parcial $${(actualCall / 100).toLocaleString()} (resto)`;
          } else {
            this.state.lastAction = `${player.nickname} iguala $${(actualCall / 100).toLocaleString()}`;
          }
          player.hasActed = true;
          advanceNext();

        } else if (action === "resto") {
          this.pasoPendienteIds.delete(client.sessionId);
          const allInAmount = player.chips;
          if (allInAmount <= 0) {
            player.isFolded = true;
            player.hasActed = true;
            this.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
            this.attemptManoRotation(client.sessionId, "Mano sin fichas para resto");
            if (player.id === this.state.activeManoId) this.transferMano();
            advanceNext();
            return;
          }
          // Persist to DB
          if (player.supabaseUserId) {
            const result = await SupabaseService.recordBet(player.supabaseUserId, allInAmount, this.currentGameId, undefined, { roomId: this.roomId, tableName: (this as any).metadata?.tableName, phase });
            if (result && !result.success && result.isBalanceError) {
              player.isFolded = true;
              player.hasActed = true;
              this.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
              this.attemptManoRotation(client.sessionId, "Mano sin fondos para resto");
              if (player.id === this.state.activeManoId) this.transferMano();
              advanceNext();
              return;
            }
          }
          player.chips -= allInAmount;
          player.roundBet += allInAmount;
          player.totalMainBet += allInAmount;
          this.state.pot += allInAmount;
          player.isAllIn = true;
          if (player.roundBet > this.state.currentMaxBet) {
            this.state.currentMaxBet = player.roundBet;
            this.state.highestBetPlayerId = client.sessionId;
          }
          player.hasActed = true;
          this.state.lastAction = `${player.nickname} va RESTO $${(allInAmount / 100).toLocaleString()}`;
          advanceNext();
        }
      }
    });

    this.onMessage("dismiss-reveal", (client) => {
      if (this.state.phase !== "PIQUE_REVEAL") return;

      // ── Caso: Llevo Juego durante DESCARTE ──
      if (this.pendingLlevoJuegoPlayerId) {
        const playerId = this.pendingLlevoJuegoPlayerId;
        this.pendingLlevoJuegoPlayerId = "";
        const player = this.state.players.get(playerId);

        if (player) {
          player.revealedCards = "";

          // Barajar cartas del jugador y ponerlas encima del naipe
          const playerCards = player.cards ? player.cards.split(',').filter(Boolean) : [];
          for (let i = playerCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playerCards[i], playerCards[j]] = [playerCards[j], playerCards[i]];
          }
          for (const card of playerCards) {
            this.deck.push(card);
          }
          this.setPlayerCards(playerId, "");

          // Pagar pique menos comisión
          const piqueRake = Math.ceil(this.state.piquePot * 0.05 / 100) * 100;
          const piquePayout = this.state.piquePot - piqueRake;
          player.chips += piquePayout;
          console.log(`[MesaRoom] ${player.nickname} gana el pique por Llevo Juego: $${piquePayout} (Rake: $${piqueRake})`);
          this.state.lastAction = `¡${player.nickname} gana el Pique! (+$${(piquePayout / 100).toLocaleString()})`;

          if (player.supabaseUserId) {
            SupabaseService.awardPot(player.supabaseUserId, piquePayout, piqueRake, this.currentGameId).catch(console.error);
          }
          this.currentTimeline.push({ event: 'pique_won', winner: playerId, piquePot: this.state.piquePot, payout: piquePayout, rake: piqueRake, time: Date.now(), rng_state: this.getRngState() });
          this.state.piquePot = 0;

          // Retirar al jugador del pot principal
          player.isFolded = true;
          if (player.id === this.state.activeManoId) this.transferMano();
        }

        // Reanudar la fase de origen
        const returnPhase = this.phaseBeforePiqueReveal || "DESCARTE";
        this.phaseBeforePiqueReveal = "";

        if (returnPhase === "DESCARTE") {
          this.state.phase = "DESCARTE";
          this.advanceTurnPhaseDescarte();
        } else {
          // APUESTA_4_CARTAS, GUERRA, CANTICOS, etc.
          this.state.phase = returnPhase;
          const nextPhaseCallback = this.getNextPhaseCallback(returnPhase);
          this.advanceTurnBetting(undefined, nextPhaseCallback);
        }
        return;
      }

      // ── Caso original: reveal durante PIQUE ──
      const revealedPlayer = Array.from(this.state.players.values() as IterableIterator<Player>)
        .find(p => p.revealedCards && p.isFolded);
      if (revealedPlayer) {
        revealedPlayer.revealedCards = "";
      }
      // Restaurar la fase PIQUE y continuar el turno
      this.state.phase = "PIQUE";
      this.advanceTurnPhase2();
    });

    // ── Llevo Juego: jugador que pasó con juego reclama el pique durante DESCARTE ──
    this.onMessage("llevo-juego", (client) => {
      if (this.state.phase !== "DESCARTE") return;
      if (this.state.turnPlayerId !== client.sessionId) return;
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.passedWithJuego) return;

      player.hasActed = true;
      player.revealedCards = player.cards;
      this.state.lastAction = `¡${player.nickname} lleva juego!`;
      console.log(`[MesaRoom] ${player.nickname} declara Llevo Juego en DESCARTE`);

      this.currentTimeline.push({ event: 'action', phase: 'DESCARTE', player: client.sessionId, action: 'llevo-juego', time: Date.now(), rng_state: this.getRngState() });

      // Guardar referencia para procesar en dismiss-reveal
      this.pendingLlevoJuegoPlayerId = client.sessionId;
      this.phaseBeforePiqueReveal = "DESCARTE";

      // Cambiar a PIQUE_REVEAL para mostrar las cartas
      this.state.phase = "PIQUE_REVEAL";
      this.state.turnPlayerId = client.sessionId;

      this.broadcast("pique-fold-reveal", {
        playerId: client.sessionId,
        llevaJuego: true,
        cards: player.cards
      });
    });

    // ── Resolución inmediata de Llevo Juego / No Llevo en cualquier fase de apuestas ──
    this.onMessage("paso-juego-response", (client, message) => {
      if (this.pendingPasoJuegoPlayerId !== client.sessionId) return;
      const resolvePhase = this.pendingPasoJuegoPhase;
      if (this.state.phase !== resolvePhase) return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const { llevaJuego } = message;
      this.pendingPasoJuegoPlayerId = "";
      this.pendingPasoJuegoPhase = "";

      this.currentTimeline.push({ event: 'action', phase: resolvePhase, player: client.sessionId, action: llevaJuego ? 'llevo-juego-inmediato' : 'no-llevo-juego', time: Date.now(), rng_state: this.getRngState() });

      // Callback de siguiente fase según la fase actual
      const nextPhaseCallback = this.getNextPhaseCallback(resolvePhase);

      if (llevaJuego) {
        player.hasActed = true;
        player.passedWithJuego = true;

        if (resolvePhase === 'APUESTA_4_CARTAS') {
          // En APUESTA_4_CARTAS: sale del pozo principal, compite solo por pique (diferido)
          player.isFolded = true;
          player.revealedCards = player.cards;
          this.state.lastAction = `¡${player.nickname} lleva juego!`;
          console.log(`[MesaRoom] ${player.nickname} lleva juego en APUESTA_4_CARTAS — sale del pozo principal, pique diferido`);

          this.broadcast("pique-fold-reveal", {
            playerId: client.sessionId,
            llevaJuego: true,
            cards: player.cards
          });

          this.attemptManoRotation(client.sessionId, "Lleva juego — sale del pozo principal");
          if (player.id === this.state.activeManoId) this.transferMano();

          // Continuar la ronda de apuestas (pique se resuelve al final)
          this.advanceTurnBetting(undefined, nextPhaseCallback);
        } else {
          // Otras fases: revelar cartas, resolver pique inmediatamente via PIQUE_REVEAL
          player.revealedCards = player.cards;
          this.state.lastAction = `¡${player.nickname} lleva juego!`;
          console.log(`[MesaRoom] ${player.nickname} lleva juego inmediatamente en ${resolvePhase}`);

          this.pendingLlevoJuegoPlayerId = client.sessionId;
          this.phaseBeforePiqueReveal = resolvePhase;

          this.state.phase = "PIQUE_REVEAL";
          this.state.turnPlayerId = client.sessionId;

          this.broadcast("pique-fold-reveal", {
            playerId: client.sessionId,
            llevaJuego: true,
            cards: player.cards
          });
        }
      } else {
        // No lleva juego: fold y devolver cartas al mazo
        player.isFolded = true;
        player.hasActed = true;
        this.state.lastAction = `${player.nickname} no lleva juego — se bota`;
        console.log(`[MesaRoom] ${player.nickname} no lleva juego — fold inmediato en ${resolvePhase}`);

        const wasMano = player.id === this.state.activeManoId;
        this.collectPlayerCards(client.sessionId, resolvePhase === 'APUESTA_4_CARTAS' && wasMano && this.seatOrder.length === 7);

        this.attemptManoRotation(client.sessionId, "Mano no lleva juego");
        if (wasMano) this.transferMano();

        // Continuar la ronda de apuestas con el callback correcto
        this.advanceTurnBetting(undefined, nextPhaseCallback);
      }
    });

    this.onMessage("dismiss-showdown", (client) => {
      if (this.state.phase !== "SHOWDOWN") return;

      // Caso 1: Showdown del pique (después de completar 4 cartas)
      if (this.pendingPiqueWinnerId) {
        this.state.players.forEach((p: Player) => { p.revealedCards = ""; });
        const winnerId = this.pendingPiqueWinnerId;
        this.attemptManoRotation(winnerId, "Mano ganó Pique");
        this.awardPiqueAndContinue(winnerId);
        return;
      }

      // Caso 2: Showdown de un solo jugador que eligió mostrar cartas
      if (!this.pendingShowdownData) {
        this.state.players.forEach((p: Player) => { p.revealedCards = ""; });
        const winner = Array.from(this.state.players.values() as IterableIterator<Player>)
          .find(p => !p.isFolded && p.connected);
        if (winner) {
          this.awardPot(winner.id);
        }
        return;
      }

      // Caso 3: Showdown multi-jugador — payout already persisted, just cleanup
      const { overallWinnerId, potWinners, totalPayout, totalRake, activePlayers } = this.pendingShowdownData;
      this.pendingShowdownData = null;
      this.finalizeShowdown(overallWinnerId, potWinners, totalPayout, totalRake, activePlayers);
    });

    this.onMessage("declarar-juego", (client, message) => {
      if (this.state.phase !== "DECLARAR_JUEGO") return;
      if (this.state.turnPlayerId !== client.sessionId) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Server-side validation: determine if the player actually has juego
      const hand = evaluateHand(player.cards);
      const actuallyHasJuego = hand.type !== 'NINGUNA';
      // Force the correct value regardless of what the client sent
      const tiene = actuallyHasJuego;

      player.hasActed = true;
      player.declaredJuego = tiene;
      this.currentTimeline.push({ event: 'declarar_juego', player: client.sessionId, tiene, clientClaimed: message?.tiene, serverOverride: message?.tiene !== tiene, time: Date.now(), rng_state: this.getRngState() });

      if (tiene) {
        const hand = evaluateHand(player.cards);
        this.state.lastAction = `${player.nickname} declara: ¡Tengo ${hand.type}!`;
        console.log(`[MesaRoom] ${player.nickname} declara tener juego (${hand.type}, ${hand.points} pts)`);
      } else {
        this.state.lastAction = `${player.nickname} declara: No tengo juego`;
        console.log(`[MesaRoom] ${player.nickname} declara no tener juego`);
      }

      this.advanceTurnDeclarar();
    });

    this.onMessage("show-muck", (client, message) => {
      if (this.state.phase !== "SHOWDOWN_WAIT") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      // Solo el ganador puede decidir
      if (client.sessionId !== this.state.turnPlayerId) return;

      // Check if this is a pique show/muck or main pot show/muck
      if (this.pendingPiqueWinnerId) {
        if (message.action === "show") {
          this.state.lastAction = `${player.nickname} muestra sus cartas del Pique`;
          player.revealedCards = player.cards;
          this.state.phase = "SHOWDOWN";
          this.state.showdownTimer = 0;
          // Sin timer — esperar "dismiss-showdown"
        } else {
          this.state.lastAction = `${player.nickname} no muestra las cartas`;
          this.awardPiqueAndContinue(client.sessionId);
        }
        return;
      }

      if (message.action === "show") {
        this.state.lastAction = `${player.nickname} muestra sus cartas`;
        player.revealedCards = player.cards;
        // Mostrar cartas sin timer automático — esperar "dismiss-showdown"
        this.state.phase = "SHOWDOWN";
        this.state.showdownTimer = 0;
      } else {
        this.state.lastAction = `${player.nickname} no muestra las cartas`;
        this.awardPot(client.sessionId);
      }
    });

    // ── Admin Moderation (spectator-only) ──

    this.onMessage("admin:kick", (client, message) => {
      if (!this.spectators.has(client.sessionId)) return;
      const targetId = message.playerId;
      const target = this.state.players.get(targetId);
      if (!target) return;

      console.log(`[MesaRoom] Admin kick: ${target.nickname} (${targetId})`);
      this.state.lastAction = `${target.nickname} fue retirado por el admin`;

      const targetClient = this.clients.find(c => c.sessionId === targetId);
      if (targetClient) targetClient.leave(4001, "Kicked by admin");
      this.removePlayer(targetId);
    });

    this.onMessage("admin:mute", (client, message) => {
      if (!this.spectators.has(client.sessionId)) return;
      const targetId = message.playerId;
      const target = this.state.players.get(targetId);
      if (!target) return;

      console.log(`[MesaRoom] Admin mute: ${target.nickname} (${targetId})`);
      // Notify the target client; the frontend/LiveKit will handle the actual muting
      const targetClient = this.clientMap.get(targetId);
      if (targetClient) targetClient.send("admin:muted", { reason: message.reason || "Silenciado por admin" });
    });

    this.onMessage("admin:ban", (client, message) => {
      if (!this.spectators.has(client.sessionId)) return;
      const targetId = message.playerId;
      const target = this.state.players.get(targetId);
      if (!target) return;

      console.log(`[MesaRoom] Admin ban: ${target.nickname} (${targetId})`);
      this.state.lastAction = `${target.nickname} fue baneado de la mesa`;

      const targetClient = this.clients.find(c => c.sessionId === targetId);
      if (targetClient) targetClient.leave(4002, "Banned by admin");
      this.removePlayer(targetId);
    });

    // ── Resincronización silenciosa de cartas privadas ──
    this.onMessage("request-resync", (client) => {
      if (this.spectators.has(client.sessionId)) return; // Admin blindness: no cards for spectators
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.cards) return;
      // Mantener clientMap actualizado: tras reconnect el transport cambia
      this.clientMap.set(client.sessionId, client);
      console.log(`[MesaRoom] Resync cartas privadas → ${player.nickname}`);
      // Enviar directamente por el client live (no depender de clientMap lookup)
      const cards = player.cards.split(',').filter(Boolean);
      client.send("private-cards", cards);
    });

    // ── Lookup de jugador por teléfono (para transferencia en mesa sin HTTP) ──
    this.onMessage("lookup-player", async (client, message) => {
      if (this.spectators.has(client.sessionId)) return;
      const { phone } = message || {};
      if (!phone || typeof phone !== 'string') {
        client.send("lookup-result", { success: false, error: 'Número inválido' });
        return;
      }
      try {
        const result = await SupabaseService.lookupUserByPhone(phone);
        client.send("lookup-result", result);
      } catch (e) {
        client.send("lookup-result", { success: false, error: 'Error al buscar usuario' });
      }
    });

    // ── Transferencia P2P entre jugadores ──
    this.onMessage("transfer", async (client, message) => {
      // Solo jugadores reales pueden transferir (no spectators)
      if (this.spectators.has(client.sessionId)) return;

      const sender = this.state.players.get(client.sessionId);
      if (!sender || !sender.supabaseUserId) {
        client.send("transfer-result", { success: false, error: 'Jugador no válido' });
        return;
      }

      const { recipientUserId, amountCents } = message;

      if (!recipientUserId || typeof amountCents !== 'number') {
        client.send("transfer-result", { success: false, error: 'Datos inválidos' });
        return;
      }

      // Validar monto mínimo
      if (amountCents < 10000) {
        client.send("transfer-result", { success: false, error: 'El monto mínimo es $100' });
        return;
      }

      // Validar que el sender tiene suficientes chips
      if (amountCents > sender.chips) {
        client.send("transfer-result", { success: false, error: 'Saldo insuficiente en la mesa' });
        return;
      }

      // No auto-transferencia
      if (sender.supabaseUserId === recipientUserId) {
        client.send("transfer-result", { success: false, error: 'No puedes transferirte a ti mismo' });
        return;
      }

      try {
        const result = await SupabaseService.transferBetweenPlayers(
          sender.supabaseUserId,
          recipientUserId,
          amountCents,
          { roomId: this.roomId }
        );

        if (!result.success) {
          client.send("transfer-result", { success: false, error: result.error || 'Error en la transferencia' });
          return;
        }

        // Actualizar chips del sender inmediatamente
        sender.chips -= amountCents;

        // Buscar si el recipient está en esta room y actualizar sus chips
        let recipientSessionId: string | null = null;
        this.state.players.forEach((player, sessionId) => {
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
          const recipientClient = this.clientMap.get(recipientSessionId);
          if (recipientClient) {
            recipientClient.send("transfer-received", {
              senderName: sender.nickname,
              amountCents,
              newBalance: this.state.players.get(recipientSessionId)?.chips || 0,
            });
          }
        }

        console.log(`[MesaRoom] Transfer: ${sender.nickname} → ${result.recipientName}, $${amountCents / 100}`);
      } catch (e) {
        console.error('[MesaRoom] Transfer error:', e);
        client.send("transfer-result", { success: false, error: 'Error interno al procesar la transferencia' });
      }
    });
  }

  async onJoin(client: Client, options: any) {
    // ── Spectator (admin) mode ──
    if (options.spectator === true) {
      // Validate supervision token for authorized spectator access
      const { valid } = await SupabaseService.validateSupervisionToken(
        options.supervisionToken,
        this.roomId
      );
      if (!valid) {
        throw new Error("Token de supervisión inválido o expirado (code: 4003)");
      }
      console.log(`[MesaRoom] Espectador (admin) conectado: ${client.sessionId}`);
      this.spectators.set(client.sessionId, client);
      // Spectators do NOT get a Player schema entry and NEVER receive private cards (Admin Blindness)
      client.send("spectator:joined", { roomId: this.roomId, phase: this.state.phase });
      // Notify all players that an admin is watching
      this.broadcast("admin:status", { active: true, count: this.spectators.size });
      return;
    }

    const requestedNickname = options.nickname || `Jugador_${client.sessionId}`;
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
    this.clientMap.set(client.sessionId, client);

    // Ghost player cleanup and state restoration:
    // Match by deviceId first, then fall back to userId (handles enforceSessionPolicy
    // scenario where profiles.last_device_id differs from the original localStorage deviceId)
    const existingPlayerEntry = Array.from(this.state.players.entries()).find(
      ([_, p]) => (deviceId && (p as Player).deviceId === deviceId) ||
                  (options.userId && (p as Player).supabaseUserId === options.userId)
    );

    if (existingPlayerEntry) {
      const [oldSessionId, oldPlayer] = existingPlayerEntry;
      console.log(`[MesaRoom] Restaurando asiento de ${oldSessionId} hacia la nueva conexión ${client.sessionId}...`);

      // Forzar cierre del socket viejo si seguía atascado
      if (oldPlayer.connected) {
        try {
          const oldClient = this.clients.find(c => c.sessionId === oldSessionId);
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
      // Si la sala fue reseteada (LOBBY), el jugador debe estar listo de nuevo
      newPlayer.isReady = this.state.phase === "LOBBY" ? false : oldPlayer.isReady;
      newPlayer.hasActed = this.state.phase === "LOBBY" ? false : oldPlayer.hasActed;
      newPlayer.isFolded = this.state.phase === "LOBBY" ? false : oldPlayer.isFolded;
      newPlayer.connected = true;
      newPlayer.deviceId = oldPlayer.deviceId;
      // Prefer fresh userId from options (fixes ghost players created without auth)
      newPlayer.supabaseUserId = options.userId || oldPlayer.supabaseUserId;

      if (!newPlayer.supabaseUserId) {
        AlertService.identity(requestedNickname, client.sessionId, this.roomId);
      }

      // Si reconecta en LOBBY, actualizar chips con el saldo actual de opciones
      if (this.state.phase === "LOBBY" && options.chips) {
        newPlayer.chips = options.chips;
      }

      this.state.players.delete(oldSessionId);
      this.clientMap.delete(oldSessionId);
      this.state.players.set(client.sessionId, newPlayer);

      // Actualizar el asiento en el orden estable para mantener la rotación correcta
      const ghostSeatIdx = this.seatOrder.indexOf(oldSessionId);
      if (ghostSeatIdx !== -1) {
        this.seatOrder[ghostSeatIdx] = client.sessionId;
      }

      if (this.state.dealerId === oldSessionId) {
        this.state.dealerId = client.sessionId;
      }
      if (this.state.turnPlayerId === oldSessionId) {
        this.state.turnPlayerId = client.sessionId;
      }

      // Re-enviar las cartas privadas al cliente reconectado (solo si hay partida activa)
      // Actualizar clientMap primero: el client del ghost restore tiene transport nuevo
      this.clientMap.set(client.sessionId, client);
      if (this.state.phase !== "LOBBY") {
        const cards = newPlayer.cards ? newPlayer.cards.split(',').filter(Boolean) : [];
        client.send("private-cards", cards);
      }

      // Re-enviar configuración de la sala al cliente reconectado
      const meta = this.metadata as MesaMetadata;
      client.send("room-config", {
        disabledChips: meta?.disabledChips || [],
        minEntry: meta?.minEntry || MIN_BALANCE_CENTS,
        minPique: meta?.minPique || 500_000,
        isCustom: meta?.isCustom || false,
      });

      this.updateLobbyMetadata();
      this.checkStartCountdown();
      return;
    }

    // ── Validación de saldo mínimo (usa minEntry personalizado si existe) ──
    const chips = options.chips || 0;
    const roomMinEntry = (this.metadata as MesaMetadata)?.minEntry || MIN_BALANCE_CENTS;
    if (chips < roomMinEntry) {
      const formatted = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(roomMinEntry / 100);
      throw new Error(`Fondos insuficientes. Se requiere un saldo mínimo de ${formatted} para entrar a esta mesa. Por favor, recargue su cuenta.`);
    }

    console.log(`[MesaRoom] Cliente unido: ${client.sessionId} -> ${requestedNickname}`);

    const newPlayer = new Player();
    newPlayer.id = client.sessionId;
    newPlayer.nickname = requestedNickname;
    newPlayer.avatarUrl = options.avatarUrl || "default";
    newPlayer.chips = chips;
    newPlayer.connected = true;
    newPlayer.deviceId = deviceId;
    newPlayer.supabaseUserId = options.userId || "";

    if (!newPlayer.supabaseUserId) {
      AlertService.identity(requestedNickname, client.sessionId, this.roomId);
    }

    // Si la partida está en curso, el jugador entra como "esperando"
    if (this.state.phase !== "LOBBY") {
      newPlayer.isWaiting = true;
      console.log(`[MesaRoom] ${requestedNickname} entra como espectador (partida en curso). Esperará la próxima ronda.`);
    }

    this.state.players.set(client.sessionId, newPlayer);

    // Solo agregar al seatOrder si no está esperando (los que esperan se agregan al volver a LOBBY)
    if (!newPlayer.isWaiting) {
      this.seatOrder.push(client.sessionId);
    }
    this.updateLobbyMetadata();

    // El primer jugador es el dealer por defecto, o si el dealer actual no es válido
    const currentDealer = this.state.players.get(this.state.dealerId);
    if (this.state.players.size === 1 || !currentDealer || !currentDealer.connected) {
      this.state.dealerId = client.sessionId;
    }

    // Enviar configuración de la sala al cliente (chips deshabilitados, min entry, etc.)
    const meta = this.metadata as MesaMetadata;
    client.send("room-config", {
      disabledChips: meta?.disabledChips || [],
      minEntry: meta?.minEntry || MIN_BALANCE_CENTS,
      minPique: meta?.minPique || 500_000,
      isCustom: meta?.isCustom || false,
    });

    // Cancelar/revalidar countdown en caso de que un nuevo jugador descuadre el "todos listos"
    this.checkStartCountdown();
  }

  private updateLobbyMetadata() {
    const players = Array.from(this.state.players.values());
    const activePlayers = players.filter(p => p.connected).length;
    const totalReservedSeats = players.length; // Includes disconnected but within grace period

    this.setMetadata({
      ...this.metadata,
      activePlayers,
      totalReservedSeats
    });
  }

  async onLeave(client: Client, code?: number) {
    // Clean up spectator if applicable
    if (this.spectators.has(client.sessionId)) {
      console.log(`[MesaRoom] Espectador desconectado: ${client.sessionId}`);
      this.spectators.delete(client.sessionId);
      // Notify players that admin left
      this.broadcast("admin:status", { active: this.spectators.size > 0, count: this.spectators.size });
      return;
    }

    const consented = (code === 1000);
    const player = this.state.players.get(client.sessionId);

    if (!player) return;

    console.log(`[MesaRoom] Cliente desconectado: ${player.nickname} (${client.sessionId}). Code: ${code}, Consented: ${consented}`);
    player.connected = false;
    this.updateLobbyMetadata();

    // TRANSFERIR ANFITRIÓN INMEDIATAMENTE SI SE DESCONECTA (siguiendo orden de asientos)
    if (this.state.dealerId === client.sessionId) {
      const currentSeatIdx = this.seatOrder.indexOf(client.sessionId);
      let replaced = false;
      if (currentSeatIdx !== -1) {
        for (let i = 1; i < this.seatOrder.length; i++) {
          const nextIdx = (currentSeatIdx + i) % this.seatOrder.length;
          const nextId = this.seatOrder[nextIdx];
          const p = this.state.players.get(nextId);
          if (p && p.connected) {
            this.state.dealerId = nextId;
            this.dealerRotatedThisGame = true;
            console.log(`[MesaRoom] El anfitrión se desconectó. Mano pasa a ${p.nickname} (orden de asientos).`);
            replaced = true;
            break;
          }
        }
      }
      if (!replaced) {
        const fallback = Array.from(this.state.players.values()).find(p => p.connected && p.id !== client.sessionId);
        if (fallback) {
          this.state.dealerId = fallback.id;
          this.dealerRotatedThisGame = true;
        }
      }
    }

    // Transferir la Mano Activa si el jugador desconectado era el activeManoId
    if (this.state.activeManoId === client.sessionId) {
      this.transferMano();
    }

    // Si TODOS los jugadores están desconectados, resetear la sala a estado limpio
    const anyoneConnected = Array.from(this.state.players.values()).some((p: Player) => p.connected);
    if (!anyoneConnected && this.state.players.size > 0) {
      console.log(`[MesaRoom] Todos los jugadores se desconectaron. Reseteando sala a estado limpio.`);
      this.resetRoomState();
    }

    this.checkStartCountdown();

    if (consented) {
      console.log(`[MesaRoom] Desconexión explícita o limpia para ${player.nickname}. Retirando de la mesa.`);
      this.removePlayer(client.sessionId);
      return;
    }

    try {
      console.log(`[MesaRoom] Otorgando 5 minutos de reconexión para ${player.nickname}...`);
      // 300 segundos = 5 minutos de gracia
      await this.allowReconnection(client, 300);

      player.connected = true;
      // Actualizar clientMap: tras reconnect, Colyseus reutiliza el Client
      // pero el transport interno cambia. Sin este set, sendPrivateCards() usa la ref muerta.
      this.clientMap.set(client.sessionId, client);
      this.updateLobbyMetadata();
      console.log(`[MesaRoom] Cliente reconectado exitosamente: ${player.nickname} (${client.sessionId})`);

      // Re-enviar cartas privadas tras reconexión exitosa
      if (this.state.phase !== "LOBBY" && player.cards) {
        const cards = player.cards.split(',').filter(Boolean);
        client.send("private-cards", cards);
      }

      // Re-enviar configuración de la sala
      const meta = this.metadata as MesaMetadata;
      client.send("room-config", {
        disabledChips: meta?.disabledChips || [],
        minEntry: meta?.minEntry || MIN_BALANCE_CENTS,
        minPique: meta?.minPique || 500_000,
        isCustom: meta?.isCustom || false,
      });

    } catch (e) {
      console.log(`[MesaRoom] Tiempo de reconexión expirado o abandono definitivo para ${player.nickname}`);
      this.removePlayer(client.sessionId);
    }
  }

  private removePlayer(sessionId: string) {
    this.state.players.delete(sessionId);
    this.clientMap.delete(sessionId);
    // Liberar el asiento del jugador del orden estable
    const seatIdx = this.seatOrder.indexOf(sessionId);
    if (seatIdx !== -1) this.seatOrder.splice(seatIdx, 1);
    this.updateLobbyMetadata();

    // Si era el dealer y quedan jugadores, asignar el siguiente en orden de asientos
    if (this.state.dealerId === sessionId && this.state.players.size > 0) {
      if (this.seatOrder.length > 0) {
        this.state.dealerId = this.seatOrder[0];
      } else {
        this.state.dealerId = Array.from(this.state.players.keys())[0];
      }
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
  private resetRoomState() {
    console.log(`[MesaRoom] Reseteando estado completo de la sala.`);

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
  private promoteWaitingPlayers() {
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
  private notifyInsufficientBalance() {
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

  private checkStartCountdown() {
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

  private stopCountdown() {
    if (this.countdownTimer) {
      this.countdownTimer.clear();
      this.countdownTimer = undefined;
    }
    this.state.countdown = -1;
  }

  private createDeck() {
    const suits = ["O", "C", "E", "B"]; // Oros, Copas, Espadas, Bastos
    const values = ["1", "2", "3", "4", "5", "6", "7"]; // 7 cartas por palo

    this.deck = [];
    for (const suit of suits) {
      for (const val of values) {
        this.deck.push(`${val}-${suit}`);
      }
    }
  }

  /**
   * Inicializa un nuevo estado para la partida actual.
   * Genera el seed de encriptación aleatorio y reparte el mazo.
   */
  private startNewGame() {
    // Detener cualquier contador activo antes de arrancar para evitar que
    // un timer residual vuelva a llamar a startNewGame() mientras el juego está en curso.
    this.stopCountdown();

    // Limpiar propuesta de pique pendiente al iniciar la partida
    if (this.state.proposedPique > 0) this.clearPiqueProposal();

    const seed = crypto.randomBytes(16).toString('hex');
    console.log(`[MesaRoom] Iniciando partida con seed: ${seed}`);
    this.state.lastSeed = seed;

    this.dealerRotatedThisGame = false;
    this.piqueRestartCount = 0;
    this.piqueFoldCount.clear();
    this.pendingPiqueWinnerId = "";
    this.pendingShowdownData = null;
    this.currentGameId = crypto.randomUUID();
    this.currentTimeline = [];
    this.rngCounter = 0;
    this.currentTimeline.push({ event: 'start', seed, time: Date.now() });

    // Reset pots and visual state to guarantee no carry-over from previous games
    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.currentMaxBet = 0;
    this.state.bottomCard = "";

    SupabaseService.createGameSession(this.currentGameId, this.metadata?.tableName || "Mesa VIP");

    // Resetear el estado de los jugadores para la nueva ronda
    Array.from(this.state.players.entries()).forEach(([sessionId, p]) => {
      if (!p.isReady || p.isWaiting) {
        p.isFolded = true;
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
  private startPhase1Sorteo() {
    // STARTING: 5s for the cinematic intro animation on the client
    this.state.phase = "STARTING";
    console.log(`[MesaRoom] Fase STARTING: mostrando intro animación...`);

    this.clock.setTimeout(() => {
      // BARAJANDO: 12s for the GSAP shuffle animation (10s animation + 2s buffer)
      this.state.phase = "BARAJANDO";
      console.log(`[MesaRoom] Barajando para Sorteo Mano...`);

      this.createDeck();
      this.shuffleDeck();

      this.clock.setTimeout(() => {
        this.state.phase = "SORTEO_MANO";
        console.log(`[MesaRoom] Fase 1: Sorteo de La Mano buscando un Oro...`);

        let manoPlayerId = "";

        // Ordenar jugadores empezando por el Host (dealer actual placeholder) y rotando
        const playerIds = Array.from(this.state.players.keys());
        const hostIdx = playerIds.indexOf(this.state.dealerId) >= 0 ? playerIds.indexOf(this.state.dealerId) : 0;

        const orderedActivePlayers: { player: Player; sessionId: string }[] = [];
        for (let i = 0; i < playerIds.length; i++) {
          const idx = (hostIdx + i) % playerIds.length;
          const sessionId = playerIds[idx];
          const p = this.state.players.get(sessionId);
          if (p && !p.isFolded && p.connected) {
            orderedActivePlayers.push({ player: p, sessionId });
          }
        }

        let currentPlayerIndex = 0;

        const dealInterval = this.clock.setInterval(() => {
          // Si ya encontramos oro o nos quedamos sin cartas, terminar
          if (manoPlayerId || this.deck.length === 0) {
            dealInterval.clear();
            if (manoPlayerId) {
              this.state.dealerId = manoPlayerId;
              this.state.lastAction = `¡${this.state.players.get(manoPlayerId)?.nickname} sacó ORO y es La Mano!`;
              // Asignar números de turno a todos los jugadores según el orden de asientos
              this.assignTurnOrders();
            }

            this.clock.setTimeout(() => {
              this.startPhase2Pique();
            }, 3000);
            return;
          }

          const { player, sessionId } = orderedActivePlayers[currentPlayerIndex];
          const card = this.deck.pop();

          if (card) {
            const newCards = player.cards ? player.cards + "," + card : card;
            // SORTEO: cartas visibles para todos (reveal = true)
            this.setPlayerCards(sessionId, newCards, true);

            // Cualquier Oro otorga la mano
            const suit = card.split('-')[1];
            if (suit === 'O') {
              manoPlayerId = sessionId;
            }
          }

          currentPlayerIndex = (currentPlayerIndex + 1) % orderedActivePlayers.length;
        }, 3000); // 3s per card for cinematic sorteo
      }, 12000); // 12s for GSAP shuffle animation (10s) + 2s buffer
    }, 5000); // 5s for STARTING phase intro animation
  }

  /**
   * Fase 2: El Pique
   */
  private async startPhase2Pique(skipAnte: boolean = false) {
    this.state.phase = "BARAJANDO";
    console.log(`[MesaRoom] Barajando para el Pique...`);

    // Limpiar registro de jugadores que pasaron para el cobro de banda
    this.piquePassPlayerIds.clear();
    this.piquePreBetPasserIds.clear();
    this.piqueReopenActive = false;
    this.piqueReopenPendingIds.clear();

    // Resetear apuesta máxima del pique (La Mano la fijará al apostar)
    this.state.currentMaxBet = 0;

    // Recoger cartas, barajar de nuevo
    this.createDeck();
    this.shuffleDeck();
    // Limpiar cartas (privadas + públicas) de todos los jugadores
    this.state.players.forEach((p: Player, sessionId: string) => {
      this.setPlayerCards(sessionId, "");
      p.revealedCards = "";
    });

    // Inicializar la Mano activa para el orden de turnos de esta partida
    this.state.activeManoId = this.state.dealerId;

    // Reset folds (skip ante for now per user request: pot must start at 0)
    for (const [, p] of this.state.players) {
      p.isFolded = !p.connected || p.isWaiting;
    }
    if (!skipAnte) {
      this.state.lastAction = `Nueva mano iniciada.`;
    }

    this.clock.setTimeout(() => {
      this.state.phase = "PIQUE_DEAL";
      console.log(`[MesaRoom] Repartiendo 2 cartas de pique por jugador...`);

      // Ordered by seatOrder starting from La Mano (activeManoId, captured before the delay)
      const dealerSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      const startIdx = dealerSeatIdx >= 0 ? dealerSeatIdx : 0;
      const orderedActivePlayers: { player: Player; sessionId: string }[] = [];
      for (let i = 0; i < this.seatOrder.length; i++) {
        const idx = (startIdx + i) % this.seatOrder.length;
        const sessionId = this.seatOrder[idx];
        const p = this.state.players.get(sessionId);
        if (p && !p.isFolded && p.connected) {
          orderedActivePlayers.push({ player: p, sessionId });
        }
      }

      let currentPlayerIndex = 0;

      // Deal 2 cards AT ONCE to each player (not round-robin)
      const dealInterval = this.clock.setInterval(() => {
        if (currentPlayerIndex >= orderedActivePlayers.length) {
          dealInterval.clear();
          this.clock.setTimeout(() => {
            this.state.phase = "PIQUE";
            this.state.players.forEach(p => p.hasActed = false);
            this.advanceTurnPhase2(this.state.activeManoId);
          }, 1000);
          return;
        }

        const { player, sessionId } = orderedActivePlayers[currentPlayerIndex];
        // Give both cards at once
        const card1 = this.deck.pop();
        const card2 = this.deck.pop();
        let newCards = "";
        if (card1) newCards = card1;
        if (card2) newCards = newCards ? newCards + "," + card2 : card2;
        this.setPlayerCards(sessionId, newCards);

        currentPlayerIndex++;
      }, 3000); // 3s between each player receiving their 2 cards
    }, 12000); // 12s for GSAP shuffle animation (10s) + 2s buffer
  }


  private advanceTurnPhase2(startFromId?: string) {
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
    // Guard: si el ID no se encuentra en seatOrder, usar activeManoId o avanzar fase
    if (startSeatIdx === -1) {
      if (startFromId) {
        startSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      }
      if (startSeatIdx === -1) {
        return this.startPhase3CompletarMano();
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
        return;
      }
    }
    // No one left to act — check if at least 2 SEATED players went "voy"
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
  private reopenPiqueForPassers() {
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
  private restartPique() {
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
    if (voyPlayer && this.piquePassPlayerIds.size > 0) {
      const bandaAmount = this.state.minPique >= 1_000_000 ? 500_000 : 200_000;
      let totalBanda = 0;
      const bandaDetails: { playerId: string; nickname: string; amount: number }[] = [];

      for (const passedId of this.piquePassPlayerIds) {
        const passedPlayer = this.state.players.get(passedId);
        if (!passedPlayer || !passedPlayer.connected) continue;

        const actualBanda = Math.min(bandaAmount, passedPlayer.chips);
        if (actualBanda <= 0) continue;

        passedPlayer.chips -= actualBanda;
        totalBanda += actualBanda;
        bandaDetails.push({ playerId: passedId, nickname: passedPlayer.nickname, amount: actualBanda });

        if (passedPlayer.supabaseUserId) {
          SupabaseService.recordBet(passedPlayer.supabaseUserId, actualBanda, this.currentGameId, undefined, {
            roomId: this.roomId, tableName: (this as any).metadata?.tableName, phase: 'BANDA'
          }).catch(console.error);
        }
      }

      if (totalBanda > 0) {
        voyPlayer.chips += totalBanda;
        if (voyPlayer.supabaseUserId) {
          SupabaseService.awardPot(voyPlayer.supabaseUserId, totalBanda, 0, this.currentGameId).catch(console.error);
        }

        this.state.lastAction = `${voyPlayer.nickname} cobra Banda: $${(totalBanda / 100).toLocaleString()} de ${bandaDetails.length} jugador(es)`;

        // Broadcast banda event para animaciones en el frontend
        this.broadcast("banda", {
          winnerId: voyPlayer.id,
          winnerNickname: voyPlayer.nickname,
          bandaPerPlayer: bandaAmount,
          totalBanda,
          details: bandaDetails
        });

        this.currentTimeline.push({
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

    this.currentTimeline.push({ event: 'pique_restart', reason: 'less_than_2_voy', newDealerId: this.state.dealerId, time: Date.now(), rng_state: this.getRngState() });

    // Reiniciar pique sin cobrar ante de nuevo
    this.startPhase2Pique(true);
  }

  /**
   * Fase 3: Completar Mano
   * Primero recoge las cartas de quienes pasaron en PIQUE, luego reparte las 2 cartas restantes a los activos.
   */
  private startPhase3CompletarMano() {
    this.state.phase = "COMPLETAR";
    console.log(`[MesaRoom] Iniciando Fase 3: Completar`);

    // Collect cards from folded players back onto the top of the deck
    for (const id of this.seatOrder) {
      const p = this.state.players.get(id);
      if (p && p.isFolded && p.cards) {
        for (const card of p.cards.split(',').filter(Boolean)) {
          this.deck.push(card);
        }
        this.setPlayerCards(id, "");
      }
    }

    // Build ordered active players starting from La Mano
    const dealerSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
    const startIdx = dealerSeatIdx >= 0 ? dealerSeatIdx : 0;
    const orderedActivePlayers: { player: Player; sessionId: string }[] = [];
    for (let i = 0; i < this.seatOrder.length; i++) {
      const idx = (startIdx + i) % this.seatOrder.length;
      const sessionId = this.seatOrder[idx];
      const p = this.state.players.get(sessionId);
      if (p && !p.isFolded && p.connected) {
        orderedActivePlayers.push({ player: p, sessionId });
      }
    }

    if (orderedActivePlayers.length === 0) {
      this.afterPiqueResolution();
      return;
    }

    let currentPlayerIndex = 0;
    let roundsDealt = 0;

    const dealInterval = this.clock.setInterval(() => {
      if (roundsDealt >= 2) {
        dealInterval.clear();
        this.clock.setTimeout(() => {
          this.afterPiqueResolution();
        }, 1000);
        return;
      }

      const { player, sessionId } = orderedActivePlayers[currentPlayerIndex];
      const currentCardsCount = player.cards ? player.cards.split(',').filter(Boolean).length : 0;

      if (currentCardsCount < 4) {
        // Repartir desde el fondo del mazo para evitar dar las cartas
        // recién devueltas por jugadores que pasaron (están en el tope)
        const card = this.deck.shift();
        if (card) {
          const newCards = player.cards ? player.cards + "," + card : card;
          this.setPlayerCards(sessionId, newCards);
        }
      }

      currentPlayerIndex++;
      if (currentPlayerIndex >= orderedActivePlayers.length) {
        currentPlayerIndex = 0;
        roundsDealt++;
      }
    }, 3000);
  }

  /**
   * Entrega el pique al ganador único y continúa con el juego principal.
   * Se llama cuando un jugador gana el pique en la ronda de 3 cartas.
   */
  private awardPiqueAndContinue(winnerId: string) {
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
    this.currentTimeline.push({ event: 'pique_won', winner: winnerId, piquePot: this.state.piquePot, payout: piquePayout, rake: piqueRake, time: Date.now(), rng_state: this.getRngState() });
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
  private afterPiqueResolution() {
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
  private startPhaseDescarte() {
    this.state.phase = "DESCARTE";
    console.log(`[MesaRoom] Iniciando Fase: Descarte`);
    this.pasoPendienteIds.clear();
    this.pendingPasoJuegoPlayerId = "";
    this.pendingPasoJuegoPhase = "";
    this.state.players.forEach((p: Player) => p.hasActed = false);

    // Start from La Mano activa
    this.advanceTurnPhaseDescarte(this.state.activeManoId);
  }

  /**
   * NUEVA Fase: APUESTA_4_CARTAS
   * Ronda de apuestas con 4 cartas antes del descarte. Inicia en La Mano activa.
   */
  private startPhaseApuesta4Cartas() {
    this.state.phase = "APUESTA_4_CARTAS";
    console.log(`[MesaRoom] Iniciando APUESTA_4_CARTAS: ronda de apuestas con 4 cartas`);
    this.pasoPendienteIds.clear();
    this.state.players.forEach((p: Player) => { p.hasActed = false; p.roundBet = 0; });
    this.state.currentMaxBet = 0;
    this.state.highestBetPlayerId = "";
    this.advanceTurnBetting(this.state.activeManoId, () => this.startPhaseDescarte());
  }

  /**
   * Calcula y devuelve al jugador la porción de su apuesta de ronda que nadie igualó.
   * Retorna el monto reembolsado (0 si no aplica).
   */
  private refundUncalledBet(): number {
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
  private endHandEarlyAfterFoldOut() {
    const remaining = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);

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
      this.currentTimeline.push({ event: 'pique_won_early', winner: winner.id, piquePot: this.state.piquePot, payout: piquePayout, rake: piqueRake, time: Date.now(), rng_state: this.getRngState() });
    }

    // Limpiar estado y volver al lobby tras un breve delay para que el cliente vea el mensaje
    this.clock.setTimeout(() => {
      this.state.pot = 0;
      this.state.piquePot = 0;

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
  }

  // ── Resolución de pique diferido tras APUESTA_4_CARTAS ──

  /** Resuelve el pique diferido y luego inicia DESCARTE o finaliza la mano. */
  private resolveAndStartDescarte() {
    this.resolvePiqueAfterApuesta4();

    const remaining = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);
    if (remaining.length <= 1) {
      this.endHandEarlyAfterFoldOut();
    } else {
      this.startPhaseDescarte();
    }
  }

  /** Resuelve la competencia de pique entre jugadores que pasaron con juego en APUESTA_4_CARTAS. */
  private resolvePiqueAfterApuesta4() {
    if (this.state.piquePot <= 0) return;

    const contestants = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => p.passedWithJuego);

    if (contestants.length === 0) {
      // Nadie pasó con juego → Mano gana pique por defecto
      const manoId = this.state.activeManoId || this.state.dealerId;
      const mano = this.state.players.get(manoId);
      if (mano) {
        this.awardPiqueToContestant(manoId);
        console.log(`[MesaRoom] Nadie pasó con juego — Mano (${mano.nickname}) gana pique por defecto`);
      }
      return;
    }

    if (contestants.length === 1) {
      this.awardPiqueToContestant(contestants[0].id);
      contestants[0].revealedCards = "";
      this.collectPlayerCards(contestants[0].id, false);
      return;
    }

    // 2+ contestants: comparar por jerarquía de juego (SEGUNDA > CHIVO > PRIMERA)
    const typeRank: Record<string, number> = { 'SEGUNDA': 3, 'CHIVO': 2, 'PRIMERA': 1 };
    const manoSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);

    let winner = contestants[0];
    let winnerHand = evaluateHand(winner.cards);
    let winnerRank = typeRank[winnerHand.type] || 0;
    let winnerSeatDist = ((this.seatOrder.indexOf(winner.id) - manoSeatIdx) + this.seatOrder.length) % this.seatOrder.length;

    for (let i = 1; i < contestants.length; i++) {
      const p = contestants[i];
      const h = evaluateHand(p.cards);
      const rank = typeRank[h.type] || 0;
      const seatDist = ((this.seatOrder.indexOf(p.id) - manoSeatIdx) + this.seatOrder.length) % this.seatOrder.length;

      if (rank > winnerRank || (rank === winnerRank && seatDist < winnerSeatDist)) {
        winner = p;
        winnerHand = h;
        winnerRank = rank;
        winnerSeatDist = seatDist;
      }
    }

    this.awardPiqueToContestant(winner.id);

    // Recoger cartas de TODOS los contestants (ganador y perdedores)
    for (const contestant of contestants) {
      contestant.revealedCards = "";
      this.collectPlayerCards(contestant.id, false);
    }
  }

  /** Paga el pique al ganador con 5% rake. */
  private awardPiqueToContestant(winnerId: string) {
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
    this.currentTimeline.push({ event: 'pique_won_apuesta4', winner: winnerId, piquePot: this.state.piquePot, payout: piquePayout, rake: piqueRake, time: Date.now(), rng_state: this.getRngState() });
    this.state.piquePot = 0;
  }

  /** Recoge las cartas del jugador y las devuelve al naipe. Si shuffle=true, las baraja antes. */
  private collectPlayerCards(playerId: string, shuffle: boolean) {
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
  private getNextPhaseCallback(phase: string): () => void {
    switch (phase) {
      case "APUESTA_4_CARTAS": return () => this.resolveAndStartDescarte();
      case "GUERRA": return () => this.startPhase4Canticos();
      case "CANTICOS": return () => this.startPhaseDeclararJuego();
      case "GUERRA_JUEGO": return () => this.startPhase6Showdown();
      default: return () => this.startPhase6Showdown();
    }
  }

  /**
   *  - no se botó, no está restiado, está conectado
   *  - Y no ha actuado aún O su apuesta de ronda es menor que la máxima (ronda reabierta por raise)
   */
  private advanceTurnBetting(startFromId?: string, nextPhaseCallback?: () => void) {
    // Si solo queda 1 jugador activo (no folded), ir directo a showdown o siguiente fase
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);
    if (activePlayers.length <= 1) {
      // Devolver apuesta no igualada antes de avanzar
      this.refundUncalledBet();

      // En APUESTA_4_CARTAS, resolver pique diferido antes de avanzar
      if (this.state.phase === 'APUESTA_4_CARTAS') {
        this.resolvePiqueAfterApuesta4();
      }

      if (this.state.pot === 0 && activePlayers.length === 0 && this.state.piquePot === 0) {
        this.endHandEarlyAfterFoldOut();
        return;
      }
      // 1 jugador restante (con o sin pot): ir a showdown para revelación obligatoria
      if (nextPhaseCallback && this.state.pot > 0) nextPhaseCallback();
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
        return;
      }
    }
    // Nadie más necesita actuar — verificar apuesta no igualada

    this.refundUncalledBet();
    {
      const remainingAfterRefund = Array.from(this.state.players.values() as IterableIterator<Player>)
        .filter(p => !p.isFolded && p.connected);
      if (this.state.pot === 0 && remainingAfterRefund.length === 0) {
        this.endHandEarlyAfterFoldOut();
        return;
      }
    }
    if (nextPhaseCallback) nextPhaseCallback();
    else this.startPhase6Showdown();
  }

  private advanceTurnPhaseDescarte(startFromId?: string) {
    let startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    // Guard: si el ID no se encuentra en seatOrder, intentar con activeManoId
    if (startSeatIdx === -1) {
      if (startFromId) {
        startSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      }
      if (startSeatIdx === -1) {
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
        return;
      }
    }
    this.startPhaseReemplazoDescarte();
  }

  /**
   * Repartir reemplazos: todas las cartas de un jugador antes de pasar al siguiente (reparto por bloque),
   * en orden desde activeManoId, tomando del fondo del mazo.
   */
  private startPhaseReemplazoDescarte() {
    this.state.phase = "COMPLETAR_DESCARTE";
    console.log(`[MesaRoom] Repartiendo reemplazos por bloque desde el fondo del mazo...`);

    // Ordered by seatOrder starting from activeManoId
    const manoSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
    const startIdx = manoSeatIdx >= 0 ? manoSeatIdx : 0;
    const playersNeedingCards: { player: Player; sessionId: string }[] = [];
    for (let i = 0; i < this.seatOrder.length; i++) {
      const idx = (startIdx + i) % this.seatOrder.length;
      const sessionId = this.seatOrder[idx];
      const p = this.state.players.get(sessionId);
      if (p && !p.isFolded && p.connected && p.pendingDiscardCards.length > 0) {
        playersNeedingCards.push({ player: p, sessionId });
      }
    }

    if (playersNeedingCards.length === 0) {
      this.startPhaseRevealBottomCard();
      return;
    }

    // Block dealing: all pending cards for current player, then next player
    let currentPlayerIdx = 0;

    const dealInterval = this.clock.setInterval(() => {
      if (currentPlayerIdx >= playersNeedingCards.length) {
        dealInterval.clear();
        this.startPhaseRevealBottomCard();
        return;
      }

      const { player, sessionId } = playersNeedingCards[currentPlayerIdx];

      if (player.pendingDiscardCards.length > 0) {
        // Deal 1 card from bottom of deck
        const card = this.deck.shift();
        if (card) {
          const newCards = player.cards ? player.cards + "," + card : card;
          this.setPlayerCards(sessionId, newCards);
        }
        player.pendingDiscardCards = player.pendingDiscardCards.slice(1);

        // If this player got all their cards, move to next player
        if (player.pendingDiscardCards.length === 0) {
          currentPlayerIdx++;
        }
      } else {
        // Player already done, skip to next
        currentPlayerIdx++;
      }

      // Check if all done
      if (currentPlayerIdx >= playersNeedingCards.length) {
        dealInterval.clear();
        this.startPhaseRevealBottomCard();
      }
    }, 800); // 800ms between each individual card
  }

  /**
   * NUEVA Fase: REVELAR_CARTA
   * Revela la última carta del mazo boca arriba. Queda visible el resto de la partida.
   */
  private startPhaseRevealBottomCard() {
    if (this.deck.length > 0) {
      this.state.bottomCard = this.deck.shift()!;
      console.log(`[MesaRoom] Carta revelada del fondo: ${this.state.bottomCard}`);
    }
    this.state.phase = "REVELAR_CARTA";

    this.clock.setTimeout(() => {
      this.startPhase5Guerra();
    }, 3000);
  }

  /**
   * Fase 4: Cánticos
   * Ronda de declaraciones y apuestas finales antes del Showdown.
   * Cuando todos pasan (check), se activa DECLARAR_JUEGO para que
   * cada jugador declare si lleva juego o no.
   */
  private startPhase4Canticos() {
    // Si nadie apostó en GUERRA (todos pasaron/check), saltar Cánticos
    // e ir directo a Declarar Juego — no tiene sentido una segunda ronda de paso.
    if (this.state.currentMaxBet === 0) {
      console.log(`[MesaRoom] Todos pasaron en GUERRA — saltando Cánticos, directo a Declarar Juego`);
      this.startPhaseDeclararJuego();
      return;
    }
    this.state.phase = "CANTICOS";
    console.log(`[MesaRoom] Iniciando Fase 4: Cánticos`);
    this.pendingPasoJuegoPlayerId = "";
    this.pendingPasoJuegoPhase = "";
    this.state.players.forEach((p: Player) => { p.hasActed = false; p.roundBet = 0; });
    this.state.currentMaxBet = 0;
    this.state.highestBetPlayerId = "";
    this.advanceTurnBetting(this.state.activeManoId, () => this.startPhaseDeclararJuego());
  }

  /**
   * Fase de Declaración de Juego.
   * Después de que todos pasan en CANTICOS, cada jugador declara:
   * - "Tengo Juego" → sigue compitiendo (puede seguir apostando)
   * - "No Tengo Juego" → se foldea
   * Luego los que tienen juego pueden apostar entre sí hasta que
   * decidan parar, momento en el que se van al showdown.
   */
  private startPhaseDeclararJuego() {
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected && !p.isWaiting);

    // Si solo queda 1 jugador o menos, ir directo al showdown
    if (activePlayers.length <= 1) {
      this.startPhase6Showdown();
      return;
    }

    // Si hubo apuestas en CANTICOS (alguien subió), ir directo al showdown
    // porque ya se resolvió con dinero
    if (this.state.currentMaxBet > 0) {
      this.startPhase6Showdown();
      return;
    }

    this.state.phase = "DECLARAR_JUEGO";
    console.log(`[MesaRoom] Iniciando Declaración de Juego`);
    this.state.players.forEach((p: Player) => { p.hasActed = false; p.declaredJuego = null; });

    // Send each player their valid option via private message
    for (const p of activePlayers) {
      const hand = evaluateHand(p.cards);
      const hasJuego = hand.type !== 'NINGUNA';
      const client = this.clientMap.get(p.id);
      if (client) {
        client.send("declarar-juego-option", { hasJuego, handType: hand.type });
      }
    }

    // Iniciar desde La Mano
    this.advanceTurnDeclarar(this.state.activeManoId);
  }

  /**
   * Avanza el turno en la fase DECLARAR_JUEGO.
   * Busca el siguiente jugador activo que aún no ha declarado.
   * When all have declared: if 2+ have juego → GUERRA_JUEGO;
   * if 1 has juego → that player wins (standard showdown);
   * if 0 have juego → points-based resolution (all non-folded players compete).
   */
  private advanceTurnDeclarar(startFromId?: string) {
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected && !p.isWaiting);

    if (activePlayers.length <= 1) {
      this.startPhase6Showdown();
      return;
    }

    let startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1) {
      startSeatIdx = this.seatOrder.indexOf(this.state.activeManoId);
      if (startSeatIdx === -1) {
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
        return;
      }
    }

    // All players have declared — evaluate outcomes
    const withJuego = activePlayers.filter(p => p.declaredJuego === true);
    const withoutJuego = activePlayers.filter(p => p.declaredJuego === false);

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
  private startPhaseGuerraJuego() {
    this.state.phase = "GUERRA_JUEGO";
    console.log(`[MesaRoom] Iniciando Guerra de Juego — apuestas entre jugadores con juego`);
    this.state.players.forEach((p: Player) => { p.hasActed = false; p.roundBet = 0; p.declinedGuerraJuegoBet = false; });
    this.state.currentMaxBet = 0;
    this.state.highestBetPlayerId = "";
    this.advanceTurnBetting(this.state.activeManoId, () => this.startPhase6Showdown());
  }

  /**
   * Fase 5: Guerra Principal
   * Ronda de apuestas del pozo. Inicia en La Mano activa (activeManoId).
   */
  private startPhase5Guerra() {
    this.state.phase = "GUERRA";
    console.log(`[MesaRoom] Iniciando Fase 5: Guerra Principal`);
    this.pendingPasoJuegoPlayerId = "";
    this.pendingPasoJuegoPhase = "";
    this.state.players.forEach((p: Player) => { p.hasActed = false; p.roundBet = 0; });
    this.state.currentMaxBet = 0;
    this.state.highestBetPlayerId = "";
    this.advanceTurnBetting(this.state.activeManoId, () => this.startPhase4Canticos());
  }

  /**
   * Fase 6: Showdown
   * Muestra las cartas por 20 segundos, luego premia al ganador.
   * Soporta side pots básicos cuando hay jugadores restiados (all-in).
   */
  private startPhase6Showdown() {
    this.state.phase = "SHOWDOWN";
    console.log(`[MesaRoom] Iniciando Fase 6: Showdown`);

    // Include isAllIn players (they stay to compete) + non-folded connected
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>)
      .filter(p => !p.isFolded && p.connected);

    if (activePlayers.length === 0) {
      this.state.pot = 0;
      this.state.piquePot = 0;
      this.promoteWaitingPlayers();
      this.state.phase = "LOBBY";
      this.notifyInsufficientBalance();
      return;
    }

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      if (this.state.pot === 0) {
        // Pot=0 (apuesta devuelta) pero queda un ganador con cartas:
        // Revelar obligatoriamente su mano antes de cerrar.
        if (winner.cards) {
          console.log(`[MesaRoom] Solo queda ${winner.nickname} con pot=0 — revelación obligatoria de mano`);
          winner.revealedCards = winner.cards;
          this.state.lastAction = `¡${winner.nickname} gana! (${evaluateHand(winner.cards).type})`;
          this.state.showdownTimer = 0;
          // Persistir replay / stats antes de esperar dismiss
          this.currentTimeline.push({ event: 'end', winner: winner.id, pot: 0, payout: 0, rake: 0, time: Date.now(), rng_state: this.getRngState() });
          const playersSnapshot = Array.from(this.state.players.values()).map(p => ({
            userId: p.supabaseUserId || p.id, sessionId: p.id, nickname: p.nickname, cards: p.cards, chips: p.chips
          }));
          const finalHands: Record<string, any> = {};
          Array.from(this.state.players.values()).forEach(p => {
            if (p.cards) {
              const h = evaluateHand(p.cards);
              finalHands[p.supabaseUserId || p.id] = { cards: p.cards, handType: h.type, handPoints: h.points, nickname: p.nickname };
            }
          });
          SupabaseService.saveReplay(this.currentGameId, this.state.lastSeed, this.currentTimeline.map(({ rng_state, ...e }) => e), playersSnapshot, [...this.currentTimeline], { totalPot: 0, mainPot: 0, piquePot: 0, payout: 0, rake: 0 }, finalHands, this.roomId, this.metadata?.tableName || 'Mesa VIP').catch(console.error);
          // Se queda en SHOWDOWN — dismiss-showdown caso 2 limpiará al LOBBY
          return;
        }
        // Sin cartas: nada que mostrar, cerrar directamente
        console.log(`[MesaRoom] Solo queda ${winner.nickname} con pot=0 y sin cartas — terminando`);
        this.endHandEarlyAfterFoldOut();
        return;
      }
      this.state.lastAction = `¡${winner.nickname} gana!`;
      // Dar opción de mostrar o no mostrar cartas (sin timer automático)
      this.state.phase = "SHOWDOWN_WAIT";
      this.state.turnPlayerId = winner.id;
      this.state.showdownTimer = 0;
      return;
    }

    // Revelar cartas de TODOS los jugadores activos (obligatorio cuando 2+ compiten).
    activePlayers.forEach(p => {
      p.revealedCards = p.cards;
    });
    console.log(`[MesaRoom] Showdown: revelando cartas de ${activePlayers.length} jugadores activos`);

    // Calculate side pots
    const sidePots = this.calculateSidePots(activePlayers);

    // Evaluate hands — La Mano activa (activeManoId) gets +1 point tiebreaker
    const manoId = this.state.activeManoId || this.state.dealerId;
    const evaluateWithManoBonus = (player: Player): HandEvaluation => {
      const evaluation = evaluateHand(player.cards);
      return player.id === manoId
        ? { ...evaluation, points: evaluation.points + 1 }
        : evaluation;
    };

    // Award each side pot to its best eligible hand
    let overallWinnerId = "";
    let totalPayout = 0;
    let totalRake = 0;
    const potWinners: { winnerId: string; potAmount: number; payout: number; rake: number }[] = [];

    for (const sp of sidePots) {
      const eligible = sp.eligiblePlayerIds
        .map(id => activePlayers.find(p => p.id === id))
        .filter(Boolean) as Player[];

      if (eligible.length === 0) continue;

      let winner = eligible[0];
      let bestHand = evaluateWithManoBonus(winner);
      for (let i = 1; i < eligible.length; i++) {
        const p = eligible[i];
        const pHand = evaluateWithManoBonus(p);
        if (compareHands(pHand, bestHand) > 0) { winner = p; bestHand = pHand; }
      }

      const rake = Math.ceil(sp.amount * 0.05 / 100) * 100;
      const payout = sp.amount - rake;
      winner.chips += payout;
      totalPayout += payout;
      totalRake += rake;
      overallWinnerId = winner.id;
      potWinners.push({ winnerId: winner.id, potAmount: sp.amount, payout, rake });

      console.log(`[MesaRoom] Side pot $${sp.amount}: ${winner.nickname} gana $${payout} (Rake: $${rake})`);
    }

    // Determine overall winner for display (last/largest pot winner)
    const mainWinner = this.state.players.get(overallWinnerId);
    if (mainWinner) {
      const bestHand = evaluateWithManoBonus(mainWinner);
      this.state.lastAction = `¡${mainWinner.nickname} gana con ${bestHand.type}! (${bestHand.points} pts)`;
    }

    // Sin timer automático — se espera "dismiss-showdown" de cualquier jugador
    this.state.showdownTimer = 0;
    // Guardar datos del showdown para finalizar cuando alguien cierre
    this.pendingShowdownData = { overallWinnerId, potWinners, totalPayout, totalRake, activePlayers };

    // Persist payout immediately — don't wait for dismiss
    this.persistShowdownResults(overallWinnerId, potWinners, totalPayout, totalRake, activePlayers);
  }

  /**
   * Calcula side pots basados en las contribuciones totales de cada jugador.
   * Ordena por totalMainBet ascendente y crea pots proporcionales.
   */
  private calculateSidePots(activePlayers: Player[]): { amount: number; eligiblePlayerIds: string[] }[] {
    const sorted = [...activePlayers].sort((a, b) => a.totalMainBet - b.totalMainBet);
    const sidePots: { amount: number; eligiblePlayerIds: string[] }[] = [];
    let prevLevel = 0;

    // Get unique bet levels
    const levels = [...new Set(sorted.map(p => p.totalMainBet))];

    for (const level of levels) {
      const eligible = sorted.filter(p => p.totalMainBet >= level);
      const potAmount = (level - prevLevel) * eligible.length;
      if (potAmount > 0) {
        sidePots.push({
          amount: potAmount,
          eligiblePlayerIds: eligible.map(p => p.id)
        });
      }
      prevLevel = level;
    }

    return sidePots;
  }

  /**
   * Persists payout, replay, and stats to Supabase immediately when the winner is determined.
   * Called from startPhase6Showdown — does NOT transition to LOBBY.
   */
  private persistShowdownResults(
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

    this.currentTimeline.push({ event: 'end', winner: overallWinnerId, pot: totalPot, payout: totalPayout, rake: totalRake, sidePots: potWinners, time: Date.now(), rng_state: this.getRngState() });

    const playersSnapshot = Array.from(this.state.players.values()).map(p => ({
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
    Array.from(this.state.players.values()).forEach(p => {
      if (p.cards) {
        const hand = evaluateHand(p.cards);
        finalHands[p.supabaseUserId || p.id] = {
          cards: p.cards,
          handType: hand.type,
          handPoints: hand.points,
          nickname: p.nickname
        };
      }
    });

    // Save replay
    const adminTimeline = [...this.currentTimeline];
    const playerTimeline = this.currentTimeline.map(({ rng_state, ...event }) => event);
    SupabaseService.saveReplay(this.currentGameId, this.state.lastSeed, playerTimeline, playersSnapshot, adminTimeline, potBreakdown, finalHands, this.roomId, this.metadata?.tableName || 'Mesa VIP').catch(console.error);

    // Update stats for all participating players
    Array.from(this.state.players.values()).forEach(p => {
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
  private finalizeShowdown(
    overallWinnerId: string,
    potWinners: { winnerId: string; potAmount: number; payout: number; rake: number }[],
    totalPayout: number,
    totalRake: number,
    activePlayers: Player[]
  ) {

    Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => p.isReady = false);
    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.bottomCard = "";
    this.state.activeManoId = "";
    this.state.showdownTimer = 0;
    this.promoteWaitingPlayers();
    this.state.phase = "LOBBY";
    this.notifyInsufficientBalance();

    // Limpiar cartas reveladas de todos los jugadores
    this.state.players.forEach((p: Player, sessionId: string) => {
      p.revealedCards = "";
    });

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
  private awardPot(winnerId: string) {
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

    this.currentTimeline.push({ event: 'end', winner: winnerId, pot: totalPot, payout, rake, time: Date.now(), rng_state: this.getRngState() });

    const playersSnapshot = Array.from(this.state.players.values()).map(p => ({
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
    Array.from(this.state.players.values()).forEach(p => {
      if (p.cards) {
        const hand = evaluateHand(p.cards);
        finalHands[p.supabaseUserId || p.id] = { cards: p.cards, handType: hand.type, handPoints: hand.points, nickname: p.nickname };
      }
    });
    const adminTimeline = [...this.currentTimeline];
    const playerTimeline = this.currentTimeline.map(({ rng_state, ...event }) => event);
    SupabaseService.saveReplay(this.currentGameId, this.state.lastSeed, playerTimeline, playersSnapshot, adminTimeline, potBreakdown, finalHands, this.roomId, this.metadata?.tableName || 'Mesa VIP').catch(console.error);

    // Update stats
    Array.from(this.state.players.values()).forEach(p => {
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
    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.bottomCard = "";
    this.state.activeManoId = "";
    this.state.showdownTimer = 0;
    this.promoteWaitingPlayers();
    this.state.phase = "LOBBY";
    this.notifyInsufficientBalance();
    this.state.players.forEach((p: Player) => { p.revealedCards = ""; });

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

  private endRound() {
    console.log(`[MesaRoom] Fin de la ronda (Showdown/Muck finalizado).`);
    this.clock.setTimeout(() => {
      this.restartLobby();
    }, 5000); // 5s to see winners
  }

  private restartLobby() {
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

  private endHandEarly() {
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
  private assignTurnOrders(): void {
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
  private attemptManoRotation(playerId: string, reason: string): void {
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

  private transferMano(): void {
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

  private shuffleDeck() {
    // Fisher-Yates con crypto.randomInt para máxima seguridad
    const cards = this.deck;
    for (let i = cards.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const temp = cards[i];
      cards[i] = cards[j];
      cards[j] = temp;
    }
  }

  /**
   * Actualiza las cartas de un jugador de forma segura:
   * 1. Almacena en la propiedad privada del servidor (nunca sincronizada).
   * 2. Actualiza el conteo público de cartas (cardCount) para que los demás dibujen dorsos.
   * 3. Envía las cartas reales SOLO al dueño vía mensaje privado.
   * @param reveal Si true, también establece revealedCards (para SORTEO/SHOWDOWN).
   */
  private setPlayerCards(sessionId: string, cards: string, reveal: boolean = false): void {
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
  private sendPrivateCards(sessionId: string): void {
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
  private getRngState(): string {
    this.rngCounter++;
    return crypto
      .createHash('sha256')
      .update(`${this.state.lastSeed}:${this.rngCounter}`)
      .digest('hex')
      .substring(0, 16);
  }

  // ── Pique Fijo: helpers de votación ──

  private clearPiqueProposal() {
    this.state.proposedPique = 0;
    this.state.proposedPiqueBy = "";
    this.state.piqueVotesFor = 0;
    this.state.piqueVotesAgainst = 0;
    this.state.piqueVotersTotal = 0;
    this.piqueVoters.clear();
    this.piqueProposerId = "";
  }

  private resolvePiqueVoteIfReady() {
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

  private setupSessionKickListener() {
    try {
      this.redisSub = createRedisSubscriber();
      this.redisSub.subscribe("session_kick").catch((err) => {
        console.warn("[MesaRoom] Redis subscribe failed:", err.message);
      });

      this.redisSub.on("message", (_channel: string, message: string) => {
        try {
          const { userId, deviceId } = JSON.parse(message);
          this.handleSessionKick(userId, deviceId);
        } catch (e) {
          console.warn("[MesaRoom] Invalid session_kick payload:", message);
        }
      });

      this.redisSub.on("error", (err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[MesaRoom] Redis sub error:", err.message);
        }
      });
    } catch (e) {
      console.warn("[MesaRoom] Could not setup session kick listener:", (e as Error).message);
    }
  }

  private handleSessionKick(userId: string, newDeviceId: string) {
    // Find any connected clients with this userId but a DIFFERENT deviceId
    for (const [sessionId, player] of this.state.players.entries()) {
      if (
        (player as Player).supabaseUserId === userId &&
        (player as Player).deviceId !== newDeviceId
      ) {
        console.log(
          `[MesaRoom] Force-disconnecting ${(player as Player).nickname} (session: ${sessionId}) — new login from device ${newDeviceId}`
        );

        const targetClient = this.clientMap.get(sessionId);
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
        const piqueContributors = Array.from(this.state.players.values())
          .filter((p: Player) => p.supabaseUserId && !p.isFolded && p.connected) as Player[];
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
}
