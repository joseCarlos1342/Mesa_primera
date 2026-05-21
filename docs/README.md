# Documentacion de Mesa Primera

Esta carpeta es la fuente de verdad documental del monorepo. Describe el estado actual del codigo, no la historia de decisiones ya superadas.

## Arquitectura del Repo

- `apps/web`: Next.js 16, React 19, Tailwind 4, Supabase Auth y App Router.
- `apps/game-server`: Node.js 24, Colyseus, Redis, Socket.IO y BullMQ.
- `supabase/migrations`: schema, RLS y RPCs financieras/autenticacion.

## Estructura

- `admin/`: operacion funcional, seguridad y referencia tecnica del panel administrativo.
- `deployment/`: despliegue canonico y runbooks operativos.
- `game/`: documentacion viva del motor, fases, escenarios y versionado del flujo de juego.
- `product/`: mapa de rutas y guias funcionales del producto visibles para equipo y soporte.
- `security/`: notas de seguridad transversales y mejoras futuras.
- `testing/`: comandos y criterios reales de validacion.
- `archive/`: sprints, auditorias y documentos historicos que ya no son fuente viva.

## Lectura Recomendada Para Onboarding

1. `deployment/README.md`
2. `admin/README.md`
3. `admin/ADMIN_SECURITY.md`
4. `admin/ADMIN_TECHNICAL.md`
5. `game/README.md`
6. `game/phases.md`
7. `game/GAME_SCENARIOS.md`
8. `game/MESA_VERSIONS.md`
9. `product/ROUTES.md`
10. `product/player/README.md`
11. `testing/TESTING.md`
12. `testing/WEB_COVERAGE_ROADMAP.md`

## Hechos Tecnicos Canonicos

- Monorepo gestionado con `pnpm` y `turbo`.
- Runtime canonico: Node.js 24.
- Web deployada en Vercel.
- Game server deployado en VPS CubePath.
- Supabase usa claves nuevas (`sb_publishable_*`, `sb_secret_*`) con compatibilidad legacy.
- El login publico de jugador y recuperacion usan Cloudflare Turnstile.
- El login de jugador soporta OTP, PIN, dispositivo confiable y passkeys WebAuthn.
- El login admin exige password + MFA.
- La reconexion real del jugador en mesa usa un grace period de `120s`.
- El token de supervision admin dura `60s` en Redis y solo sirve para abrir la sesion de observacion.
- El ledger es inmutable y las mutaciones pasan por RPCs.

## Guías Clave

- `deployment/README.md`: despliegue actual Vercel + CubePath + Supabase.
- `deployment/vps_actualizacion_motor.md`: operacion manual del VPS del motor.
- `admin/README.md`: recorrido operativo del panel admin.
- `admin/ADMIN.md`: capacidades funcionales del admin.
- `admin/ADMIN_SECURITY.md`: MFA, RLS, admin blindness, ledger y sanciones.
- `admin/ADMIN_TECHNICAL.md`: server actions, RPCs y trazabilidad tecnica.
- `game/phases.md`: fases reales registradas por el motor.
- `game/GAME_SCENARIOS.md`: escenarios funcionales del motor.
- `game/MESA_VERSIONS.md`: cambios y validaciones del motor.
- `product/ROUTES.md`: rutas reales expuestas por la app.
- `product/player/README.md`: recorrido del jugador.
- `testing/TESTING.md`: comandos reales de test, lint y typecheck.
- `testing/WEB_COVERAGE_ROADMAP.md`: estado actual, objetivo y hoja de ruta para subir cobertura de `apps/web`.

## Regla de Mantenimiento

- No agregar nuevos `.md` sueltos en la raiz de `docs/`.
- Si un documento deja de reflejar el codigo actual, reescribirlo o moverlo a `archive/`.
- Toda ruta nueva en `apps/web/src/app` debe reflejarse en `product/ROUTES.md`.
- Todo cambio en auth, MFA, passkeys, PIN o sesiones debe reflejarse en la documentacion de seguridad/admin.
- Todo cambio en `MesaRoom`, fases o reconexion debe reflejarse en la documentacion de juego.
- Toda migracion que toque ledger, wallets o RPCs debe revisar la documentacion admin/financiera.
