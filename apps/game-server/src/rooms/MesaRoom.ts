import { Room, Client } from "colyseus";
import { GameState, Player } from "../schemas/GameState";
import crypto from "crypto";
import { SupabaseService } from "../services/SupabaseService";

export class MesaRoom extends Room<{ state: GameState }> {
  maxClients = 7;

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

    // Manejar mensajes del cliente
    this.onMessage("start", (client) => {
      if (this.state.dealerId === client.sessionId && this.clients.length >= this.state.minPlayers) {
        this.startNewGame();
      }
    });

    this.onMessage("action", (client, message) => {
      if (this.state.turnPlayerId !== client.sessionId) return;
      
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (this.state.phase === "PIQUE") {
        const { action } = message; // "voy" o "paso"
        if (action === "paso") {
          player.isFolded = true;
        } else if (action === "voy") {
          // Acá podríamos descontar el costo (ante)
          player.chips -= 10;
          this.state.pot += 10;
        }

        this.advanceTurnPhase2();
      } else if (this.state.phase === "GUERRA") {
        const { action, amount } = message; // "bet", "call", "fold"
        if (action === "fold") {
          player.isFolded = true;
        } else if (action === "call" || action === "bet") {
          const betAmount = amount || 10; // Default bet
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
    console.log(`[MesaRoom] Cliente unido: ${client.sessionId}`);
    
    const player = new Player();
    player.id = client.sessionId;
    player.nickname = options.nickname || "Jugador";
    player.avatarUrl = options.avatarUrl || "default";
    player.chips = options.chips || 1000;

    this.state.players.set(client.sessionId, player);

    // El primer jugador es el dealer por defecto
    if (this.clients.length === 1) {
      this.state.dealerId = client.sessionId;
    }
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(`[MesaRoom] Cliente desconectado: ${client.sessionId}. Consented: ${consented}`);
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (consented) {
      // Si salió voluntariamente (cerró la mesa definitivamente)
      this.state.players.delete(client.sessionId);
    } else {
      // Desconexión inesperada: Permitir reconexión por 60 segundos
      player.connected = false;
      try {
        await this.allowReconnection(client, 60);
        console.log(`[MesaRoom] Cliente reconectado: ${client.sessionId}`);
        player.connected = true;
      } catch (e) {
        console.log(`[MesaRoom] Cliente expiró tiempo de reconexión: ${client.sessionId}`);
        this.state.players.delete(client.sessionId);
      }
    }
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
    
    this.state.tableCards.clear();
    this.createDeck();
    this.shuffleDeck();

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
    
    let highestValue = -1;
    let manoPlayerId = "";
    
    // Repartir 1 carta a cada jugador para decidir La Mano
    this.state.players.forEach((player) => {
      // Limpiar cartas previas
      player.cards.clear();
      
      const card = this.state.tableCards.pop();
      if (card) {
        player.cards.push(card);
        const [valStr, suit] = card.split('-');
        const val = parseInt(valStr);
        // Regla básica: El número mayor gana. Si hay empate, gana el primero que se saca (o implementar palo)
        if (val > highestValue) {
          highestValue = val;
          manoPlayerId = player.id;
        }
      }
    });

    if (manoPlayerId) {
      this.state.dealerId = manoPlayerId;
      console.log(`[MesaRoom] Fase 1 Completa. La Mano es: ${manoPlayerId} (sacó un ${highestValue})`);
    }

    // Esperar 4 segundos para que la UI muestre el sorteo y pasar a Fase 2
    this.clock.setTimeout(() => {
      this.startPhase2Pique();
    }, 4000);
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
        this.state.players.forEach((player) => {
            if (player.connected) {
                if (i === 0) player.cards.clear();
                const card = this.state.tableCards.pop();
                if (card) player.cards.push(card);
            }
        });
    }

    // Reset folds and deduct ante (optional)
    this.state.players.forEach(p => {
        p.isFolded = !p.connected;
    });

    // Elegir quién empieza la ronda de Voy/Paso (Mano o a su derecha)
    this.state.turnPlayerId = this.state.dealerId; 
  }

  private advanceTurnPhase2() {
    // Buscar el siguiente jugador que no haya foldeado y esté conectado
    const playerIds = Array.from(this.state.players.keys());
    const currentIndex = playerIds.indexOf(this.state.turnPlayerId);
    
    let nextIndex = (currentIndex + 1) % playerIds.length;
    let found = false;

    // Si damos toda la vuelta y llegamos a la mano original, se terminó la ronda de piques
    while (nextIndex !== currentIndex) {
      if (nextIndex === playerIds.indexOf(this.state.dealerId)) {
        // Terminó la ronda
        break;
      }
      
      const p = this.state.players.get(playerIds[nextIndex]);
      if (p && p.connected && !p.isFolded) {
        this.state.turnPlayerId = playerIds[nextIndex];
        found = true;
        break;
      }
      nextIndex = (nextIndex + 1) % playerIds.length;
    }

    if (!found || nextIndex === playerIds.indexOf(this.state.dealerId)) {
      // Todos hablaron. Verificar cuántos quedan.
      const activePlayers = Array.from(this.state.players.values()).filter(p => !p.isFolded && p.connected);
      
      if (activePlayers.length < 2) {
        // Si solo queda 1, gana el pozo inmediatamente
        console.log(`[MesaRoom] Solo 1 jugador queda. Fin de la ronda.`);
        this.endHandEarly();
      } else {
        // Pasar a Fase 3
        this.startPhase3CompletarMano();
      }
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

    // Repartir 2 cartas más a los que quedan
    for (let i = 0; i < 2; i++) {
        this.state.players.forEach((player) => {
            if (player.connected && !player.isFolded) {
                const card = this.state.tableCards.pop();
                if (card) player.cards.push(card);
            }
        });
    }

    // Pasar a Fase 4
    this.clock.setTimeout(() => {
        this.startPhase4Canticos();
    }, 2000);
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

    // Resetear el turno al primer jugador activo después de La Mano
    const playerIds = Array.from(this.state.players.keys());
    const dealerIdx = playerIds.indexOf(this.state.dealerId);
    let nextIdx = (dealerIdx + 1) % playerIds.length;
    
    while(nextIdx !== dealerIdx) {
      const p = this.state.players.get(playerIds[nextIdx]);
      if (p && !p.isFolded && p.connected) {
        this.state.turnPlayerId = playerIds[nextIdx];
        break;
      }
      nextIdx = (nextIdx + 1) % playerIds.length;
    }
  }

  private advanceTurnPhase5() {
    // Al igual que advanceTurnPhase2, rotar turno entre jugadores activos
    const playerIds = Array.from(this.state.players.keys());
    const currentIndex = playerIds.indexOf(this.state.turnPlayerId);
    
    let nextIndex = (currentIndex + 1) % playerIds.length;
    let found = false;

    // TODO: Implementar lógica de igualar apuestas (Matching the highest bet).
    // Por simplicidad en este borrador, si todos hablan una vez pasamos a Showdown.
    
    while (nextIndex !== currentIndex) {
      if (nextIndex === playerIds.indexOf(this.state.dealerId)) {
        break; // Vuelta completada
      }
      
      const p = this.state.players.get(playerIds[nextIndex]);
      if (p && p.connected && !p.isFolded) {
        this.state.turnPlayerId = playerIds[nextIndex];
        found = true;
        break;
      }
      nextIndex = (nextIndex + 1) % playerIds.length;
    }

    if (!found || nextIndex === playerIds.indexOf(this.state.dealerId)) {
      const activePlayers = Array.from(this.state.players.values()).filter(p => !p.isFolded && p.connected);
      if (activePlayers.length < 2) {
        this.endHandEarly();
      } else {
        this.startPhase6Showdown();
      }
    }
  }

  /**
   * Fase 6: Showdown
   * Se descubren las cartas finales de los participantes.
   * Supabase Service dictaminará el ganador y liquidará.
   */
  private startPhase6Showdown() {
    this.state.phase = "SHOWDOWN";
    console.log(`[MesaRoom] Iniciando Fase 6: Showdown`);

    const activePlayers = Array.from(this.state.players.values()).filter(p => !p.isFolded && p.connected);
    
    // Evaluar la jerarquía de Primera
    // En el futuro: sort() basado en el valor de las cartas de Primera
    // Arbitrariamente gana el último activo en este draft para que el flujo termine
    const winner = activePlayers[activePlayers.length - 1];

    if (winner) {
      this.awardPot(winner.id);
    }
  }

  private awardPot(winnerId: string) {
    const winner = this.state.players.get(winnerId);
    if (!winner) return;

    // Rake del 5%
    const rake = Math.floor(this.state.pot * 0.05);
    const payout = this.state.pot - rake;

    winner.chips += payout;
    console.log(`[MesaRoom] Ganador: ${winner.id} ganó ${payout} (Rake: ${rake})`);
    
    // Llamar al Ledger en Supabase para persistir en DB y actualizar stats
    SupabaseService.awardPot(winner.id, payout, rake).catch(console.error);

    this.state.pot = 0;
    this.state.phase = "LOBBY";

    // Preparar siguiente mano (rotar dealer)
    const playerIds = Array.from(this.state.players.keys());
    const dealerIdx = playerIds.indexOf(this.state.dealerId);
    this.state.dealerId = playerIds[(dealerIdx + 1) % playerIds.length];
  }

  private endHandEarly() {
    const winner = Array.from(this.state.players.values()).find(p => !p.isFolded && p.connected);
    if (winner) {
      winner.chips += this.state.pot;
      console.log(`[MesaRoom] Ganador sin showdown: ${winner.id} ganó ${this.state.pot}`);
    }
    this.state.pot = 0;
    this.state.phase = "LOBBY";
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
