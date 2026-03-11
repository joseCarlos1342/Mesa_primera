# Resumen del Sprint 6 - Social: Amigos, Leaderboard y Estadísticas

## 🎯 Objetivo del Sprint

Implementar las funcionalidades sociales clave que permiten a los jugadores interactuar, medirse contra otros y hacer un seguimiento de su progreso a través de un sistema de estadísticas en tiempo real.

## 🛠 Funcionalidades Implementadas

### 1. Sistema de Amigos

- **Listado y Búsqueda:** Creación de la página `/friends` con un buscador de usuarios integrado.
- **Gestión de Solicitudes:** Capacidad para enviar, aceptar y rechazar invitaciones de amistad.
- **Backend:** Lógica apoyada por `social-actions.ts` interconectando la tabla relacional `friendships`.

### 2. Leaderboard (Tabla de Clasificación)

- **Top Ganadores:** Ranking de jugadores basado en las ganancias netas acumuladas (`total_won_cents`).
- **Mejor Racha:** Ranking que destaca a los usuarios con mayor cantidad de victorias consecutivas (`best_streak`).
- **Maestro de Primera:** Una métrica basada en habilidades, contando jugadas especiales (Primeras, Chivos, Segundas) logradas.
- **Backend:** Nueva función RPC en la base de datos `get_leaderboard` para consultas ultra-rápidas.

### 3. Estadísticas del Jugador

- **Panel Personal:** Creación de `/stats` que muestra _Win Rate_, ganancias netas e historial.
- **Evolución:** Un gráfico implementado puramente en CSS que dibuja la evolución de las ganancias recientes del usuario.
- **Motor del Juego:** El `MesaRoom.ts` de Colyseus ahora evalúa las cartas finales de todos en el _Showdown_ para detectar y almacenar de forma automática jugadas especiales en la base de datos al concluir una mano.

### 4. Sistema Anti-Colusión (Básico)

- **Cron Job:** Se desarrolló una tarea en el servidor de juegos (`src/cron/antiCollusion.ts`) ejecutada cada 2 horas que busca anomalías (jugadores que comparten mesa en +80% de sus juegos).
- **Alerta Oculta:** Inserta _flags_ de advertencia en `admin_audit_log` para que un operador los revise manualmente si nota un vaciado de cuentas sospechoso. (El diseño para una solución avanzada quedó documentado en `docs/mejoras_anti_colusion.md`).

## ⚙️ Base de Datos & Migraciones

- `20260310000009_sprint_6_social.sql`:
  - Se ajustó el nombre de columnas en `player_stats`.
  - Se agregaron columnas de racha (`current_streak`, `best_streak`) y de cantos (`primeras_count`, `chivos_count`, `segundas_count`).

## 🧪 Pruebas (Testing)

- Tests en Base de datos a través de `pgTAP` garantizando las migraciones.
- Creación de `e2e/social.spec.ts` bajo Playwright, el cual valora que todas las vistas de rutas `/friends`, `/leaderboard` y `/stats` se rendericen adecuadamente y estén protegidas para visitantes sin sesión.
