/**
 * Fase 4 — State Machine (Strangler Fig).
 *
 * `IGamePhase` define la interfaz mínima pragmática para cada fase de juego.
 * NO se introduce `exit()` en esta fase: el código original no tiene cleanup
 * explícito al salir; agregarlo provocaría regresiones invisibles.
 */

// PhaseContext = MesaRoom (typed `any` durante la migración; Fase 5 lo tipará).
export type PhaseContext = any;

export interface IGamePhase {
  /** ID canónico — coincide con `state.phase`. */
  readonly id: string;
  /** Punto de entrada — equivalente al método `startPhaseX` original. */
  enter(ctx: PhaseContext, opts?: any): void | Promise<void>;
  /** Avance de turno — opcional, sólo fases con turnos. */
  advance?(ctx: PhaseContext, startFromId?: string): void;
}
