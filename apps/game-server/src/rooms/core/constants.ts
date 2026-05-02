/**
 * Constantes compartidas por MesaRoom y sus módulos extraídos.
 * Fase 5 — consolidación: única fuente de verdad para evitar drift entre
 * MesaRoom.ts y ConnectionManager.ts.
 */

/** Saldo mínimo (en centavos COP) para sentarse: $50.000 COP. */
export const MIN_BALANCE_CENTS = 5_000_000;

/** Código de cierre consentido de Colyseus (cliente cerró voluntariamente). */
export const COLYSEUS_CONSENTED_CLOSE_CODE = 4000;

/** Tiempo límite (en segundos) para que un jugador actúe antes de auto-acción del servidor. */
export const TURN_TIMEOUT_SECONDS = 120;

/** Tiempo límite (en segundos) para que un jugador cierre el diálogo de showdown.
 * Si expira, el servidor avanza automáticamente a LOBBY. */
export const SHOWDOWN_TIMEOUT_SECONDS = 30;
