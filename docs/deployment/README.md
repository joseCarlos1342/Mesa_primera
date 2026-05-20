# Despliegue Canonico

Esta es la guia viva de despliegue de Mesa Primera. El stack operativo actual es:

- Web en Vercel.
- Game Server en VPS CubePath.
- Base de datos, Auth y Storage en Supabase.
- Redis para game-server, workers y colas.

## Topologia

- `apps/web`: Next.js 16 desplegado en Vercel.
- `apps/game-server`: Colyseus + Socket.IO + BullMQ desplegado en VPS.
- `supabase/migrations`: fuente de verdad del schema y las RPCs.

## Requisitos Previos

1. Proyecto Supabase creado y migraciones aplicadas.
2. Proyecto Vercel conectado al repo con `Root Directory = apps/web`.
3. VPS con Docker, Redis y acceso HTTPS/WSS para el servidor de juego.
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

GAME_SERVER_URL="https://vps23830.cubepath.net"
NEXT_PUBLIC_GAME_SERVER_URL="https://vps23830.cubepath.net"
NEXT_PUBLIC_SOCKET_URL="https://vps23830.cubepath.net"

LIVEKIT_URL="..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."

INTERNAL_API_SECRET="..."
NEXT_PUBLIC_TURNSTILE_SITE_KEY="..."
TURNSTILE_SECRET_KEY="..."

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

REDIS_URL="redis://localhost:6379"
REDIS_PORT="6379"

VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@tu-dominio.com"
```

Notas:

- `PORT` es Colyseus.
- `SOCKET_PORT` es el servidor Socket.IO auxiliar.
- Redis respalda presencia, workers y algunas integraciones del panel admin.

## Build y Deploy

### Web

1. Configurar Vercel con `apps/web` como root.
2. Build command: `pnpm run build`.
3. Instalar dependencias con `pnpm`.
4. Cargar todas las variables del bloque web.

### Game Server

1. Desplegar `apps/game-server` en la VPS.
2. Exponer `2567` para Colyseus y `2568` para Socket.IO.
3. Asegurar Redis accesible desde el runtime.
4. Verificar que el proceso tambien levante workers y cronjobs requeridos.

## Verificacion Post-Deploy

1. Abrir la URL publica de Vercel.
2. Verificar login de jugador, registro y recuperacion con Turnstile.
3. Verificar login admin con password + MFA.
4. Entrar al lobby, unirse a una mesa y confirmar conexion a Colyseus.
5. Confirmar soporte/notificaciones en Socket.IO.
6. Validar dashboard admin, ledger, replays y supervision.

## Runbooks Relacionados

- `docs/deployment/vps_actualizacion_motor.md`: operacion y actualizacion manual del motor.
- `docs/deployment/email-soporte-profesional.md`: configuracion del correo de soporte.
