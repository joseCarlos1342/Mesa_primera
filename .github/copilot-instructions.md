# Copilot Instructions — Mesa Primera

## Project Overview

**Mesa Primera** is a real-time multiplayer card game platform for the traditional Spanish card game "Primera." It features a dual-UI (Player PWA + Admin Dashboard), an authoritative Colyseus game engine, and bank-grade security with an immutable financial ledger.

---

## Repository Structure

Turbo monorepo with two apps and three shared packages:

- `apps/web` — Next.js 16 (App Router), Player PWA + Admin Dashboard
- `apps/game-server` — Colyseus 0.17 authoritative game engine + Socket.IO chat
- `packages/ui` — Shared React components (`@repo/ui`)
- `packages/typescript-config` — Shared tsconfig (`@repo/typescript-config`)
- `packages/eslint-config` — Shared ESLint rules (`@repo/eslint-config`)

---

## Commands

### Dev
```bash
npm run dev           # Start web + game-server concurrently
npm run dev:web       # Web only (localhost:3000)
npm run dev:game      # Game server only (localhost:2567)
docker-compose up -d  # Start Redis (required; mapped to port 6380)
```

### Build & Type Check
```bash
turbo build           # Build all workspaces in dependency order
turbo check-types     # TypeScript check all workspaces (tsc --noEmit)
turbo lint            # ESLint all workspaces
```

### Testing

**Web (Jest 30):**
```bash
# From apps/web/
npm run test                                          # All unit tests
npm run test -- src/__tests__/actions/wallet.test.ts  # Single file
npm run test -- --testNamePattern="pattern"           # Single test by name
npm run test:coverage                                  # Coverage report
```

**Game Server (Vitest 4):**
```bash
# From apps/game-server/
npm run test                                    # All unit tests
npm run test -- src/rooms/__tests__/MesaRoom.test.ts  # Single file
npm run test -- --grep "pattern"               # Single test by name
npm run test:coverage
```

**E2E (Playwright):**
```bash
# From repo root
npx playwright test                             # All E2E
npx playwright test e2e/gameplay.spec.ts --headed  # Single spec
```

### Database (Supabase CLI)
```bash
npx supabase migration new <name>       # Create new migration
npx supabase db reset                   # Apply all migrations locally
npx supabase db push                    # Push to staging
npx supabase gen types typescript --local > apps/web/src/types/supabase.ts
npx supabase inspect db                 # Performance inspection
```

---

## Architecture

### Dual-UI Routing (Next.js App Router)
Routes are segmented by route groups inside `apps/web/src/app/`:
- `(player)/` — Player PWA (game lobby, wallet, friends, support)
- `(admin)/` — Admin dashboard (deposits, withdrawals, users, tickets)
- `(auth)/` — Authentication flows

### Authentication
- **Players:** SMS OTP via Twilio (6-digit code, `TOTP_VALIDITY_MINUTES`)
- **Admins:** Email + TOTP MFA (two-factor, verified via Supabase `listFactors → challenge → verify`)
- Every server action must validate auth with `supabase.auth.getUser()` before processing

### Game Server
- `apps/game-server/src/rooms/MesaRoom.ts` — Core Colyseus room: authoritative game state, message handlers, reconnection grace period (60s)
- `apps/game-server/src/services/socket.ts` — Socket.IO namespaces for chat, support tickets, notifications
- Game state is synced to all clients via Colyseus state synchronization; Redis caches room snapshots for reconnection

### Server Actions & API
- `apps/web/src/app/actions/` — All Next.js server actions (wallet, deposits, withdrawals, admin)
- `apps/web/src/app/api/` — REST API routes (LiveKit token, webhooks)
- Server actions must stay ≤50 lines; extract helpers into `src/lib/` or `src/utils/`

