---
applyTo: "apps/game-server/**"
description: "Reglas para el game server con Colyseus, RedisPresence, MesaRoom, reconexion y replays."
---

# Game Server - Colyseus / Redis

## Stack confirmado
- Colyseus + `@colyseus/redis-driver` + RedisPresence + `ioredis`.
- Redis local en puerto `6380` (`docker-compose.yml`).
- Tests con Vitest 4 (`apps/game-server`).

## Reglas de dominio
- Politica de reconexion: 60s de gracia (`allowReconnection`).
- Match de rejoin por `userId` estable, no por `sessionId`.
- En `consented === true`: cleanup inmediato, sin grace.
- En timeout: liberar asiento, emitir `session_kick`, ejecutar side-effects (refund/turn skip) exactamente una vez.
- Sin ghost players en `state.players` tras desconexion.

## Observabilidad
- Logs JSON con campos disponibles: `ts`, `level`, `msg`, `roomId`, `sessionId`, `userId`, `event`, `phase`, `latencyMs`, `errCode`.
- `sessionId` y `userId` son opcionales cuando no existan o puedan aumentar PII/cardinalidad; nunca registrar secretos, tokens ni cartas privadas.
- Sin `console.log` de debug en produccion.
- Lifecycle counters: `room_created_total`, `room_disposed_total`, `reconnect_success_total`, `reconnect_timeout_total`.

## Replays y regresion
- Replays en `replays/YYYY-MM/`. Cada bug fijado debe convertirse en test de regresion deterministico (sin `Date.now()`, RNG seedeado).
- Registrar escenarios en `docs/game/GAME_SCENARIOS.md` con ID, regla, logica del servidor, ejemplo y tests.
- Versionar el motor en `docs/game/MESA_VERSIONS.md` (PATCH visual, MINOR escenario, MAJOR regla fundamental).

## Skills a cargar segun tarea
- Estado realtime, Presence, driver, ioredis: `colyseus-redis-realtime-states`.
- Reconexion / ghost / `session_kick` / `onLeave`: `colyseus-reconnection-ghost-recovery`.
- Logs/metricas/health en rooms: `colyseus-room-observability`.
- Race conditions multijugador en E2E: `e2e-multiplayer-race-conditions`.
- Validar motor con replays: `replay-regression-scenarios`.
- Incidentes que cruzan capas: `abstraction-leak-playbook`.

## Comandos
- `pnpm --filter game-server dev`
- `pnpm --filter game-server test`
- `pnpm exec tsc --noEmit -p apps/game-server/tsconfig.json`
