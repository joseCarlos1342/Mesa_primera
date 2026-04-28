/**
 * PotManager — cálculo puro de side pots para Mesa Primera.
 *
 * Extraído desde MesaRoom (Fase 1.2 del refactor). La función `calculateSidePots`
 * no depende del estado Colyseus ni de servicios de red: opera solamente sobre
 * el campo `totalMainBet` y el `id` de cada jugador.
 *
 * Algoritmo (idéntico al original):
 *  1. Ordenar jugadores por `totalMainBet` ascendente.
 *  2. Calcular niveles únicos de apuesta.
 *  3. Por cada nivel, generar un pot por la diferencia con el nivel previo
 *     multiplicado por la cantidad de jugadores que llegaron al menos a ese
 *     nivel; los elegibles a ese pot son justamente esos jugadores.
 */

export interface SidePotPlayer {
  id: string;
  totalMainBet: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

/**
 * Devuelve los side pots derivados de las apuestas totales (`totalMainBet`)
 * de los jugadores activos. La función es pura y no muta sus argumentos.
 */
export function calculateSidePots(activePlayers: ReadonlyArray<SidePotPlayer>): SidePot[] {
  const sorted = [...activePlayers].sort((a, b) => a.totalMainBet - b.totalMainBet);
  const sidePots: SidePot[] = [];
  let prevLevel = 0;

  // Get unique bet levels
  const levels = [...new Set(sorted.map((p) => p.totalMainBet))];

  for (const level of levels) {
    const eligible = sorted.filter((p) => p.totalMainBet >= level);
    const potAmount = (level - prevLevel) * eligible.length;
    if (potAmount > 0) {
      sidePots.push({
        amount: potAmount,
        eligiblePlayerIds: eligible.map((p) => p.id),
      });
    }
    prevLevel = level;
  }

  return sidePots;
}
