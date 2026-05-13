# Rutas del Proyecto

| Ruta                   | Descripción                                     | Estado                     |
| ---------------------- | ----------------------------------------------- | -------------------------- |
| `/`                    | Lobby del juego principal (Player)              | En Construcción (Sprint 2) |
| `/play/[id]`           | Mesa de Juego y Sala de Espera Activa           | ✅ Terminado               |
| `/login/player`        | Acceso con +57 OTP para Jugadores               | ✅ Terminado               |
| `/login/player/verify` | Verificación de token SMS (6-dígitos)           | ✅ Terminado               |
| `/register/player`     | Registro (Nombre + Apodo + Teléfono + Avatar)   | ✅ Terminado               |
| `/login/admin`         | Ingreso privilegiado (Email / Password)         | ✅ Terminado               |
| `/login/admin/recovery`| Solicitud de recuperación de contraseña admin   | ✅ Terminado               |
| `/login/admin/password`| Definición de nueva contraseña admin            | ✅ Terminado               |
| `/login/admin/mfa`     | Verificación TOTP o canje de recovery code      | ✅ Terminado               |
| `/wallet`              | Balance del jugador e Historial del Ledger      | ✅ Terminado               |
| `/wallet/deposit`      | Formulario de recarga y subida de comprobantes  | ✅ Terminado               |
| `/wallet/withdraw`     | Formulario asincrono para solicitud de retiro   | ✅ Terminado               |
| `/admin`               | Panel de Control principal para Administradores | ✅ Terminado               |
| `/admin/deposits`      | Cola de Aprobación/Rechazo de Fichaje           | ✅ Terminado               |
| `/admin/withdrawals`   | Cola de Aprobación de Egresos Financieros       | ✅ Terminado               |
| `/replays`             | Listado de replays para jugadores               | ✅ Terminado               |
| `/replays/[gameId]`    | Detalle de un replay de partida                 | ✅ Terminado               |
| `/admin/replays`       | Auditoría de replays para administradores       | ✅ Terminado               |
| `/admin/ledger`        | Historial global de transacciones (Admin)       | ✅ Terminado               |
| `/admin/ledger/[userId]`| Historial de transacciones de un usuario       | ✅ Terminado               |
| `/privacy`             | Política de Privacidad (Pública)                | ✅ Terminado               |
| `/terms`               | Términos y Condiciones (Pública)                | ✅ Terminado               |
| `/admin/users`         | Gestión de usuarios (ban, balance, historial)   | ✅ Terminado               |
| `/admin/tables`        | Control de mesas y salas en vivo                | ✅ Terminado               |
| `/admin/ganancias`     | Estadísticas de rake y comisiones               | ✅ Terminado               |
| `/admin/consultas`     | Búsqueda global por UUID, semilla, usuario       | ✅ Terminado               |
| `/admin/disputes`      | Gestión de disputas y casos de fraude           | ✅ Terminado               |
| `/admin/audit`         | Log de auditoría de acciones administrativas    | ✅ Terminado               |
| `/admin/security`      | Seguridad admin: correo, contraseña, TOTP, recovery codes y sesiones | ✅ Terminado |
| `/admin/broadcast`     | Envío de notificaciones masivas                 | ✅ Terminado               |
| `/admin/broadcast/history` | Historial de broadcasts enviados           | ✅ Terminado               |
| `/admin/support`       | Gestión de tickets de soporte                   | ✅ Terminado               |
| `/admin/alerts`        | Alertas críticas del sistema                    | ✅ Terminado               |
| `/admin/server-log`    | Log del servidor de juego                       | ✅ Terminado               |
| `/admin/rules`         | Editor del reglamento de la plataforma          | ✅ Terminado               |
| `/admin/spectate/[roomId]` | Observación en vivo de salas activas       | ✅ Terminado               |
| `/admin/render/[gameId]`   | Worker de renderizado de replays a video    | ✅ Terminado               |

---

**Documentación detallada del panel de administración:**
- [ADMIN.md](../admin/ADMIN.md) — Guía funcional de todos los módulos admin
- [ADMIN_SECURITY.md](../admin/ADMIN_SECURITY.md) — Modelo de seguridad y restricciones
- [ADMIN_TECHNICAL.md](../admin/ADMIN_TECHNICAL.md) — Referencia técnica de server actions y RPCs
