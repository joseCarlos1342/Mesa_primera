<!-- prettier-ignore -->
<div align="center">

<img src="apps/web/public/icon-192x192.png" alt="" align="center" height="96" />

# Mesa de Primera

*Motor de juego de cartas multijugador en tiempo real para la tradicional "Primera" colombiana*

[![Build Status](https://img.shields.io/github/actions/workflow/status/joseCarlos1342/Mesa_primera/main.yml?style=flat-square&label=Build)](https://github.com/joseCarlos1342/Mesa_primera/actions)
![Node version](https://img.shields.io/badge/Node.js->=20-3c873a?style=flat-square)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Colyseus](https://img.shields.io/badge/Colyseus-0.17-blue?style=flat-square)](https://colyseus.io)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-V4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](#características)

[Descripción](#descripción) · [Características](#características) · [Arquitectura](#arquitectura) · [Inicio rápido](#inicio-rápido) · [Estructura del proyecto](#estructura-del-proyecto) · [Testing](#testing) · [Despliegue](#despliegue)

</div>

## Descripción

Mesa de Primera digitaliza el juego de cartas tradicional colombiano "Primera" (baraja española) en una plataforma multijugador full-stack en tiempo real. El motor de juego corre completamente en el servidor — los clientes son solo visuales — garantizando juego limpio mediante RNG criptográfico y aislamiento de estado.

La plataforma sirve a dos grupos de usuarios distintos mediante una arquitectura **Dual-UI**:

- **App del Jugador (PWA)** — Interfaz móvil táctil con botones grandes, alto contraste y flujos simplificados. Diseñada para **adultos mayores** siguiendo las pautas WCAG AAA.
- **Panel de Administración** — Consola de gestión completa para usuarios, billeteras, mesas y auditoría.

> [!NOTE]
> Cada decisión visual — botones sobredimensionados, tipografía en negrita, profundidad de navegación mínima — es una decisión deliberada de accesibilidad para usuarios con agudeza visual reducida o dificultades motrices finas.

## Características

**Motor de Juego Autoritativo**
- Lógica del lado del servidor vía salas Colyseus — el cliente nunca dicta el estado del juego
- Barajado Fisher-Yates con RNG `crypto.randomBytes`
- Aplicación automática de jerarquía de manos (Segunda > Chivo > Primera > Puntos)
- Periodo de gracia de 60 segundos para reconexión con snapshots en Redis

**Integridad Financiera**
- Ledger inmutable (`INSERT-ONLY`) — saldo = `SUM(créditos) - SUM(débitos)`
- Operaciones atómicas de apuesta/pago/comisión con RPCs de Supabase
- Herramientas de reconciliación para detectar discrepancias

**Seguridad Zero-Knowledge**
- Row Level Security (RLS) impone **Admin Blindness**: los admins no pueden ver manos activas
- Autenticación WebAuthn/passkey junto con PIN + OTP
- Algoritmos de detección de colusión mediante análisis programado por cron

**Comunicación en Tiempo Real**
- Chat de voz WebRTC vía LiveKit con latencia menor a 100ms
- Canal de soporte Socket.IO y notificaciones push
- Grabación y reproducción de partidas

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clientes                                │
│  ┌──────────────────┐          ┌──────────────────────────┐     │
│  │  Player PWA      │          │  Panel Admin             │     │
│  │  (Next.js 16)    │          │  (Next.js 16)            │     │
│  └────────┬─────────┘          └────────────┬─────────────┘     │
└───────────┼─────────────────────────────────┼───────────────────┘
            │ WebSocket + HTTPS               │ HTTPS
┌───────────▼─────────────────────────────────▼───────────────────┐
│                      Infraestructura                             │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Game Server      │  │  Redis 7     │  │  Supabase        │   │
│  │  (Colyseus)       │◄─┤  (Sesiones)  │  │  (Postgres+RLS)  │   │
│  │  Puerto 2567      │  │  Puerto 6380 │  │  Auth + Storage  │   │
│  └──────────────────┘  └──────────────┘  └──────────────────┘   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │  LiveKit Cloud    │  │  BullMQ Workers (Cron, Replays)     │ │
│  │  (Voz WebRTC)     │  │  web-push (Notificaciones)          │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| Frontend | Next.js 16, React 19, Tailwind V4 | SSR, PWA, Dual-UI |
| Motor de Juego | Colyseus 0.17 | Salas multijugador autoritativas |
| Base de Datos | Supabase (PostgreSQL) | RLS, Auth (OTP + WebAuthn), Ledger |
| Caché | Redis 7 | Persistencia de sesiones, snapshots de reconexión |
| Voz | LiveKit | Audio WebRTC en tiempo real |
| Trabajos | BullMQ, node-cron | Limpieza de replays, escaneos anti-colusión |
| Monorepo | Turborepo | Orquestación de builds, caché |

## Inicio rápido

### Prerrequisitos

- [Node.js](https://nodejs.org) >= 20
- [Docker](https://www.docker.com) (para Redis)
- Un proyecto de [Supabase](https://supabase.com) (local o en la nube)

### Configuración

```bash
# Clonar e instalar
git clone https://github.com/joseCarlos1342/Mesa_primera.git
cd Mesa_primera
npm install

# Iniciar Redis
docker compose up -d

# Configurar entorno
cp apps/web/.env.example apps/web/.env.local
cp apps/game-server/.env.example apps/game-server/.env.local
# Editar ambos archivos .env.local con tus credenciales de Supabase, Redis y LiveKit

# Ejecutar migraciones de base de datos
npx supabase db reset
npx supabase gen types typescript --local > apps/web/src/types/supabase.ts

# Iniciar desarrollo (web + game server en paralelo)
npm run dev
```

> [!TIP]
> El comando `npm run dev` usa Turborepo para iniciar la app Next.js y el servidor Colyseus concurrentemente.

### Variables de entorno requeridas

| Variable | Descripción |
| :--- | :--- |
| `REDIS_URL` | Cadena de conexión Redis (puerto por defecto `6380`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de service role de Supabase |
| `NEXT_PUBLIC_GAME_SERVER_URL` | URL del servidor Colyseus |
| `TWILIO_*` | Credenciales de Twilio para SMS/OTP |
| `LIVEKIT_*` | Credenciales de LiveKit para chat de voz |

## Estructura del proyecto

```
Mesa_primera/
├── apps/
│   ├── web/                    # Frontend Next.js 16
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (admin)/    # Rutas del panel admin
│   │       │   ├── (auth)/     # Login, registro, MFA, WebAuthn
│   │       │   ├── (player)/   # Páginas del jugador
│   │       │   ├── (legal)/    # Términos, privacidad
│   │       │   ├── play/[id]/  # Mesa de juego en vivo
│   │       │   └── actions/    # Server actions
│   │       ├── components/     # Componentes React
│   │       ├── hooks/          # Hooks personalizados
│   │       └── lib/            # Utilidades
│   └── game-server/            # Motor de juego Colyseus
│       └── src/
│           ├── rooms/          # MesaRoom (lógica del juego)
│           ├── schemas/        # Esquemas de sincronización de estado
│           ├── services/       # Servicios Supabase, Replay
│           ├── workers/        # Trabajos en segundo plano
│           └── cron/           # Programador anti-colusión
├── packages/
│   ├── eslint-config/          # Reglas de lint compartidas
│   ├── typescript-config/      # Configs TS compartidas
│   └── ui/                     # Librería de componentes compartida
├── supabase/
│   └── migrations/             # 40+ migraciones SQL (RLS, RPCs, Ledger)
├── e2e/                        # Tests E2E con Playwright
└── replays/                    # Archivo de replays de partidas
```

## Testing

El proyecto usa tres capas de testing:

```bash
# Tests unitarios — Web (Jest 30)
npm run test -- apps/web

# Tests unitarios — Game Server (Vitest 4)
npm run test -- apps/game-server

# End-to-end (Playwright)
npx playwright test
```

Las suites E2E cubren:

| Suite | Qué verifica |
| :--- | :--- |
| `admin-blindness` | RLS impide que el admin vea manos activas del jugador |
| `gameplay` | Unirse a mesa, estado del lobby, recuperación por desconexión |
| `security` | Rate limiting (50 clics rápidos), fingerprinting de dispositivos |
| `social` | Renderizado del leaderboard, sistema de amigos, gates de auth |

> [!IMPORTANT]
> Los server actions requieren un mínimo de 80% de cobertura de tests.

## Documentación del Administrador

El panel administrativo cuenta con documentación técnica completa en tres niveles:

| Documento | Descripción |
| :--- | :--- |
| [docs/ADMIN.md](docs/ADMIN.md) | Guía funcional completa — qué puede y qué no puede hacer el admin, por módulo |
| [docs/ADMIN_SECURITY.md](docs/ADMIN_SECURITY.md) | Autenticación MFA, RLS, admin blindness, ledger inmutable y modelo de amenazas |
| [docs/ADMIN_TECHNICAL.md](docs/ADMIN_TECHNICAL.md) | Referencia técnica: server actions, RPCs de Supabase, tipos TypeScript y componentes |

## Despliegue

| Componente | Plataforma |
| :--- | :--- |
| Frontend (Next.js) | **Vercel** |
| Game Server (Colyseus) | **VPS** (Docker + PM2) |
| Base de Datos | **Supabase Cloud** |
| Redis | **VPS** (Docker, puerto 6380) |
| Voz | **LiveKit Cloud** |

```bash
# Desplegar migraciones de base de datos a producción
npx supabase db push

# Build para producción
npm run build --workspace=web
```

> [!CAUTION]
> Siempre ejecuta `npx supabase db push` antes de desplegar cambios de frontend que dependan de nuevas migraciones.

Un cron job ejecuta esta verificación cada hora. Cualquier discrepancia bloquea automáticamente las transacciones del sistema y alerta al administrador.

---
*© 2026 Mesa de Primera. Desarrollado con excelencia técnica para la Hackatón CubePath 2026.*
