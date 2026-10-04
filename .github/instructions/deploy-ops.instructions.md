---
applyTo: "infra/**,docker-compose.yml,.github/workflows/**"
description: "Reglas de despliegue: VPS (systemd, Caddy, Redis 6380, Docker), CI con GitHub Actions y release seguro."
---

# Deploy / Ops / CI

## VPS
- Scripts y unidades en `infra/vps/` (`install.sh`, `mesa-deploy.sh`, `systemd/`).
- Cambios al runtime deben ser reversibles: documentar comando de rollback y mantener artefacto previo.
- Secretos separados en `/etc/mesa/deploy.env` y `/etc/mesa/runtime.env`,
  `root:root` con `chmod 600`. Nunca en git.
- En desarrollo Redis publica solo `127.0.0.1:6380`; en producción vive sin
  puertos publicados dentro de `mesa-internal` y requiere autenticación.
- Tras editar units: `systemctl daemon-reload`.
- Tras desplegar: smoke check (`/health`), Redis autenticado mediante
  `docker exec mesa-redis redis-cli -p 6380 --askpass PING`, `journalctl -u` y Caddy.

### CLIs de produccion (verificados)

| CLI | Version | Ubicacion | Notas |
|-----|---------|-----------|-------|
| `supabase` | 2.95.4 | `~/.local/bin/supabase` | Autenticado. Usar directo (no `npx`) |
| `vercel` | 50.37.3 | nvm global | Autenticado como `josecarlos1342` |
| `twilio` | 6.2.4 | `/usr/bin/twilio` | Sistema (node v20 bundled) |
| `lk` | 2.16.2 | `/usr/local/bin/lk` | El binario se llama `livekit-cli` pero **usa `lk`** (el nombre anterior esta deprecado) |
| `gh` | 2.91.0 | `/usr/bin/gh` | GitHub CLI |
| `redis-cli` | 8.0.6 | `/usr/bin/redis-cli` | Sistema |
| `psql` | 18.3 | `/usr/bin/psql` | PostgreSQL client |
| `node` | v24.14.1 | nvm | |
| `npm` | 11.11.0 | nvm | |
| `turbo` | 2.8.20 | workspace | Usar `pnpm exec turbo` |
| `playwright` | 1.58.2 | workspace | Usar `pnpm exec playwright` |
| Docker | 28.5.2 | `/usr/bin/docker` | **`docker compose` NO funciona** — usar `docker-compose` o `docker compose` via `dev.sh` |
| `supabase` (npx) | 2.84.4 | proyecto local | Version atrasada vs la global (2.95.4). Preferir la global |

### Gotcha: Redis port
El puerto canónico de Redis es **6380**. En desarrollo `docker-compose.yml`
mapea `127.0.0.1:6380:6379`; en producción Redis escucha en `6380` dentro de
la red privada `mesa-internal` y no publica ningún puerto al host.

## Releases cross-stack
- Migracion DB aditiva PRIMERO; luego codigo que la requiera.
- Cambios riesgosos detras de feature flag (off por defecto).
- Rollback web: promover deployment anterior en Vercel.
- Rollback game-server: script documentado en `docs/deployment/vps_actualizacion_motor.md`.
- Rollback DB: forward-only (compensating migration), nunca destructivo.
- Validar E2E + smoke en preview antes de promover.
- Monitorear logs y Web Vitals 30 min post-deploy.

## CI - GitHub Actions
- YAML en `.github/workflows/`.
- Para workflows nuevos o cambios mayores: cargar `github-actions-docs`.
- Preferir reusable workflows + matrices cuando aplique.

## Skills a cargar
- VPS / systemd / Caddy / Redis / secretos: `vps-hardening-and-runtime-ops`.
- Plan de release con rollback: `deployment-confidence-any-day`.
- CI / GitHub Actions: `github-actions-docs`.
- Performance budgets en CI: `performance-budget-and-web-vitals`.
