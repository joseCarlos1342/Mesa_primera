import { Schema, type, MapSchema, ArraySchema, view } from "@colyseus/schema";
import { Client } from "colyseus";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") nickname: string = "";
  @type("string") avatarUrl: string = "";
  @type("boolean") connected: boolean = true;
  @type("boolean") isFolded: boolean = false;
  @type("boolean") hasActed: boolean = false;
  @type("boolean") isReady: boolean = false;
  @type("number") chips: number = 0;
  /** Posición de turno relativa a La Mano: 1 = La Mano, 2 = siguiente, etc. 0 = aún no asignado. */
  @type("uint8") turnOrder: number = 0;
  
  // TODO: Colyseus @view has bugs in 0.17 with MapSchema. Removed temporarily for logic testing.
  @type("string") cards: string = "";

  // Server-only properties (not synced to clients)
  deviceId?: string;
  pendingDiscardCards: string[] = [];
}

export class GameState extends Schema {
  @type("string") phase: string = "LOBBY"; // LOBBY, STARTING, BARAJANDO, SORTEO_MANO, PIQUE_DEAL, PIQUE, COMPLETAR, APUESTA_4_CARTAS, DESCARTE, COMPLETAR_DESCARTE, REVELAR_CARTA, CANTICOS, GUERRA, SHOWDOWN
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(["string"]) tableCards = new ArraySchema<string>();
  @type("string") dealerId: string = "";
  /** La Mano activa para el orden de turnos (puede transferirse si dealerId se retira mid-game) */
  @type("string") activeManoId: string = "";
  @type("uint32") pot: number = 0;
  @type("uint32") piquePot: number = 0;
  @type("string") turnPlayerId: string = "";
  @type("uint8") minPlayers: number = 1;
  @type("uint8") maxPlayers: number = 7;
  @type("number") countdown: number = -1; // -1 significa inactivo
  @type("string") lastSeed: string = ""; // Seed del RNG para auditoría
  @type("string") lastAction: string = ""; // Para mostrar mensajes como "Dario va $5.000 para Pique" en UI
  @type("uint8") showdownTimer: number = 0; // Temporizador para Mostrar/No Mostrar cartas
  @type("uint32") currentMaxBet: number = 0; // Apuesta más alta en la fase actual
  @type("string") highestBetPlayerId: string = ""; // Quién puso la apuesta más alta
  @type("boolean") isFirstGame: boolean = true; // Define si es la primera partida de la sesión para el Sorteo
  /** Última carta del mazo revelada boca arriba al finalizar el reparto; visible el resto de la partida */
  @type("string") bottomCard: string = "";
}