### Financial Ledger
- Every transaction inserts a row into `wallets_ledger` (INSERT-only, no UPDATE/DELETE)
- Wallet balance = `SUM(credits) - SUM(debits)` from the ledger, not stored directly
- Hourly cron validates: `SUM(wallets.balance) === SUM(ledger.credits) - SUM(ledger.debits)`
- RNG for card shuffling uses `crypto.randomBytes` (Fisher-Yates)

### Security — Admin Blindness
- RLS policies prevent admins from seeing game state during active games
- When adding tables that contain game state, always add the corresponding admin-blindness RLS policy

### RLS (Row-Level Security)
- Every table has RLS policies. After each migration, verify policies manually
- Test both positive access (user can see their own data) and negative access (user cannot see others' data)
- SQL test files go in `supabase/tests/<migration_name>.test.sql`

---

## Key Conventions

### Naming
| Item | Convention | Example |
|------|-----------|---------|
| Files | `kebab-case` | `auth-actions.ts`, `use-fingerprint.ts` |
| Components | `PascalCase` | `WalletPage`, `AdminDepositsPanel` |
| Functions | `camelCase` | `getWalletData()`, `processTransaction()` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_DEPOSIT_AMOUNT` |
| Types/Interfaces | `PascalCase` | `WalletData`, `TransactionStatus` |

### Path Aliases
- `@/` maps to `apps/web/src/`

### Code Quality
- No `any` types — use Context7 to find correct types if unsure
- No `console.log` in production — use Pino logger
- Components ≤150 lines; extract sub-components if exceeded
- Server actions ≤50 lines; extract helpers if exceeded

### Documentation
- All public functions/hooks/components must have JSDoc/TSDoc
- Document the *why*, not the *what*, in inline comments

### Commits (Conventional Commits, in Spanish)
```
feat(auth): implementar login con OTP via SMS
fix(wallet): corregir cálculo de saldo (#42)
```
Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
Max 72 chars on first line. Reference issues when applicable.

### Test Coverage Minimums
- Server Actions: 80%
- Hooks & Utilities: 90%
- E2E: Every critical business flow has at least one test

### Test File Location
Tests live in a `__tests__/` subdirectory adjacent to the file being tested:
```
src/app/actions/wallet.ts
src/app/actions/__tests__/wallet.test.ts
```

### Git Branching
```
main               ← Stable production
feat/sprint-N-*    ← Sprint feature branches
fix/*              ← Hotfixes (merge directly to main)
docs/*             ← Documentation-only changes
```

---

## Environment Variables

Copy `.env.example` to `.env.local`. Required variables:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
REDIS_URL=redis://localhost:6380
GAME_SERVER_PORT=2567
GAME_SERVER_URL=http://localhost:2567
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

---

## MCP Servers & Skills

Before implementing features using Next.js, Supabase, Tailwind, or Colyseus APIs, use **Context7 MCP** to retrieve up-to-date documentation and avoid hallucinated APIs.

Available local skills (use before writing related code):
- `vercel-react-best-practices` — Server/Client Components, data fetching patterns
- `tailwind-design-system` — Tailwind v4 CSS variables, responsive patterns
- `supabase-postgres-best-practices` — RLS patterns, index recommendations, query optimization
- `frontend-design` — High-quality component design
- `javascript-typescript-jest` — Test structure and patterns

Use **Twilio MCP** (`ListMessage`, `FetchMessage`) to debug OTP delivery issues.

---

## Sprint Workflow

1. **Plan**: Read tasks from `plan_primera.md`, consult Context7 for relevant APIs
2. **Implement**: One commit per logical unit, write tests alongside code
3. **Verify**: `turbo check-types`, full test suite, migration smoke-test on staging, RLS audit
4. **Merge**: All tests pass → PR → merge → update `docs/` and CHANGELOG

**Definition of Done:** Code ✓ | Unit tests ✓ | E2E tests ✓ | JSDoc ✓ | `tsc --noEmit` clean ✓ | No Supabase security warnings ✓ | CHANGELOG updated ✓
