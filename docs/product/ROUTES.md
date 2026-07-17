# Rutas del Proyecto

Mapa de rutas reales segun `apps/web/src/app`.

## Publicas y legales

| Ruta | Descripcion | Estado |
|---|---|---|
| `/` | Landing / entrada principal | Activa |
| `/privacy` | Politica de privacidad | Activa |
| `/terms` | Terminos y condiciones | Activa |
| `/rules` | Reglas publicas | Activa |
| `/security-policy` | Politica de seguridad publica | Activa |
| `/primera-riverada-los-4-ases` | Landing SEO/campana | Activa |

## Auth jugador

| Ruta | Descripcion | Estado |
|---|---|---|
| `/login/player` | Inicio de sesion jugador | Activa |
| `/login/player/verify` | Verificacion OTP jugador | Activa |
| `/login/player/device-verify` | Verificacion de dispositivo confiable | Activa |
| `/register/player` | Registro de jugador | Activa |
| `/register/player/verify` | Verificacion de registro | Activa |
| `/register/player/pin` | Creacion de PIN | Activa |
| `/register/player/biometric` | Alta de passkey/biometria | Activa |
| `/register/player/complete` | Cierre del onboarding | Activa |
| `/recovery` | Recuperacion de cuenta jugador | Activa |
| `/recovery/verify` | Verificacion OTP de recuperacion | Activa |
| `/recovery/pin` | Reasignacion de PIN | Activa |

## Auth admin

| Ruta | Descripcion | Estado |
|---|---|---|
| `/login/admin` | Login admin con email/password | Activa |
| `/login/admin/recovery` | Solicitud de recuperacion admin | Activa |
| `/login/admin/password` | Definicion de nueva password admin | Activa |
| `/login/admin/mfa` | Verificacion MFA admin | Activa |
| `/login/admin/mfa/setup` | Setup inicial de MFA admin | Activa |
| `/register/admin` | Alta asistida de admin | Activa |

## App jugador

| Ruta | Descripcion | Estado |
|---|---|---|
| `/dashboard` | Home operativa del jugador | Activa |
| `/lobby` | Lobby y listado de mesas | Activa |
| `/play/[id]` | Mesa de juego en vivo | Activa |
| `/wallet` | Wallet del jugador | Activa |
| `/wallet/deposit` | Solicitud de deposito | Activa |
| `/wallet/withdraw` | Solicitud de retiro | Activa |
| `/wallet/history` | Historial de wallet | Activa |
| `/profile` | Perfil y seguridad del jugador | Activa |
| `/stats` | Estadisticas del jugador | Activa |
| `/friends` | Sistema social de amistades | Activa |
| `/leaderboard` | Ranking / salon de la fama | Activa |
| `/replays` | Listado de replays del jugador | Activa |
| `/replays/[gameId]` | Replay individual | Activa |
| `/replays/mesa/[roomId]` | Replays agrupados por mesa | Activa |

## App admin

| Ruta | Descripcion | Estado |
|---|---|---|
| `/admin` | Dashboard admin | Activa |
| `/admin/users` | Gestion de usuarios | Activa |
| `/admin/ledger` | Ledger global | Activa |
| `/admin/ledger/[userId]` | Ledger por usuario | Activa |
| `/admin/tables` | Control de mesas y lobby | Activa |
| `/admin/deposits` | Revision de depositos | Activa |
| `/admin/withdrawals` | Revision de retiros | Activa |
| `/admin/ganancias` | Rake y metricas financieras | Activa |
| `/admin/consultas` | Busqueda global | Activa |
| `/admin/disputes` | Investigaciones internas (URL legacy) | Activa |
| `/admin/disputes/new` | Alta de investigación interna | Activa |
| `/admin/disputes/[id]` | Expediente de investigación | Activa |
| `/admin/audit` | Auditoria administrativa | Activa |
| `/admin/security` | Seguridad admin y recovery codes | Activa |
| `/admin/broadcast` | Broadcast masivo | Activa |
| `/admin/broadcast/history` | Historial de broadcast | Activa |
| `/admin/support` | Soporte | Activa |
| `/admin/alerts` | Alertas operativas | Activa |
| `/admin/server-log` | Log operativo | Activa |
| `/admin/rules` | Editor de reglamento | Activa |
| `/admin/replays` | Replays admin | Activa |
| `/admin/replays/[gameId]` | Replay individual admin | Activa |
| `/admin/spectate/[roomId]` | Supervision en vivo | Activa |

## Notas de Mantenimiento

- Este archivo debe actualizarse cada vez que cambie `apps/web/src/app`.
- Antes de agregar o mantener una ruta aqui, verificar que exista realmente en `apps/web/src/app`.

## Documentacion Relacionada

- [ADMIN.md](../admin/ADMIN.md)
- [ADMIN_SECURITY.md](../admin/ADMIN_SECURITY.md)
- [ADMIN_TECHNICAL.md](../admin/ADMIN_TECHNICAL.md)
