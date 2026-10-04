---
applyTo: "supabase/**"
description: "Reglas de migraciones, RLS, Admin Blindness, ledger inmutable y SQL en Supabase."
---

# Supabase - SQL, RLS y Seguridad

## Reglas de oro
- Toda migracion debe revisarse con foco en indices, RLS, locking y rollback logico.
- Admin Blindness: el admin NO debe ver estado activo de juego.
- `wallets_ledger` es INSERT-only. Balance = `SUM(credits) - SUM(debits)`.
- Nunca commitear secretos ni credenciales.

## Migraciones
- Crear con `npx supabase migration new <nombre>`.
- Aditivas y reversibles cuando sea posible.
- Validar con `npx supabase db reset` localmente antes de subir.
- Regenerar tipos: `npx supabase gen types typescript --local > apps/web/src/types/supabase.ts`.

## RLS
- `enable row level security` siempre en tablas nuevas.
- Deny-by-default; agregar policies positivas explicitas.
- Para tablas con estado activo de juego o financiero: agregar policy negativa para admin y test que asegure 0 filas para rol admin.
- Evitar `service_role` en rutas accesibles desde la UI admin.

## Ledger financiero (wallets_ledger)
- Solo INSERT. Sin UPDATE ni DELETE.
- Operaciones via RPC `SECURITY DEFINER` envuelta en una sola transaccion.
- `idempotency_key` (UUID derivado de `game_id + hand_id + player_id + reason`) con unique index.
- Recomputar y asertar balance >= 0 dentro de la transaccion.
- Test obligatorio: duplicado idempotente + race concurrente.

## Auth / OTP
- Flujo OTP usa Supabase Auth + `twilio_verify` (`supabase/config.toml`).
- Cambios en auth o sesiones requieren pruebas negativas y positivas extremo a extremo.

## Skills a cargar
- SQL/indices/migraciones: `supabase-postgres-best-practices`.
- Policies que afecten visibilidad del admin: `supabase-rls-admin-blindness`.
- Cambios en wallet/ledger: `mesa-ledger-atomicity`.
