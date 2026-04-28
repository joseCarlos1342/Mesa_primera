/**
 * Constantes compartidas por MesaRoom y sus módulos extraídos.
 * Fase 5 — consolidación: única fuente de verdad para evitar drift entre
 * MesaRoom.ts y ConnectionManager.ts.
 */

/** Saldo mínimo (en centavos COP) para sentarse: $50.000 COP. */
export const MIN_BALANCE_CENTS = 5_000_000;

/** Código de cierre consentido de Colyseus (cliente cerró voluntariamente). */
export const COLYSEUS_CONSENTED_CLOSE_CODE = 4000;
