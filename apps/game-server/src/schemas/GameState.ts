import { Schema, type, MapSchema, ArraySchema, filter } from "@colyseus/schema";
import { Client } from "colyseus";

export class Player extends Schema {
  @type("string") id!: string;
  @type("string") nickname!: string;
  @type("string") avatarUrl!: string;
  @type("boolean") connected: boolean = true;
  @type("boolean") isFolded: boolean = false;
  @type("uint16") chips: number = 0;
  
  // Seguridad (Admin Blindness / Opponent Blindness)
  @filter(function(this: Player, client: Client, value: any, root: GameState) {
    return this.id === client.sessionId;
  })
  @type(["string"]) cards = new ArraySchema<string>();
}

export class GameState extends Schema {
  @type("string") phase: string = "LOBBY"; // LOBBY, SORTEO_MANO, PIQUE, COMPLETAR, CANTICOS, GUERRA, SHOWDOWN
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(["string"]) tableCards = new ArraySchema<string>();
  @type("string") dealerId!: string;
  @type("uint32") pot: number = 0;
  @type("string") turnPlayerId!: string;
  @type("uint8") minPlayers: number = 3;
  @type("uint8") maxPlayers: number = 7;
  @type("string") lastSeed!: string; // Seed del RNG para auditoría
}
