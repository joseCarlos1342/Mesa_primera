# Sprint 5 — Voz + Chat + Notificaciones + Replays

## Objetivos (COMPLETADOS)

Implementar un sistema de comunicación en tiempo real y componentes sociales (Voz y Texto), notificaciones para alertas del sistema (dentro y fuera de la app) y un visor de repeticiones (Replays) para la auditoría de partidas jugadas de "Mesa Primera".

## Funcionalidades Implementadas

1. **Chat de Voz de Baja Latencia (LiveKit)**: Integración con `@livekit/components-react` y autenticación segura con un endpoint en Next.js. Se construyó un botón Push-to-Talk (Mic Activo / Silenciado) responsivo y visualizador de ondas de audio (`AudioVisualizer`) directamente en el cliente.
2. **Servidor Socket.IO Independiente**: Para no sobrecargar Colyseus (puerto 2567), se levantó un servidor con namespaces propios para el Chat de Soporte y Notificaciones en el puerto 2568, optimizando el ancho de banda del servidor de juego.
3. **Chat de Soporte Técnico en Vivo**: Widget global flotante para los jugadores unido a la vista de "Inbox" en el lado del Panel de Administrador, permitiendo conversación directa entre usuarios y el staff en tiempo real.
4. **Notificaciones In-App (Campanita)**: Centro de notificaciones ubicado en el Header que escucha eventos emitidos tanto por operaciones de billetera como por mensajes globales del Staff a través de la red de Socket.IO (`/notifications`).
5. **Web Push Notifications (PWA)**: Implementación integral de notificaciones en segundo plano nativas (Android/Chrome/Safari). Se generaron claves VAPID, se adaptó el Service Worker (`public/sw.js`), y se construyó un "Worker" de **BullMQ** sobre el ecosistema Redis para que el servidor escale y envíe notificaciones masivas sin saturar el Main Thread.
6. **Timeline y Repeticiones de Juego (Replays)**: Integración en la lógica `MesaRoom` que captura todas las acciones y el seed criptográfico por cada mano, grabándolo al final del match en Supabase mediante llamadas directas. Se agregó la página de visor interactivo en la mesa para poder estudiar el paso a paso.
7. **Estabilización de Componentes**: Modificaciones estructurales importantes a la lógica de des-conexión del cliente Web y Server (Colyseus) usando `room.leave(true)` para detener el estado constante de "Mesa Lleno" cuando la pantalla del jugador es abandonaba sin intención.

## Funcionalidades Modificadas / Pospuestas

8. **Sound Effects (CDN)**: Los efectos de sonido se establecieron fuera del foco principal asincrónico para completarse como detalles/polish de UI en sprints venideros para no afectar el tamaño del bundle ni desincronizar los loops principales probados en local.

---

> NOTA: Todos los bugs de inestabilidad detectados en local por permisos de navegadores (micrófono en conexiones no-SSL móviles) y WebRTC timeouts se mitigaron utilizando robustez de flags React nativas en el diseño del componente principal de `VoiceChat.tsx`.
