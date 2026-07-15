export const CRASH_RECOVERY_WINDOW_MS = 120_000;

/** Fases sin animación ni callbacks diferidos que pueden reanudarse tras un crash. */
export const RECOVERABLE_GAME_PHASES = [
  "PIQUE",
  "DESCARTE",
  "CANTICOS",
  "DECLARAR_JUEGO",
  "GUERRA",
  "GUERRA_JUEGO",
  "PIQUE_REVEAL",
  "APUESTA_4_CARTAS",
] as const;

export function isRecoverableGamePhase(phase: unknown): phase is (typeof RECOVERABLE_GAME_PHASES)[number] {
  return typeof phase === "string" && RECOVERABLE_GAME_PHASES.includes(phase as (typeof RECOVERABLE_GAME_PHASES)[number]);
}

export type RecoveryDecision = "resume" | "wait" | "cancel";

export interface GameRecoveryInput {
  detectedAt: Date;
  now: Date;
  originalUserIds: string[];
  reconnectedUserIds: string[];
}

export interface GameRecoveryResult {
  decision: RecoveryDecision;
  missingUserIds: string[];
}

/** Serialización determinista para verificar snapshots JSON persistidos como JSONB. */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function uniqueUserIds(userIds: string[], label: string): Set<string> {
  if (userIds.length === 0) {
    throw new Error(`El ${label} no puede estar vacío`);
  }

  const uniqueIds = new Set(userIds);
  if (uniqueIds.size !== userIds.length) {
    throw new Error(`El ${label} contiene jugadores duplicados`);
  }

  return uniqueIds;
}

/**
 * Decide si una mano interrumpida puede reanudarse. La ventana empieza al
 * detectar el crash, nunca al reconectar el primer jugador.
 */
export function decideGameRecovery(input: GameRecoveryInput): GameRecoveryResult {
  const originalUserIds = uniqueUserIds(input.originalUserIds, "roster original");
  const reconnectedUserIds = new Set(input.reconnectedUserIds);
  const missingUserIds = [...originalUserIds].filter((userId) => !reconnectedUserIds.has(userId));

  if (missingUserIds.length === 0) {
    return { decision: "resume", missingUserIds };
  }

  const expiresAt = input.detectedAt.getTime() + CRASH_RECOVERY_WINDOW_MS;
  return {
    decision: input.now.getTime() >= expiresAt ? "cancel" : "wait",
    missingUserIds,
  };
}
