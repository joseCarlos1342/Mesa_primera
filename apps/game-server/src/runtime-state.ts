// Estado de runtime compartido entre el endpoint /health y el handler de
// shutdown. Se utiliza para que el script de deploy (mesa-deploy) pueda
// detectar que el proceso está drenando y abortar / esperar antes de
// recrear el contenedor.

let draining = false;

export function setDraining(value: boolean): void {
  draining = value;
}

export function isDraining(): boolean {
  return draining;
}
