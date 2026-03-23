# 🃏 Mesa de Primera — Multiplayer Card Game Engine

> **Plataforma premium para el juego de cartas "Primera", construida con una arquitectura autoritativa en tiempo real, seguridad de grado bancario y una interfaz Dual-UI optimizada para adultos mayores.**

[![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20Colyseus%20%7C%20Supabase-blue)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)
[![PWA](https://img.shields.io/badge/PWA-Mobile--First-green)](#)

---

## 📖 Visión General

Mesa de Primera no es solo un juego de cartas; es un ecosistema completo diseñado para digitalizar la experiencia tradicional de la "Primera" con naipe español. El proyecto se fundamenta en tres pilares técnicos innegociables:

1.  **Arquitectura Dual-UI:** Separación radical entre la experiencia táctil y simplificada del **Jugador (PWA)** y el centro de mando **Admin (Dashboard)**.
2.  **Motor Real-Time Autoritativo:** Lógica de juego procesada exclusivamente en el servidor mediante **Colyseus**, garantizando que el cliente nunca dicte el estado de la partida.
3.  **Seguridad Zero-Knowledge:** Implementación estricta de **Row Level Security (RLS)** y filtrado de estado para asegurar que nadie (ni siquiera el administrador) pueda ver las cartas ocultas durante una partida activa.

---

## ⚡ Características Principales

### 🎮 Gameplay de Alto Impacto
- **Motor de Cartas Inmune a Trampas:** Uso de RNG criptográfico (`crypto.randomBytes`) y barajeo Fisher-Yates seguro.
- **Jerarquía Estricta:** Manejo automático de jugadas (Segunda > Chivo > Primera > Puntos).
- **Reconexión Nativa:** Gracia de 60 segundos con restauración de estado mediante snapshots en **Redis**.
- **Voz sobre IP:** Integración de **LiveKit WebRTC** para chat de voz con latencia sub-100ms.

### 🛡️ Seguridad y Finanzas
- **Ledger Inmutable:** Libro mayor blindado que prohíbe `UPDATE` o `DELETE`, registrando cada movimiento de fichas al centavo.
- **Validación de Identidad:** Sistema de retiros vinculado estrictamente al `display_name` verificado.
- **Anti-Fraude Avanzado:** Device fingerprinting para detectar multi-cuentas y patrones de colusión.

### 👥 Ecosistema Social
- **Sistema de Amigos y Leaderboards:** Clasificaciones semanales por ganancias, rachas y jugadas especiales.
- **Replays Detallados:** Generación de timeline JSON para auditoría y resolución de disputas.
- **Soporte Integrado:** Chat directo Jugador ↔ Admin mediante namespaces de **Socket.IO**.

---

## 🏗 Arquitectura y Stack Tecnológico

El proyecto utiliza un stack moderno de microservicios coordinados para máxima escalabilidad:

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router) | Dual-UI (SSR/PWA), TailwindCSS 4. |
| **Game Server** | [Colyseus](https://colyseus.io/) | Motor de juego autoritativo, sync de estado. |
| **BBDD & Auth** | [Supabase](https://supabase.com/) | PostgreSQL con RLS, Auth OTP SMS (Twilio). |
| **Infraestructura** | [Redis](https://redis.io/) & [BullMQ](https://docs.bullmq.io/) | Cache de sesiones, rate limiting y colas de jobs. |
| **Real-Time** | [Socket.IO](https://socket.io/) | Chat de soporte y notificaciones push masivas. |
| **Multimedia** | [LiveKit](https://livekit.io/) | Voz WebRTC en tiempo real. |

---

## 🗂 Estructura del Proyecto

```bash
src/
├── app/
│   ├── (player)/       # 👤 Interfaz PWA: Lobby, Juego, Wallet, Stats.
│   ├── (admin)/        # 👑 Dashboard: Control de mesas, Ledger, Auditoría.
│   └── api/            # Webhooks y endpoints compartidos.
├── engine/             # ⚙️ Colyseus Game Rooms (Lógica inmutable).
├── services/           # Socket.IO (Chat/Notifs), LiveKit, Supabase SDK.
└── shared/
    ├── components/     # UI optimizada para accesibilidad (Adultos Mayores).
    ├── lib/            # RNG, validadores financieros, auditoría.
    └── types/          # Tipado estricto TS para el Ledger y el Estado.
```

---

## 🚀 Guía de Desarrollo

### Prerrequisitos
- Node.js 22 LTS o superior.
- Instancia de Redis activa.
- Proyecto Supabase configurado con el esquema de 15 tablas (ver `plan_primera.md`).

### Instalación
```bash
# 1. Clonar e instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local

# 3. Iniciar entorno de desarrollo (Hybrid: Next.js + Game Server)
npm run dev
```

### Convenciones de Desarrollo
- **Commits:** Uso obligatorio de [Conventional Commits](https://www.conventionalcommits.org/).
- **IA/Agent Workflow:** Uso estricto de MCPs (Context7) para evitar alucinaciones en APIs de terceros.
- **Accesibilidad:** Todo componente en `(player)` debe cumplir con WCAG AAA (alto contraste y botones >64px).

---

## 🛡️ Seguridad & Auditoría

La integridad financiera se verifica mediante la fórmula:
`SUM(users.balance) === (SUM(ledger.credits) - SUM(ledger.debits))`

Un cron job ejecuta esta verificación cada hora. Cualquier discrepancia bloquea automáticamente las transacciones del sistema y alerta al administrador.

---
*© 2026 Mesa de Primera. Desarrollado con excelencia técnica para una experiencia de juego justa y profesional.*

