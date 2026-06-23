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
- Medicion web vigente: `98.86%` statements, `86.77%` branches, `93.17%` functions, `98.86%` lines con `188` suites y `1421` tests pasando (`2026-06-22`).
- Medicion game-server vigente: `94.93%` statements, `85.23%` branches, `97%` functions, `96.13%` lines con `27` suites y `758` tests pasando (`2026-06-20`).
- `MesaRoom` y sus fases son zona critica: cualquier cambio en flujo de juego, reconexion, payout o apuestas debe venir con pruebas especificas.
- El roadmap detallado de cobertura web vive en `docs/testing/WEB_COVERAGE_ROADMAP.md`.
- Frentes flojos actuales de game-server: `MesaRoom.ts` por volumen de reglas, `SupabaseService.ts` en catch/fail-open residuales y ramas defensivas de comandos.
- Gate operativo temporal actual:
  - Web: `86%` statements, `79%` branches, `81%` functions, `86%` lines.
  - Game server: `87%` statements, `77%` branches, `87%` functions, `88%` lines.
- Objetivo final estrategico sigue siendo `98%` en ambos frentes, pero CI usa un gate escalonado para reflejar el baseline real y bloquear regresiones, no el estado final aun no alcanzado.

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
