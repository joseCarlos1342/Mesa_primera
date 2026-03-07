# Changelog

## [Sprint 1] - 2026-03-06

### Added

- Login OTP SMS para jugadores (Supabase Auth)
- Vista y validación de Login email + 2FA TOTP (Google Authenticator) para administradores.
- Página `/wallet` para el jugador con el saldo e historial Ledger unificado.
- Flujo funcional de retiros en `/wallet/withdraw` validando el requerimiento del alias bancario de Nequi / entidad.
- Bandeja de retiros `/admin/withdrawals` para revisar solicitudes salientes de los usuarios.
- Middleware en `apps/web` con validación robusta y redirección restrictiva para aislar la capa `(player)` contra la `(admin)`.
- Anti-fraude inicial: Implementación del Token Bucket limitando peticiones con Redis UI/API `utils/redis.ts`.
- Fingerprinting básico de dispositivos inyectado directamente logueando acceso contra `user_devices`.
- Documentos generados de arquitectura en `docs/sprint-0.md` y `docs/sprint-1.md`.
