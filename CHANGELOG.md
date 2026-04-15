# Changelog

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
