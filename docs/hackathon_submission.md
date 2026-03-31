# 🃏 Primera — Juego de Cartas Multijugador en Tiempo Real

> "Más que un simple juego, una experiencia completa de casino social con arquitectura de nivel de producción."

## 💡 ¿Qué es "Primera"?
**Primera** es una plataforma de juego de cartas multijugador en tiempo real basada en el naipe español (PWA Mobile-First). No solo hemos desarrollado el motor del juego, sino todo un **ecosistema dual** (aplicación de Jugadores y panel de Administración) respaldado por un sistema transaccional robusto y seguro.

Nuestro objetivo en esta hackathon fue llevar la experiencia tradicional del juego de cartas de salón al mundo digital, manteniendo la confiabilidad, la velocidad y añadiendo la capa social del chat de voz.

---

## 🔗 Enlaces del Proyecto
* **Repositorio:** https://github.com/joseCarlos1342/Mesa_primera
**URLs de Producción para Evaluación:**
*   **Acceso Jugador (PWA):** [Abrir App](https://mesa-primera-web.vercel.app/login/player)
*   **Acceso Admin (Dashboard):** [Abrir Panel](https://mesa-primera-web.vercel.app/login/admin)

---

## 🛠️ ¿Cómo hemos utilizado CubePath?
Nuestro proyecto es altamente demandante a nivel de servidor y requiere infraestructura de grado de producción que no se limita a servir archivos estáticos. Hemos utilizado el VPS de **CubePath** como el corazón de nuestra arquitectura en tiempo real:

1. **Motor Multijugador (Node.js + Colyseus):** Alojado en el VPS de CubePath, mantiene el estado de la partida sincronizado de forma autoritativa (delta-compression) entre hasta 7 jugadores simultáneos garantizando latencia mínima gracias a WebSockets persistentes.
2. **Servidor de Voz (LiveKit WebRTC):** Desplegado de manera self-hosted en nuestro VPS para proveer chat de voz de alta calidad por proximidad en la mesa sin depender de servicios externos.
3. **Capa de Tráfico y Tareas (Redis + BullMQ):** Gestión en memoria de *state snapshots* para la reconexión instantánea de los jugadores y workers que procesan las transacciones seguras del Ledger.

El poder computacional y el control de red del VPS de CubePath nos permitió salir de las limitaciones de las plataformas *serverless* tradicionales, demostrando que es ideal para aplicaciones de gaming exigentes.

---

## ✨ Características Principales

*   🎮 **Colyseus Game Server:** Motor multijugador autoritativo (server-bound) con sincronización de estado y reconexión automática instantánea.
*   🎭 **Arquitectura Dual-UI:** Construido con Next.js App Router separando por completo la interfaz PWA para jugadores (Mobile-First) del Panel Múltiple de Administración (`/player` y `/admin`).
*   🔒 **Zero-Knowledge Admin & Anti-Fraude:** El motor del juego garantiza por RLS en Postgres y filtrado en Colyseus que **nadie** (ni los administradores ni usuarios inspeccionando la red) pueda ver las cartas boca abajo de otro jugador.
*   💰 **Ledger Inmutable:** Todas las operaciones y flujo de fichas se guardan en un Libro Mayor garantizando transacciones ACID, con Rake (comisión) automatizado transparente.
*   🎤 **Chat de Voz WebRTC (LiveKit):** Comunicación de baja latencia (20-100ms) entre los jugadores de la misma mesa para mantener el ambiente social del juego.
*   📱 **Zero-Password Auth:** Sistema de autenticación OTP vía SMS sin contraseñas para los jugadores, maximizando la fricción cero en el onboarding.
*   📼 **Sistema de Replays:** Historial de partidas y movimientos cronológicos guardados para revisión post-partida.

---

## 🏆 ¿Por qué este proyecto?
Hemos ido más allá de "hacer que las cartas se muevan". Nos enfrentamos a retos complejos como **manejar la desconexión esporádica** en redes móviles, asegurar la **integridad de una partida y de las fichas virtuales** bajo concurrencia, y crear un **diseño accesible y altamente contrastado** para jugadores, incluyendo adultos mayores.
