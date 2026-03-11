# Changelog

All notable changes to this project will be documented in this file.

## [Sprint 6] - 2026-03-10

### Added

- Friends System: UI to manage friends, including searching for users (minimum 3 characters), sending requests, and accepting/rejecting/canceling pending requests. Backend server actions powered by Supabase `friendships` table.
- Leaderboard ("Salón de la Fama"): Fully functional leaderboard with 3 distinct categories ("Mejores Ganancias", "Mejor Racha", and "Maestro de Primera") powered by a unified `get_leaderboard` Supabase RPC.
- Player Statistics Dashboard: A comprehensive `/stats` page showing overall Win Rate, Net Balance, Best Streak (Racha), and specific tracking for special card combinations ("Primera", "Chivo", "Segunda").
- Visual Evolution Chart: A CSS-based vertical bar chart displaying the simulated recent transaction history of the player.
- E2E Tests: Playwright scripts to ensure correct rendering and authorization handling of all social pages (`/friends`, `/leaderboard`, `/stats`).
- Automated Game Analytics: The Game Server (`MesaRoom.ts`) now automatically detects the winner and calculates the rake, invoking `SupabaseService` to permanently update player statistics post-match.
- Basic Anti-Collusion System: A cron job operating every 2 hours that detects potential chip dumping by querying users who play together aggressively, logging a warning into `admin_audit_log`.

## [Sprint 4] - 2026-03-08

### Added

- Dashboard admin: Real-time metrics, active games, pending deposits, and Ledger consistency checks.
- Table Management (Admin): Ability to pause, force-close tables, and evict players as a silent observer.
- User Management: Listing with banning/unbanning features, integrated with Colyseus to drop connections.
- Suspicious Device Detection: Flagging users sharing the same fingerprint.
- Ledger Viewer: Comprehensive, filterable, and read-only view of all financial transactions (`apps/web/src/app/(admin)/admin/ledger`).
- Rules Editor: Real-time markdown editor modifying global `site_settings`.
- Scheduled Jobs: A monolithic hourly cron job in the game server verifying Ledger integrity.
- Structured Logging: Pino logger implemented across Next.js Server Actions and Colyseus.

### Changed

- Refactored Supabase policies (RLS) and Server Actions to securely bypass infinite recursion loops when computing `admin` roles, using `SECURITY DEFINER` functions.
- Migrated phone numbers from the private `auth.users` to the public `profiles` table to correctly display them in the admin dashboard.

## [Sprint 3] - 2026-03-07

### Added

- Top-down progressive web app (PWA) table interface.
- Complete set of Spanish suited cards (Naipes) injected as SVG assets.
- Interactive animations for distributing, flipping, and moving cards.
- Core UI buttons: Big "VOY" and "PASO" buttons with haptic feedback and distinct colors.
- Interactive token betting interface.
- Automatic point calculation side-panel.
- Player badges with status, timebank indicator, and action notifications.
- Complete responsive mobile design and logic.
- Real-time `site_settings` synchronization allowing the clients to read standard playing rules dynamically.

## [Sprint 2] - 2026-03-07

### Added

- Core Lobby System: Live table listing, player seating logic, and room creation via Colyseus.
- Game Engine: Full `MachineState` representing the phases of "Primera" card game.
- 28-card Fisher-Yates cryptographically secure random number generation (RNG).
- Draw phase, Flop phase (2 cards dealt), and Turn phase (2 more cards).
- Betting phase (Guerra Principal) resolving calls, passes, and pots.
- Showdown logic combining hand evaluations and game hierarchy rules to define winners.
- Automatic 5% Rake extraction on pots sending the rake trace to the immutable Ledger.
- Advanced Colyseus `@filter` state decorators strictly sending players only their own private cards.
- Auto-reconnection graceful handling holding spots for 60 seconds with offline cues.

## [Sprint 1] - 2026-03-06

### Added

- Login OTP SMS for players via Supabase Auth.
- Validation and routing for email + 2FA TOTP (Google Authenticator) for admins.
- Player Wallet page with balance and integrated Ledger history.
- Withdrawal flow validating external bank entity formats (Nequi, etc).
- Pending Deposits/Withdrawals initial data architectures.
- Heavy dual-routing middleware isolating `(player)` layer from `(admin)` layer in Next.js.
- Rate limiting anti-fraud module using Redis sliding windows (`utils/redis.ts`).
- Basic device fingerprinting storing records in `user_devices`.
