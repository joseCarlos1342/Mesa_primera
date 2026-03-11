import { Room, Client } from "@colyseus/core";
import { GameState, Player } from "../schemas/GameState";
import { SupabaseService } from "../services/SupabaseService";
import * as crypto from "crypto";
import { evaluateHand, compareHands } from "./combinations";

export class MesaRoom extends Room<{ state: GameState }> {
  maxClients = 6;
  private countdownTimer?: any;
  private currentGameId: string = crypto.randomUUID();
  private currentTimeline: any[] = [];

  onCreate(options: any) {
    this.setState(new GameState());

    // Configurar metadatos para el Lobby
    this.setMetadata({
      tableName: options.tableName || "Mesa VIP",
      minPlayers: this.state.minPlayers,
      maxPlayers: this.state.maxPlayers
    });

    // Inicializar baraja de 28 cartas
    // Primera usa: 1 (As), 3, 4, 5, 6, 7, y figuras (10, 11, o 12) para completar 7 por palo
    // O según la variante más común de 28: 1, 2, 3, 4, 5, 6, 7
    this.createDeck();

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
        player.hasActed = true; // IMPORTANT

        this.currentTimeline.push({ event: 'action', phase: 'PIQUE', player: client.sessionId, action, time: Date.now() });

        if (action === "paso") {
          player.isFolded = true;
        } else if (action === "voy") {
          player.chips -= 10;
          this.state.pot += 10;
        }

        this.advanceTurnPhase2();
      } else if (this.state.phase === "DESCARTE") {
        const { action, droppedCards } = message; // "discard" action with array of cards (e.g., ["1-O", "7-E"])
        player.hasActed = true; // IMPORTANT

        this.currentTimeline.push({ event: 'action', phase: 'DESCARTE', player: client.sessionId, action, droppedCards, time: Date.now() });

        if (action === "discard" && droppedCards && Array.isArray(droppedCards)) {
          let currentHand = player.cards ? player.cards.split(',') : [];
          
          // Remove dropped cards
          currentHand = currentHand.filter((c: string) => !droppedCards.includes(c));
          
          // Entra la mecánica de La Bajada:
          // 1. Las cartas que el jugador bota se colocan boca abajo en la parte superior del mazo (push)
          for (const c of droppedCards) {
             this.state.tableCards.push(c);
          }

          // 2. El sistema saca cartas para reemplazar, del fondo del mazo (shift)
          const drawnCards: string[] = [];
          for (let i = 0; i < droppedCards.length; i++) {
             const newCard = this.state.tableCards.shift();
             if (newCard) {
               drawnCards.push(newCard);
             } else {
               console.log("[MesaRoom] Warning: Deck ran out during DESCARTE phase, not returning cards.");
             }
          }
          currentHand.push(...drawnCards);
          player.cards = currentHand.join(',');
          console.log(`[MesaRoom] Player ${player.id} discarded ${droppedCards.length} (top) and drew ${drawnCards.length} (bottom)`);
        }
        
        this.advanceTurnPhaseDescarte();
      } else if (this.state.phase === "GUERRA") {
        const { action, amount } = message; // "bet", "call", "fold"
        player.hasActed = true; // IMPORTANT

        this.currentTimeline.push({ event: 'action', phase: 'GUERRA', player: client.sessionId, action, amount, time: Date.now() });

        if (action === "fold") {
          player.isFolded = true;
        } else if (action === "call" || action === "bet") {
          const betAmount = amount || 10;
          if (player.chips >= betAmount) {
            player.chips -= betAmount;
            this.state.pot += betAmount;
          }
        }
        this.advanceTurnPhase5();
      }
    });
  }

  onJoin(client: Client, options: any) {
    const requestedNickname = options.nickname || `Jugador_${client.sessionId}`;
    
    const deviceId = options.deviceId;
    
    // React Strict Mode deduplication / Ghost player cleanup:
    // If we find another player with the SAME exact deviceId that is disconnected,
    // it's likely a hot-reload or duplicate connection we should clean up.
    // Also fallback to nickname + disconnected if deviceId missing (rare).
    const existingPlayerEntry = Array.from(this.state.players.entries()).find(
      ([_, p]) => !p.connected && 
                 ((deviceId && p.deviceId === deviceId) || (p.nickname === requestedNickname))
    );
    
    if (existingPlayerEntry) {
      // Reemplazamos la sesión anterior
      const [oldSessionId, _] = existingPlayerEntry;
      console.log(`[MesaRoom] Reemplazando sesión fantasma ${oldSessionId} con la nueva ${client.sessionId} (Match: ${requestedNickname}/${deviceId})`);
      this.state.players.delete(oldSessionId);
      
      if (this.state.dealerId === oldSessionId) {
        this.state.dealerId = client.sessionId;
      }
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

    // El primer jugador es el dealer por defecto, o si el dealer actual no es válido
    const currentDealer = this.state.players.get(this.state.dealerId);
    if (this.state.players.size === 1 || !currentDealer || !currentDealer.connected) {
      this.state.dealerId = client.sessionId;
    }

    // Cancelar/revalidar countdown en caso de que un nuevo jugador descuadre el "todos listos"
    this.checkStartCountdown();
  }

  async onLeave(client: Client, code?: number) {
    const consented = (code === 1000);
    const player = this.state.players.get(client.sessionId);
    
    if (!player) return;
    
    console.log(`[MesaRoom] Cliente desconectado: ${player.nickname} (${client.sessionId}). Code: ${code}, Consented: ${consented}`);
    player.connected = false;

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
      console.log(`[MesaRoom] Cliente reconectado exitosamente: ${player.nickname} (${client.sessionId})`);
      
    } catch (e) {
      console.log(`[MesaRoom] Tiempo de reconexión expirado o abandono definitivo para ${player.nickname}`);
      this.removePlayer(client.sessionId);
    }
  }

  private removePlayer(sessionId: string) {
    this.state.players.delete(sessionId);
    
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
    const seed = crypto.randomBytes(16).toString('hex');
    console.log(`[MesaRoom] Iniciando partida con seed: ${seed}`);
    this.state.lastSeed = seed;
    
    this.currentGameId = crypto.randomUUID();
    this.currentTimeline = [];
    this.currentTimeline.push({ event: 'start', seed, time: Date.now() });

    SupabaseService.createGameSession(this.currentGameId, this.metadata?.tableName || "Mesa VIP");

    this.state.tableCards.clear();
    this.createDeck();
    this.shuffleDeck();

    // Resetear el estado de los jugadores para la nueva ronda
    Array.from(this.state.players.values() as IterableIterator<Player>).forEach(p => {
       if (!p.isReady) {
           p.isFolded = true; // Si no estaba listo, no participa en esta mano
       } else {
           p.isFolded = false;
       }
       p.hasActed = false;
       p.cards = "";
    });

    // Fase 1: Sorteo de la mano
    this.startPhase1Sorteo();
  }

  /**
   * Fase 1: Sorteo de La Mano
   * Cada jugador conectado recibe una carta. 
   * La carta con mayor valor numérico se define como el dealer de la ronda actual.
   */
  private startPhase1Sorteo() {
    this.state.phase = "SORTEO_MANO";
    console.log(`[MesaRoom] Fase 1: Sorteo de La Mano buscando un Oro...`);
    
    let manoPlayerId = "";
    let cardsDealt = 0;
    
    // Solo los jugadores conectados que están participando (no folded)
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    activePlayers.forEach((player: Player) => player.cards = "");

    let foundOros = false;
    while (!foundOros && this.state.tableCards.length > 0) {
      for (const player of activePlayers) {
        const card = this.state.tableCards.pop();
        if (!card) break;
        
        cardsDealt++;
        player.cards = player.cards ? player.cards + "," + card : card;
        
        const suit = card.split('-')[1];
        if (suit === 'O') {
           manoPlayerId = player.id;
           foundOros = true;
           break; // Se detiene inmediatamente
        }
      }
    }

    if (manoPlayerId) {
      this.state.dealerId = manoPlayerId;
      console.log(`[MesaRoom] Fase 1 Completa. La Mano es: ${manoPlayerId} (Salió el Oro en la carta #${cardsDealt})`);
    }

    // Esperar rápido para que se vea el Sorteo progresivo, luego otra pausa en UI
    const delayTime = (cardsDealt * 800) + 2000; 
    
    this.clock.setTimeout(() => {
      this.startPhase2Pique();
    }, delayTime);
  }

  /**
   * Fase 2: El Pique
   * Reparte 2 cartas boca abajo a todos los jugadores activos e inicia
   * el carrusel de decisiones (Voy/Paso) desde La Mano o su derecha.
   */
  private startPhase2Pique() {
    this.state.phase = "PIQUE";
    console.log(`[MesaRoom] Iniciando Fase 2: El Pique`);

    // Recoger cartas, barajar de nuevo
    this.createDeck();
    this.shuffleDeck();

    // Repartir 2 cartas a cada jugador activo
    for (let i = 0; i < 2; i++) {
        this.state.players.forEach((player: Player) => {
            if (player.connected) {
                if (i === 0) player.cards = ""; // Clear cards only on the first iteration
                const card = this.state.tableCards.pop();
                if (card) {
                  player.cards = player.cards ? player.cards + "," + card : card;
                }
            }
        });
    }

    // Reset folds and deduct ante (optional)
    this.state.players.forEach((p: Player) => {
        p.isFolded = !p.connected;
    });

    // Elegir quién empieza (La Mano o a su derecha)
    this.state.players.forEach((p: Player) => p.hasActed = false); // Reset actions
    this.advanceTurnPhase2(this.state.dealerId); 
  }

  private advanceTurnPhase2(startFromId?: string) {
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    
    // Si solo queda 1, gana el pozo inmediatamente
    if (activePlayers.length < 2) {
      console.log(`[MesaRoom] Solo 1 jugador queda. Fin de la ronda.`);
      return this.endHandEarly();
    }

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
   * Entregamos 2 cartas adicionales a los jugadores que siguen 
   * activos en la mesa.
   */
  private startPhase3CompletarMano() {
    this.state.phase = "COMPLETAR";
    console.log(`[MesaRoom] Iniciando Fase 3: Completar`);

    // Repartir 2 cartas adicionales (máximo 4) a los que dijeron "Voy" (siguen activos)
    for (let i = 0; i < 2; i++) {
        this.state.players.forEach((player: Player) => {
            if (player.connected && !player.isFolded) {
                // Prevenir que pasen de 4 cartas por error de lógica
                const currentCardsCount = player.cards ? player.cards.split(',').length : 0;
                if (currentCardsCount < 4) {
                    const card = this.state.tableCards.pop();
                    if (card) player.cards = player.cards ? player.cards + "," + card : card;
                }
            }
        });
    }

    // El DESCARTE comienza desde el Dealer (La Mano)
    this.clock.setTimeout(() => {
        this.startPhaseDescarte();
    }, 2000);
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

    const playerIds = Array.from(this.state.players.keys());
    const dealerIdx = playerIds.indexOf(this.state.dealerId);
    
    // El turno debe iniciar en La Mano o el siguiente activo
    this.advanceTurnPhaseDescarte(this.state.dealerId);
  }

  private advanceTurnPhaseDescarte(startFromId?: string) {
    const activePlayers = Array.from(this.state.players.values() as IterableIterator<Player>).filter(p => !p.isFolded && p.connected);
    
    // Si solo queda 1, gana el pozo inmediatamente
    if (activePlayers.length < 2) {
      return this.endHandEarly();
    }

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

    // Si nadie está disponible para actuar, pasamos a Fase 4 (Cánticos / Guerra)
    if (!found) {
      this.startPhase4Canticos();
    }
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
    
    if (activePlayers.length < 2) {
      return this.endHandEarly();
    }

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
      this.state.phase = "LOBBY";
      return;
    }

    if (activePlayers.length === 1) {
       this.awardPot(activePlayers[0].id);
       return;
    }

    // Evaluar la mano de todos los activos
    let winner = activePlayers[0];
    let bestHand = evaluateHand(winner.cards);

    for (let i = 1; i < activePlayers.length; i++) {
      const p = activePlayers[i];
      const pHand = evaluateHand(p.cards);
      
      console.log(`[MesaRoom] Player ${p.nickname} final hand: ${pHand.type} (Points: ${pHand.points})`);

      // compareHands devuelve positivo si pHand gana a bestHand, negativo si bestHand gana
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

    // Rake del 5%
    const rake = Math.floor(this.state.pot * 0.05);
    const payout = this.state.pot - rake;

    winner.chips += payout;
    console.log(`[MesaRoom] Ganador: ${winner.id} ganó ${payout} (Rake: ${rake})`);
    
    this.currentTimeline.push({ event: 'end', winner: winnerId, pot: this.state.pot, payout, rake, time: Date.now() });

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
    this.state.phase = "LOBBY";

    // Preparar siguiente mano (rotar dealer)
    const playerIds = Array.from(this.state.players.keys());
    const dealerIdx = playerIds.indexOf(this.state.dealerId);
    this.state.dealerId = playerIds[(dealerIdx + 1) % playerIds.length];
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
      this.state.phase = "LOBBY";
    }
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
