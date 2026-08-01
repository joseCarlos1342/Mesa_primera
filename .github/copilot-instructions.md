# Copilot Instructions — Mesa Primera

## Commands
```bash
pnpm run dev           # Start web + game-server (Redis on :6380)
# Web (Jest 30)
pnpm --filter web test
# Web coverage
pnpm --filter web test:coverage
# Game Server (Vitest 4)
pnpm --filter game-server test
# Game server coverage
pnpm --filter game-server test:coverage
# E2E (Playwright)
pnpm exec playwright test
# Database
pnpm exec supabase migration new <name>
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > apps/web/src/types/supabase.ts
```

## Architectural Decisions
- **Admin Blindness**: RLS must prevent admins from viewing active game state.
- **Financial Ledger**: `wallets_ledger` is INSERT-only (immutable). Balance = `SUM(credits) - SUM(debits)`.
- **Dual-UI**: `apps/web/src/app/(player)` for PWA, `/(admin)` for Dashboard.
- **Reconnection**: Colyseus rooms have a 60s grace period.

## Conventions
- **Commits**: Spanish Conventional Commits (`feat(auth): mensaje`, `fix(game): mensaje`).
- **Files/Types**: `kebab-case` for files, `PascalCase` for Components/Types.
- **Testing**: Tests in `__tests__/` adjacent to source. Effective gates are web `99/91/98/99` and game-server `89/80/89/90` (statements/branches/functions/lines).

## Environment & Tools
- **Required**: `REDIS_URL` (port 6380), `GAME_SERVER_URL`, `TWILIO_*`, `LIVEKIT_*`.
## Project Context & Rules
- **Domain Rules**: Detailed rules live in `.github/instructions/*.instructions.md` and load automatically by `applyTo` (web, game-server, supabase, testing, deploy-ops, docs, commits, skills-catalog). Read those before working in each area.
- **Core Rulebook**: `.cursorrules` holds the slim global core (principles, golden rule, index).
- **Technical Docs**: Always refer to `.github/rules/context7.md` for fetching current external library/SDK/CLI documentation via `ctx7`.
- **Skills Catalog**: See `.github/instructions/skills-catalog.instructions.md` to pick the right skill per task. Use `find-docs` for external docs, `test-driven-development` before implementing, `git-commit` for commits, and `update-docs` for documentation sync.
- **MCP Enforcement**: All financial operations must follow the atomic Ledger pattern defined in `@plan_primera.md` and `.github/instructions/supabase-rls.instructions.md`.
