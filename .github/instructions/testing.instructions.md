---
applyTo: "**/__tests__/**,**/*.test.*,**/*.spec.*,e2e/**,apps/*/vitest.config.ts,apps/*/jest.config.*"
description: "Reglas de testing: Jest 30 (web), Vitest 4 (game-server), Playwright (E2E) y SQL/RLS."
---

# Testing y Verificacion

## Stack
- Web: Jest 30 + React Testing Library.
- Game server: Vitest 4.
- E2E: Playwright (carpeta `e2e/`).
- SQL/RLS: tests en `supabase/tests/` y verificaciones del schema.

## Reglas
- No cerrar tarea sin probar el area afectada.
- Cambios en server actions, auth, wallet, RLS o flujos criticos requieren tests.
- Bugs UI / auth multi-paso: preferir E2E o navegador real.
- Componentes async de Next.js: evitar tests fragiles que no representen el runtime real.
- Tests en `__tests__/` adyacente a la fuente cuando aplique.

## Antes de mergear
- Ejecutar pruebas de la app afectada.
- Ejecutar typecheck de la app afectada.
- Ejecutar lint si tocaste web.
- Si toca rutas criticas o UX: validar manual o con Playwright.

## E2E multiplayer
- Para bugs que solo aparecen con 2+ jugadores usar `e2e-multiplayer-race-conditions`:
  - Multiples `browser.newContext()`.
  - Acciones colisionantes con `Promise.all`.
  - Sin `waitForTimeout`; esperar eventos confirmados por servidor.
  - Re-correr con `--repeat-each=10` para detectar flakiness real.

## Replays y regresion del motor
- Convertir bugs ya fijados en replays bajo `replays/YYYY-MM/` y test deterministico (skill `replay-regression-scenarios`).

## TDD
- Para lógica de negocio nueva y bugs reproducibles, preferir `test-driven-development` (red-green-refactor).
- No bloquear cambios de configuración, documentación, infraestructura o exploración si TDD no aporta una prueba significativa.

## Comandos
- `pnpm --filter web test`
- `pnpm --filter web test:coverage`
- `pnpm --filter game-server test`
- `pnpm --filter game-server test:coverage`
- `pnpm exec playwright test`
