# Changelog

## [Sprint 2] - 2026-03-06

### Added

- **Colyseus State Machine (Motor Core)**: Se definieron e implementaron las 6 fases de la mesa (SORTEO_MANO, PIQUE, COMPLETAR, CANTICOS, GUERRA, SHOWDOWN).
- **Seguridad y Anti-Cheat**: Decorador `@filter` aplicado a los naipes para denegar red en el cliente (Admin Blindness). Reanudación ininterrumpida lograda con `allowReconnection(client, 60)`
- **Fisher-Yates Criptográfico**: Aleatoriedad fortalecida por `crypto.randomInt` y el auditor guardado internamente como `lastSeed`.
- **Lobby Operativo**: Frontend que interactúa sincrónicamente consultando `Game Server` para unirse o crear sub-salas "mesas".
- **API Server-Side Ledger**: Script `SupabaseService.ts` a nivel Colyseus capaz de inyectar balance (`Chips`), descontar Rake del 5% del pozo acumulado y alterar registro central sin confiar en las validaciones de Frontend.
- Documento de estado `docs/sprint-2.md`.
