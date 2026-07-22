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
- Medicion web vigente: `99.57%` statements, `91.67%` branches, `98.03%` functions, `99.57%` lines con `218` suites y `1952` tests pasando (`2026-07-19`).
- Medicion game-server vigente: `93.35%` statements, `84.97%` branches, `94.79%` functions, `95.18%` lines con `34` suites y `833` tests pasando (`2026-07-19`).
- `MesaRoom` y sus fases son zona critica: cualquier cambio en flujo de juego, reconexion, payout o apuestas debe venir con pruebas especificas.
- El roadmap detallado de cobertura web vive en `docs/testing/WEB_COVERAGE_ROADMAP.md`.
- Frentes flojos actuales de game-server: `MesaRoom.ts` por volumen de reglas, `SupabaseService.ts` en catch/fail-open residuales y ramas defensivas de comandos.
- Gate operativo actual:
  - Web: `99%` statements, `91%` branches, `98%` functions, `99%` lines. Este gate fija el avance del checkpoint 152 y evita regresar por debajo de la meta estratégica ya alcanzada en statements, functions y lines.
  - Game server: `89%` statements, `80%` branches, `89%` functions, `90%` lines.
- Objetivo final estrategico sigue siendo `98%` en ambos frentes. Web ya supera la meta en statements, functions y lines; branches (`91.67%`) es su frente pendiente. Game-server mantiene gates escalonados hasta acercarse a la meta sin falsos rojos.
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
- Hardening de recuperación y acciones de consultas (2026-07-16): las pruebas de `app/play/[id]` validan el fallback al room mapeado cuando falla el join inicial, tanto para recuperación reanudada como pendiente no vencida; la fecha del caso pendiente se deriva de `Date.now()` para evitar falsos rojos por calendario. `IssueAdminActions` cubre respuesta, cierre, errores y actualización tras adjuntar evidencia, quedando en `100%` focalizado. En el servidor, los mensajes que mutan una mano quedan bloqueados hasta que regrese todo el roster y la telemetría distingue la publicación del replacement de la completitud real del roster.
- Hardening del visor de replays player (2026-07-17): 9 pruebas adicionales cubren replay legacy, datos parciales, traducción y detalles de eventos, resolución segura de jugadores y grillas de 1 a 7 manos finales. La página de detalle queda en `100%` statements/functions/lines y `87.01%` branches, sin exponer información no saneada.
- Hardening de recovery admin (2026-07-18): el lote vertical deja `217` suites y `1892` tests web en verde; cubre filtros, paginación, reconocimientos, refunds, cierre, exportación CSV y fallos de RPC. También corrige el schema Zod de exportación, acepta cursores Postgres con offset, evita refrescar la UI ante errores de dominio y protege el CSV con auth admin explícita, rate limit y un máximo sin truncamiento silencioso.
- Hardening de replays server-side (2026-07-18): 8 casos adicionales cubren hidratación best-effort desde game-server, saneamiento de cartas privadas para player, autorización y visibilidad completa para admin, fallos HTTP/red y resultados parciales de RPC. `app/actions/replays.ts` queda en `100%` statements/lines/functions y `93.67%` branches.
- Hardening de callbacks SupportChat (2026-07-18): 4 tests nuevos cubren categoría `other` sin referencias indebidas, doble submit, mensajes player→admin y tickets archivados; además se refuerzan navegación, lifecycle de socket y emisión de cierre en casos existentes. `SupportChat.tsx` queda en `100%` statements/lines, `88.46%` functions y `92.8%` branches.
- Hardening de soporte admin (2026-07-18): `SupportConversationList` cubre selección inicial segura, ambos callbacks de cierre, autoplay bloqueado, feedback/reintento después de un rechazo de red y respuestas tardías sin cerrar otra conversación. El componente queda en `100%` statements/lines/functions y `98.38%` branches.
- Hardening de Board realtime (2026-07-18): se cubren ambos órdenes del resync privado sin reparto falso, reveal incremental, deselección de cartas, limpieza de apuestas, sorteo de mano, ordinal y semántica de resto después de pasar con juego. `Board.tsx` queda en `100%` statements/lines/functions y `97.05%` branches.
- Cierre de meta web functions (2026-07-19): 6 tests nuevos cubren apertura/cierre de recarga desde `Lobby`, avance por Enter con monto válido y bloqueo de montos vacío/inferior/superior en `GameTransferModal`; además se ejercitan filtros completos de recovery y el retorno de mesa personalizada a común. Web alcanza `98.03%` functions y el gate sube a `99/91/98/99` para preservar statements/branches/functions/lines.
- Hardening social player (2026-07-19): 5 tests nuevos cubren errores sin detalle, avatar de solicitudes, mensajes realtime entrantes/salientes, descarte de eventos ajenos, reintento tras fallo y estado en partida. `DirectChat.tsx` estabiliza su cliente Supabase para evitar resuscripciones y pérdida de mensajes; queda en `100%` statements/lines/functions y `97.95%` branches, mientras `FriendRequests.tsx` alcanza `100%` focalizado.
- Hardening de búsqueda admin (2026-07-19): 3 tests nuevos cubren resultados relacionados de perfiles (tickets, alertas y disputas), errores primarios/secundarios y auditoría de fallo. `admin-search.ts` sube a `100%` statements/lines/functions y `82.19%` branches; la cobertura global queda en `99.55/91.30/98.03/99.55` con `1930` tests.
- Hardening de consultas admin (2026-07-19): 9 tests nuevos cubren auth de bandeja/archivo, errores de RPC, cierre rechazado, validación de adjuntos, permisos de propietario/admin, fallo real de upload, metadata de evidencia y URLs firmadas fallidas. `admin-issues.ts` queda en `100%` statements/lines/functions y `74.72%` branches; la cobertura global queda en `91.48%` branches con `1939` tests.
- Hardening de investigaciones admin (2026-07-19): 13 tests nuevos cubren errores técnicos y payloads incompletos de las seis RPC de investigación/compensación, además de fallos de resolución de evidencia. `admin-disputes.ts` sube a `86.95%` branches y la cobertura global alcanza `91.67%` con `1952` tests.

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
