# Copilot Instructions — Mesa Primera

## Commands
```bash
npm run dev           # Start web + game-server (Redis on :6380)
# Web (Jest 30)
npm run test -- apps/web
# Game Server (Vitest 4)
npm run test -- apps/game-server
# E2E (Playwright)
npx playwright test
# Database
npx supabase migration new <name>
npx supabase db reset && npx supabase gen types typescript --local > apps/web/src/types/supabase.ts
```

## Architectural Decisions
- **Admin Blindness**: RLS must prevent admins from viewing active game state.
- **Financial Ledger**: `wallets_ledger` is INSERT-only (immutable). Balance = `SUM(credits) - SUM(debits)`.
- **Dual-UI**: `apps/web/src/app/(player)` for PWA, `/(admin)` for Dashboard.
- **Reconnection**: Colyseus rooms have a 60s grace period.

## Conventions
- **Commits**: Spanish Conventional Commits (`feat(auth): mensaje`, `fix(game): mensaje`).
- **Files/Types**: `kebab-case` for files, `PascalCase` for Components/Types.
- **Testing**: Tests in `__tests__/` adjacent to source. Min 80% coverage for actions.

## Environment & Tools
- **Required**: `REDIS_URL` (port 6380), `GAME_SERVER_URL`, `TWILIO_*`, `LIVEKIT_*`.
## Project Context & Rules
- **Domain Rules**: Detailed rules live in `.github/instructions/*.instructions.md` and load automatically by `applyTo` (web, game-server, supabase, testing, deploy-ops, docs, commits, skills-catalog). Read those before working in each area.
- **Core Rulebook**: `.cursorrules` holds the slim global core (principles, golden rule, index).
- **Technical Docs**: Always refer to `.github/rules/context7.md` for fetching current external library/SDK/CLI documentation via `ctx7`.
- **Skills Catalog**: See `.github/instructions/skills-catalog.instructions.md` to pick the right skill per task. Use `find-docs` for external docs, `test-driven-development` before implementing, `git-commit` for commits, and `update-docs` for documentation sync.
- **MCP Enforcement**: All financial operations must follow the atomic Ledger pattern defined in `@plan_primera.md` and `.github/instructions/supabase-rls.instructions.md`.

