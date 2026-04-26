# Changelog

## [Sprint 6.10e] - 2026-04-26

### Added

- **FAQPage JSON-LD en layout global** (`apps/web/src/app/layout.tsx`):
  - Nuevo bloque `FAQPage` con 4 preguntas frecuentes orientadas a búsquedas GEO: establecimiento físico en Neiva, juego de Primera con bebidas, registro online y página de reglas/seguridad.
  - Se agregaron arrays `sameAs` en los schemas `Organization` y `LocalBusiness` apuntando a Facebook e Instagram.

- **Sección FAQ visible en landing page** (`apps/web/src/components/landing/LandingContent.tsx`):
  - Nuevo `<section id="faq">` con 4 `<article>` de preguntas/respuestas para jugadores que buscan "un buen sitio para tomar bebidas y jugar Primera en Neiva".
  - Entrada `{ id: 'faq', label: 'FAQ' }` añadida a `NAV_SECTIONS`.

- **Trust links contextuales tras "Cómo jugar"** (`apps/web/src/components/landing/LandingContent.tsx`):
  - Párrafo con enlaces a `/rules` ("reglas oficiales") y `/security-policy` ("política de seguridad") para facilitar descubrimiento por AI crawlers.

- **Página 404 personalizada** (`apps/web/src/app/not-found.tsx`):
  - Nueva página "Página no encontrada" con links de recuperación a `/`, `/login/player` y `/register/player`.

- **Tests GEO Phase 2/3** (`apps/web/src/__tests__/landing-geo-phase2.test.ts`):
  - 3 contratos TDD: FAQPage JSON-LD en layout, sección FAQ + trust links en landing, existencia de not-found.tsx.

## [Sprint 6.10d] - 2026-04-26

### Changed

- **GEO de landing: bots de IA con acceso solo a rutas públicas de marketing/legal** (`apps/web/src/app/robots.ts`, `apps/web/src/app/__tests__/robots.test.ts`):
  - Se reemplazó el bloqueo total a crawlers de IA por una política de allowlist limitada a ` /`, `/rules`, `/privacy`, `/terms` y `/security-policy`.
  - Se mantienen bloqueadas rutas autenticadas de jugador, admin e internas (`/api`, `/play`, etc.), preservando aislamiento de áreas privadas.
  - Tests de robots actualizados en TDD para asegurar el contrato de rastreo GEO.

- **PWA start_url alineado a la home pública** (`apps/web/public/manifest.json`):
  - `start_url` pasa de `/lobby` a `/` para coherencia con señal de entrada pública e indexación.

### Fixed

- **Asset OG faltante en metadata social** (`apps/web/public/og-image.png`):
  - Se agregó el archivo esperado por metadata para evitar referencia rota en `openGraph` y `twitter`.

## [Sprint 6.10c] - 2026-04-25

### Fixed

- **Cartas reveladas en `SHOWDOWN`/`SHOWDOWN_WAIT` se veían translúcidas y desaturadas para jugadores foldeados** (`apps/web/src/components/replay/ReplayBoard.tsx`, `apps/web/src/components/game/Board.tsx`):
  - Tanto la mesa de replay como la mesa viva aplicaban `opacity: 0.3` + `grayscale` a las cartas reveladas de jugadores `isFolded`, sin tener en cuenta la fase. En `SHOWDOWN` esto producía manos visibles pero "fantasma" (mal contraste, difíciles de leer) durante la revelación.
  - Nuevo gating: el tratamiento atenuado solo se aplica fuera de las fases de revelación (`!isRevealPhase`). En showdown las cartas de cualquier jugador (foldeado o no) se ven nítidas, a 100% de opacidad y sin filtro grayscale.
- **`parseCard` rechazaba el formato compacto histórico de cartas** (`apps/web/src/types/replay.ts`):
  - El parser exigía `valor-Palo` con guion (`"7-O"`); replays antiguos persistidos en VPS que pudieran haberse grabado en formato compacto (`"7O"`) caían a `null` y se renderizaban como dorsos.
  - Ahora el parser acepta ambos: `"7-O"`/`"12-Copas"` (canónico actual) y `"3O"`/`"12C"` (compacto histórico). Garantiza retrocompatibilidad sin tener que regrabar replays.

### Changed

