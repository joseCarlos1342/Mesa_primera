/**
 * Fase 4 — State Machine (Strangler Fig).
 *
 * `IGamePhase` define la interfaz mínima pragmática para cada fase de juego.
 * NO se introduce `exit()` en esta fase: el código original no tiene cleanup
 * explícito al salir; agregarlo provocaría regresiones invisibles.
 */

import type { MesaRoom } from "../MesaRoom";

/**
 * Contexto de fase = la propia `MesaRoom`.
 * Fase 5 elimina el `any` reemplazándolo por el tipo concreto de la sala,
 * exponiendo formalmente el contrato que usan las fases extraídas.
 */
export type PhaseContext = MesaRoom;

export interface IGamePhase {
  /** ID canónico — coincide con `state.phase`. */
  readonly id: string;
  /** Punto de entrada — equivalente al método `startPhaseX` original. */
  enter(ctx: PhaseContext, opts?: unknown): void | Promise<void>;
  /** Avance de turno — opcional, sólo fases con turnos. */
  advance?(ctx: PhaseContext, startFromId?: string): void;
}
