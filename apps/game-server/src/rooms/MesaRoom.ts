import { Room, Client } from "colyseus";
import { GameState, Player } from "../schemas/GameState";
import { SupabaseService } from "../services/SupabaseService";
import * as crypto from "crypto";
import { evaluateHand, compareHands, HandEvaluation } from "./combinations";

export interface MesaMetadata {
  tableName: string;
  minPlayers: number;
  maxPlayers: number;
  activePlayers: number;
  totalReservedSeats: number;
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

  onCreate(options: any) {
    this.setState(new GameState());

    // Configurar metadatos para el Lobby
    this.setMetadata({
      tableName: options.tableName || "Mesa VIP",
      minPlayers: (this.state as any).minPlayers,
      maxPlayers: (this.state as any).maxPlayers,
      activePlayers: 0,
      totalReservedSeats: 0
    });

    // Inicializar baraja de 28 cartas
    // Primera usa: 1 (As), 3, 4, 5, 6, 7, y figuras (10, 11, o 12) para completar 7 por palo
    // O según la variante más común de 28: 1, 2, 3, 4, 5, 6, 7
    this.createDeck();

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
      if (!player) return;

      player.isReady = message.isReady;
      
      this.checkStartCountdown();
    });

    this.onMessage("startGame", (client) => {
      if (this.state.phase !== "LOBBY") return;
      if (this.state.dealerId !== client.sessionId) return; // Solo el creador de la sala puede iniciar

      const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => p.connected);
      const readyPlayers = activePlayers.filter(p => p.isReady);

      if (readyPlayers.length >= this.state.minPlayers) {
         this.startNewGame();
      }
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

        player.hasActed = true; 

        this.currentTimeline.push({ event: 'action', phase: 'PIQUE', player: client.sessionId, action, time: Date.now(), rng_state: this.getRngState() });

        if (action === "paso") {
          player.isFolded = true;
          this.state.lastAction = `${player.nickname} pasa en el Pique`;
          if (player.id === this.state.activeManoId) this.transferMano();
        } else if (action === "voy") {
          const betAmount = message.amount || 10;
          const actualBet = Math.min(betAmount, player.chips);
          if (actualBet <= 0) {
            player.isFolded = true;
            this.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
            if (player.id === this.state.activeManoId) this.transferMano();
          } else {
            // Persist bet to DB before modifying RAM state
            if (player.supabaseUserId) {
              const result = await SupabaseService.recordBet(player.supabaseUserId, actualBet, this.currentGameId);
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
            this.state.lastAction = `${player.nickname} va $${actualBet} para Pique`;
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
          if (player.id === this.state.activeManoId) this.transferMano();
        }
        this.advanceTurnPhaseDescarte();
      } else if (this.state.phase === "APUESTA_4_CARTAS") {
        const { action, amount } = message;
        player.hasActed = true;
        this.currentTimeline.push({ event: 'action', phase: 'APUESTA_4_CARTAS', player: client.sessionId, action, amount, time: Date.now(), rng_state: this.getRngState() });

        if (action === "paso") {
          player.isFolded = true;
          this.state.lastAction = `${player.nickname} se bota en la apuesta`;
          if (player.id === this.state.activeManoId) this.transferMano();
        } else if (action === "voy") {
          const betAmount = amount || 10;
          const actualBet = Math.min(betAmount, player.chips);
          if (actualBet <= 0) {
            player.isFolded = true;
            this.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
            if (player.id === this.state.activeManoId) this.transferMano();
          } else {
            if (player.supabaseUserId) {
              const result = await SupabaseService.recordBet(player.supabaseUserId, actualBet, this.currentGameId);
              if (result && !result.success && result.isBalanceError) {
                player.isFolded = true;
                this.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
                if (player.id === this.state.activeManoId) this.transferMano();
                this.advanceTurnApuesta4();
                return;
              }
            }
            player.chips -= actualBet;
            this.state.pot += actualBet;
            this.state.lastAction = `${player.nickname} va $${actualBet}`;
          }
        }
        this.advanceTurnApuesta4();

      } else if (this.state.phase === "CANTICOS") {
        const { action, amount, combination } = message;
        player.hasActed = true;
        this.currentTimeline.push({ event: 'action', phase: 'CANTICOS', player: client.sessionId, action, amount, combination, time: Date.now(), rng_state: this.getRngState() });

        if (action === "paso") {
          player.isFolded = true;
          this.state.lastAction = `${player.nickname} se bota`;
          if (player.id === this.state.activeManoId) this.transferMano();
        } else if (action === "voy") {
          const betAmount = amount || 10;
          const actualBet = Math.min(betAmount, player.chips);
          if (actualBet <= 0) {
            player.isFolded = true;
            this.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
            if (player.id === this.state.activeManoId) this.transferMano();
          } else {
            if (player.supabaseUserId) {
              const result = await SupabaseService.recordBet(player.supabaseUserId, actualBet, this.currentGameId);
              if (result && !result.success && result.isBalanceError) {
                player.isFolded = true;
                this.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
                if (player.id === this.state.activeManoId) this.transferMano();
                this.advanceTurnCanticos();
                return;
              }
            }
            player.chips -= actualBet;
            this.state.pot += actualBet;
            const comboStr = combination ? ` a la ${combination}` : '';
            this.state.lastAction = `${player.nickname} va $${actualBet}${comboStr}`;
          }
        }
        this.advanceTurnCanticos();
      } else if (this.state.phase === "GUERRA") {
        const { action, amount } = message; // "voy" o "paso"

        if (action !== "paso" && action !== "voy") {
           console.log(`[MesaRoom] Acción inválida '${action}' de ${player.nickname} en fase GUERRA. Rechazada.`);
           return;
        }

        player.hasActed = true;

        this.currentTimeline.push({ event: 'action', phase: 'GUERRA', player: client.sessionId, action, amount, time: Date.now(), rng_state: this.getRngState() });

        if (action === "paso") {
          player.isFolded = true;
          this.state.lastAction = `${player.nickname} se bota`;
          if (player.id === this.state.activeManoId) this.transferMano();
        } else if (action === "voy") {
          const betAmount = amount || 10;
          const actualBet = Math.min(betAmount, player.chips);
          if (actualBet <= 0) {
            player.isFolded = true;
            this.state.lastAction = `${player.nickname} no tiene fichas y se bota`;
            if (player.id === this.state.activeManoId) this.transferMano();
          } else {
            if (player.supabaseUserId) {
              const result = await SupabaseService.recordBet(player.supabaseUserId, actualBet, this.currentGameId);
              if (result && !result.success && result.isBalanceError) {
                player.isFolded = true;
                this.state.lastAction = `${player.nickname} se bota (fondos insuficientes)`;
                if (player.id === this.state.activeManoId) this.transferMano();
                this.advanceTurnPhase5();
                return;
              }
            }
            player.chips -= actualBet;
            this.state.pot += actualBet;
            this.state.lastAction = `${player.nickname} va $${actualBet}`;
          }
        }
        this.advanceTurnPhase5();
      }
    });

    this.onMessage("show-muck", (client, message) => {
       if (this.state.phase !== "SHOWDOWN_WAIT") return;
       const player = this.state.players.get(client.sessionId);
       if (!player) return;
       
       if (message.action === "show") {
          this.state.lastAction = `${player.nickname} muestra sus cartas`;
          player.revealedCards = player.cards;
       } else {
          this.state.lastAction = `${player.nickname} no muestra las cartas`;
          this.setPlayerCards(client.sessionId, "");
       }
       this.endRound();
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
  }

  onJoin(client: Client, options: any) {
    // ── Spectator (admin) mode ──
    if (options.spectator === true) {
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

    // Registrar cliente para mensajería privada
    this.clientMap.set(client.sessionId, client);
    
    // Ghost player cleanup and state restoration:
    const existingPlayerEntry = Array.from(this.state.players.entries()).find(
      ([_, p]) => (deviceId && (p as Player).deviceId === deviceId)
    );
    
    if (existingPlayerEntry) {
      const [oldSessionId, oldPlayer] = existingPlayerEntry;
      console.log(`[MesaRoom] Restaurando asiento de ${oldSessionId} hacia la nueva conexión ${client.sessionId}...`);
      
      // Forzar cierre del socket viejo si seguía atascado
      if (oldPlayer.connected) {
         try {
           const oldClient = this.clients.find(c => c.sessionId === oldSessionId);
           if (oldClient) oldClient.leave(4000, "Replaced by new connection");
         } catch(e) {}
      }
      
      const newPlayer = new Player();
      newPlayer.id = client.sessionId;
      newPlayer.nickname = oldPlayer.nickname;
      newPlayer.avatarUrl = oldPlayer.avatarUrl;
      newPlayer.chips = oldPlayer.chips;
      newPlayer.cards = oldPlayer.cards;
      newPlayer.cardCount = oldPlayer.cardCount;
      newPlayer.revealedCards = oldPlayer.revealedCards;
      newPlayer.isReady = oldPlayer.isReady;
      newPlayer.hasActed = oldPlayer.hasActed;
      newPlayer.isFolded = oldPlayer.isFolded;
      newPlayer.connected = true;
      newPlayer.deviceId = oldPlayer.deviceId;
      newPlayer.supabaseUserId = oldPlayer.supabaseUserId;

      this.state.players.delete(oldSessionId);
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

      // Re-enviar las cartas privadas al cliente reconectado
      this.sendPrivateCards(client.sessionId);
      
      this.updateLobbyMetadata();
      this.checkStartCountdown();
      return;
    }
    
    console.log(`[MesaRoom] Cliente unido: ${client.sessionId} -> ${requestedNickname}`);
    
    const newPlayer = new Player();
    newPlayer.id = client.sessionId;
    newPlayer.nickname = requestedNickname;
    newPlayer.avatarUrl = options.avatarUrl || "default";
    newPlayer.chips = options.chips || 1000;
    newPlayer.connected = true;
    newPlayer.deviceId = deviceId;
    newPlayer.supabaseUserId = options.userId || "";
      
    this.state.players.set(client.sessionId, newPlayer);
    // Registrar el asiento del nuevo jugador para la rotación estable de la mano
    this.seatOrder.push(client.sessionId);
    this.updateLobbyMetadata();

    // El primer jugador es el dealer por defecto, o si el dealer actual no es válido
    const currentDealer = this.state.players.get(this.state.dealerId);
    if (this.state.players.size === 1 || !currentDealer || !currentDealer.connected) {
      this.state.dealerId = client.sessionId;
    }

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

    // TRANSFERIR ANFITRIÓN INMEDIATAMENTE SI SE DESCONECTA
    if (this.state.dealerId === client.sessionId) {
      const nextHost = Array.from(this.state.players.values()).find(p => p.connected && p.id !== client.sessionId);
      if (nextHost) {
        this.state.dealerId = nextHost.id;
        console.log(`[MesaRoom] El anfitrión se desconectó. Nuevo anfitrión temporal: ${nextHost.nickname}`);
      }
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
      this.updateLobbyMetadata();
      console.log(`[MesaRoom] Cliente reconectado exitosamente: ${player.nickname} (${client.sessionId})`);
      
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
    
    // Si era el dealer y quedan jugadores, asignar otro dealer
    if (this.state.dealerId === sessionId && this.state.players.size > 0) {
      this.state.dealerId = Array.from(this.state.players.keys())[0];
    }
    this.checkStartCountdown();

    // Si nadie queda en la mesa, limpiar por si acaso
    if (this.state.players.size === 0) {
      this.state.phase = "LOBBY";
      this.state.countdown = -1;
      this.stopCountdown();
    }
  }

  private checkStartCountdown() {
    if (this.state.phase !== "LOBBY") return;

    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => p.connected);
    const readyPlayers = activePlayers.filter(p => p.isReady);

    if (readyPlayers.length >= this.state.minPlayers) {
       // Si todos están listos (y son más del mínimo), podemos dejar que el anfitrión inicie inmediatamente, 
       // pero la regla dice: "contador de 1 minuto para iniciar... se detiene si un jugador nuevo da listo o cancela... 
       // una vez todos den listo al creador le sale para iniciar partido sin espera".
       if (readyPlayers.length === activePlayers.length && readyPlayers.length > 0) {
          this.stopCountdown(); // Se detiene porque todos están listos, el anfitrión iniciará manual.
       } else if (this.state.countdown === -1) {
          // Arrancar contador de 60 segundos
          console.log(`[MesaRoom] Starting 60s countdown as ${readyPlayers.length} players are ready.`);
          this.state.countdown = 60;
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
       // Menos de 3 listos: cancelar
       if (this.state.countdown !== -1) {
          console.log(`[MesaRoom] Conditions unmet. Canceling countdown.`);
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

    const seed = crypto.randomBytes(16).toString('hex');
    console.log(`[MesaRoom] Iniciando partida con seed: ${seed}`);
    this.state.lastSeed = seed;
    
    this.currentGameId = crypto.randomUUID();
    this.currentTimeline = [];
    this.rngCounter = 0;
    this.currentTimeline.push({ event: 'start', seed, time: Date.now() });

    SupabaseService.createGameSession(this.currentGameId, this.metadata?.tableName || "Mesa VIP");

    // Resetear el estado de los jugadores para la nueva ronda
    Array.from(this.state.players.entries()).forEach(([sessionId, p]) => {
       if (!p.isReady) {
           p.isFolded = true; 
       } else {
           p.isFolded = false;
       }
       p.hasActed = false;
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
        for(let i=0; i<playerIds.length; i++) {
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
  private async startPhase2Pique() {
    this.state.phase = "BARAJANDO";
    console.log(`[MesaRoom] Barajando para el Pique...`);

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

    // Reset folds and deduct ante (Casa)
    let antePlayerCount = 0;
    for (const [, p] of this.state.players) {
        p.isFolded = !p.connected;
        if (!p.isFolded) {
          const anteAmount = Math.min(10, p.chips);
          if (anteAmount <= 0) continue;
          // Persist ante to DB
          if (p.supabaseUserId) {
            const result = await SupabaseService.recordBet(p.supabaseUserId, anteAmount, this.currentGameId);
            if (result && !result.success && result.isBalanceError) {
              console.warn(`[MesaRoom] Ante rejected (insufficient funds) for ${p.nickname}`);
              p.isFolded = true;
              continue;
            }
            if (result && !result.success) {
              console.warn(`[MesaRoom] Ante DB error for ${p.nickname}: ${result.error} (proceeding anyway)`);
            }
          }
          antePlayerCount++;
          p.chips -= anteAmount;
          this.state.pot += anteAmount;
        }
    }
    this.state.lastAction = `Entrada obligatoria: $10 × ${antePlayerCount} jugadores = $${this.state.pot} al pozo`;

    this.clock.setTimeout(() => {
        this.state.phase = "PIQUE_DEAL";
        console.log(`[MesaRoom] Repartiendo 2 cartas de pique por jugador...`);

        // Ordered by seatOrder starting from La Mano (dealerId)
        const dealerSeatIdx = this.seatOrder.indexOf(this.state.dealerId);
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
                   this.advanceTurnPhase2(this.state.dealerId);
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
    const startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1 && !startFromId) {
      return this.startPhase3CompletarMano();
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
    // No one left to act
    this.startPhase3CompletarMano();
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
    const dealerSeatIdx = this.seatOrder.indexOf(this.state.dealerId);
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
      this.startPhaseApuesta4Cartas();
      return;
    }

    let currentPlayerIndex = 0;
    let roundsDealt = 0;

    const dealInterval = this.clock.setInterval(() => {
        if (roundsDealt >= 2) {
           dealInterval.clear();
           this.clock.setTimeout(() => {
               this.startPhaseApuesta4Cartas();
           }, 1000);
           return;
        }

        const { player, sessionId } = orderedActivePlayers[currentPlayerIndex];
        const currentCardsCount = player.cards ? player.cards.split(',').filter(Boolean).length : 0;

        if (currentCardsCount < 4) {
            const card = this.deck.pop();
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
   * Fase Intermedia: DESCARTE
   * Cada jugador activo descarta las cartas que no le sirven (sin apuestas — las apuestas ya ocurrieron en APUESTA_4_CARTAS).
   */
  private startPhaseDescarte() {
    this.state.phase = "DESCARTE";
    console.log(`[MesaRoom] Iniciando Fase: Descarte`);
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
    this.state.players.forEach((p: Player) => p.hasActed = false);
    this.state.currentMaxBet = 0;
    this.state.highestBetPlayerId = "";
    this.advanceTurnApuesta4(this.state.activeManoId);
  }

  private advanceTurnApuesta4(startFromId?: string) {
    const startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1) {
      return this.startPhaseDescarte();
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
    this.startPhaseDescarte();
  }

  private advanceTurnPhaseDescarte(startFromId?: string) {
    const startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1) {
      return this.startPhaseReemplazoDescarte();
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
   * Repartir reemplazos: todos los del jugador de una vez, sequentially por jugador, desde abajo del mazo.
   */
  private startPhaseReemplazoDescarte() {
    this.state.phase = "COMPLETAR_DESCARTE";
    console.log(`[MesaRoom] Repartiendo reemplazos desde el fondo del mazo...`);

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

    let currentPlayerIndex = 0;

    const dealInterval = this.clock.setInterval(() => {
        if (currentPlayerIndex >= playersNeedingCards.length) {
           dealInterval.clear();
           this.startPhaseRevealBottomCard();
           return;
        }

        const { player, sessionId } = playersNeedingCards[currentPlayerIndex];
        const count = player.pendingDiscardCards.length;
        // Deal all requested cards at once from the bottom of the deck
        let newCards = player.cards;
        for (let i = 0; i < count; i++) {
            const card = this.deck.shift();
            if (card) newCards = newCards ? newCards + "," + card : card;
        }
        this.setPlayerCards(sessionId, newCards);
        player.pendingDiscardCards = [];
        currentPlayerIndex++;
    }, 2000); // 2s between players
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
   */
  private startPhase4Canticos() {
    this.state.phase = "CANTICOS";
    console.log(`[MesaRoom] Iniciando Fase 4: Cánticos`);
    this.state.players.forEach((p: Player) => p.hasActed = false);
    this.state.currentMaxBet = 0;
    this.state.highestBetPlayerId = "";
    this.advanceTurnCanticos(this.state.activeManoId);
  }

  private advanceTurnCanticos(startFromId?: string) {
    // If only 1 active player remains, go straight to showdown (20s to show/muck)
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    if (activePlayers.length <= 1) {
      return this.startPhase6Showdown();
    }

    const startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1) {
      return this.startPhase6Showdown();
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
    this.startPhase6Showdown();
  }

  /**
   * Fase 5: Guerra Principal
   * Ronda de apuestas del pozo. Inicia en La Mano activa (activeManoId).
   */
  private startPhase5Guerra() {
    this.state.phase = "GUERRA";
    console.log(`[MesaRoom] Iniciando Fase 5: Guerra Principal`);
    this.state.players.forEach((p: Player) => p.hasActed = false);
    this.state.currentMaxBet = 0;
    this.state.highestBetPlayerId = "";
    this.advanceTurnPhase5(this.state.activeManoId);
  }

  private advanceTurnPhase5(startFromId?: string) {
    // If only 1 active player remains, go straight to showdown (20s to show/muck)
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    if (activePlayers.length <= 1) {
      return this.startPhase6Showdown();
    }

    const startSeatIdx = this.seatOrder.indexOf(startFromId || this.state.turnPlayerId);
    if (startSeatIdx === -1) {
      return this.startPhase4Canticos();
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
    this.startPhase4Canticos();
  }

  /**
   * Fase 6: Showdown
   * Muestra las cartas por 20 segundos, luego premia al ganador.
   */
  private startPhase6Showdown() {
    this.state.phase = "SHOWDOWN";
    console.log(`[MesaRoom] Iniciando Fase 6: Showdown`);

    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);

    if (activePlayers.length === 0) {
      this.state.pot = 0;
      this.state.piquePot = 0;
      this.state.phase = "LOBBY";
      return;
    }

    if (activePlayers.length === 1) {
      this.state.lastAction = `¡${activePlayers[0].nickname} gana!`;
      this.state.showdownTimer = 10;
      const interval = this.clock.setInterval(() => {
        this.state.showdownTimer--;
        if (this.state.showdownTimer <= 0) { interval.clear(); this.awardPot(activePlayers[0].id); }
      }, 1000);
      return;
    }

    // Revelar cartas de todos los jugadores activos para el showdown
    activePlayers.forEach(p => {
      p.revealedCards = p.cards;
    });

    // Evaluate hands — La Mano (dealerId) gets +1 point tiebreaker
    const manoId = this.state.dealerId;
    const evaluateWithManoBonus = (player: Player): HandEvaluation => {
      const evaluation = evaluateHand(player.cards);
      return player.id === manoId
        ? { ...evaluation, points: evaluation.points + 1 }
        : evaluation;
    };

    let winner = activePlayers[0];
    let bestHand = evaluateWithManoBonus(winner);
    for (let i = 1; i < activePlayers.length; i++) {
      const p = activePlayers[i];
      const pHand = evaluateWithManoBonus(p);
      console.log(`[MesaRoom] ${p.nickname}${p.id === manoId ? ' (La Mano +1)' : ''}: ${pHand.type} (${pHand.points} pts)`);
      if (compareHands(pHand, bestHand) > 0) { winner = p; bestHand = pHand; }
    }

    console.log(`[MesaRoom] Ganador: ${winner.nickname} con ${bestHand.type} (${bestHand.points} pts)`);
    this.state.lastAction = `¡${winner.nickname} gana con ${bestHand.type}! (${bestHand.points} pts)`;

    // Show cards for 10 seconds before awarding
    this.state.showdownTimer = 10;
    const interval = this.clock.setInterval(() => {
      this.state.showdownTimer--;
      if (this.state.showdownTimer <= 0) {
        interval.clear();
        this.awardPot(winner.id);
      }
    }, 1000);
  }

  private awardPot(winnerId: string) {
    const winner = this.state.players.get(winnerId);
    if (!winner) return;

    // Rake del 5% independiente para cada pozo
    const potRake = Math.floor(this.state.pot * 0.05);
    const piqueRake = Math.floor(this.state.piquePot * 0.05);
    const potPayout = this.state.pot - potRake;
    const piquePayout = this.state.piquePot - piqueRake;

    const rake = potRake + piqueRake;
    const payout = potPayout + piquePayout;
    const totalPot = this.state.pot + this.state.piquePot;

    winner.chips += payout;
    console.log(`[MesaRoom] Ganador: ${winner.id} ganó ${payout} (Pot: ${potPayout}, Pique: ${piquePayout}, Rake total: ${rake})`);
    
    this.currentTimeline.push({ event: 'end', winner: winnerId, pot: totalPot, payout, rake, time: Date.now(), rng_state: this.getRngState() });

    const playersSnapshot = Array.from(this.state.players.values()).map(p => ({
      userId: p.supabaseUserId || p.id,
      nickname: p.nickname,
      cards: p.cards,
      chips: p.chips
    }));
    
    // Llamar al Ledger en Supabase para persistir en DB y actualizar stats
    if (winner.supabaseUserId) {
      SupabaseService.awardPot(winner.supabaseUserId, payout, rake, this.currentGameId).catch(console.error);
    }

    // Save replay: admin_timeline includes rng_state per action, player timeline strips it
    const adminTimeline = [...this.currentTimeline];
    const playerTimeline = this.currentTimeline.map(({ rng_state, ...event }) => event);
    SupabaseService.saveReplay(this.currentGameId, this.state.lastSeed, playerTimeline, playersSnapshot, adminTimeline).catch(console.error);

    // Update stats for all participating players
    Array.from(this.state.players.values()).forEach(p => {
      // Assuming initial chips deduced was 10. For a real implementation, track total bet per player
      const initialBet = 10; 
      const isWinner = p.id === winner.id;
      const playerPayout = isWinner ? payout : -initialBet;
      const playerRake = isWinner ? rake : 0;
      
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

    Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => p.isReady = false);
    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.bottomCard = "";
    this.state.activeManoId = "";
    this.state.showdownTimer = 0;
    this.state.phase = "LOBBY";

    // Limpiar cartas reveladas de todos los jugadores
    this.state.players.forEach((p: Player, sessionId: string) => {
      p.revealedCards = "";
    });

    // Rotar La Mano al siguiente asiento en orden estable (jugador a la derecha)
    const dealerSeatIdx = this.seatOrder.indexOf(this.state.dealerId);
    if (dealerSeatIdx !== -1 && this.seatOrder.length > 1) {
      const nextSeatIdx = (dealerSeatIdx + 1) % this.seatOrder.length;
      this.state.dealerId = this.seatOrder[nextSeatIdx];
    }
    // Actualizar números de turno para reflejar el nuevo orden desde ya en el LOBBY
    this.assignTurnOrders();
  }

  private endRound() {
    console.log(`[MesaRoom] Fin de la ronda (Showdown/Muck finalizado).`);
    this.clock.setTimeout(() => {
        this.restartLobby();
    }, 5000); // 5s to see winners
  }

  private restartLobby() {
      this.state.players.forEach((p: Player, sessionId: string) => {
          p.isReady = false;
          this.setPlayerCards(sessionId, "");
          p.revealedCards = "";
      });
      this.state.pot = 0;
      this.state.piquePot = 0;
      this.state.phase = "LOBBY";
  }

  private endHandEarly() {
    const winner = Array.from(this.state.players.values() as IterableIterator<Player>).find(p => !p.isFolded && p.connected);
    if (winner) {
      console.log(`[MesaRoom] Ganador sin showdown (Rival retirado/Farol). Entregando pozo a ${winner.id}...`);
      this.awardPot(winner.id);
    } else {
      console.log(`[MesaRoom] Fin de mano prematuro, pero no hay un ganador claro. Se aborta partida.`);
      Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => p.isReady = false);
      this.state.pot = 0;
      this.state.piquePot = 0;
      this.state.phase = "LOBBY";
    }
  }

  /**
   * Asigna el número de turno relativo a La Mano a cada jugador activo.
   * La Mano recibe turnOrder = 1, el siguiente jugador a la derecha = 2, y así sucesivamente.
   * Permite que el cliente muestre visualmente el orden de rotación de la mano.
   */
  private assignTurnOrders(): void {
    const manoSeatIdx = this.seatOrder.indexOf(this.state.dealerId);
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
}
