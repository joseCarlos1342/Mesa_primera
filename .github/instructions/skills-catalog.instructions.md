---
description: "Use when picking which custom skill to load for a Mesa Primera task (RLS, ledger, Colyseus, deploy, refactor, docs, commits, etc.)."
---

# Catalogo de skills (cheatsheet tarea -> skill)

## Ubicaciones
- Repo: `.agents/skills/<name>/SKILL.md` y con prioridad sobre cualquier copia global.
- Global: solo como fallback si no existe una skill local equivalente.
- Obsoleta: `agent/skills/`; no debe cargarse ni actualizarse.
- IDE: skills integradas (`find-skills`, `get-search-view-results`).

## Precedencia
- Las invariantes de `AGENTS.md` y las instrucciones de dominio ganan frente a cualquier skill genérica.
- Una skill local gana frente a una copia global con el mismo nombre.
- Las skills de commit, deploy, migración, browser automation y actualización de dependencias no tienen permiso implícito para ejecutar efectos externos.
- Las skills HyperFrames pueden actualizarse solo con aprobación explícita; durante renders reproducibles se usa la versión fijada del proyecto.

## Mapa rapido
- Tocar `wallets_ledger` o saldos -> `mesa-ledger-atomicity`.
- Policy nueva o tabla con datos sensibles del juego -> `supabase-rls-admin-blindness`.
- Endpoint, server action, formulario publico, upload, webhook -> `secure-defaults-pit-of-success`.
- Reconexion / ghost / `session_kick` / `onLeave` en Colyseus -> `colyseus-reconnection-ghost-recovery`.
- Logs/metricas/health en Colyseus -> `colyseus-room-observability`.
- Estado realtime, Presence, ioredis -> `colyseus-redis-realtime-states`.
- Race conditions multi-jugador en E2E -> `e2e-multiplayer-race-conditions`.
- Convertir replays en regresion -> `replay-regression-scenarios`.
- VPS / systemd / Caddy / Redis / secretos -> `vps-hardening-and-runtime-ops`.
- Plan de release con rollback -> `deployment-confidence-any-day`.
- Deploy a Vercel -> `deploy-to-vercel`.
- Acoplamiento entre apps/web y game-server -> `bounded-context-api-contracts`.
- Refactor que toca muchos archivos -> `change-friendly-design-etc`.
- Refactor quirurgico -> `refactor`.
- Plan multi-archivo de refactor -> `refactor-plan`.
- Error raro entre capas / cache stale -> `abstraction-leak-playbook`.
- Renombrar funciones, mejorar mensajes de error -> `naming-intention-and-error-messages`.
- Modulo legacy fragil sin tests -> `characterization-tests-legacy-flows`.
- Web Vitals / bundle / latencia de actions -> `performance-budget-and-web-vitals`.
- Commit, staging y mensaje -> `.github/instructions/commits.instructions.md` + `.opencode/agents/deploy-and-commit.md`.
- Decision arquitectonica / ADR / RFC -> `docs-as-code-adr-rfc-workflow`.
- Revisar PR generado con IA -> `ai-assisted-code-review-guardrails`.
- Documentar cambios en docs/ -> `update-docs`.
- Buscar docs externas (libs, SDKs, frameworks) -> `find-docs` + `ctx7` CLI.
- TDD red-green-refactor -> `test-driven-development`.
- UI/UX nueva o accesibilidad -> `frontend-design`, `tailwind-design-system`, `web-design-guidelines`.
- Auditar SEO -> `seo-audit`.
- Optimizar SEO on-page -> `seo`.
- Animaciones GSAP en React -> `gsap-core`, `gsap-react`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-performance`, `gsap-plugins`, `gsap-utils`.
- Validar webapp en navegador -> `agent-browser`, `webapp-testing`.
- Performance web (Core Web Vitals) -> `web-perf`.
- Composicion React escalable -> `vercel-composition-patterns`.
- Schemas Zod -> `zod`.
- Vitest (game-server tests) -> `vitest`.
- Turborepo (monorepo) -> `turborepo`.
- Express en game-server -> `nodejs-express-server`.
- Patrones Node.js -> `nodejs-backend-patterns`, `nodejs-best-practices`.
- Best practices Next.js -> `next-best-practices`.
- Cache components Next.js 16 -> `next-cache-components`.
- Upgrade Next.js -> `next-upgrade`.
- Postgres / Supabase performance -> `supabase-postgres-best-practices`.
- Cloudflare (Browser Rendering, dominio) -> `cloudflare`, `wrangler`.
- GitHub Actions CI -> `github-actions-docs`.
- Accesibilidad web -> `accessibility`.
- Playwright E2E -> `playwright-best-practices`.
- Buscar otra skill -> `find-skills`.

## Tier (importancia)
- A (criticas): `supabase-rls-admin-blindness`, `mesa-ledger-atomicity`, `secure-defaults-pit-of-success`, `colyseus-reconnection-ghost-recovery`, `colyseus-room-observability`, `colyseus-redis-realtime-states`, `e2e-multiplayer-race-conditions`, `replay-regression-scenarios`, `vps-hardening-and-runtime-ops`.
- B (calidad/arquitectura): `bounded-context-api-contracts`, `change-friendly-design-etc`, `abstraction-leak-playbook`, `naming-intention-and-error-messages`, `characterization-tests-legacy-flows`, `performance-budget-and-web-vitals`, `supabase-postgres-best-practices`.
- C (equipo/productividad): `docs-as-code-adr-rfc-workflow`, `deployment-confidence-any-day`, `ai-assisted-code-review-guardrails`, `deploy-to-vercel`.
- D (frontend/GSAP/UI): `gsap-core`, `gsap-react`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-performance`, `gsap-plugins`, `gsap-utils`, `tailwind-design-system`, `tailwind-css-patterns`, `frontend-design`, `web-design-guidelines`, `vercel-composition-patterns`.
- E (herramientas/testing): `playwright-best-practices`, `agent-browser`, `webapp-testing`, `vitest`, `zod`, `turborepo`, `web-perf`, `seo`, `seo-audit`, `accessibility`, `find-docs`, `test-driven-development`, `refactor`, `refactor-plan`, `update-docs`.
- F (infra/CI): `cloudflare`, `wrangler`, `github-actions-docs`, `next-best-practices`, `next-cache-components`, `next-upgrade`, `nodejs-express-server`, `nodejs-backend-patterns`, `nodejs-best-practices`.
