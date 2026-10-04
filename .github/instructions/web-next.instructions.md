---
applyTo: "apps/web/**"
description: "Reglas para Next.js 16 (App Router), React 19, Tailwind 4, server actions, auth Supabase y UI del PWA y admin."
---

# Web - Next.js / React / Tailwind

## Stack confirmado
- Next.js `16.1.x`, React `19`, Tailwind CSS `4`, Jest `30`.
- Supabase Auth con proveedor `twilio_verify` (configurado en `supabase/config.toml`).

## Arquitectura
- Priorizar Server Components; aislar `use client` solo donde sea necesario.
- Mantener separacion clara entre `apps/web/src/app/(player)` (PWA) y `apps/web/src/app/(admin)` (Dashboard).
- No mezclar imports entre `(player)` y `(admin)`; usar `packages/` para tipos compartidos.
- Preservar Admin Blindness: el admin no debe acceder a estado activo de juego.

## Server Actions y auth
- Validar autenticacion y autorizacion explicitamente en cada server action sensible.
- Hidratar/validar la sesion de Supabase antes de operar.
- Validar inputs con esquemas (zod/valibot u otro existente) antes de tocar DB o auth.
- No confiar en datos del cliente si el servidor puede recalcularlos.
- Para endpoints o webhooks nuevos cargar la skill `secure-defaults-pit-of-success`.

## TypeScript y calidad
- No usar `any` salvo justificacion fuerte.
- Reutilizar tipos de `apps/web/src/types/supabase.ts` y de `packages/`.
- Archivos en `kebab-case`, funciones en `camelCase`, componentes y tipos en `PascalCase`.

## UI y frontend
- Mantener coherencia con el lenguaje visual existente.
- Apoyarse en `frontend-design` y `tailwind-design-system` para UI nueva relevante.
- Cuidar estados de carga, error y vacio. Responsive real mobile y desktop.

## Logging y errores
- Sin `console.log` de debug en produccion.
- Errores de negocio: mensaje util al usuario + detalle tecnico solo donde corresponda.

## Skills a cargar segun tarea
- Codigo App Router, RSC, async APIs, metadata, route handlers: `next-best-practices`.
- UI compartida o nueva: `tailwind-design-system` + `frontend-design`.
- Auditoria UI/accesibilidad: `web-design-guidelines`.
- Validar en navegador: `agent-browser` o `webapp-testing`.
- Performance / Web Vitals: `performance-budget-and-web-vitals`.

## Comandos
- `pnpm --filter web dev`
- `pnpm --filter web test`
- `pnpm --filter web lint`
- `pnpm exec tsc --noEmit -p apps/web/tsconfig.json`
