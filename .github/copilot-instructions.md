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
- **Technical Docs**: Always refer to `.github/rules/context7.md` for current documentation standards and framework usage (Supabase, Colyseus, Next.js).
- **Agent Skills**: Reference `.agents/skills/find-docs/SKILL.md` for advanced search and documentation retrieval patterns.
- **MCP Enforcement**: All financial operations must follow the atomic Ledger pattern defined specifically in `@plan_primera.md`.

