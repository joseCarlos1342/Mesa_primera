# 🃏 Mesa de Primera — Multiplayer Card Game Engine

> **Plataforma premium para el juego de cartas "Primera", construida con una arquitectura autoritativa en tiempo real, seguridad de grado bancario y una interfaz Dual-UI optimizada para adultos mayores.**

[![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20Colyseus%20%7C%20Supabase-blue)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)
[![PWA](https://img.shields.io/badge/PWA-Mobile--First-green)](#)

---

### 🏁 Estado para la Hackatón
**URLs de Producción para Evaluación:**
*   **Acceso Jugador (PWA):** [Abrir App](https://mesa-primera-cyjkpr7dh-josecarlos1342s-projects.vercel.app/player)
*   **Acceso Admin (Dashboard):** [Abrir Panel](https://mesa-primera-cyjkpr7dh-josecarlos1342s-projects.vercel.app/admin)

Para facilitar la evaluación por parte del jurado, se han aplicado las siguientes configuraciones temporales:

*   **Interfaz Optimizada para Mayores:** Notará que la interfaz de escritorio tiene un diseño con elementos inusualmente grandes, alto contraste y botones de gran escala. Esto **no es un error de diseño**, sino una decisión deliberada de accesibilidad (WCAG AAA) para nuestro público objetivo: personas mayores con agudeza visual reducida o dificultades motoras finas.
*   **Secciones Pendientes:** Debido al límite de tiempo de la hackatón, algunas secciones secundarias.

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

---

## 🏗 Arquitectura y Stack Tecnológico

El proyecto utiliza un stack moderno de microservicios coordinados para máxima escalabilidad:

| Componente | Tecnología | Propósito | Despliegue |
 | :--- | :--- | :--- | :--- |
 | **Frontend** | [Next.js 16](https://nextjs.org/) | Dual-UI (SSR/PWA), TailwindCSS 4. | **Vercel** |
 | **Game Server** | [Colyseus](https://colyseus.io/) | Motor de juego autoritativo, sync de estado. | **CubePath VPS** |
 | **BBDD & Auth** | [Supabase](https://supabase.com/) | PostgreSQL con RLS, Auth OTP SMS. | **Supabase Cloud** |
 | **Infraestructura** | [Redis](https://redis.io/) | Cache de sesiones y snapshots de juego. | **CubePath (Local)** |
 | **Real-Time** | [Socket.IO](https://socket.io/) | Chat de soporte y notificaciones. | **CubePath VPS** |
 | **Multimedia** | [LiveKit](https://livekit.io/) | Voz WebRTC en tiempo real. | **LiveKit Cloud** |

---

## 🗂 Estructura del Proyecto

```bash
mesa_primera/
├── apps/
│   ├── web/            # Frontend (Next.js)
│   └── game-server/    # Backend (Colyseus + Node.js)
├── packages/           # Lógica compartida y tipos.
└── supabase/           # Migraciones y políticas RLS.
```

---

## 🚀 Guía de Desarrollo

### Prerrequisitos
- Node.js 22 LTS o superior.
- Instancia de Redis activa.
- Proyecto Supabase configurado.

### Instalación
```bash
# 1. Clonar e instalar dependencias
npm install

# 2. Configurar variables de entorno
cp apps/web/.env.example apps/web/.env.local
cp apps/game-server/.env.example apps/game-server/.env.local

# 3. Iniciar entorno de desarrollo
npm run dev
```

---

## 🛡️ Seguridad & Auditoría

La integridad financiera se verifica mediante la fórmula:
`SUM(users.balance) === (SUM(ledger.credits) - SUM(ledger.debits))`

Un cron job ejecuta esta verificación cada hora. Cualquier discrepancia bloquea automáticamente las transacciones del sistema y alerta al administrador.

---
*© 2026 Mesa de Primera. Desarrollado con excelencia técnica para la Hackatón CubePath 2026.*
