# Guia de Testing

## Stack Real

| Area | Herramienta | Uso |
|---|---|---|
| Web | Jest 30 + Testing Library | componentes, hooks y server actions de `apps/web` |
| Game Server | Vitest 4 | `MesaRoom`, servicios, comandos y fases |
| E2E | Playwright | flujos integrados sobre servicios levantados |
| DB / SQL | Supabase CLI | migraciones, RLS y pruebas locales de base de datos |

## Comandos Canonicos

```bash
pnpm --filter web test
pnpm --filter game-server test

pnpm --filter web test:coverage
pnpm --filter game-server test:coverage

pnpm exec playwright test

pnpm --filter web lint
pnpm exec tsc --noEmit -p apps/web/tsconfig.json
pnpm exec tsc --noEmit -p apps/game-server/tsconfig.json
```

## Ubicacion de Tests

- Web: junto al codigo o en `src/__tests__/` segun el modulo.
- Game server: junto al dominio probado, especialmente bajo `src/rooms/__tests__/` y `src/services/__tests__/`.
- E2E: suite Playwright del repo.

## Regla de Verificacion

Antes de cerrar cambios relevantes:

1. correr tests del area tocada;
2. correr lint y typecheck del area;
3. si hay cambios cross-app, validar ambos workspaces;
4. si el cambio toca UI, considerar tambien Playwright;
5. si cambia `DESIGN.md`, correr `pnpm --filter web run design:lint`.

## Cobertura y Riesgo

- Web: el umbral oficial lo gobierna el proyecto `apps/web`.
- Game server: el umbral oficial lo gobierna `apps/game-server`.
- Medicion web vigente: `99.32%` statements, `89.17%` branches, `93.55%` functions, `99.32%` lines con `189` suites y `1531` tests pasando (`2026-07-02`).
- Medicion game-server vigente: `95.36%` statements, `86.01%` branches, `97.75%` functions, `96.53%` lines con `27` suites y `766` tests pasando (`2026-07-01`).
- `MesaRoom` y sus fases son zona critica: cualquier cambio en flujo de juego, reconexion, payout o apuestas debe venir con pruebas especificas.
- El roadmap detallado de cobertura web vive en `docs/testing/WEB_COVERAGE_ROADMAP.md`.
- Frentes flojos actuales de game-server: `MesaRoom.ts` por volumen de reglas, `SupabaseService.ts` en catch/fail-open residuales y ramas defensivas de comandos.
- Gate operativo actual (subido tras Fase 3 del plan de hardening de cobertura):
  - Web: `90%` statements, `84%` branches, `86%` functions, `90%` lines.
  - Game server: `89%` statements, `80%` branches, `89%` functions, `90%` lines.
- Objetivo final estrategico sigue siendo `98%` en ambos frentes, pero CI usa un gate escalonado para reflejar el baseline real y bloquear regresiones, no el estado final aun no alcanzado.
- Hardening de cobertura Fases 1-2 (2026-06-22): 80 tests nuevos centrados en zonas debiles criticas (auth-actions, MesaRoom.refundAllActiveBets, AdminSecurityPanel, recovery, security, password, tables, consultas). Subidas clave: `auth-actions.ts` 74.8% → 85.71% branches; `recovery/page.tsx` 11.11% → 100% branches; `AdminSecurityPanel.tsx` 26.92% → 100% branches; `password/page.tsx` 62.5% → 94.54% branches; `tables/page.tsx` 61.11% → 100% branches; `consultas/page.tsx` 63.63% → 100% branches; `security/page.tsx` 33.33% → 100% branches.
- Hardening de cobertura Fase 3 (2026-06-24): 14 tests web y 2 tests game-server adicionales sobre replays, perfil, CSP, cliente Supabase SSR, `PlayerBadge` y `AlertService`. Subidas clave: `app/(player)/replays/page.tsx` queda en `100%`, `utils/supabase/client.ts` queda en `100%`, `PlayerBadge.tsx` sube branches a `96.87%` y `AlertService.ts` queda en `100%` statements/lines/functions con `96.07%` branches.
- Hardening de wallet UI (2026-07-01): 4 tests web adicionales sobre `TransactionModal.tsx` cubren fallback sin `signedUrl`, modal cerrado, retiro pendiente sin comprobante, transferencias/ajustes/tipos desconocidos y mantienen el bloque financiero solo en UI con Supabase storage mockeado.
- Hardening de broadcast admin (2026-07-02): 9 tests web adicionales sobre `admin-broadcast.ts` cubren errores de audiencia/insert/deliveries, deliveries sin `notification_id`, best-effort del game-server sin secreto o con fetch fallido, history vacio y conteos nulos/lecturas sin `broadcast_id`.
- Hardening de dashboard admin (2026-07-02): 3 tests web adicionales sobre `admin-dashboard.ts` cubren fallbacks financieros de solo lectura, diff `ALERTA`, deteccion de fingerprints compartidos y estados de boveda `ALERTA`/`CRÍTICO`.
- Hardening de ledger admin (2026-07-02): 6 tests web adicionales sobre `admin-ledger.ts` cubren errores de lectura, perfiles ausentes, referencias vacias, ledger de usuario sin datos y perfil con wallet faltante sin escrituras financieras.

## Roadmap de Cobertura Web

Para el esfuerzo de mediano y largo plazo sobre `apps/web`, usar como fuente viva:

- `docs/testing/WEB_COVERAGE_ROADMAP.md`

Ese documento define:

- baseline real de coverage;
- objetivo final y metas intermedias;
- frentes de trabajo por dominio;
- checklists por modulo;
- procedimiento de ejecucion y checkpoints.

## Casos Sensibles Que Deben Mantenerse Cubiertos

- MFA admin y recovery codes.
- Auth de jugador con OTP, PIN, dispositivo confiable y passkeys.
- Turnstile en flujos publicos.
- Ledger, depositos, retiros, ajustes y transferencias.
- Reconexion de Colyseus y restauracion de estado.
- Admin blindness y supervision en vivo.
- Broadcast, soporte y replays.
