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
  /**
   * Orden estable de asientos (por orden de entrada).
   * Garantiza que la rotación de La Mano sea siempre "al jugador de la derecha",
   * independientemente del orden interno del MapSchema.
   */
  private seatOrder: string[] = [];

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

    this.onMessage("action", (client, message) => {
      if (this.state.turnPlayerId !== client.sessionId) return;
      
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (this.state.phase === "PIQUE") {
        const { action } = message; // "voy" o "paso"
        player.hasActed = true; 

        this.currentTimeline.push({ event: 'action', phase: 'PIQUE', player: client.sessionId, action, time: Date.now() });

        if (action === "paso") {
          player.isFolded = true;
          this.state.lastAction = `${player.nickname} pasa en el Pique`;
        } else if (action === "voy") {
          const betAmount = message.amount || 10;
          if (player.chips >= betAmount) {
            player.chips -= betAmount;
            this.state.piquePot += betAmount;
          } else {
            this.state.piquePot += player.chips;
            player.chips = 0;
          }
          this.state.lastAction = `${player.nickname} va $${betAmount} para Pique`;
        }

        this.advanceTurnPhase2();
      } else if (this.state.phase === "DESCARTE") {
        const { action, droppedCards, amount } = message; 
        const betAmount = amount || 0;
        
        player.hasActed = true;
        this.currentTimeline.push({ event: 'action', phase: 'DESCARTE', player: client.sessionId, action, droppedCards, amount: betAmount, time: Date.now() });

        if (action === "discard") {
          // Si hay una apuesta previa y el jugador no la iguala ni la sube, es un paso/fold implícito o error de UI
          // Para esta lógica, si manda amount y es mayor que el actual, es un SUBE
          if (betAmount > this.state.currentMaxBet) {
             this.state.currentMaxBet = betAmount;
             this.state.highestBetPlayerId = player.id;
             // Resetear hasActed para todos los demás activos para que deban responder al nuevo aumento
             this.state.players.forEach(p => {
               if (p.id !== player.id && !p.isFolded && p.connected) {
                 p.hasActed = false;
               }
             });
          }

          if (betAmount > 0) {
            const deduction = betAmount; // Simplificación: asumiendo que amount es el total a poner en esta fase
            if (player.chips >= deduction) {
              player.chips -= deduction;
              this.state.pot += deduction;
            } else {
              this.state.pot += player.chips;
              player.chips = 0;
            }
          }

          // Guardar descartes (solo si se enviaron)
          if (droppedCards && Array.isArray(droppedCards) && droppedCards.length > 0) {
            player.pendingDiscardCards = droppedCards;
            
            // Remover de la mano visual inmediatamente
            let currentHand = player.cards ? player.cards.split(',') : [];
            currentHand = currentHand.filter((c: string) => !droppedCards.includes(c));
            player.cards = currentHand.join(',');

            // Poner en el tope del mazo
            for (const c of droppedCards) {
               this.state.tableCards.push(c);
            }
            
            this.state.lastAction = `${player.nickname} va $${betAmount} y bota ${droppedCards.length} cartas`;
          } else {
            this.state.lastAction = `${player.nickname} va $${betAmount} y mantiene su mano`;
          }
        } else if (action === "paso") {
           // Si alguien ya apostó, pasar significa retirarse (fallecer)
           if (this.state.currentMaxBet > 0) {
              player.isFolded = true;
              this.state.lastAction = `${player.nickname} fallece (no iguala la apuesta)`;
           } else {
              this.state.lastAction = `${player.nickname} pasa`;
           }
        }
        
        this.advanceTurnPhaseDescarte();
      } else if (this.state.phase === "GUERRA") {
        const { action, amount } = message; // "bet", "call", "fold"
        player.hasActed = true;

        this.currentTimeline.push({ event: 'action', phase: 'GUERRA', player: client.sessionId, action, amount, time: Date.now() });

        if (action === "fold") {
          player.isFolded = true;
          this.state.lastAction = `${player.nickname} se retira (fold)`;
        } else if (action === "call" || action === "bet") {
          const betAmount = amount || 10;
          if (player.chips >= betAmount) {
            player.chips -= betAmount;
            this.state.pot += betAmount;
          } else {
            this.state.pot += player.chips;
            player.chips = 0;
          }
          this.state.lastAction = `${player.nickname} va $${betAmount} para Guerra`;
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
       } else {
          this.state.lastAction = `${player.nickname} no muestra las cartas`;
          player.cards = "";
       }
       this.endRound();
    });
  }

  onJoin(client: Client, options: any) {
    const requestedNickname = options.nickname || `Jugador_${client.sessionId}`;
    const deviceId = options.deviceId;
    
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
      newPlayer.isReady = oldPlayer.isReady;
      newPlayer.hasActed = oldPlayer.hasActed;
      newPlayer.isFolded = oldPlayer.isFolded;
      newPlayer.connected = true;
      newPlayer.deviceId = oldPlayer.deviceId;

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
    
    this.state.tableCards.clear();
    for (const suit of suits) {
      for (const val of values) {
        this.state.tableCards.push(`${val}-${suit}`);
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
    this.currentTimeline.push({ event: 'start', seed, time: Date.now() });

    SupabaseService.createGameSession(this.currentGameId, this.metadata?.tableName || "Mesa VIP");

    // Resetear el estado de los jugadores para la nueva ronda
    Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => {
       if (!p.isReady) {
           p.isFolded = true; 
       } else {
           p.isFolded = false;
       }
       p.hasActed = false;
       p.cards = "";
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
    this.state.phase = "BARAJANDO";
    console.log(`[MesaRoom] Barajando para Sorteo Mano...`);
    
    this.state.tableCards.clear();
    this.createDeck();
    this.shuffleDeck();

    this.clock.setTimeout(() => {
        this.state.phase = "SORTEO_MANO";
        console.log(`[MesaRoom] Fase 1: Sorteo de La Mano buscando un Oro...`);
        
        let manoPlayerId = "";
        
        // Ordenar jugadores empezando por el Host (dealer actual placeholder) y rotando
        const playerIds = Array.from(this.state.players.keys());
        const hostIdx = playerIds.indexOf(this.state.dealerId) >= 0 ? playerIds.indexOf(this.state.dealerId) : 0;
        
        const orderedActivePlayers: Player[] = [];
        for(let i=0; i<playerIds.length; i++) {
            const idx = (hostIdx + i) % playerIds.length;
            const p = this.state.players.get(playerIds[idx]);
            if (p && !p.isFolded && p.connected) {
                orderedActivePlayers.push(p);
            }
        }

        let currentPlayerIndex = 0;

        const dealInterval = this.clock.setInterval(() => {
            // Si ya encontramos oro o nos quedamos sin cartas, terminar
            if (manoPlayerId || this.state.tableCards.length === 0) {
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

            const player = orderedActivePlayers[currentPlayerIndex];
            const card = this.state.tableCards.pop();
            
            if (card) {
                player.cards = player.cards ? player.cards + "," + card : card;
                
                // Cualquier Oro otorga la mano
                const suit = card.split('-')[1];
                if (suit === 'O') {
                   manoPlayerId = player.id;
                }
            }
            
            currentPlayerIndex = (currentPlayerIndex + 1) % orderedActivePlayers.length;
        }, 3000); // 3s delay for cinematic sorteo
    }, 7000); // 7s delay to allow the cinematic intro UI to finish before dealing starts
  }

  /**
   * Fase 2: El Pique
   */
  private startPhase2Pique() {
    this.state.phase = "BARAJANDO";
    console.log(`[MesaRoom] Barajando para el Pique...`);

    // Recoger cartas, barajar de nuevo
    this.createDeck();
    this.shuffleDeck();
    this.state.players.forEach(p => p.cards = "");

    // Reset folds and deduct ante (Casa)
    this.state.players.forEach((p: Player) => {
        p.isFolded = !p.connected;
        if (!p.isFolded) {
          if (p.chips >= 10) {
            p.chips -= 10;
            this.state.pot += 10;
          } else {
            this.state.pot += p.chips;
            p.chips = 0;
          }
        }
    });

    this.clock.setTimeout(() => {
        this.state.phase = "PIQUE_DEAL";
        console.log(`[MesaRoom] Repartiendo 2 cartas iniciales (Pique)...`);

        const playerIds = Array.from(this.state.players.keys());
        const dealerIdx = playerIds.indexOf(this.state.dealerId) >= 0 ? playerIds.indexOf(this.state.dealerId) : 0;
        
        const orderedActivePlayers: Player[] = [];
        for(let i=0; i<playerIds.length; i++) {
           const idx = (dealerIdx + i) % playerIds.length;
           const p = this.state.players.get(playerIds[idx]);
           if (p && !p.isFolded && p.connected) {
               orderedActivePlayers.push(p);
           }
        }

        let currentPlayerIndex = 0;
        let roundsDealt = 0;

        const dealInterval = this.clock.setInterval(() => {
            if (roundsDealt >= 2) {
               dealInterval.clear();
               
               this.clock.setTimeout(() => {
                   this.state.phase = "PIQUE";
                   this.state.players.forEach(p => p.hasActed = false);
                   this.advanceTurnPhase2(this.state.dealerId); 
               }, 1000);
               return;
            }

            const player = orderedActivePlayers[currentPlayerIndex];
            const card = this.state.tableCards.pop();
            if (card) {
                player.cards = player.cards ? player.cards + "," + card : card;
            }

            currentPlayerIndex++;
            if (currentPlayerIndex >= orderedActivePlayers.length) {
                currentPlayerIndex = 0;
                roundsDealt++;
            }
        }, 3000); // Global 3s delay
    }, 3000);
  }


  private advanceTurnPhase2(startFromId?: string) {
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    
    // Si solo queda 1, gana el pozo inmediatamente
    /* if (activePlayers.length < 2) {
      console.log(`[MesaRoom] Solo 1 jugador queda. Fin de la ronda.`);
      return this.endHandEarly();
    } */

    const playerIds = Array.from(this.state.players.keys());
    let currentIndex = playerIds.indexOf(this.state.turnPlayerId);
    
    // Si pasamos startFromId (inicio de fase), forzamos ese índice
    if (startFromId) {
       currentIndex = playerIds.indexOf(startFromId) - 1; 
       // Restamos 1 porque el loop suma 1 enseguida
       if (currentIndex < 0) currentIndex = playerIds.length - 1;
    }

    let nextIndex = (currentIndex + 1) % playerIds.length;
    let found = false;

    // Buscamos el siguiente jugador activo que no haya actuado (hasActed === false)
    while (nextIndex !== currentIndex) {
      const p = this.state.players.get(playerIds[nextIndex]);
      if (p && p.connected && !p.isFolded && !p.hasActed) {
        this.state.turnPlayerId = playerIds[nextIndex];
        found = true;
        break;
      }
      nextIndex = (nextIndex + 1) % playerIds.length;
    }

    // Si nadie está disponible para actuar, terminó la fase
    if (!found) {
      this.startPhase3CompletarMano();
    }
  }

  /**
   * Fase 3: Completar Mano
   */
  private startPhase3CompletarMano() {
    this.state.phase = "COMPLETAR";
    console.log(`[MesaRoom] Iniciando Fase 3: Completar`);

    const playerIds = Array.from(this.state.players.keys());
    const dealerIdx = playerIds.indexOf(this.state.dealerId) >= 0 ? playerIds.indexOf(this.state.dealerId) : 0;
    
    const orderedActivePlayers: Player[] = [];
    for(let i=0; i<playerIds.length; i++) {
        const idx = (dealerIdx + i) % playerIds.length;
        const p = this.state.players.get(playerIds[idx]);
        if (p && !p.isFolded && p.connected) {
            orderedActivePlayers.push(p);
        }
    }

    let currentPlayerIndex = 0;
    let roundsDealt = 0;

    const dealInterval = this.clock.setInterval(() => {
        if (roundsDealt >= 2) {
           dealInterval.clear();
           
           this.clock.setTimeout(() => {
               this.startPhaseDescarte();
           }, 1000);
           return;
        }

        const player = orderedActivePlayers[currentPlayerIndex];
        const currentCardsCount = player.cards ? player.cards.split(',').length : 0;
        
        if (currentCardsCount < 4) {
            const card = this.state.tableCards.pop();
            if (card) player.cards = player.cards ? player.cards + "," + card : card;
        }

        currentPlayerIndex++;
        if (currentPlayerIndex >= orderedActivePlayers.length) {
            currentPlayerIndex = 0;
            roundsDealt++;
        }
    }, 3000); // Global 3s delay
  }

  /**
   * Fase Intermedia: DESCARTE
   * Los jugadores pueden votar de 0 a 4 cartas que no le sirvan y pedir
   * reemplazos al sistema.
   */
  private startPhaseDescarte() {
    this.state.phase = "DESCARTE";
    console.log(`[MesaRoom] Iniciando Fase: Descarte`);

    this.state.players.forEach((p: Player) => p.hasActed = false); // Reset actions
    this.state.currentMaxBet = 0;
    this.state.highestBetPlayerId = "";

    const playerIds = Array.from(this.state.players.keys());
    const dealerIdx = playerIds.indexOf(this.state.dealerId);
    
    // El turno debe iniciar en La Mano o el siguiente activo
    this.advanceTurnPhaseDescarte(this.state.dealerId);
  }

  private advanceTurnPhaseDescarte(startFromId?: string) {
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    
    // Si solo queda 1, gana el pozo inmediatamente
    /* if (activePlayers.length < 2) {
      return this.endHandEarly();
    } */

    const playerIds = Array.from(this.state.players.keys());
    let currentIndex = playerIds.indexOf(this.state.turnPlayerId);
    
    if (startFromId) {
       currentIndex = playerIds.indexOf(startFromId) - 1; 
       if (currentIndex < 0) currentIndex = playerIds.length - 1;
    }

    let nextIndex = (currentIndex + 1) % playerIds.length;
    let found = false;

    // Siguiente jugador activo que no haya actuado
    while (nextIndex !== currentIndex) {
      const p = this.state.players.get(playerIds[nextIndex]);
      if (p && p.connected && !p.isFolded && !p.hasActed) {
        this.state.turnPlayerId = playerIds[nextIndex];
        found = true;
        break;
      }
      nextIndex = (nextIndex + 1) % playerIds.length;
    }

    // Si nadie está disponible para actuar, terminó el descarte
    if (!found) {
      this.startPhaseReemplazoDescarte();
    }
  }

  /**
   * Entregar reemplazos una vez todos han botado sus cartas
   */
  private startPhaseReemplazoDescarte() {
    this.state.phase = "COMPLETAR_DESCARTE";
    console.log(`[MesaRoom] Repartiendo reemplazos usando shift() desde debajo...`);
    
    const playerIds = Array.from(this.state.players.keys());
    const dealerIdx = playerIds.indexOf(this.state.dealerId) >= 0 ? playerIds.indexOf(this.state.dealerId) : 0;
    
    const orderedActivePlayers: Player[] = [];
    for(let i=0; i<playerIds.length; i++) {
        const idx = (dealerIdx + i) % playerIds.length;
        const p = this.state.players.get(playerIds[idx]);
        if (p && !p.isFolded && p.connected && (p.cards ? p.cards.split(',').length : 0) < 4) {
            orderedActivePlayers.push(p);
        }
    }

    if (orderedActivePlayers.length === 0) {
        this.startPhase4Canticos();
        return;
    }

    let currentPlayerIndex = 0;
    
    const dealInterval = this.clock.setInterval(() => {
        if (orderedActivePlayers.length === 0) {
           dealInterval.clear();
           this.clock.setTimeout(() => {
               this.startPhase4Canticos();
           }, 1000);
           return;
        }

        const player = orderedActivePlayers[currentPlayerIndex];
        const currentCardsCount = player.cards ? player.cards.split(',').length : 0;
        
        if (currentCardsCount < 4) {
            const card = this.state.tableCards.shift(); // Saca de abajo (Memory of deck)
            if (card) player.cards = player.cards ? player.cards + "," + card : card;
            
            // Si ya completó las 4, lo sacamos de la lista para no volver a iterar sobre él
            if (currentCardsCount + 1 >= 4) {
               orderedActivePlayers.splice(currentPlayerIndex, 1);
               if (currentPlayerIndex >= orderedActivePlayers.length) {
                   currentPlayerIndex = 0;
               }
               return; // Siguiente ciclo evaluate
            }
        } else {
           orderedActivePlayers.splice(currentPlayerIndex, 1);
           if (currentPlayerIndex >= orderedActivePlayers.length) {
               currentPlayerIndex = 0;
           }
           return;
        }

        currentPlayerIndex++;
        if (currentPlayerIndex >= orderedActivePlayers.length) {
            currentPlayerIndex = 0;
        }
    }, 3000); // Global 3s delay
  }

  /**
   * Fase 4: Cánticos
   * Evaluación Server-Side de combos especiales de "Primera" o "Ronda".
   */
  private startPhase4Canticos() {
    this.state.phase = "CANTICOS";
    console.log(`[MesaRoom] Iniciando Fase 4: Cánticos`);
    
    // Server-side detection of combinations (Ej: 2 cartas mismo palo = Pique/Ronda)
    this.state.players.forEach(player => {
      if (!player.isFolded && player.connected) {
         // Lógica futura de detección
         // player.combos = detectCombos(player.cards);
      }
    });

    // Pasar a Fase 5 después de los cánticos
    this.clock.setTimeout(() => {
        this.startPhase5Guerra();
    }, 3000);
  }

  /**
   * Fase 5: Guerra Principal
   * Ronda de apuestas primarias del pozo.
   */
  private startPhase5Guerra() {
    this.state.phase = "GUERRA";
    console.log(`[MesaRoom] Iniciando Fase 5: Guerra Principal`);

    this.state.players.forEach((p: Player) => p.hasActed = false); // Reset actions

    const playerIds = Array.from(this.state.players.keys());
    const dealerIdx = playerIds.indexOf(this.state.dealerId);
    const startFromId = playerIds[(dealerIdx + 1) % playerIds.length];

    this.advanceTurnPhase5(startFromId);
  }

  private advanceTurnPhase5(startFromId?: string) {
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    
    /* if (activePlayers.length < 2) {
      return this.endHandEarly();
    } */

    const playerIds = Array.from(this.state.players.keys());
    let currentIndex = playerIds.indexOf(this.state.turnPlayerId);
    
    if (startFromId) {
       currentIndex = playerIds.indexOf(startFromId) - 1; 
       if (currentIndex < 0) currentIndex = playerIds.length - 1;
    }

    let nextIndex = (currentIndex + 1) % playerIds.length;
    let found = false;
    
    while (nextIndex !== currentIndex) {
      const p = this.state.players.get(playerIds[nextIndex]);
      if (p && p.connected && !p.isFolded && !p.hasActed) {
        this.state.turnPlayerId = playerIds[nextIndex];
        found = true;
        break;
      }
      nextIndex = (nextIndex + 1) % playerIds.length;
    }

    if (!found) {
       this.startPhase6Showdown();
    }
  }

  /**
   * Fase 6: Showdown
   * Se descubren las cartas finales de los participantes.
   * Se aplica la jerarquía de Primera: Segunda > Chivo > Primera > Puntos.
   */
  private startPhase6Showdown() {
    this.state.phase = "SHOWDOWN";
    console.log(`[MesaRoom] Iniciando Fase 6: Showdown`);

    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    
    if (activePlayers.length === 0) {
      console.log(`[MesaRoom] No hay jugadores activos para el showdown.`);
      this.state.pot = 0;
      this.state.piquePot = 0;
      this.state.phase = "LOBBY";
      return;
    }

    if (activePlayers.length === 1) {
       this.awardPot(activePlayers[0].id);
       return;
    }

    // Evaluar la mano de todos los activos.
    // La Mano recibe +1 punto de bonificación (desempata a su favor si el tipo de mano es igual).
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
      
      const isMano = p.id === manoId;
      console.log(`[MesaRoom] ${p.nickname}${isMano ? ' (La Mano +1)' : ''}: ${pHand.type} (${pHand.points} pts)`);

      if (compareHands(pHand, bestHand) > 0) {
         winner = p;
         bestHand = pHand;
      }
    }

    console.log(`[MesaRoom] Ganador del Showdown: ${winner.nickname} con ${bestHand.type} (${bestHand.points} pts).`);
    this.awardPot(winner.id);
  }

  private awardPot(winnerId: string) {
    const winner = this.state.players.get(winnerId);
    if (!winner) return;

    const totalPot = this.state.pot + this.state.piquePot;

    // Rake del 5%
    const rake = Math.floor(totalPot * 0.05);
    const payout = totalPot - rake;

    winner.chips += payout;
    console.log(`[MesaRoom] Ganador: ${winner.id} ganó ${payout} (Rake: ${rake})`);
    
    this.currentTimeline.push({ event: 'end', winner: winnerId, pot: totalPot, payout, rake, time: Date.now() });

    const playersSnapshot = Array.from(this.state.players.values()).map(p => ({
      userId: p.id,
      nickname: p.nickname,
      cards: p.cards,
      chips: p.chips
    }));
    
    // Llamar al Ledger en Supabase para persistir en DB y actualizar stats
    SupabaseService.awardPot(winner.id, payout, rake).catch(console.error);
    SupabaseService.saveReplay(this.currentGameId, this.state.lastSeed, this.currentTimeline, playersSnapshot).catch(console.error);

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
      
      SupabaseService.updatePlayerStats(p.id, isWinner, playerPayout, playerRake, specialPlay).catch(console.error);
    });

    Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => p.isReady = false);
    this.state.pot = 0;
    this.state.piquePot = 0;
    this.state.phase = "LOBBY";

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
      this.state.players.forEach((p: Player) => {
          p.isReady = false;
          p.cards = "";
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

  private shuffleDeck() {
    // Fisher-Yates con crypto.randomInt para máxima seguridad
    const cards = this.state.tableCards;
    for (let i = cards.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const temp = cards[i];
      cards[i] = cards[j];
      cards[j] = temp;
    }
  }
}
