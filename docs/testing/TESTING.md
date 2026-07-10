# Guia de Testing

## Stack Real

| Area | Herramienta | Uso |
|---|---|---|
| Web | Jest 30 + Testing Library | componentes, hooks y server actions de `apps/web` |
| Game Server | Vitest 4 | `MesaRoom`, servicios, comandos y fases |
| E2E | Playwright | flujos integrados sobre servicios levantados |
| DB / SQL | Supabase CLI | migraciones, RLS y pruebas locales de base de datos |

## Comandos Canonicos

```bash
pnpm --filter web test
pnpm --filter game-server test

pnpm --filter web test:coverage
pnpm --filter game-server test:coverage

pnpm exec playwright test

pnpm --filter web lint
pnpm exec tsc --noEmit -p apps/web/tsconfig.json
pnpm exec tsc --noEmit -p apps/game-server/tsconfig.json
```

## Ubicacion de Tests

- Web: junto al codigo o en `src/__tests__/` segun el modulo.
- Game server: junto al dominio probado, especialmente bajo `src/rooms/__tests__/` y `src/services/__tests__/`.
- E2E: suite Playwright del repo.

## Regla de Verificacion

Antes de cerrar cambios relevantes:

1. correr tests del area tocada;
2. correr lint y typecheck del area;
3. si hay cambios cross-app, validar ambos workspaces;
4. si el cambio toca UI, considerar tambien Playwright;
5. si cambia `DESIGN.md`, correr `pnpm --filter web run design:lint`.

## Cobertura y Riesgo

- Web: el umbral oficial lo gobierna el proyecto `apps/web`.
- Game server: el umbral oficial lo gobierna `apps/game-server`.
- Medicion web vigente: `99.52%` statements, `92.14%` branches, `96.79%` functions, `99.52%` lines con `199` suites y `1736` tests pasando (`2026-07-09`).
- Medicion game-server vigente: `95.38%` statements, `86.11%` branches, `97.76%` functions, `96.55%` lines con `27` suites y `769` tests pasando (`2026-07-09`).
- `MesaRoom` y sus fases son zona critica: cualquier cambio en flujo de juego, reconexion, payout o apuestas debe venir con pruebas especificas.
- El roadmap detallado de cobertura web vive en `docs/testing/WEB_COVERAGE_ROADMAP.md`.
- Frentes flojos actuales de game-server: `MesaRoom.ts` por volumen de reglas, `SupabaseService.ts` en catch/fail-open residuales y ramas defensivas de comandos.
- Gate operativo actual (subido tras Fase 3 del plan de hardening de cobertura):
  - Web: `90%` statements, `84%` branches, `86%` functions, `90%` lines.
  - Game server: `89%` statements, `80%` branches, `89%` functions, `90%` lines.
