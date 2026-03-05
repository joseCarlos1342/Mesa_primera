# Changelog

Todos los cambios notables del proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sprint 1] - 2026-03-04

### Added

- Login OTP SMS para jugadores (Supabase Auth)
- Login email + 2FA TOTP para admin con verificación MFA
- Página de verificación MFA (`/login/admin/mfa`)
- Registro simplificado con auto-creación de usuario
- Device fingerprinting (hook `useFingerprint` + server action `registerDevice`)
- Middleware de protección de rutas (player vs admin con query a `profiles.role`)
- Página Wallet: saldo disponible + historial del Ledger
- Flujo de depósito: monto + comprobante imagen → Supabase Storage
- Admin: Bandeja de depósitos pendientes (aprobar/rechazar)
- Flujo de retiro: solicitud con datos bancarios + validación saldo
- Admin: Cola de retiros pendientes (procesar/anular)
- Server actions: `wallet.ts`, `admin-wallet.ts`, `withdrawals.ts`, `anti-fraud.ts`

### Fixed

- `useFingerprint.ts`: bug IntBridge (usaba variable antes de declararse)
- `deposits/page.tsx`: import inexistente `processDeposit` → `processTransaction`
- Middleware: admin role check estaba comentado, activado con query a DB
- `wallet.ts`: `createDepositRequest` no guardaba `user_id` en transacciones
- `wallet/page.tsx`: botón "Retirar" era `<button>` sin navegación → `<Link>`
- `auth-actions.ts`: admin login sin paso 2FA TOTP, ahora completo

## [Sprint 0] - 2026-03-03

### Added

- Repositorio GitHub inicializado
- Next.js 16 + TypeScript + TailwindCSS 4 + App Router
- Estructura Dual-UI: `(player)` y `(admin)` route groups
- Colyseus Game Server (separado en `apps/game-server`)
- Express 5 + Socket.IO v4 (chat/notificaciones)
- Redis (docker-compose + ioredis)
- BullMQ (cola de trabajos con worker ledger)
- Proyecto Supabase `mesa-primera` (DB + Auth + Storage)
- 15 tablas con migraciones SQL
- RLS policies completas con ceguera del admin
- Conventional Commits (husky + commitlint)
- CI/CD con GitHub Actions
- PWA configurada (manifest + next-pwa + iconos 192/512)
- `.gitignore` seguro (agents, IDE, secrets excluidos)
