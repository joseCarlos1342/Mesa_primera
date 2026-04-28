/**
 * PhaseRouter — registro central de fases.
 *
 * Durante Fase 4 (steps 4.2–4.12) el router se va poblando incrementalmente.
 * `getNextPhaseCallback` original en MesaRoom **sigue siendo la fuente de verdad**
 * de las transiciones; este router solamente expone las fases ya extraídas para
 * que MesaRoom pueda delegar `startPhaseX` a `phases[X].enter(this)`.
 *
 * En el step 4.13 el router reemplaza completamente a `getNextPhaseCallback`.
 */

import type { IGamePhase, PhaseContext } from "./IGamePhase";

const phases: Record<string, IGamePhase> = {};

export function registerPhase(phase: IGamePhase): void {
  phases[phase.id] = phase;
}

export function getPhase(id: string): IGamePhase | undefined {
  return phases[id];
}

/** Helper para invocar `enter` de una fase registrada. */
export function enterPhase(ctx: PhaseContext, id: string, opts?: any): void | Promise<void> {
  const phase = phases[id];
  if (!phase) {
    throw new Error(`[PhaseRouter] Fase no registrada: ${id}`);
  }
  return phase.enter(ctx, opts);
}
