# Plan de Implementación: Correcciones de Auditoría de Lógica de Juego (Mesa Primera)

## 1. Contexto y Motivación
Basado en el reporte `GAME_LOGIC_BEHAVIOR_ANALYSIS.md` y las decisiones de negocio tomadas por el usuario, este plan detalla los pasos para resolver las condiciones de carrera, bloqueos (deadlocks) y vulnerabilidades del Ledger en el servidor de juego (Colyseus).

## 2. Alcance e Impacto
**Archivos principales afectados:**
- `apps/game-server/src/rooms/ConnectionManager.ts`
- `apps/game-server/src/rooms/MesaRoom.ts`
- `apps/game-server/src/rooms/PotManager.ts` (si existe, o donde se calculen los side pots)
- `supabase/migrations/` (Nuevo RPC para transferencias atómicas)

**Riesgos mitigados:** C1, C2, C3, C4, M5, M7.
*(Nota: El riesgo C5 fue descartado ya que el comportamiento actual del Pique es el deseado por las reglas del negocio).*

## 3. Soluciones Acordadas y Arquitectura

### 3.1. Temporizadores y Timeouts (C1, M5)
- **Grace Period (C1):** Se reducirá el tiempo de espera por desconexión en `ConnectionManager.ts` de 300s (5 minutos) a **120s (2 minutos)**.
- **AFK / Timeout de Acción (M5):** Se implementará un temporizador de **120s (2 minutos)** para el turno de cada jugador. Si el jugador no actúa (Check, Call, Raise, Fold, Descarte), el servidor forzará una acción por defecto:
  - En fases de apuesta: Si puede hacer *Check*, hará *Check*. Si debe igualar una apuesta (*Call*), hará *Fold*.
  - En fase de descarte: Descartará 0 cartas.

### 3.2. Botes Varados por Desconexión Masiva (C3)
- Si la mano termina prematuramente porque *todos* los jugadores activos se han desconectado, el dinero del Bote Principal (Pot) y del Pique **no se perderá en la memoria de la sala**.
- Se implementará un mecanismo de **Reembolso Total (Refund)** hacia las wallets de los jugadores que contribuyeron al bote, utilizando funciones idempotentes para garantizar que el Ledger cuadre a cero.

### 3.3. Deadlock de Reconexión Competitiva (C2)
- **Prioridad al Socket (Opción B):** En el bloque `catch` de `allowReconnection` (cuando expira el timer), se añadirá una verificación estricta. Si el objeto `client` o `player` reporta que el usuario logró reconectarse en el último milisegundo (`player.connected === true`), **se cancelará la expulsión (`removePlayer`)**. El jugador mantendrá su asiento.

### 3.4. Apuestas contra Jugadores Desconectados (M7)
- **Side Pot por Desconexión (Opción B):** Si el Jugador A se desconecta y luego el Jugador B hace un *Raise*, el Jugador A no será foldeado automáticamente perdiendo su dinero.
- El sistema tratará al Jugador A como si hubiera hecho un **"All-In" implícito** por el monto que ya tenía en el bote.
- Se creará un *Side Pot* (Bote Secundario). El Jugador A (desconectado) solo competirá en el Showdown por el bote que logró igualar, mientras que B y otros jugadores activos competirán por el excedente en un bote aparte.

### 3.5. Aislamiento del Ledger y Banda Atómica (C4)
- **Análisis del Problema:** Actualmente, en `restartPique`, el servidor Node llama a `recordBet` (descuenta a los perdedores) y luego a `awardPot` (premia al ganador). Si el servidor se apaga/crashea entre ambas llamadas, el dinero desaparece del Ledger.
- **Solución Óptima (Atomicidad en BD):** Se creará un nuevo procedimiento almacenado (RPC) en Supabase (ej. `transfer_pique_banda`).
- Este RPC recibirá la lista de perdedores y el ganador, y realizará el débito y el crédito en una **única transacción de PostgreSQL**.
- Si el servidor crashea antes de llamar al RPC, nadie pierde dinero (rollback natural). Si crashea después o durante, PostgreSQL garantiza que el dinero cambie de manos completamente o no lo haga en absoluto. Esto cumple estrictamente con la habilidad `mesa-ledger-atomicity`.

## 4. Pasos de Implementación

1. **Paso 1 (Supabase):** Crear la migración SQL para el RPC `transfer_pique_banda` con lógica transaccional e idempotente. Probar el RPC.
2. **Paso 2 (Colyseus - Conexiones):** Actualizar `ConnectionManager.ts`. Cambiar el timer a 120s y añadir la guarda `if (player.connected) return;` en el catch del `allowReconnection`.
3. **Paso 3 (Colyseus - Timeouts):** Integrar un sistema de `setTimeout` o `clock` en el inicio del turno (`advanceTurnBetting`, `advanceTurnPhaseDescarte`). Al expirar (120s), ejecutar el comando de auto-acción y limpiar el timer.
4. **Paso 4 (Colyseus - Botes Varados):** Modificar `endHandEarlyAfterFoldOut` (o crear un flujo de limpieza equivalente) para ejecutar reembolsos (`refundPlayer`) cuando no hay jugadores activos conectados que puedan reclamar el bote.
5. **Paso 5 (Colyseus - Side Pots Desconectados):** Modificar la evaluación de apuestas en `advanceTurnBetting` para marcar a los jugadores desconectados como `isAllIn` si no pueden responder a un Raise, asegurando que el `PotManager` construya los Side Pots correctamente.
6. **Paso 6 (Integración Pique):** Reemplazar las múltiples llamadas `recordBet` y `awardPot` en `restartPique` por una única llamada al nuevo RPC `transfer_pique_banda`.

## 5. Verificación
- Escribir tests unitarios en Vitest (`apps/game-server/src/__tests__/`) para:
  - Expiración de turno (AFK) forza un Fold o Check.
  - Expiración de reconexión *después* de reconectar no expulsa al jugador.
  - El nuevo RPC transaccional del Ledger funciona y rechaza claves de idempotencia duplicadas.
  - Jugador desconectado hereda un Side Pot al enfrentar un Raise.