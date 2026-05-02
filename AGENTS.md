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

## 4. CLIs de produccion (verificados)

| CLI | Version | Ubicacion | Notas |
|-----|---------|-----------|-------|
| `supabase` | 2.95.4 | `~/.local/bin/supabase` | Autenticado. Usar directo (no `npx`) |
| `vercel` | 50.37.3 | nvm global | Autenticado como `josecarlos1342` |
| `twilio` | 6.2.4 | `/usr/bin/twilio` | Sistema (node v20 bundled) |
| `lk` | 2.16.2 | `/usr/local/bin/lk` | El binario se llama `livekit-cli` pero **usa `lk`** (el nombre anterior esta deprecado) |
| `gh` | 2.91.0 | `/usr/bin/gh` | GitHub CLI |
| `redis-cli` | 8.0.6 | `/usr/bin/redis-cli` | Sistema |
| `psql` | 18.3 | `/usr/bin/psql` | PostgreSQL client |
| `node` | v24.14.1 | nvm | |
| `npm` | 11.11.0 | nvm | |
| `turbo` | 2.8.20 | via npx | No instalado globalmente, usar `npx turbo` |
| `playwright` | 1.58.2 | via npx | No instalado globalmente, usar `npx playwright` |
| Docker | 28.5.2 | `/usr/bin/docker` | **`docker compose` NO funciona** — usar `docker-compose` o `docker compose` via `dev.sh` |
| `supabase` (npx) | 2.84.4 | proyecto local | Version atrasada vs la global (2.95.4). Preferir la global |

### Gotcha: Redis port
El puerto de Redis es **6380** (no el default 6379). `docker-compose.yml` mapea `6380:6379`. El `.env.example` raiz dice `6379` pero esta mal — siempre usar `6380`.

## 5. Skills (resumen)
- Repo: `.agents/skills/<name>/SKILL.md` (68 skills) y `.claude/skills/<name>/SKILL.md` (20 skills).
- Globales: `~/.agents/skills/` (2 skills: `find-skills`, `nextjs-typescript-tailwindcss-supabase`).
- Para elegir skill ver `.github/instructions/skills-catalog.instructions.md`.

### Skills clave por tarea (mapa rapido)

| Tarea | Skill |
|-------|-------|
| Wallet/ledger/saldos | `mesa-ledger-atomicity` |
| RLS / admin visibility | `supabase-rls-admin-blindness` |
| Nuevo endpoint o server action | `secure-defaults-pit-of-success` |
| Reconexion / ghost / session_kick | `colyseus-reconnection-ghost-recovery` |
| Estado realtime / Redis / Presence | `colyseus-redis-realtime-states` |
| Logs/metricas/health en rooms | `colyseus-room-observability` |
| Race conditions multiplayer E2E | `e2e-multiplayer-race-conditions` |
| VPS / systemd / Caddy / Redis ops | `vps-hardening-and-runtime-ops` |
| Plan de release con rollback | `deployment-confidence-any-day` |
| Acoplamiento entre apps | `bounded-context-api-contracts` |
| Refactor multi-archivo | `change-friendly-design-etc` o `refactor-plan` |
| Error raro entre capas / cache stale | `abstraction-leak-playbook` |
| Commit con razon de negocio | `spanish-conventional-commits-rationale` |
| Commit operativo (staging, tipo) | `git-commit` |
| TDD antes de implementar | `test-driven-development` |
| Validar motor con replays | `replay-regression-scenarios` |
| Modulo legacy fragil sin tests | `characterization-tests-legacy-flows` |
| Decision arquitectonica / ADR | `docs-as-code-adr-rfc-workflow` |
| Deploy a Vercel | `deploy-to-vercel` |
| UI nueva / accesibilidad | `frontend-design`, `tailwind-design-system` |
| Validar webapp en navegador | `agent-browser`, `webapp-testing` |
| Animaciones GSAP | `gsap-core`, `gsap-timeline`, `gsap-performance` |
| Buscar docs externas | `find-docs` |
| 2FA / MFA con Better Auth | `two-factor-authentication-best-practices` |
| Vitest (game-server tests) | `vitest` |
| Turborepo (monorepo) | `turborepo` |
| Zod schemas | `zod` |
| SEO auditoria | `seo-audit` |

## 6. Indice de instrucciones por dominio
- Commits: `.github/instructions/commits.instructions.md`
- Web (Next.js/React/Tailwind): `.github/instructions/web-next.instructions.md`
- Game server (Colyseus/Redis): `.github/instructions/game-server.instructions.md`
- Supabase / SQL / RLS / Ledger: `.github/instructions/supabase-rls.instructions.md`
- Testing (Jest, Vitest, Playwright): `.github/instructions/testing.instructions.md`
- Deploy / Ops / CI: `.github/instructions/deploy-ops.instructions.md`
- Documentacion viva: `.github/instructions/docs-living.instructions.md`
- Catalogo de skills: `.github/instructions/skills-catalog.instructions.md`

## 7. Otros archivos clave
- `.github/copilot-instructions.md` - resumen always-on para Copilot.
- `.github/rules/context7.md` - como usar `ctx7` para docs externas.
- `plan_primera.md` - plan canonico del producto y reglas financieras de alto nivel.
- `AGENTS.md` (este archivo) - convenciones para agentes externos.

## 8. Flujo recomendado por tarea
1. Identificar dominio -> el instruction file correspondiente se cargara solo.
2. Cargar la skill que aplique (ver mapa rapido en seccion 5 o catalogo).
3. Si toca docs externas (libs/SDK/CLI): usar la skill `find-docs` o el CLI `ctx7` directamente (ya configurado globalmente con API key).
4. Implementar con tests cuando sea relevante.
5. Validar (lint/typecheck/tests del area).
6. Commit en espanol siguiendo `commits.instructions.md`.