- **Layout móvil del replay: clúster central anclado abajo y anclas separadas avatar/cartas** (`apps/web/src/components/replay/ReplayBoard.tsx`):
  - El bloque central de Apuesta Principal + Pique + mazo + bottom card pasó de centrado vertical (`inset-0 items-center`) a anclado al tercio inferior (`inset-x-0 bottom-[14%] md:bottom-[18%]`). En móvil con 7 jugadores esto libera la franja superior para las manos de arriba y acerca el clúster a los controles del replay.
  - Cada `PlayerSeat` expone `data-seat-zone="avatar"` y `data-seat-zone="cards"` para distinguir explícitamente las dos zonas del asiento (avatar perimetral, cartas hacia el centro), siguiendo el esquema visual solicitado por producto.
  - Nuevo `data-testid="replay-center-cluster"` para validar layout vía tests.

### Tests

- 9 nuevos tests en `apps/web/src/components/replay/__tests__/ReplayBoard.test.tsx` cubriendo: parser tolerante a formatos canónico y compacto, render face-up de cartas con formato compacto, ausencia de `grayscale` en `SHOWDOWN`/`SHOWDOWN_WAIT` para foldeados con cartas reveladas, mantención del tratamiento atenuado fuera de fases de revelación, y anclas separadas avatar/cartas + clúster central no centrado vertical.
- 470/470 tests passing en `apps/web`.

## [Sprint 6.10b] - 2026-04-25

### Fixed

- **Fullscreen del replay scope mal aplicado** (`apps/web/src/hooks/useFullscreen.ts`, `apps/web/src/components/replay/ReplayController.tsx`):
  - El fullscreen se invocaba sobre `document.documentElement`, llevándose a la pantalla completa la NAV superior, sidebars y todo el shell de la app.
  - `useFullscreen(targetRef?)` ahora acepta un `RefObject<HTMLElement>` opcional; si no se pasa argumento, conserva el comportamiento previo (target = `document.documentElement`), por lo que `game-header.tsx` no se ve afectado.
  - `ReplayController` envuelve la mesa + controles flotantes en un nuevo contenedor `data-testid="replay-fullscreen-target"` que es el target del fullscreen. Cuando está activo aplica `fixed inset-0 z-[1000] w-screen h-screen` y la mesa expande con `!h-full !min-h-0 !rounded-none !border-0` para ocupar 100vw/100vh sin márgenes.
  - La barra de progreso y el control bar de escritorio se ocultan en fullscreen; solo permanecen visibles los controles flotantes (Anterior, Play/Pause, Siguiente, Salir), tal como exige el requerimiento de "Persistencia de Controles".
  - Los floating controls se movieron DENTRO del target fullscreen porque el navegador oculta cualquier nodo fuera del elemento en pantalla completa.

## [Sprint 6.10] - 2026-04-25

### Fixed

- **Replay filtraba cartas de SHOWDOWN al primer paso del timeline** (`apps/web/src/components/replay/ReplayController.tsx`, `apps/web/src/components/replay/ReplayBoard.tsx`):
  - `ReplayController` reemplaza el mapa global de cartas (que se construía recorriendo todos los frames y `final_hands`) por una memoria progresiva indexada por frame: en el paso `i` el fallback solo conoce los frames `0..i`. Esto evita que el primer paso muestre cartas reveladas al final.
  - `final_hands` deja de ser fuente de verdad para pasos intermedios; solo se usa en el resumen final.
- **La mesa del replay no soportaba 7 asientos y solapaba cartas con el avatar** (`apps/web/src/components/replay/ReplayBoard.tsx`):
  - Layout dinámico de 3 a 7 asientos distribuidos por todo el perímetro (alineado con `MesaRoom.maxClients = 7` y `GameState.maxPlayers = 7`).
  - La mano de los asientos inferiores ahora renderiza por encima del bote/pique central (`z-30`) para no quedar tapada por el badge.
  - Se eliminaron los slots vacíos cuando hay menos jugadores que asientos.
- **Manos finales con grid rígido** (`apps/web/src/app/(player)/replays/[gameId]/page.tsx`, `apps/web/src/app/(admin)/admin/replays/[gameId]/page.tsx`):
  - Grid adaptativo que reparte el espacio según el número real de manos (de 1 a 7+), evitando huecos blancos al haber pocas manos.

### Added

