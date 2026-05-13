# Guía de Testing — Mesa Primera

## Stack de Testing

| Tipo           | Herramienta                    | Propósito                        |
| -------------- | ------------------------------ | -------------------------------- |
| Unit Tests     | Vitest + React Testing Library | Hooks, utils, componentes client |
| Server Actions | Vitest + mocks                 | Lógica de negocio server-side    |
| E2E Tests      | Playwright                     | Flujos completos de usuario      |
| SQL/RLS Tests  | Supabase CLI                   | Políticas de acceso y seguridad  |

## Comandos

```bash
# Unit tests
npm run test              # Ejecutar todos los tests
npm run test:watch        # Watch mode para desarrollo
npm run test:coverage     # Con reporte de cobertura

# E2E tests
npm run test:e2e          # Ejecutar Playwright
npm run test:e2e:ui       # Modo visual de Playwright
```

## Estructura de Tests

Tests se colocan junto al código que prueban, en carpetas `__tests__/`:

```
src/
├── hooks/
│   ├── useFingerprint.ts
│   └── __tests__/
│       └── useFingerprint.test.ts
├── app/
│   ├── actions/
│   │   ├── wallet.ts
│   │   └── __tests__/
│   │       └── wallet.test.ts
```

## Ejemplo de Unit Test (Vitest)

```typescript
import { expect, test, describe, vi } from "vitest";
import { render, screen } from "@testing-library/react";

describe("WalletPage", () => {
  test("muestra saldo correctamente", async () => {
    // ...
  });

  test("muestra mensaje cuando no hay transacciones", () => {
    // ...
  });
});
```

## Ejemplo de E2E Test (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test("jugador puede ver su wallet", async ({ page }) => {
  await page.goto("/login/player");
  await page.fill('[name="phone"]', "+5491112345678");
  await page.click('button[type="submit"]');
  // ... verificar OTP, redirigir a wallet
});
```

## Cobertura Mínima

- Server Actions: **80%**
- Hooks y Utilidades: **90%**
- E2E: Cada flujo crítico tiene **al menos 1 test**

## Estado Actual de Cobertura (MesaRoom)

Actualizado: **2026-04-19**

Se realizó una expansión de la suite de pruebas del Game Server para `MesaRoom.ts` con foco en ramas profundas, guards de mensajes, flujos de reinicio/reapertura de pique y resolución anticipada de mano.

### Resultado verificado

- Tests totales del archivo: **531 passed (531)**
- Archivo objetivo: `apps/game-server/src/rooms/MesaRoom.ts`
- Statements: **98.51%**
- Branches: **87.33%**
- Functions: **100%**
- Lines: **99.18%**

### Comando usado

```bash
cd apps/game-server
npx vitest run src/rooms/__tests__/MesaRoom.test.ts --coverage
```

### Nota sobre branches

En el reporte de V8 existen múltiples branch arms implícitos sin línea asociada (`L0-L0`). Esas ramas no son direccionables de forma directa con tests de comportamiento, por lo que el porcentaje de branches tiene un techo práctico menor al de statements/lines/functions en este archivo.

## Broadcast System Tests

### Web (`apps/web`)
- `__tests__/actions/admin-broadcast.test.ts` — Orchestrator tests: auth guard, type validation, audience resolution, cooldown/idempotency, history aggregation.
- `__tests__/game-zoom-accessibility.test.tsx` — PermissionsGate blocks when push not ready, renders when pushReady=true.

### Game Server (`apps/game-server`)
- Push worker: retry/backoff (3 attempts, exponential 2s), stale subscription cleanup on 404/410, delivery tracking in `broadcast_deliveries`.

### Key Scenarios
1. Admin sends broadcast → persisted in `broadcast_messages` + per-user `notifications` + `broadcast_deliveries`
2. Cooldown prevents duplicate sends within 30s window
3. Socket.IO delivers in real-time, Supabase Realtime deduplicates via `broadcastId`
4. Push worker retries failed jobs, removes expired subscriptions
5. PermissionsGate blocks player access until push subscription is active
