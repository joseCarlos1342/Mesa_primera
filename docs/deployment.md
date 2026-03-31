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
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GAME_SERVER_URL`: `http://tu_ip_de_vps:2567`
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
4. Despliega.

## 4. Verificación
Una vez desplegado, accede a la URL de Vercel y verifica que puedes:
1. Iniciar sesión (OTP mediante Twilio).
2. Unirte a una mesa (comunicación con el Game Server en CubePath).
3. Chat de voz (LiveKit).