- **Fullscreen móvil para el replay con controles flotantes** (`apps/web/src/components/replay/ReplayController.tsx`):
  - Al pulsar Play en pantallas ≤1024px se solicita fullscreen (best-effort, fallback webkit) reutilizando `useFullscreen`.
  - Mientras el reproductor está en fullscreen aparece una barra flotante con los controles de anterior, play/pause, siguiente y salir; "salir" devuelve a la vista normal del replay.
- **Tests de fidelidad temporal y geometría** (`apps/web/src/components/replay/__tests__/ReplayController.test.tsx`, `apps/web/src/components/replay/__tests__/ReplayBoard.test.tsx`):
  - El primer paso no filtra cartas privadas de frames futuros.
  - `final_hands` no se usa como fallback en pasos intermedios.
  - El board renderiza 3 y 7 asientos correctamente, sin slots vacíos.
  - Pulsar Play en móvil dispara `requestFullscreen` y muestra los controles flotantes.

## [Sprint 6.9] - 2026-04-24

### Fixed

- **Login bloqueado por "Legacy API keys are disabled" y mensaje engañoso de PIN** (`utils/supabase/env.ts`, `app/layout.tsx`, `app/(auth)/auth-actions.ts`, `app/(auth)/login/player/page.tsx`, `turbo.json`, `docs/deployment/deployment.md`):
  - `getPublicSupabaseEnv` y `getAdminSupabaseEnv` ahora aceptan las claves nuevas de Supabase (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) con fallback a los nombres legacy (`ANON_KEY` / `SERVICE_ROLE_KEY`). La inyección runtime en `layout.tsx` expone ambos nombres públicos para que el navegador pueda resolver el primero disponible.
  - `checkPhoneHasPin()` ya no degrada silenciosamente a `false`: distingue `true` / `false` / `null` (desconocido) y loguea los errores RPC. El UI de `/login/player` trata `null` como "desconocido" y deja el formulario de clave por defecto, evitando el mensaje "tu cuenta aún no tiene clave" cuando en realidad el backend está caído.
  - `loginWithPhone`, `loginWithPin`, `loginAdmin`, `registerPlayer` y `startPinRecovery` detectan `Legacy API keys are disabled` / `Invalid API key` y muestran un mensaje operativo en español en lugar del texto crudo del proveedor.
  - Documentación de despliegue alineada con la configuración real: `TWILIO_VERIFY_SERVICE_SID` en lugar de `TWILIO_PHONE_NUMBER`, y guía explícita sobre las claves `publishable` / `secret`.

### Added

- **Tests de resolución de variables Supabase** (`utils/supabase/__tests__/env.test.ts`): cobertura para el orden de preferencia nueva > legacy y mensajes de error.
- **Tests de `checkPhoneHasPin` y mapeo de error legacy** (`app/(auth)/__tests__/auth-actions.test.ts`): aseguran que fallos de RPC devuelven `null` y que `loginWithPhone` no filtra el mensaje crudo del proveedor.

## [Sprint 6.8] - 2026-04-23

### Fixed

- **Recuperación admin usaba el origen equivocado y el enlace no avanzaba** (`admin-security.ts`, `recovery/page.tsx`, `password/page.tsx`, `admin-security.test.ts`, `recovery-password-pages.test.tsx`, `admin-security.spec.ts`):
  Las acciones de seguridad admin ahora priorizan `APP_URL` al construir enlaces firmados de recuperación/cambio de correo, evitando que el flujo caiga a hosts reenviados o `localhost` cuando el correo se abre fuera del entorno local. Además, la pantalla de nueva contraseña redirige automáticamente al login admin tras éxito y se retiraron los botones de volver de las dos vistas del flujo para simplificar la experiencia.

## [Sprint 6.7] - 2026-04-23

### Fixed

