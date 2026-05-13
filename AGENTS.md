# AGENTS.md — Mesa Primera

## Commands

```bash
# Dev (starts web :3000 + game-server :2567 + socket :2568 + Redis :6380)
./dev.sh
# Or using turbo (does not override VPS URLs in .env.local):
npm run dev

# Tests
npm run test --workspace=web              # Jest 30 (jsdom, next/jest)
npm run test --workspace=game-server       # Vitest 4 (node env)
npm run test:coverage --workspace=web      # Threshold: 38% (statements/branches/lines)
npm run test:coverage --workspace=game-server  # Threshold: 75% lines, 65% branches
npx playwright test                        # E2E (requires running services)

# Lint & typecheck (run before committing)
npm run lint --workspace=web
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/game-server/tsconfig.json

# Database
supabase migration new <name>
supabase db reset
supabase gen types typescript --local > apps/web/src/types/supabase.ts
```

# Mesa Primera - Reglas globales (nucleo)

> Este archivo es el nucleo minimo. El detalle vive en `.github/instructions/*.instructions.md`
> y se carga automaticamente cuando se trabaja en cada area (segun `applyTo`).
> No dupliques contenido aqui: si una regla aplica solo a un dominio, va al instruction file correspondiente.

## 1. Principios
- Hablamos espanol con el usuario y en commits/docs.
- Implementar; no solo sugerir. Investigar lo necesario y proceder.
- Cambios pequenos, reversibles y enfocados en lo pedido.
- No archivos nuevos por defecto: editar lo existente.
- Sin secretos en el repo, sin `console.log` en produccion, sin `any` injustificado.
- Verificar antes de cerrar (lint/typecheck/tests del area afectada).

## 2. Regla de oro (Mesa Primera)
- **Admin Blindness**: el admin NO accede a estado activo de juego. RLS deny-by-default.
- **Ledger inmutable**: `wallets_ledger` es INSERT-only. Balance = `SUM(credits) - SUM(debits)`. Toda operacion financiera atomica + idempotente.
- **Reconexion 60s**: salas Colyseus con grace de 60s, match por `userId`, sin ghost players.
- **Dual-UI estricto**: `apps/web/src/app/(player)` (PWA) vs `apps/web/src/app/(admin)` (Dashboard).

## 3. Stack
- Monorepo Turbo. Web: Next.js 16 / React 19 / Tailwind 4 / Jest 30. Game: Colyseus + Vitest 4. DB: Supabase + Postgres + RLS. Realtime: Redis 7 (`:6380`). E2E: Playwright. VPS con Caddy + systemd.

## 4. CLI, Ops y Skills
* **CLIs y gotchas del VPS** (puerto Redis 6380, versiones de herramientas): ver `.github/instructions/deploy-ops.instructions.md`.
* **Skills**: `.agents/skills/<name>/SKILL.md`. Para elegir la correcta, ver `.github/instructions/skills-catalog.instructions.md`.

## 5. Indice de instrucciones por dominio
- Commits: `.github/instructions/commits.instructions.md`
- Web (Next.js/React/Tailwind): `.github/instructions/web-next.instructions.md`
- Game server (Colyseus/Redis): `.github/instructions/game-server.instructions.md`
- Supabase / SQL / RLS / Ledger: `.github/instructions/supabase-rls.instructions.md`
- Testing (Jest, Vitest, Playwright): `.github/instructions/testing.instructions.md`
- Deploy / Ops / CI: `.github/instructions/deploy-ops.instructions.md`
- Documentacion viva: `.github/instructions/docs-living.instructions.md`
- Catalogo de skills: `.github/instructions/skills-catalog.instructions.md`

## 6. Otros archivos clave
- `.github/copilot-instructions.md` - resumen always-on para Copilot.
- `.github/rules/context7.md` - como usar `ctx7` para docs externas.
- `plan_primera.md` - plan canonico del producto y reglas financieras de alto nivel.
- `AGENTS.md` (este archivo) - convenciones para agentes externos.

## 7. Flujo recomendado por tarea
1. Identificar dominio -> el instruction file correspondiente se cargara solo.
2. Cargar la skill que aplique (ver `skills-catalog.instructions.md`).
3. Si toca docs externas (libs/SDK/CLI): usar la skill `find-docs` o el CLI `ctx7` directamente (ya configurado globalmente con API key).
4. Implementar con tests cuando sea relevante.
5. Validar (lint/typecheck/tests del area).
6. Commit en espanol siguiendo `commits.instructions.md`.