# AGENTS.md — Mesa Primera

## Commands

```bash
# Runtime y gestor de paquetes canonicos
# Node.js 24 LTS
# pnpm 11

# Dev (starts web :3000 + game-server :2567 + socket :2568 + Redis :6380)
./dev.sh
# Dev visible desde la red local actual (detecta automaticamente la IP LAN)
./dev.sh
# Si necesitas forzar una IP publica concreta para la red local:
PUBLIC_DEV_HOST=192.168.1.74 ./dev.sh
# Or using turbo (does not override VPS URLs in .env.local):
pnpm run dev

# Dependencias
pnpm install
pnpm add <paquete> --filter web
pnpm update --filter web <paquete>
pnpm outdated --filter web
pnpm audit

# Tests
pnpm --filter web test                     # Jest 30 (jsdom, next/jest)
pnpm --filter game-server test             # Vitest 4 (node env)
pnpm --filter web test:coverage            # Threshold: 38% (statements/branches/lines)
pnpm --filter game-server test:coverage    # Threshold: 75% lines, 65% branches
pnpm exec playwright test                  # E2E (requires running services)

# Lint & typecheck (run before committing)
pnpm --filter web lint
pnpm exec tsc --noEmit -p apps/web/tsconfig.json
pnpm exec tsc --noEmit -p apps/game-server/tsconfig.json

# Database
# La fuente de verdad es el proyecto remoto de Supabase Cloud. No usamos
# `supabase start`, contenedores Docker ni `supabase db reset` localmente.
# Usar Supabase CLI enlazado al proyecto remoto para migraciones y tipos.
pnpm exec supabase migration new <name>
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > apps/web/src/types/supabase.ts
```

# Mesa Primera - Reglas globales (nucleo)

> Este archivo es el nucleo minimo. El detalle vive en `.github/instructions/*.instructions.md`
> y se carga automaticamente cuando se trabaja en cada area (segun `applyTo`).
> No dupliques contenido aqui: si una regla aplica solo a un dominio, va al instruction file correspondiente.

## 1. Principios
- Hablamos espanol con el usuario y en commits/docs.
- Implementar; no solo sugerir. Investigar lo necesario y proceder.
- Cambios pequenos, reversibles y enfocados en lo pedido.
- No archivos nuevos por defecto: editar lo existente.
- Usamos `pnpm` como gestor unico de paquetes y `Node.js 24 LTS` como runtime canonico.
- Sin secretos en el repo, sin `console.log` en produccion, sin `any` injustificado.
- Verificar antes de cerrar (lint/typecheck/tests del area afectada).

## 2. Regla de oro (Mesa Primera)
- **Admin Blindness**: el admin NO accede a estado activo de juego. RLS deny-by-default.
- **Ledger inmutable**: `wallets_ledger` es INSERT-only. Balance = `SUM(credits) - SUM(debits)`. Toda operacion financiera atomica + idempotente.
- **Reconexion 60s**: salas Colyseus con grace de 60s, match por `userId`, sin ghost players.
- **Dual-UI estricto**: `apps/web/src/app/(player)` (PWA) vs `apps/web/src/app/(admin)` (Dashboard).
- **Design System como fuente de verdad**: cada interfaz tiene su `DESIGN.md` validado por el CLI de Google. El agente DEBE leerlo antes de crear o modificar componentes UI.

## 3. Stack
- Monorepo Turbo. Web: Next.js 16 / React 19 / Tailwind 4 / Jest 30. Game: Colyseus + Vitest 4. DB: Supabase Cloud + Postgres + RLS (sin instancia local). Realtime: Redis 7 (`:6380`). E2E: Playwright. VPS con Caddy + systemd.

## 4. CLI, Ops y Skills
* **CLIs y gotchas del VPS** (puerto Redis 6380, versiones de herramientas): ver `.github/instructions/deploy-ops.instructions.md`.
* **Skills**: `.agents/skills/<name>/SKILL.md`. Para elegir la correcta, ver `.github/instructions/skills-catalog.instructions.md`.

## 5. Indice de instrucciones por dominio
- Commits: `.github/instructions/commits.instructions.md`
- Web (Next.js/React/Tailwind): `.github/instructions/web-next.instructions.md`
- Game server (Colyseus/Redis): `.github/instructions/game-server.instructions.md`
- Supabase / SQL / RLS / Ledger: `.github/instructions/supabase-rls.instructions.md`
- Testing (Jest, Vitest, Playwright): `.github/instructions/testing.instructions.md`
- Deploy / Ops / CI: `.github/instructions/deploy-ops.instructions.md`
- Documentacion viva: `.github/instructions/docs-living.instructions.md`
- Catalogo de skills: `.github/instructions/skills-catalog.instructions.md`

## 6. Otros archivos clave
- `.github/copilot-instructions.md` - resumen always-on para Copilot.
- `.github/rules/context7.md` - como usar `ctx7` para docs externas.
- `plan_primera.md` - plan canonico del producto y reglas financieras de alto nivel.
- `AGENTS.md` (este archivo) - convenciones para agentes externos.

## 7. Design System (DESIGN.md)

Mesa Primera adopta el formato [**DESIGN.md**](https://github.com/google-labs-code/design.md) de Google Labs como fuente de verdad visual para agentes de codigo. Cada interfaz tiene su propio archivo `DESIGN.md` que define tokens de diseno (colores, tipografia, espaciado, componentes) + razon de diseno en markdown.

### Archivos

| Interfaz | Fuente de verdad | CSS de tema (Tailwind v4) | Layout que lo carga |
|---|---|---|---|
| Player (casino/poker) | `apps/web/src/design/DESIGN-player.md` | `apps/web/src/app/(player)/player.css` | `(player)/layout.tsx` |
| Admin (oscuro/corporativo) | `apps/web/src/design/DESIGN-admin.md` | `apps/web/src/app/(admin)/admin/admin.css` | `(admin)/admin/layout.tsx` |

### Reglas para agentes

- **Antes de crear o modificar cualquier componente UI**, leer el `DESIGN.md` de la interfaz correspondiente.
- **No mezclar mundos visuales**: los colores dorados/verdes del player NO van en el admin; los colores indigo/funcionales del admin NO van en el player.
- **Usar los tokens exportados** en los CSS de tema (ej: `bg-primary`, `text-text-primary`, `radius-card`).
- **Validar cambios** con `pnpm --filter web run design:lint` antes de commitear.
- **Instalar, agregar y actualizar dependencias** con `pnpm`; no usar `npm` ni `npx` para ese flujo.

### CLI de DESIGN.md

```bash
pnpm --filter web run design:lint:player   # Valida DESIGN-player.md
pnpm --filter web run design:lint:admin    # Valida DESIGN-admin.md
pnpm --filter web run design:lint          # Valida ambos
```

## 8. Flujo recomendado por tarea
1. Identificar dominio -> el instruction file correspondiente se cargara solo.
2. Cargar la skill que aplique (ver `skills-catalog.instructions.md`).
3. Si toca docs externas (libs/SDK/CLI): usar la skill `find-docs` o el CLI `ctx7` directamente (ya configurado globalmente con API key).
4. **Si toca UI**: leer el `DESIGN.md` correspondiente (`player` o `admin`) antes de escribir componentes.
5. Implementar con tests cuando sea relevante.
6. Validar (lint/typecheck/tests del area). Si se toco un `DESIGN.md`, correr `pnpm --filter web run design:lint`.
7. Commit en espanol siguiendo `commits.instructions.md`.
