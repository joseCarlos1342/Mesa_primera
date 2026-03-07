# Documentación de Fase: Sprint 0 (Setup & Foundation)

**Estado:** 100% Completado ✅

## Resumen del Sprint

El Sprint 0 estableció la base técnica, arquitectónica y de infraestructura para el proyecto "Mesa Primera" (Juego de Cartas Multijugador). Se configuraron los repositorios, las herramientas de desarrollo, múltiples servicios backend y la base de datos para soportar la arquitectura Dual-UI (Player y Admin).

## Hitos Completados

### 1. Monorepo y Frontend

- **Framework:** Se inicializó el proyecto con Next.js 16 (App Router), TypeScript y Tailwind CSS 4.
- **Estructura Dual-UI:** Se configuraron los route groups `(player)` y `(admin)` en `apps/web/src/app` para manejar las vistas independientes de jugadores y administradores.
- **PWA:** Configuración base para Mobile-First y Progressive Web App.

### 2. Infraestructura Backend

- **Colyseus Game Server:** Servidor autorizado separado del frontend, encargado exclusivamente de la lógica de juego real-time y de la sincronización de estados.
- **Express + Socket.IO:** Servidor adicional implementado para notificaciones globales y chat de soporte en tiempo real, aislando esta carga del game server principal.
- **Redis & BullMQ:** Se integró Redis para manejar el cacheo de sesiones y los snapshots de estado de Colyseus (permitiendo reconexión segura). BullMQ se configuró para manejar trabajos asíncronos en cola (como notificaciones push).

### 3. Base de Datos (Supabase)

- **Migraciones Iniciales (Esquema Completo):** Se crearon 15 tablas relacionales que soportan jugadores, admins, amistades, métricas, y un Ledger inmutable para auditoría financiera financiera.
- **Políticas RLS de Seguridad:** Se configuró rigurosamente Row-Level Security (RLS) estableciendo el principio de "Ceguera del Admin", donde el administrador es incapaz de leer por base de datos las cartas que posee un jugador.
- **Almacenamiento (Storage):** Buckets creados para recibir imágenes (v.g. comprobantes de depósitos).

### 4. Flujo de Desarrollo

- **Convenciones:** Configuración de `husky` y `commitlint` para asegurar la norma Conventional Commits en todo el proyecto.
- **Reglas del Proyecto (`.cursorrules`):** Definición clara de metodologías de trabajo, tests obligatorios y directivas de la arquitectura (uso del MCP y skills locales).

## Conclusión y Siguientes Pasos

Toda la base técnica requerida está lista y auditada. El proyecto se encuentra 100% apto para avanzar con el **Sprint 1**, el cual se enfocará en la autenticación OTP/2FA, el flujo de Wallet (depositos y retiros) y las protecciones Anti-Fraude.
