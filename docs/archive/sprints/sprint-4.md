# Sprint 4 — Admin Panel + Moderación + Monitoring

## Objetivos (COMPLETADOS)

Construir toda la interfaz y funcionalidad que permitirá al administrador controlar el sistema, moderar a los jugadores, y monitorear la salud (especialmente la financiera) del juego.

## Funcionalidades Implementadas

1. **Dashboard de Métricas**: Indicadores en tiempo real (active users, games) y control de consistencia de la base de datos (Ledger).
2. **Interfaz de Control de Mesas**: Posibilidad de pausar, reanudar, forzar cierre y expulsar a jugadores.
3. **Gestión de Usuarios y Dispositivos**: Identificación visual de multicuentas y botones de baneo.
4. **Vista completa del Ledger**: Listado de toda transacción inmutable (Server Actions con soporte para limit).
5. **Edición del Reglamento**: Editor Markdown funcional interactuando con la tabla dinámica `site_settings`.
6. **Logging Estructurado con Pino**: Implementado logger base en `utils/logger.ts` para Next.js y Game Server.
7. **Cronjobs de Integridad**: Implementado vía `node-cron` de forma monolítica en el Game Server (`apps/game-server/src/cron/integrityCheck.ts`) en lugar de Workers externos para ahorro de costos ($0).

## Funcionalidades Pospuestas

8. **Configuración de Sentry**: Aplazado hasta la creación de la cuenta Developer (gratuita) por parte del dueño del proyecto.
