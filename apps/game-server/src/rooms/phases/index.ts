/**
 * Barrel + registro central de fases.
 *
 * Importar este módulo registra todas las fases en el PhaseRouter como
 * efecto colateral. Re-exporta `registerPhase`, `getPhase` y `enterPhase`
 * para que MesaRoom pueda delegar transiciones al router.
 */

import { registerPhase, getPhase, enterPhase } from "./PhaseRouter";

import { sorteoPhase, piquePhase } from "./SorteoPhase";
import { completarPhase } from "./CompletarPhase";
import { descartePhase } from "./DescartePhase";
import { reemplazoDescartePhase } from "./ReemplazoDescartePhase";
import { revealBottomCardPhase } from "./RevealBottomCardPhase";
import { canticosPhase } from "./CanticosPhase";
import { declararJuegoPhase } from "./DeclararJuegoPhase";
import { apuesta4CartasPhase } from "./Apuesta4CartasPhase";
import { guerraJuegoPhase } from "./GuerraJuegoPhase";
import { guerraPhase } from "./GuerraPhase";
import { showdownPhase } from "./ShowdownPhase";

registerPhase(sorteoPhase);
registerPhase(piquePhase);
registerPhase(completarPhase);
registerPhase(descartePhase);
registerPhase(reemplazoDescartePhase);
registerPhase(revealBottomCardPhase);
registerPhase(canticosPhase);
registerPhase(declararJuegoPhase);
registerPhase(apuesta4CartasPhase);
registerPhase(guerraJuegoPhase);
registerPhase(guerraPhase);
registerPhase(showdownPhase);

export { registerPhase, getPhase, enterPhase };
export {
  sorteoPhase,
  piquePhase,
  completarPhase,
  descartePhase,
  reemplazoDescartePhase,
  revealBottomCardPhase,
  canticosPhase,
  declararJuegoPhase,
  apuesta4CartasPhase,
  guerraJuegoPhase,
  guerraPhase,
  showdownPhase,
};
