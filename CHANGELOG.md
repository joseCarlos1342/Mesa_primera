# Changelog

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
