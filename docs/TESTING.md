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
