# Guía de Despliegue (Deploy) - Primera Card Game

El proyecto está diseñado para funcionar en un entorno distribuido:

- **Frontend (Web):** Alojado en Vercel (Next.js Edge Networking).
- **Backend (Game Server):** Alojado en Railway o AWS ECS usando Docker.
- **Base de Datos & Auth:** Alojados en Supabase (Cloud o self-hosted).

## Variables de Entorno Requeridas (`.env.production`)

Asegúrate de configurar estas variables en tus respectivos entornos (Vercel y Railway):

### Frontend (Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-llave-anonima-publica"
NEXT_PUBLIC_GAME_SERVER_URL="wss://game-server-v1.railway.app"
```

### Backend Game Server (Railway / ECS)

```env
HOST="0.0.0.0"
PORT=2567
SUPABASE_URL="https://[PROJECT_ID].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="tu-llave-secreta-de-servicio"
REDIS_URL="redis://default:password@railway.local:6379"
```

---

## Estrategia de Servidores

### 1. Base de Datos (Supabase)

Todo el sistema confía en Supabase para:

- Autenticación OTP y perfiles.
- Bases de datos (Transacciones financieras, Ledger, Amistades).
- No requiere deploy adicional si se usa Supabase Cloud.

### 2. Frontend (Vercel)

Al empujar la rama `main` a un repositorio de GitHub conectado a Vercel, asegúrate de:

1. Establecer el `Root Directory` en `apps/web`.
2. Asignar el comando de Build a `npm run build` o `pnpm run build`.
3. Inyectar las variables de entorno de producción.
4. Asignar tu dominio personalizado (ej. `juegaprimera.com`) forzando HTTPS y redirección www.

### 3. Game Server (Railway)

1. Conecta tu repositorio a un nuevo servicio en Railway.
2. Railway leerá automáticamente el `Dockerfile` situado en `apps/game-server/Dockerfile` si lo especificas en el "Root Directory" de build.
3. El servidor usa Colyseus sobre WebSockets. Asegúrate de configurar la variable `PORT=2567` para que Railway mapee el tráfico HTTPS/WSS interno.

---

## Verificación Post-Despliegue

Luego de desplegar ambos servicios, realiza estos pasos obligatorios como Admin:

1. Entra a la web e inicia sesión como tú.
2. Ingresa al panel de administración y crea una mesa de prueba.
3. Únete a la mesa de prueba y verifica que el WebSocket (`wss://`) conecta y la fase del juego empieza.
4. Ejecuta un script test que conecte clientes mediante Artillery o Playwright en Production para validar latencia.