- **Turnstile no aparecía en login/register/recovery en producción** (`turnstile-widget.tsx`, `turnstile-env.ts`, `layout.tsx`, `turnstile.ts`):
  Se corrigió el drift entre variables build-time y runtime para `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, agregando fallback por `window.__MESA_PRIMERA_RUNTIME_ENV__` y normalización con `trim()`. Además, se endureció la validación server-side para rechazar tokens vacíos con espacios y normalizar `TURNSTILE_SECRET_KEY` antes de `siteverify`.

### Added

- **Tests de seguridad Turnstile** (`turnstile-env.test.ts`, `turnstile.test.ts`): cobertura para resolución de key pública en runtime y para validación de token/secret en servidor.

## [Sprint 6.6] - 2026-04-16

### Added

- **ResponsiveDataView compartido** (`ResponsiveDataView.tsx`):
  Nuevo componente genérico `<ResponsiveDataView<T>>` que renderiza tabla en desktop (lg:+) y tarjetas verticales en mobile (<lg). Soporta `columns`, `renderCard`, slots `header`/`footer`, alignment por columna, y estados vacíos personalizados.

### Changed

- **Tablas admin → responsive** (users, ganancias, audit, ledger, tables, replays):
  Todas las tablas del panel de administración migradas a `ResponsiveDataView`. En desktop se mantiene la tabla con alineación centrada vertical (`align-middle`) y texto sin truncamiento. En mobile se muestran tarjetas verticales con layout de grilla adaptado a cada vista. Corregido `truncate` → `wrap-break-word` en descripciones y razones de baneo para que el contenido sea siempre visible.

## [Sprint 6.5] - 2026-04-15

### Added

- **Google OAuth para jugadores** (`config.toml`, `google-auth.ts`, `google-sign-in-button.tsx`, `callback/route.ts`, `complete/page.tsx`, `auth-actions.ts`, `middleware.ts`):
  Nuevo flujo de registro e inicio de sesión con Google vía Supabase PKCE. Los jugadores pueden registrarse con Google y completar datos obligatorios (nombre, apodo, teléfono, avatar). El teléfono se verifica por OTP antes de continuar al setup de PIN/biometría. La página de login también incluye el botón de Google. Middleware actualizado para permitir el flujo de onboarding de Google (`/register/player/complete`, `/register/player/verify`).
- **Tests de Google Auth** (`google-auth-actions.test.ts`): 8 tests cubriendo `getGoogleUserData` (datos, null, fallback) y `completeGoogleRegistration` (flujo completo, teléfono duplicado, sin sesión, validación, duplicado en BD).

## [Sprint 6.4] - 2026-04-14

### Fixed

- **Zoom restringido en sala de juego** (`useGamePermissions.ts`, `PermissionsGate.tsx`, `play/[id]/page.tsx`):
  La ruta `/play/[id]` bloqueaba pinch-to-zoom de tres formas: (1) `useGamePermissions` forzaba `requestFullscreen()` + `screen.orientation.lock('landscape')` al entrar, (2) `PermissionsGate` bloqueaba el renderizado de hijos hasta conceder orientación/pantalla completa, y (3) el shell usaba `h-screen overflow-hidden` que recortaba contenido ampliado. Eliminada la lógica de fullscreen/orientación del hook, convertido PermissionsGate en banner no-bloqueante, y reemplazado `h-screen overflow-hidden` por `min-h-screen` en los tres contenedores de la página. El toggle manual de fullscreen en GameHeader se mantiene intacto.

### Added

- **Tests de accesibilidad de zoom en juego** (`game-zoom-accessibility.test.tsx`): 5 tests TDD cubriendo ausencia de fullscreen/orientation-lock forzados, renderizado inmediato de PermissionsGate, y layout sin clipping global.

## [Sprint 6.3] - 2026-04-12

### Fixed

- **CRITICAL – Transferencias de Wallet fallaban con 'Error al procesar la transferencia'** (`transfer.ts`, `TransferModal.tsx`, migración SQL):
  La server action `transferToPlayer()` no enviaba `p_sender_id` al RPC `transfer_between_players`. Tras la migración del 11/04, convivían dos sobrecargas SQL (3 y 4 parámetros) causando ambigüedad en PostgREST. Cuando `auth.uid()` era NULL en contexto SECURITY DEFINER, la transferencia fallaba silenciosamente. Corregido pasando `p_sender_id: user.id` desde Wallet.
- **Monto mínimo desalineado en Wallet** (`TransferModal.tsx`):
  El modal de transferencias de Wallet permitía enviar desde $100 (10,000 centavos) pero el RPC y el schema de validación exigían $1.000 (100,000 centavos). Alineados ambos guards del frontend con la regla real del backend.
- **Sobrecarga ambigua del RPC de transferencias** (migración `20260412000000_unify_transfer_rpc.sql`):
  Eliminada la firma legacy de 3 parámetros. Unificada en una sola firma de 4 parámetros con contrato de respuesta normalizado (`reference_id`, `sender_balance_after`, `recipient_name`, `amount_cents`) que ambos callers (web y game-server) esperan.

## [Sprint 6.2] - 2026-04-11

### Fixed

- **Viewport accesible**: eliminado `maximumScale: 1` y `userScalable: false` del viewport global. Pinch-to-zoom habilitado en todas las páginas (WCAG 1.4.4).
- **Landmark `<main>` en auth**: creado layout compartido `(auth)/layout.tsx` que envuelve todas las páginas de autenticación en un `<main>`, resolviendo la auditoría de landmark en `/login/admin/mfa`, `/login/admin/mfa/setup`, `/register/admin` y `/register/player/biometric`.
- **Contraste insuficiente en auth**: reemplazado `text-slate-500`/`text-slate-600` por `text-slate-400` en MFA, MFA setup y registro admin. Reemplazado `text-white/30` por `text-white/60` en la página de biometría.
- **CLS en MFA setup**: agregado `min-h-[360px]` al contenedor del spinner de enrolamiento para estabilizar la altura y prevenir layout shift al cargar el QR.
- **Canonical faltante en biometría**: creado `biometric/layout.tsx` con metadata y canonical `/register/player/biometric`.

### Added

- **Tests de auditoría Lighthouse** (`lighthouse-fixes.test.tsx`): 9 tests cubriendo viewport, landmark, contraste, CLS y canonical. TDD red-green-refactor.

## [Sprint 6.1] - 2026-04-11

### Fixed

- **CRITICAL – Identidad de jugador perdida en creación de mesa** (`Lobby.tsx`, `MesaRoom.ts`):
  Las 3 rutas `client.create("mesa")` en el Lobby no pasaban `userId`, causando que el creador de la sala quedara sin `supabaseUserId`. Todas las operaciones financieras (apuestas, ganancias, comisiones) eran silenciosamente omitidas por los guards `if (player.supabaseUserId)`. Corregido agregando `userId: userProfile?.id` a los 3 create calls, y haciendo que la restauración de ghost players prefiera `options.userId` sobre el valor heredado.
- **Admin Ledger N+1 → RPC único** (`admin-ledger.ts`, `get_admin_ledger_summary` RPC):
  Reemplazado el patrón de 3 queries × N usuarios con un solo RPC de agregación que retorna balance, créditos, débitos, última actividad y flag de discrepancia por usuario.
- **Cache stale en admin ledger** (`ledger/page.tsx`):
  Agregados `dynamic = "force-dynamic"` y `revalidate = 0` (ya presentes en otras páginas admin) más componente `LedgerRealtimeRefresh` que escucha cambios en la tabla `ledger` vía Supabase Realtime.
- **awardPot silenciaba errores** (`SupabaseService.ts`, `MesaRoom.ts`):
  Cambiado de `void` a `{ success, balance_after, error }`. Errores de persistencia ahora se logean como `⚠️ CRITICAL`.

### Production Reconciliation

- **Ximena Rodriguez**: Reconciliados $45,500 COP (4,550,000 centavos) correspondientes a 8 partidas sin registro en sesión del 2026-04-11 02:25–03:17. Net calculado por ley de conservación sobre entradas verificadas de Mauro y Dario. Wallet: 86,886,300 → 82,336,300 (seq 252).

## [Sprint 2] - 2026-03-29

### Added

- **Replays**: Sistema completo de repeticiones de partidas.
  - RPCs de Supabase para listado eficiente (`get_player_replays`, `get_admin_replays`).
  - Páginas de listado y detalle para jugadores y administradores.
  - Link a replays desde la mesa de juego finalizada.
- **Admin Ledger**: Herramientas de auditoría financiera.
  - Vista global de transacciones.
  - Vista detallada por usuario con balances agregados.
- **Game Server**: Integración financiera robusta.
  - Cobro automático de apuestas (`recordBet`) sincronizado con Supabase.
  - Cron de verificación de integridad para detectar discrepancias en el ledger.
  - Soporte para espectadores admin (Admin Blindness).

### Fixed

- **Game Logic**: Mejoras en la estabilidad de la reconexión de jugadores (Ghost players).
- **UI**: Actualización de `GameAnnouncer` y controles de acción para una mejor UX.
- **Wallet**: Corrección en el flujo de transacciones y estados del modal.
