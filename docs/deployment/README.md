# Despliegue Canonico

Esta es la guia viva de despliegue de Mesa Primera. El stack operativo actual es:

- Web en Vercel.
- Game Server en un VPS endurecido conforme al runbook del repositorio.
- Base de datos, Auth y Storage en Supabase.
- Redis para game-server, workers y colas.

## Topologia

- `apps/web`: Next.js 16 desplegado en Vercel.
- `apps/game-server`: Colyseus + Socket.IO + BullMQ desplegado en VPS.
- `supabase/migrations`: fuente de verdad del schema y las RPCs.

## Requisitos Previos

1. Proyecto Supabase creado y migraciones aplicadas.
2. Proyecto Vercel conectado al repo con `Root Directory = apps/web`.
3. VPS aprovisionado y validado con `docs/deployment/vps_actualizacion_motor.md`.
4. Variables de entorno configuradas en cada runtime.

## Variables de Entorno

### Web en Vercel

```env
APP_URL="https://primerariveradalos4ases.com"
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="legacy_anon_optional"
SUPABASE_SECRET_KEY="sb_secret_..."
SUPABASE_SERVICE_ROLE_KEY="legacy_service_optional"

GAME_SERVER_URL="https://game.example.com"
NEXT_PUBLIC_GAME_SERVER_URL="https://game.example.com"
NEXT_PUBLIC_SOCKET_URL="https://game.example.com"

LIVEKIT_URL="..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."

INTERNAL_API_SECRET="..."
NEXT_PUBLIC_TURNSTILE_SITE_KEY="..."
TURNSTILE_SECRET_KEY="..."
NEXT_PUBLIC_ONESIGNAL_APP_ID="01eec15a-d02d-46f8-be84-9a5e9c3158f0"

WEBAUTHN_RP_ID="..."
WEBAUTHN_ORIGINS="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

Notas:

- La web acepta claves nuevas y legacy de Supabase, pero prefiere `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`.
- `APP_URL` debe coincidir con los redirects permitidos en Supabase Auth.
- Cloudflare Turnstile protege login, registro y recuperacion publicos.

### Game Server en VPS

```env
HOST="0.0.0.0"
PORT="2567"
SOCKET_PORT="2568"

SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_or_service_role"

REDIS_URL="redis://default:<password-percent-encoded>@mesa-redis:6380"
REDIS_HOST="mesa-redis"
REDIS_PORT="6380"
REDIS_PASSWORD="<redis-password>"

# OneSignal (server-only; never expose the REST key to the web client)
ONESIGNAL_APP_ID="01eec15a-d02d-46f8-be84-9a5e9c3158f0"
ONESIGNAL_REST_API_KEY="<onesignal-rest-api-key>"
```

Notas:

- `PORT` es Colyseus.
- `SOCKET_PORT` es el servidor Socket.IO auxiliar.
- Redis respalda presencia, BullMQ y el dispatcher de notificaciones.
- `ONESIGNAL_REST_API_KEY` debe configurarse como secreto en el VPS. Nunca usar
  una clave VAPID hardcodeada ni reutilizar credenciales expuestas.

## Build y Deploy

### Web

1. Configurar Vercel con `apps/web` como root.
2. Build command: `pnpm run build`.
3. Instalar dependencias con `pnpm`.
4. Cargar todas las variables del bloque web.

### Game Server

1. Aprovisionar el VPS siguiendo el runbook seguro completo.
2. Publicar únicamente `80/443`; Caddy accede a `2567/2568` por loopback.
3. Mantener Redis sin puerto publicado en la red Docker `mesa-internal`.
4. Desplegar mediante `mesa-deploy.service`, no ejecutando Docker manualmente.
5. Verificar workers, cronjobs, health, WSS, backups y rollback.

## Verificacion Post-Deploy

1. Abrir la URL publica de Vercel.
2. Verificar login de jugador, registro y recuperacion con Turnstile.
3. Verificar login admin con password + MFA.
4. Entrar al lobby, unirse a una mesa y confirmar conexion a Colyseus.
5. Confirmar soporte/notificaciones en Socket.IO.
6. Validar dashboard admin, ledger, replays y supervision.

## Runbooks Relacionados

- `docs/deployment/vps_actualizacion_motor.md`: bootstrap seguro, hardening, operación y rollback.
- `docs/deployment/email-soporte-profesional.md`: configuracion del correo de soporte.

## Estado de reactivación del VPS

Actualmente el VPS del game-server está desactivado. La base de notificaciones ya
está aplicada y verificada en Supabase remoto, pero Push no podrá entregar avisos
hasta que vuelva a existir un runtime que ejecute el dispatcher y tenga acceso a
Redis, Supabase y OneSignal.

El `NEXT_PUBLIC_ONESIGNAL_APP_ID` ya está configurado en Vercel para Production y
Development. Las variables del game-server y el REST key siguen pendientes del
VPS; una Preview de Vercel deberá configurarse para la rama que se use cuando se
requiera probarla.

Pendientes antes de reactivar producción:

- [ ] Crear una instancia limpia; no restaurar una imagen de sistema no verificada.
- [ ] Crear `mesaops`, verificar sudo y endurecer SSH sin acceso root/remoto por contraseña.
- [ ] Activar firewall del proveedor, UFW, fail2ban y actualizaciones de seguridad.
- [ ] Instalar Docker, Redis privado, Caddy y backups conforme al runbook.
- [ ] Crear `/etc/mesa/runtime.env` con OneSignal, Supabase, Redis e internos.
- [ ] Configurar las nuevas URLs del game-server/socket en Vercel.
- [ ] Ejecutar `mesa-deploy.service` y validar health, WSS, Redis, logs y rollback.
- [ ] Probar una notificación transaccional con una cuenta de prueba, nunca con una audiencia real.

El procedimiento detallado y el rollback están en
`docs/deployment/vps_actualizacion_motor.md`.
