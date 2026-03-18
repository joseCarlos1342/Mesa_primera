# Mesa de Primera - Plataforma de Juego Online

Plataforma premium para el juego de cartas "Primera", construida con una arquitectura escalable de microservicios y una interfaz de usuario de alto impacto.

## 🚀 Tecnologías Core

- **Frontend**: Next.js 16 (React 19) + Tailwind CSS + Framer Motion.
- **Backend de Juego**: Colyseus (Node.js) para lógica de cartas en tiempo real.
- **Base de Datos & Auth**: Supabase (Postgres).
- **Comunicación**: LiveKit (Voz en tiempo real) + Socket.io.
- **Infraestructura**: Redis + BullMQ para colas de transacciones.

## 🛠 Estructura del Monorepo

```bash
├── apps
│   ├── web          # Aplicación principal Next.js (Lobby, Tablero, Perfil)
│   └── game-server  # Servidor de salas Colyseus (Lógica de Primera)
├── packages
│   ├── ui           # Componentes compartidos de diseño
│   ├── eslint-config # Reglas de linting corporativas
│   └── typescript-config # Configuraciones de TS base
└── supabase         # Migraciones y políticas RLS
```

## 📋 Funcionalidades Recientes (Sprint Actual)

### Panel Administrativo Avanzado
- **Métricas Financieras**: Control total de fichas en plataforma y cálculo automático de Rake (ganancias de la casa).
- **Gestión de Mesas**: Interfaz para crear, configurar y eliminar mesas de juego dinámicamente.
- **Broadcast System**: Envío de notificaciones masivas a todos los usuarios en tiempo real.
- **Seguridad & Fraude**: Detección automática de usuarios compartiendo dispositivos (`fingerprinting`).

### Soporte & Monitoreo
- **Chat de Soporte**: Sistema de tickets agrupados por `ticket_id` para gestión de dudas de jugadores.
- **Ceguera Admin**: Los administradores pueden ver el estado del juego pero nunca las cartas de los jugadores.

## ⚙️ Desarrollo Local

### Requisitos
- Node.js 22+
- Docker (para Supabase/Redis local)

### Comandos
1. **Instalar dependencias**:
   ```sh
   npm install
   ```
2. **Levantar entorno de desarrollo**:
   ```sh
   npm run dev
   ```
   *Esto iniciará tanto la Web (port 3000) como el Game Server.*

3. **Construir para producción**:
   ```sh
   npx turbo build
   ```

## 🔒 Seguridad
La plataforma implementa **Row Level Security (RLS)** estricto en Postgres para asegurar que los saldos y las cartas solo sean accesibles por sus propietarios legales.

---
*© 2026 Mesa de Primera. Todos los derechos reservados.*
