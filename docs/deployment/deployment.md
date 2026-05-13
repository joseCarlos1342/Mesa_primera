# Guía de Despliegue — Hackatón CubePath 2026

Esta guía detalla los pasos para desplegar **Mesa de Primera** utilizando una arquitectura distribuida (Vercel + CubePath + Supabase).

## 1. Base de Datos (Supabase)
1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Aplica las migraciones localizadas en `./supabase/migrations/`.
3. Asegúrate de que las políticas RLS estén activas.
4. Obtén la `URL` y la `ANON_KEY`.

## 2. Backend (CubePath VPS)
1. Crea una instancia (VPS) en [CubePath](https://midu.link/cubepath).
2. Instala Docker y Redis:
   ```bash
   sudo apt update && sudo apt install docker.io redis-server -y
   ```
3. Clona el repositorio y navega a `apps/game-server`.
4. Crea un archivo `.env` con las siguientes variables:
   ```env
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   REDIS_URL=redis://localhost:6379
   GAME_SERVER_PORT=2567
   GAME_SERVER_URL=http://tu_ip_de_vps:2567
   ```
5. Construye y ejecuta el contenedor:
   ```bash
   docker build -t mesa-game-server .
   docker run -d -p 2567:2567 --name mesa-backend mesa-game-server
   ```

## 3. Frontend (Vercel)
1. Importa tu repositorio en [Vercel](https://vercel.com).
2. Configura el **Root Directory** como `apps/web`.
3. Añade las variables de entorno:
   - `APP_URL`: `https://primerariveradalos4ases.com`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave publica nueva `sb_publishable_...`). Se mantiene compatibilidad hacia atras con `NEXT_PUBLIC_SUPABASE_ANON_KEY` si el proyecto aun no migro.
   - `SUPABASE_SECRET_KEY` (clave secreta nueva `sb_secret_...`). Se mantiene compatibilidad con `SUPABASE_SERVICE_ROLE_KEY`.
   - `GAME_SERVER_URL`: `https://vps23830.cubepath.net`
   - `NEXT_PUBLIC_GAME_SERVER_URL`: `https://vps23830.cubepath.net`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://vps23830.cubepath.net`
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - Variables de Twilio para OTP (consumidas por Supabase Auth, no por la web): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`. El SMS se envia desde Supabase con el proveedor `twilio_verify` configurado en `supabase/config.toml`; la web **no** necesita `TWILIO_PHONE_NUMBER`.
4. Despliega.

> Si el proyecto Supabase deshabilito las legacy API keys, debes usar las nuevas `sb_publishable_*` y `sb_secret_*`. La app acepta ambos nombres de variable (nuevos y legacy) y prefiere los nuevos si ambos estan presentes.
> `APP_URL` es el origen canonico usado por los enlaces firmados de recuperacion admin. Debe coincidir con un redirect permitido en Supabase Auth.

## 4. Verificación
Una vez desplegado, accede a la URL de Vercel y verifica que puedes:
1. Iniciar sesión (OTP mediante Twilio).
2. Unirte a una mesa (comunicación con el Game Server en CubePath).
3. Chat de voz (LiveKit).
