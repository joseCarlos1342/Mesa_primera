<!-- prettier-ignore -->
<div align="center">

<img src="apps/web/public/icon-192x192.png" alt="" align="center" height="96" />

# Mesa de Primera

*Multiplayer real-time card game engine for the traditional Spanish "Primera"*

[![Build Status](https://img.shields.io/github/actions/workflow/status/joseCarlos1342/Mesa_primera/main.yml?style=flat-square&label=Build)](https://github.com/joseCarlos1342/Mesa_primera/actions)
![Node version](https://img.shields.io/badge/Node.js-24%20LTS-3c873a?style=flat-square)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Colyseus](https://img.shields.io/badge/Colyseus-0.17-blue?style=flat-square)](https://colyseus.io)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-V4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](#features)

[Overview](#overview) · [Player Guide](docs/product/player/README.md) · [Admin Guide](docs/admin/README.md) · [Features](#features) · [Architecture](#architecture) · [Getting started](#getting-started) · [Project structure](#project-structure) · [Testing](#testing) · [Deployment](#deployment)

</div>

## Overview

Mesa de Primera digitizes the traditional Colombian card game "Primera" (Spanish deck) into a full-stack, real-time multiplayer platform. The game engine runs entirely server-side — clients are visual-only — ensuring fair play through cryptographic RNG and state isolation.

The platform serves two distinct user groups through a **Dual-UI** architecture:

- **Player App (PWA)** — Touch-first mobile interface with large tap targets, high contrast, and simplified flows. Designed for **older adults** following WCAG AAA guidelines.
- **Admin Dashboard** — Full management console for users, wallets, tables, and audit trails.

> [!TIP]
> Looking for the end-user walkthrough? Start with the [Guía del Jugador](docs/product/player/README.md), which covers the full player journey from registration to the game table.

> [!TIP]
> Looking for the backoffice and supervision flow? Use the [Guía Operativa del Admin](docs/admin/README.md) for the full admin journey from login to live operations.

> [!NOTE]
> Every visual choice — oversized buttons, bold typography, minimal navigation depth — is a deliberate accessibility decision for users with reduced visual acuity or fine motor difficulties.

## Features

**Authoritative Game Engine**
- Server-side logic via Colyseus rooms — the client never dictates game state
- Fisher-Yates shuffle with `crypto.randomBytes` RNG
- Automatic hand hierarchy enforcement (Segunda > Chivo > Primera > Puntos)
- 60-second reconnection grace period with Redis state snapshots

**Financial Integrity**
- Immutable ledger (`INSERT-ONLY`) — balance = `SUM(credits) - SUM(debits)`
- Atomic bet/payout/commission operations with Supabase RPCs
- Reconciliation tooling to detect drift

**Zero-Knowledge Security**
- Row Level Security (RLS) enforces **Admin Blindness**: admins cannot view active hands
- WebAuthn/passkey authentication alongside PIN + OTP
- Anti-collusion detection algorithms via scheduled cron analysis

**Real-Time Communication**
- LiveKit WebRTC voice chat with sub-100ms latency
- Socket.IO support channel and push notifications
- Game replay recording and playback

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                 │
│  ┌──────────────────┐          ┌──────────────────────────┐     │
│  │  Player PWA      │          │  Admin Dashboard         │     │
│  │  (Next.js 16)    │          │  (Next.js 16)            │     │
│  └────────┬─────────┘          └────────────┬─────────────┘     │
└───────────┼─────────────────────────────────┼───────────────────┘
            │ WebSocket + HTTPS               │ HTTPS
┌───────────▼─────────────────────────────────▼───────────────────┐
│                      Infrastructure                              │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Game Server      │  │  Redis 7     │  │  Supabase        │   │
│  │  (Colyseus)       │◄─┤  (Sessions)  │  │  (Postgres+RLS)  │   │
│  │  Port 2567        │  │  Port 6380   │  │  Auth + Storage  │   │
│  └──────────────────┘  └──────────────┘  └──────────────────┘   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │  LiveKit Cloud    │  │  BullMQ Workers (Cron, Replays)     │ │
│  │  (Voice WebRTC)   │  │  web-push (Notifications)           │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Frontend | Next.js 16, React 19, Tailwind V4 | SSR, PWA, Dual-UI |
| Game Engine | Colyseus 0.17 | Authoritative multiplayer rooms |
| Database | Supabase (PostgreSQL) | RLS, Auth (OTP + WebAuthn), Ledger |
| Cache | Redis 7 | Session persistence, reconnection snapshots |
| Voice | LiveKit | Real-time WebRTC audio |
| Jobs | BullMQ, node-cron | Replay cleanup, anti-collusion scans |
| Monorepo | Turborepo | Build orchestration, caching |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 24 LTS
- [pnpm](https://pnpm.io) 11
- [Docker](https://www.docker.com) (for Redis)
- A linked [Supabase](https://supabase.com) Cloud project

### Setup

```bash
# Clone and install
git clone https://github.com/joseCarlos1342/Mesa_primera.git
cd Mesa_primera
pnpm install

# Start Redis
docker-compose up -d

# Configure environment
cp apps/web/.env.example apps/web/.env.local
cp apps/game-server/.env.example apps/game-server/.env.local
# Edit both .env.local files with your Supabase, Redis, and LiveKit credentials

# Run linked Supabase Cloud migrations and regenerate types
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > apps/web/src/types/supabase.ts

# Start development (web + game server in parallel)
pnpm run dev

# Start local web + local Colyseus + local Redis,
# preserving the Supabase credentials already configured in each app
./dev.sh

# Optional: expose the local web temporarily through Cloudflare Quick Tunnel
CLOUDFLARE_TUNNEL=1 ./dev.sh
```

> [!TIP]
> The `pnpm run dev` command uses Turborepo to start both the Next.js app and the Colyseus game server concurrently.

> [!TIP]
> Use `./dev.sh` when you want to keep Supabase pointed at your existing cloud project but force the game engine and Socket.IO runtime to stay on `127.0.0.1` instead of any VPS URLs present in `.env.local`. If Docker is unavailable, the script falls back to a local `redis-server` process on port `6380` when that binary exists.

> [!NOTE]
> `CLOUDFLARE_TUNNEL=1 ./dev.sh` creates a temporary `trycloudflare.com` URL for the web on port `3000`. The URL is public and stops working when the script exits. Colyseus (`2567`) and Socket.IO (`2568`) remain local; this mode is intended for previewing the web, not for remote multiplayer sessions.

### Required environment variables

| Variable | Description |
| :--- | :--- |
| `REDIS_URL` | Redis connection string (default port `6380`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `APP_URL` | Canonical web origin used in signed admin recovery/email links |
| `NEXT_PUBLIC_GAME_SERVER_URL` | Colyseus server URL |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile public site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key (server-side verification) |
| `TWILIO_*` | Twilio credentials for SMS/OTP |
| `LIVEKIT_*` | LiveKit credentials for voice chat |

> [!NOTE]
> Admin password recovery and email-change emails use `APP_URL` as the canonical origin for signed links. Set it to your public web domain and make sure the same origin is allowlisted in Supabase Auth redirect URLs.

## Project structure

```
Mesa_primera/
├── apps/
│   ├── web/                    # Next.js 16 frontend
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (admin)/    # Admin dashboard routes
│   │       │   ├── (auth)/     # Login, register, MFA, WebAuthn
│   │       │   ├── (player)/   # Player-facing pages
│   │       │   ├── (legal)/    # Terms, privacy
│   │       │   ├── play/[id]/  # Live game table
│   │       │   └── actions/    # Server actions
│   │       ├── components/     # React components
│   │       ├── hooks/          # Custom hooks
│   │       └── lib/            # Utilities
│   └── game-server/            # Colyseus game engine
│       └── src/
│           ├── rooms/          # MesaRoom (game logic)
│           ├── schemas/        # State sync schemas
│           ├── services/       # Supabase, Replay services
│           ├── workers/        # Background jobs
│           └── cron/           # Anti-collusion scheduler
├── packages/
│   ├── eslint-config/          # Shared lint rules
│   ├── typescript-config/      # Shared TS configs
│   └── ui/                     # Shared component library
├── supabase/
│   └── migrations/             # 40+ SQL migrations (RLS, RPCs, Ledger)
├── e2e/                        # Playwright E2E tests
└── replays/                    # Game replay archive
```

## Testing

The project uses three testing layers:

```bash
# Unit tests — Web (Jest 30)
pnpm --filter web test

# Coverage — Web
pnpm --filter web test:coverage

# Unit tests — Game Server (Vitest 4)
pnpm --filter game-server test

# Coverage — Game Server
pnpm --filter game-server test:coverage

# End-to-end (Playwright)
pnpm exec playwright test
```

E2E suites cover:

| Suite | What it verifies |
| :--- | :--- |
| `admin-blindness` | RLS prevents admin from seeing active player hands |
| `gameplay` | Table join, lobby state, disconnection recovery |
| `security` | Rate limiting (50 rapid clicks), device fingerprinting |
| `social` | Leaderboard rendering, friends system, auth gates |

> [!IMPORTANT]
> Los gates ejecutables son: web `99%` statements/lines, `91%` branches y `98%` functions; game-server `89%` statements/functions, `80%` branches y `90%` lines. La cobertura no sustituye pruebas de integración para RLS, atomicidad financiera o reconexión real.

## Deployment

| Component | Platform |
| :--- | :--- |
| Frontend (Next.js) | **Vercel** |
| Game Server (Colyseus) | **VPS** (Docker + systemd) |
| Database | **Supabase Cloud** |
| Redis | **VPS** (Docker, port 6380) |
| Voice | **LiveKit Cloud** |

```bash
# Deploy database migrations to production
pnpm exec supabase db push

# Build for production
pnpm --filter web build
```

> [!CAUTION]
> Always run `pnpm exec supabase db push` before deploying frontend changes that depend on new migrations.

Un cron job ejecuta esta verificación cada hora. Cualquier discrepancia bloquea automáticamente las transacciones del sistema y alerta al administrador.

---
*© 2026 Mesa de Primera. Desarrollado con excelencia técnica para la Hackatón CubePath 2026.*