- Objetivo final estrategico sigue siendo `98%` en ambos frentes, pero CI usa un gate escalonado para reflejar el baseline real y bloquear regresiones, no el estado final aun no alcanzado.
- Hardening de cobertura Fases 1-2 (2026-06-22): 80 tests nuevos centrados en zonas debiles criticas (auth-actions, MesaRoom.refundAllActiveBets, AdminSecurityPanel, recovery, security, password, tables, consultas). Subidas clave: `auth-actions.ts` 74.8% → 85.71% branches; `recovery/page.tsx` 11.11% → 100% branches; `AdminSecurityPanel.tsx` 26.92% → 100% branches; `password/page.tsx` 62.5% → 94.54% branches; `tables/page.tsx` 61.11% → 100% branches; `consultas/page.tsx` 63.63% → 100% branches; `security/page.tsx` 33.33% → 100% branches.
- Hardening de cobertura Fase 3 (2026-06-24): 14 tests web y 2 tests game-server adicionales sobre replays, perfil, CSP, cliente Supabase SSR, `PlayerBadge` y `AlertService`. Subidas clave: `app/(player)/replays/page.tsx` queda en `100%`, `utils/supabase/client.ts` queda en `100%`, `PlayerBadge.tsx` sube branches a `96.87%` y `AlertService.ts` queda en `100%` statements/lines/functions con `96.07%` branches.
- Hardening de wallet UI (2026-07-01): 4 tests web adicionales sobre `TransactionModal.tsx` cubren fallback sin `signedUrl`, modal cerrado, retiro pendiente sin comprobante, transferencias/ajustes/tipos desconocidos y mantienen el bloque financiero solo en UI con Supabase storage mockeado.
- Hardening de broadcast admin (2026-07-02): 9 tests web adicionales sobre `admin-broadcast.ts` cubren errores de audiencia/insert/deliveries, deliveries sin `notification_id`, best-effort del game-server sin secreto o con fetch fallido, history vacio y conteos nulos/lecturas sin `broadcast_id`.
- Hardening de dashboard admin (2026-07-02): 3 tests web adicionales sobre `admin-dashboard.ts` cubren fallbacks financieros de solo lectura, diff `ALERTA`, deteccion de fingerprints compartidos y estados de boveda `ALERTA`/`CRÍTICO`.
- Hardening de ledger admin (2026-07-02): 6 tests web adicionales sobre `admin-ledger.ts` cubren errores de lectura, perfiles ausentes, referencias vacias, ledger de usuario sin datos y perfil con wallet faltante sin escrituras financieras.
- Hardening de mesas admin (2026-07-02): 10 tests web adicionales sobre `admin-tables.ts` cubren errores de queries/updates/inserts, defaults de juegos activos, fallback de lobby/financials y cleanup fallido sin sockets reales.
- Hardening de seguridad admin (2026-07-02): 15 tests web adicionales sobre `admin-security.ts` cubren ramas de admin no autenticado, TOTP rechazado antes de mutaciones, headers ausentes, formularios incompletos, emails nulos en auditoria y conteos nulos de recovery codes.
- Hardening de soporte server-side (2026-07-02): 10 tests web adicionales sobre `support.ts` cubren auth guards de las 8 funciones que faltaban, fallback de rol `player` cuando la RPC omite `from` y fallback de extensión `bin` cuando el archivo no tiene extensión.
- Hardening de wallet jugador (2026-07-02): 3 tests web adicionales sobre `wallet.ts` cubren filter branches de retiros completados en `getWalletData`, depositos completados en `getWalletHistory` y fallback `?? 'Monto inválido'` cuando la validación no devuelve `issues`.
- Hardening de rake admin y UI admin (2026-07-02): 6 tests web adicionales sobre `admin-rake.ts` (rakeEntries null, win entry sin match), `TableActiveToggle.tsx` (desactivar mesa, error en toggle, cancelar confirmación) y `DashboardWarnings.tsx` (singular vs plural).
- Hardening de auth server-side (2026-07-02): 8 tests web adicionales sobre `passkey-actions.ts` (env vars, fallbacks de userName/transports/sign_count, auth guard de verificación) y `auth-actions.ts` (redirect a device-verify tras OTP exitoso en dispositivo desconocido).
- Hardening de SupportChat UI (2026-07-02): 9 tests web adicionales sobre `SupportChat.tsx` cubren errores de creación/envío de ticket, mensajes socket de otros tickets, fallback de uuid/timestamp, notificación legacy cuando chat cerrado, guards de adjuntos/sending/finalized y preview largo/nulo en lista de tickets.
- Hardening de LandingContent UI (2026-07-02): 11 tests web adicionales sobre `LandingContent.tsx` cubren carga dinámica de 7 tutoriales restantes, click en nav desktop, cierre de menú mobile con links de sesión y guard de touchEnd sin touchStart.
- Hardening de play page callbacks (2026-07-02): 6 tests web adicionales sobre `app/play/[id]/page.tsx` cubren cierre de 4 modales (reglas, depósito, transferencia, ayuda), cambio de orientación vía matchMedia y banda sin details con pique mínimo alto.
- Hardening de VoiceChat UI (2026-07-02): 7 tests web adicionales sobre `VoiceChat.tsx` cubren error de token LiveKit, error al togglear micrófono, micrófono activo, speakers con nombre genérico y ramas de mute remoto sin elementos adjuntos o sin nombre.
- Hardening de auth-actions seguridad (2026-07-02): 10 tests web adicionales sobre `auth-actions.ts` cubren rate limits de registro/admin/OTP/PIN/recovery/Google, fallbacks TOTP no verificados, recovery admin sin factor y fallback de email vacío en Google data.
- Hardening de ReplayBoard UI (2026-07-02): 7 tests web adicionales sobre `ReplayBoard.tsx` cubren memoria progresiva de cartas por player/user, ausencia de cartas, fase desconocida, pique en cero y atenuación de foldeados antes de showdown.
- Hardening de TutorialWalkthrough UI (2026-07-05): 1 test web adicional sobre `TutorialWalkthrough.tsx` cubre el guard de animación pendiente para ignorar cambios de paso simultáneos y deja el componente en `100%` branches/functions/statements/lines.
- Hardening de Board y LiveKit (2026-07-05): 5 tests web netos cubren fallback de carta inferior con palo desconocido, HUD propio con saldo/puntos por defecto, remove chip sin conteo previo, guard de selección fuera de descarte y seguridad de `/api/livekit`. El endpoint queda endurecido para validar sala y derivar identidad desde Supabase Auth, sin confiar en `userId`/`username` enviados por el cliente.
- Hardening de DepositForm UI (2026-07-05): 4 tests web adicionales sobre `DepositForm.tsx` cubren error de archivo inválido, limpieza de preview al quitar archivo, alert sin onSuccess y prevención de caracteres inválidos en monto.
- Hardening de ShowdownCinematic UI (2026-07-05): 1 test web adicional sobre `ShowdownCinematic.tsx` cubre el caso en que un jugador posterior gana por mejor ranking de mano, dejando el componente por encima del threshold focalizado de branches.
- Hardening de TableHelpModal UI (2026-07-08): 2 tests web adicionales sobre `TableHelpModal.tsx` cubren solicitud marcada como `attending` y reset de motivo/mensaje/error al cerrar y reabrir el modal, subiendo branches focalizadas de `80.55%` a `92.85%`.
- Hardening de UserLedgerTable UI (2026-07-08): 2 tests web adicionales sobre `UserLedgerTable.tsx` cubren fallbacks de solo lectura para movimientos sin metadata, etiquetas desconocidas y sala sin nombre, dejando el componente en `100%` focalizado.
- Hardening de LedgerFilters UI (2026-07-08): 2 tests web adicionales sobre `LedgerFilters.tsx` cubren saldo cero, usuario desconocido, tipo/status no mapeados y búsqueda por `user_id`, dejando el componente en `100%` focalizado.
- Hardening de AuditFilters UI (2026-07-08): 2 tests web adicionales sobre `AuditFilters.tsx` cubren export sin filtros y eliminación de parámetros vacíos, subiendo branches focalizadas de `60.86%` a `93.54%`.
- Hardening de UserBanControl UI (2026-07-08): 2 tests web adicionales sobre `UserBanControl.tsx` cubren cierre/reapertura del panel, sanción por días y error de revocación, subiendo functions focalizadas a `100%`.
- Hardening de UserBalanceControl UI (2026-07-08): 2 tests web adicionales sobre `UserBalanceControl.tsx` cubren auto-cierre post ajuste exitoso y cierre manual con reset de errores, con `adjustUserBalance` mockeado y sin tocar ledger real.
- Hardening de UserSearch UI (2026-07-08): 1 test web adicional sobre `UserSearch.tsx` cubre limpieza del parámetro `q` preservando otros filtros de la URL.
- Hardening de CreateTableModal UI (2026-07-08): 2 tests web adicionales sobre `CreateTableModal.tsx` cubren cierre sin crear mesa y re-habilitación de fichas, dejando branches focalizadas en `100%`.
- Hardening de AdminStatusCard y CleanupStaleGamesButton UI (2026-07-08): 2 tests web adicionales cubren render sin `detail` y cancelación de confirmación, dejando ambos componentes en `100%` focalizado.
- Hardening de DeleteTableButton y PlayerControls UI (2026-07-08): 2 tests web adicionales cubren cancelación de confirmación en eliminación de mesa y expulsión de jugador, dejando ambos componentes en `100%` focalizado.
- Hardening de AdminAuditPage (2026-07-09): 2 tests web adicionales cubren fallbacks de actor/admin/detalles nulos y error de carga no estándar, dejando `app/(admin)/admin/audit/page.tsx` en `100%` focalizado.

## Roadmap de Cobertura Web

Para el esfuerzo de mediano y largo plazo sobre `apps/web`, usar como fuente viva:

- `docs/testing/WEB_COVERAGE_ROADMAP.md`

Ese documento define:

- baseline real de coverage;
- objetivo final y metas intermedias;
- frentes de trabajo por dominio;
- checklists por modulo;
- procedimiento de ejecucion y checkpoints.

## Casos Sensibles Que Deben Mantenerse Cubiertos

- MFA admin y recovery codes.
- Auth de jugador con OTP, PIN, dispositivo confiable y passkeys.
- Turnstile en flujos publicos.
- Ledger, depositos, retiros, ajustes y transferencias.
- Reconexion de Colyseus y restauracion de estado.
- Admin blindness y supervision en vivo.
- Broadcast, soporte y replays.
