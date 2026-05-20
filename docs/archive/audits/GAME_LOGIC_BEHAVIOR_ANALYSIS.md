# Análisis de Comportamiento y Escenarios — Mesa Primera
## Motor de Juego (Colyseus) vs. Especificación de Auditoría

**Fecha:** Mayo 2026  
**Scope:** `apps/game-server/src/rooms/MesaRoom.ts` y fases relacionadas  
**Objetivo:** Identificar comportamientos posibles, escenarios de borde, brechas respecto a `GAME_LOGIC_AUDIT.md`, y riesgos reales del motor actual.

---

## 1. Flujo de Estados del Motor

### 1.1 Fases implementadas actualmente

```
LOBBY
  ↓ (countdown + auto-start)
SORTEO_MANO  (solo primera partida de la sesión)
  ↓
PIQUE_DEAL → PIQUE → PIQUE_REVEAL (condicional)
  ↓
COMPLETAR (2 cartas restantes a los activos)
  ↓
APUESTA_4_CARTAS
  ↓
DESCARTE
  ↓
REEMPLAZO_DESCARTE
  ↓
REVELAR_CARTA (bottom card)
  ↓
CANTICOS
  ↓
DECLARAR_JUEGO
  ↓ (0 juego → SHOWDOWN | 1 juego → SHOWDOWN | 2+ juego → GUERRA_JUEGO)
GUERRA
  ↓
GUERRA_JUEGO (si aplica)
  ↓
SHOWDOWN / SHOWDOWN_WAIT
  ↓
LOBBY (vía finalizeShowdown, awardPot o resetRoomState)
```

### 1.2 Fases propuestas por auditoría pero AUSENTES en código

| Fase Auditoría | Estado en Código |
|---|---|
| `ESPERA_JUGADORES (LOBBY_WAIT)` | Parcial — `LOBBY` existe pero no hay estado intermedio de "cuórum alcanzado, esperando countdown". El countdown arranca directamente cuando todos están listos. |
| `COBRO_ANTE_Y_VALIDACION (ANTE_COLLECTION)` | ❌ **No existe.** El pique (ante) se cobra *durante* la fase `PIQUE`, jugador por jugador, cuando dicen `"voy"`. No hay una fase previa de validación/reserva atómica de saldo. |
| `LIMPIEZA_RONDA (ROUND_CLEANUP)` | ❌ **No existe como fase.** La limpieza está distribuida en `finalizeShowdown()`, `awardPot()`, `endHandEarlyAfterFoldOut()`, `resetRoomState()` y `restartLobby()`. Si falla algo a mitad de la limpieza, el estado queda inconsistente. |
| `PAUSA_RECONEXION (GRACE_PERIOD)` | ❌ **No existe como fase transversal.** La reconexión se maneja en `onLeave` + `allowReconnection`, pero no hay un estado de sala que indique "el juego está pausado esperando a X". Los demás jugadores siguen viendo la fase normal. |

### 1.3 Riesgo de la falta de fase `COBRO_ANTE_Y_VALIDACION`

- **Qué dice la auditoría:** Antes de repartir, se debe cobrar obligatoriamente la ciega/ante. Jugadores sin saldo mínimo deben ser pasados a sit-out o expulsados.
- **Qué hace el código:** En `handleToggleReady` se bloquea `isReady` si `chips < minPique`. Pero no hay "reserva atómica" del saldo. Un jugador puede, en teoría, estar en otra mesa simultáneamente (si el front lo permite) y gastar su saldo antes de que arranque la partida.
- **Escenario problemático:**
  1. Jugador A entra a Mesa 1 con $1.000.000. Da "Listo".
  2. Jugador A entra a Mesa 2 con $1.000.000 (el saldo de la BD es el mismo). Da "Listo".
  3. Ambas mesas arrancan simultáneamente.
  4. En Mesa 1, A apuesta $500.000 en PIQUE. `recordBet` debita de la BD.
  5. En Mesa 2, A intenta apostar $500.000. `recordBet` falla con balance error. El motor lo foldea automáticamente.
  6. **Resultado:** A pierde su asiento en Mesa 2 sin haber jugado. Eso es "correcto" desde el ledger, pero la experiencia de usuario es mala y el `toggleReady` no prevenía la doble-reserva.

---

## 2. Escenarios de Estrés y Comportamiento Detallado

### 2.1 Unanimidad vs. "Early Win"

#### Escenario A: Todos pasan (Check) en `APUESTA_4_CARTAS`

- **Código:** `advanceTurnBetting` itera por `seatOrder`. Todos los jugadores activos tienen `hasActed = true` y `roundBet = 0 == currentMaxBet`.
- **Flujo:** El loop termina sin encontrar a nadie que necesite actuar. Se llama `refundUncalledBet()` (no-op). Luego `nextPhaseCallback()` que es `resolveAndStartDescarte()`.
- **Resultado:** ✅ **Correcto.** El pique se resuelve (`resolvePiqueAfterApuesta4`) y la mesa avanza a `DESCARTE`.

#### Escenario B: Todos se retiran menos 1 (Fold to 1)

- **Código:** En `advanceTurnBetting`:
  ```typescript
  const activePlayers = ...filter(p => !p.isFolded && p.connected);
  if (activePlayers.length <= 1) {
      this.refundUncalledBet();
      if (this.state.phase === 'APUESTA_4_CARTAS') this.resolvePiqueAfterApuesta4();
      if (this.state.pot === 0 && activePlayers.length === 0 && this.state.piquePot === 0) {
          this.endHandEarlyAfterFoldOut(); return;
      }
      if (nextPhaseCallback) nextPhaseCallback();
      else this.startPhase6Showdown();
      return;
  }
  ```
- **Sub-escenarios:**

| # | Situación | Comportamiento del Motor | ¿Correcto? |
|---|---|---|---|
| B1 | Queda 1 jugador activo + conectado, pot > 0 | Va a `nextPhaseCallback` → `resolveAndStartDescarte` → ve que `remaining.length <= 1` → `endHandEarlyAfterFoldOut` → entrega pot al único jugador | ✅ Sí |
| B2 | Queda 1 jugador activo pero **desconectado**, pot > 0 | `activePlayers.length = 0` (porque filtra `connected`). No entra a `endHandEarlyAfterFoldOut` inmediato. Va a `nextPhaseCallback` → `resolveAndStartDescarte` → `remaining` también filtra `connected` → `remaining.length = 0` → `endHandEarlyAfterFoldOut` → NO entrega nada (no hay jugadores conectados). | ⚠️ **Pot varado** hasta que alguien se reconecte o la sala se destruya. |
| B3 | Queda 0 jugadores activos, piquePot > 0, pot = 0 | `activePlayers.length = 0`, `pot = 0`, `piquePot > 0`. No entra al `if (pot === 0 ...)`. Llama `nextPhaseCallback` → `resolveAndStartDescarte` → `remaining = 0` → `endHandEarlyAfterFoldOut` → el pique no se resuelve porque `remaining.length` no es > 0. | ❌ **Pique varado.** |

- **Conclusión:** El Early Win funciona bien cuando hay al menos 1 jugador conectado. Si **todos** los jugadores activos se desconectan, los pots (principal y pique) quedan varados en memoria.

### 2.2 Fractura de Acciones y Ciclo de Turnos (Raise reabre)

#### Escenario: 5 de 6 pasan. El 6º hace Raise.

- **Código en `PlayerActionCommand` para `"voy"` (Raise):**
  ```typescript
  r.state.currentMaxBet = player.roundBet;
  r.state.highestBetPlayerId = client.sessionId;
  player.hasActed = true;
  ```
- **Código en `advanceTurnBetting`:**
  ```typescript
  if (p.connected && !p.isFolded && !p.isAllIn && !p.passedWithJuego && !p.declinedGuerraJuegoBet &&
      (!p.hasActed || p.roundBet < this.state.currentMaxBet)) {
      this.state.turnPlayerId = id;
      return;
  }
  ```
- **Comportamiento:** Los 5 jugadores que ya habían actuado (`hasActed = true`) tienen `roundBet = 0`, que es menor que el nuevo `currentMaxBet`. El loop los seleccionará nuevamente en orden cíclico.
- **Resultado:** ✅ **Correcto.** Todos los que actuaron antes del Raise deben re-actuar (igualar o foldear).

#### Escenario crítico: Raise en el último índice físico

- **Auditoría (Deadlock 4.1):** Si el Jugador 7 (último en la lista) hace Raise y el código usa `if (currentIndex === players.length - 1)` para cerrar la fase, se produce un deadlock con apuestas sin igualar.
- **Código actual:** **NO** usa `currentIndex === length - 1`. Usa la condición de necesidad de actuar (`roundBet < currentMaxBet`).
- **Resultado:** ✅ **Este deadlock específico no existe.**

#### Brecha: Jugador desconectado que debe reaccionar a un Raise

- **Escenario:** Jugador 3 hizo Check. Jugador 6 hace Raise. Le toca a Jugador 3, pero Jugador 3 se desconectó.
- **Código:** `advanceTurnBetting` salta a Jugador 3 porque `p.connected === false`.
- **Pero:** El dinero que Jugador 3 ya apostó en esa ronda (`roundBet`) sigue en el pot. No tiene que igualar el Raise.
- **Resultado:** ⚠️ **Económicamente injusto.** Jugador 3 se beneficia de no tener que defender su apuesta previa. Un jugador consciente podría forzar desconexiones estratégicas (aunque difícil de explotar sistemáticamente).

### 2.3 Fondos Insuficientes (All-in) y Side Pots

#### Escenario: Jugador A apuesta 100. Jugador B tiene 30 y va All-in.

- **Código en `"igualar"`:**
  ```typescript
  const callAmount = r.state.currentMaxBet - player.roundBet; // 100 - 0 = 100
  const actualCall = Math.min(callAmount, player.chips);       // min(100, 30) = 30
  player.chips -= actualCall;                                  // 0
  player.roundBet += actualCall;                               // 30
  player.totalMainBet += actualCall;                           // 30
  if (actualCall < callAmount) player.isAllIn = true;
  ```
- **En Showdown:**
  ```typescript
  const sidePots = r.calculateSidePots(activePlayers);
  ```
  `calculateSidePots` ordena por `totalMainBet` ascendente:
  - Jugador B: 30
  - Jugador A: 100
  - Niveles: 30, 100
  - Side Pot 1: `(30 - 0) * 2 = 60` (elegibles: A y B)
  - Side Pot 2: `(100 - 30) * 1 = 70` (elegible: solo A)
- **Resultado:** ✅ **Side pots implementados correctamente.**

#### Comportamiento del Pique (pot secundario) con Side Pots

- **Código en `persistShowdownResults`:**
  ```typescript
  const piqueRake = Math.ceil(this.state.piquePot * 0.05 / 100) * 100;
  const piquePayout = this.state.piquePot - piqueRake;
  if (piquePayout > 0) {
      winner.chips += piquePayout; // winner = overallWinnerId
      totalPayout += piquePayout;
  }
  ```
- **Observación:** El `piquePot` siempre va al `overallWinnerId` (ganador del side pot más grande / último). No se particiona por side pots.
- **¿Es un bug?** Depende de las reglas de Primera. Normalmente el pique es un pot separado que se resuelve por jerarquía de juego (SEGUNDA > CHIVO > PRIMERA) o por proximidad a la Mano. En este código, si el pique no se resolvió antes (por ejemplo, en `APUESTA_4_CARTAS` con `passedWithJuego`), se le suma al ganador del main pot.
- **Resultado:** ⚠️ **Comportamiento no estándar.** El pique debería resolverse por sus propias reglas, no heredarse al ganador del main pot. Esto puede hacer que un jugador con una mano mala en el main pot gane el pique solo porque ganó el pot principal.

### 2.4 Interrupción de Red y Sincronización

#### Escenario: Cliente pierde conexión justo al enviar una apuesta

- **Código (`handleConnectionLeave`):**
  - `player.connected = false`
  - `await r.allowReconnection(client, 300)` // 300 segundos = 5 minutos
  - Si reconecta: reenvía estado completo + cartas privadas + config.
  - Si expira: `removePlayer(client.sessionId)`.
- **Auditoría dice:** Grace period estricto de 60 segundos.
- **Código actual:** Usa **300 segundos** (5 minutos).
- **Resultado:** ❌ **Desajuste crítico.** Las mesas se congelan esperando a jugadores desconectados por hasta 5 minutos. Eso es 5x más que lo especificado.

#### Idempotencia de acciones tras reconexión

- **Código:** Al reconectar, el cliente recibe el estado completo de la sala (`Room.state` de Colyseus). Las cartas privadas se reenvían vía `client.send("private-cards", cards)`.
- **¿El cliente puede re-emitir una acción al renderizar?** Depende del frontend. El backend tiene protección contra doble procesamiento:
  ```typescript
  if (player.hasActed) {
      console.warn(`...ya actuó en esta ronda... Ignorando duplicado.`);
      return;
  }
  ```
- **Resultado:** ✅ **Protegido en backend.** Aunque el frontend envíe duplicados, el servidor los ignora si `hasActed = true`.

#### Escenario: Reconexión competitiva (Timer Race Condition) — Auditoría Deadlock 4.3

- **Escenario paso a paso:**
  1. Jugador X se desconecta.
  2. `onLeave` inicia `allowReconnection(client, 300)`.
  3. A los 299.9 segundos, X reconecta por WebSocket. Colyseus acepta la conexión, `player.connected = true`.
  4. A los 300 segundos, la promesa de `allowReconnection` rechaza (timer expirado).
  5. El `catch` ejecuta `removePlayer(client.sessionId)`.
  6. Pero X ya está conectado y su `Player` existe.
- **Resultado:** ❌ **Riesgo REAL.** `removePlayer` elimina al jugador de `state.players` y `seatOrder`, pero su WebSocket sigue vivo. La sala entra en un estado corrupto: un cliente conectado sin objeto `Player` asociado. Si el turno recae sobre un `sessionId` que ya no existe, o si el jugador intenta actuar, pueden ocurrir errores de `undefined` o congelamiento.

---

## 3. Matriz de Resultados y Riesgos Actualizada

| Acción del Jugador | Fase Actual | Comportamiento Esperado | Riesgo de Bug / Fallo Lógico | Impacto Económico / Estado |
|---|---|---|---|---|
| **Join / Buy-in** | `LOBBY` | Reserva atómica de saldo en BD | ❌ No hay reserva atómica. Saldo solo se debita al apostar. Race condition si un jugador entra a múltiples mesas. | Posible doble-gasto si el front permite múltiples mesas. |
| **Fold** | `APUESTA_4_CARTAS` / `GUERRA` | Early Win si queda 1 activo | ⚠️ Si el último activo está desconectado, el pot queda varado. | Pot no entregado hasta reconexión o destrucción de sala. |
| **Raise** | `GUERRA` / `CANTICOS` | Reabrir turnos para jugadores previos | ✅ Correcto. `roundBet < currentMaxBet` fuerza re-acción. | — |
| **Raise + desconexión de otro** | Cualquier apuesta | El desconectado debe igualar o foldear | ❌ El desconectado se salta. No paga el Raise. Su apuesta previa queda en el pot. | Ventaja injusta para el desconectado. |
| **All-in** | Cualquier apuesta | Side pots por `totalMainBet` | ✅ Correcto para main pot. | Pique no particiona por side pots. |
| **Desconexión** | Cualquiera | Grace period 60s + re-sincronización | ❌ Grace period es 300s (5 min). | Mesas congeladas por 5 min. |
| **Reconexión en instante de expiración** | Cualquiera | Estado restaurado limpiamente | ❌ Race condition: `removePlayer` puede ejecutarse DESPUÉS de reconexión exitosa. | Estado corrupto (cliente vivo sin Player). |
| **Timeout (sin acción)** | `DESCARTE` | Auto-fold o descartar 0 después de X segundos | ❌ **No existe timeout.** | Si un jugador nunca actúa y nunca se desconecta (edge case del transport), la fase no avanza. |
| **Desconexión en PIQUE** | `PIQUE` | Auto-paso o esperar grace period | ⚠️ Se salta al desconectado. Tratado como fold implícito sin cobro de banda. | Jugador evita pagar banda si se desconecta antes de actuar. |
| **Desconexión en SHOWDOWN** | `SHOWDOWN` | Server authorizes payout, avanza a LOBBY | ⚠️ Payout es inmediato, pero la fase no avanza a LOBBY hasta `dismiss-showdown`. | Si nadie envía `dismiss-showdown`, la sala se queda en SHOWDOWN para siempre. |
| **Banda (pique reiniciado)** | `PIQUE` (restart) | Cobrar banda a pasadores, dar al voy | ⚠️ `recordBet` + `awardPot` no son atómicos. | Si el servidor se cae entre ambas operaciones, la banda desaparece del ledger. |

---

## 4. Deadlocks y Puntos Críticos de Bloqueo (Verificación en Código)

### 4.1 Deadlock por Cierre Falso de Ciclo (Unmatched Bet)

- **Auditoría:** `if (currentIndex === players.length - 1)` para cerrar fase.
- **Código actual:** No existe esta lógica. Se usa la condición de necesidad de actuar.
- **Veredicto:** ✅ **No aplica.**

### 4.2 Deadlock de Jugador Desconectado en Fase Pasiva (Ghost Awaiting)

- **Auditoría:** Motor espera `ACK_ANIMATION_DONE` del cliente para avanzar de `SHOWDOWN`.
- **Código actual:** `ShowdownPhase.enter()` ejecuta `persistShowdownResults()` inmediatamente (server-authoritative). No espera ACK.
- **Pero:** `handleDismissShowdown` es necesario para transicionar a `LOBBY`. Si nadie lo envía, la sala permanece en `SHOWDOWN`.
- **Veredicto:** ⚠️ **Mitigado parcialmente.** El dinero se paga, pero la mesa no se libera.

### 4.3 Deadlock de Reconexión Competitiva (Timer Race Condition)

- **Auditoría:** Timer de 60s expira justo cuando el cliente se reconecta.
- **Código actual:** `allowReconnection(client, 300)` con catch que ejecuta `removePlayer` incondicionalmente.
- **Escenario crítico:** El catch puede ejecutarse después de una reconexión exitosa.
- **Veredicto:** ❌ **Riesgo REAL no mitigado.**

### 4.4 Deadlock de Bote Vacío (Zero-Sum Halt)

- **Auditoría:** Si tras cobro de ante queda 1 jugador, el motor debe abortar.
- **Código actual:** `restartPique()` tiene protección:
  ```typescript
  if (seatedConnected.length < 2 || this.piqueRestartCount > MesaRoom.MAX_PIQUE_RESTARTS) {
      // ... aborta y vuelve a LOBBY
  }
  ```
  `afterPiqueResolution()` maneja `remaining.length === 1` y `=== 0`.
- **Veredicto:** ✅ **Mitigado.**

### 4.5 Deadlock Nuevo: Pots Varados por Desconexión Masiva

- **Escenario:** En `APUESTA_4_CARTAS`, todos los jugadores activos se desconectan. Queda pot > 0 y/o piquePot > 0.
- **Código:** `advanceTurnBetting` filtra por `p.connected`. Si nadie está conectado, `activePlayers.length = 0`. Va a `nextPhaseCallback`. Si es `APUESTA_4_CARTAS`, va a `resolveAndStartDescarte`. `remaining` también filtra `connected` → 0. Va a `endHandEarlyAfterFoldOut`. En `endHandEarlyAfterFoldOut`, `remaining.length` no es 1, así que no entrega el pot. El `setTimeout` de 3s limpia y va a LOBBY, pero **sin devolver el pot a nadie**.
- **Veredicto:** ❌ **Nuevo deadlock económico.** El dinero desaparece del estado de la sala (pot = 0) pero no se acredita a nadie en el ledger.

---

## 5. Escenarios Adicionales y Comportamientos Sospechosos

### 5.1 Falta de timeouts de acción

- **¿Existe algún cronómetro que foldee automáticamente a un jugador que no actúa?**
  - `PIQUE`: No.
  - `APUESTA_4_CARTAS`: No.
  - `DESCARTE`: No.
  - `CANTICOS`: No.
  - `DECLARAR_JUEGO`: No.
  - `GUERRA`: No.
  - `GUERRA_JUEGO`: No.
  - `SHOWDOWN_WAIT`: No (sin timer).
  - `PIQUE_REVEAL`: No.
- **Impacto:** Un jugador que nunca actúa y nunca se desconecta (por ejemplo, su navegador se congela pero el WebSocket sigue abierto) bloquea la mesa indefinidamente.
- **Nota:** En fases donde `advanceTurnBetting` o `advanceTurnPhaseDescarte` saltan a desconectados, si TODOS están desconectados la fase avanza o va a showdown. Pero si al menos 1 está conectado y no actúa, la mesa se congela.

### 5.2 `removePlayer` no sanitiza `dealerId`

- **Código:** `removePlayer` elimina al jugador de `state.players` y `seatOrder`.
- **Si el jugador removido era `dealerId`:** El código NO actualiza `dealerId` inmediatamente. Lo deja apuntando a un `sessionId` huérfano.
- **Impacto:**
  - `assignTurnOrders` usa `this.state.activeManoId || this.state.dealerId`. Si ambos son huérfanos, `manoSeatIdx = -1` y retorna sin asignar turnos.
  - `transferMano()` inicia con `currentSeatIdx = -1` y retorna inmediatamente.
  - `advanceTurnBetting` con `startSeatIdx = -1` entra al guard y salta a `nextPhaseCallback` o `showdown` prematuramente.
- **Escenario:** Jugador A es La Mano. Se va (consented). `removePlayer` lo borra. `dealerId` sigue siendo A. Nadie puede ser La Mano. La mesa avanza fases sin turnos definidos.

### 5.3 Pique diferido y jugadores desconectados

- **Escenario:** En `APUESTA_4_CARTAS`, Jugador X pasa con juego (`passedWithJuego = true`) y luego se desconecta.
- **En `resolvePiqueAfterApuesta4`:**
  ```typescript
  const contestants = Array.from(this.state.players.values()).filter(p => p.passedWithJuego);
  ```
  **No filtra por `connected`.**
- **Resultado:** Un jugador desconectado puede ganar el pique diferido. Sus fichas se incrementan (`chips += piquePayout`), pero si nunca vuelve, ese dinero queda en su banda fantasma.
- **Impacto:** El pique se paga a un jugador inactivo. Si la sala se destruye, esas fichas nunca se reembolsan (porque el refund en `onDispose` usa `totalMainBet`, no `chips`).

### 5.4 `handleDismissShowdown` con `pendingShowdownData = null`

- **Cuándo ocurre:** Cuando `ShowdownPhase.enter()` encuentra `activePlayers.length === 1` y `state.pot === 0`.
- **Código:**
  ```typescript
  if (!r.pendingShowdownData) {
      const winner = Array.from(...).find((p) => !p.isFolded && p.connected);
      if (winner) { r.awardPot(winner.id); }
      return;
  }
  ```
- **Problema:** `awardPot` asume que hay dinero para dar. Con `pot = 0`, hace `payout = 0`. Luego guarda replay y actualiza stats marcando a este jugador como ganador (`isWinner = true`) con `payout = 0`.
- **Impacto:** Contamina las estadísticas del jugador con una victoria fantasma de $0.

### 5.5 Inconsistencia: `endHandEarlyAfterFoldOut` vs `endHandEarly`

- **`endHandEarlyAfterFoldOut`:**
  - Resuelve pique entre jugadores restantes (usando `evaluateHand`).
  - Entrega pot al último jugador si `remaining.length === 1`.
  - Usa `setTimeout(() => { ... ir a LOBBY }, 3000)`.
- **`endHandEarly`:**
  - Solo pone la fase en `SHOWDOWN_WAIT` si hay un ganador.
  - Si no hay ganador, va directo a `LOBBY`.
  - No resuelve pique.
- **¿Cuándo se llama cada uno?**
  - `endHandEarlyAfterFoldOut`: Desde `afterPiqueResolution` (cuando quedan 0 o 1 tras pique), desde `resolveAndStartDescarte` (cuando quedan <= 1 tras apuestas), desde `advanceTurnBetting` (cuando pot = 0 y nadie queda).
  - `endHandEarly`: No está claro quién lo llama. Parece un método huérfano o llamado desde código del front.
- **Riesgo:** Tener dos métodos con nombres similares pero comportamientos diferentes puede llevar a usar el incorrecto en una refactorización futura.

### 5.6 Banda no atómica en `restartPique`

- **Código:**
  ```typescript
  // Paso 1: Debitar banda de cada pasador
  SupabaseService.recordBet(passedPlayer.supabaseUserId, actualBanda, ...);
  // Paso 2: Acreditar total al voy
  SupabaseService.awardPot(voyPlayer.supabaseUserId, totalBanda, 0, ...);
  ```
- **Problema:** Si el proceso de Node.js se cae entre Paso 1 y Paso 2, las bandas fueron debitadas pero nunca acreditadas al ganador.
- **Mitigación parcial:** `onDispose` hace refund de `totalMainBet`, pero las bandas no están en `totalMainBet`. Son apuestas separadas.
- **Impacto:** Fuga de dinero real del ledger en caso de crash del servidor.

### 5.7 `refundUncalledBet` y jugadores desconectados

- **Escenario:** Jugador A hizo Raise a 100. Jugador B se desconectó antes de igualar. Nadie más iguala.
- **Código:** `refundUncalledBet` encuentra que `highest = 100`, `secondHighest = 0`. `uncalled = 100`.
- **Devuelve 100 a Jugador A.**
- **Pero:** El pot principal (`state.pot`) se reduce en 100. El ledger se revierte vía `SupabaseService.refundPlayer`.
- **Resultado:** ✅ Correcto económicamente. El Raise sin respuesta se anula.

---

## 6. Hallazgos Clasificados por Severidad

### 🔴 Críticos (Requieren corrección inmediata)

| # | Hallazgo | Archivo(s) | Línea(s) aprox. |
|---|---|---|---|
| C1 | **Grace period de 300s en lugar de 60s.** Las mesas se congelan 5 minutos. | `ConnectionManager.ts` | 287 |
| C2 | **Race condition en reconexión:** `removePlayer` en catch de `allowReconnection` no verifica si el jugador ya se reconectó. | `ConnectionManager.ts` | 311-319 |
| C3 | **Pot/Pique varado si todos se desconectan en fase de apuesta.** El dinero no se devuelve a nadie ni se acredita. | `MesaRoom.ts` | 1042-1054, 964-1039 |
| C4 | **Banda no atómica:** `recordBet` + `awardPot` separados en `restartPique`. Crash entre medias = fuga de dinero. | `MesaRoom.ts` | 727-738 |
| C5 | **Pique va al `overallWinnerId` en showdown, no se resuelve por jerarquía independiente.** Rompe las reglas de Primera si hay pique sin resolver. | `ShowdownPhase.ts` | 141-142 |

### 🟡 Medios (Deben corregirse en próximo sprint)

| # | Hallazgo | Archivo(s) |
|---|---|---|
| M1 | Falta fase dedicada `COBRO_ANTE_Y_VALIDACION`. | `MesaRoom.ts` |
| M2 | Falta fase dedicada `LIMPIEZA_RONDA`. | Varios |
| M3 | `removePlayer` no sanitiza `dealerId` si el jugador removido era dealer. | `MesaRoom.ts` |
| M4 | `handleDismissShowdown` con `pendingShowdownData = null` da victoria fantasma. | `ShowdownCommand.ts` |
| M5 | No hay timeout de acción en ninguna fase. Un jugador con WebSocket zombie bloquea la mesa. | Varios |
| M6 | Jugador desconectado en PIQUE se salta sin pagar banda. | `MesaRoom.ts` |
| M7 | Jugador desconectado que debe reaccionar a Raise se salta sin igualar. | `MesaRoom.ts` |

### 🟢 Correctos (Funcionan bien)

| # | Comportamiento | Evidencia |
|---|---|---|
| OK1 | Side pots para main pot funcionan correctamente. | `PotManager.ts` + tests |
| OK2 | Raise reabre turnos para jugadores previos. | `advanceTurnBetting` |
| OK3 | Early Win (fold to 1) cuando hay jugador conectado. | `endHandEarlyAfterFoldOut` |
| OK4 | Re-sincronización completa de estado en reconexión. | `ConnectionManager.ts` |
| OK5 | Server-authoritative payout (no espera ACK del cliente). | `ShowdownPhase.ts` |
| OK6 | Protección contra bucle infinito en `restartPique`. | `MAX_PIQUE_RESTARTS` |
| OK7 | Doble procesamiento de acciones protegido por `hasActed`. | `PlayerActionCommand.ts` |

---

## 7. Escenarios Recomendados para Tests de Regresión

Basado en este análisis, los siguientes escenarios deberían cubrirse con tests automatizados (Vitest para game-server):

1. **Fold to 1 con último jugador desconectado:** Todos foldean excepto uno que está desconectado. Verificar que el pot se reembolsa a los contribuyentes o se acredita al jugador al reconectarse.
2. **Desconexión masiva en `APUESTA_4_CARTAS`:** Todos los activos se desconectan. Verificar que la sala maneja correctamente los pots (no se pierden).
3. **Race condition de reconexión:** Simular que `allowReconnection` expira exactamente cuando el cliente se reconecta. Verificar que no se produce `removePlayer` sobre un jugador vivo.
4. **Raise + desconexión de otro jugador:** Un jugador hace Raise, otro jugador se desconecta antes de reaccionar. Verificar que el desconectado no se salta la obligación de igualar (o que se le foldea automáticamente).
5. **Banda atómica:** Simular crash del servidor entre `recordBet` de banda y `awardPot`. Verificar que `onDispose` reembolsa las bandas pendientes.
6. **Pique en showdown con múltiples jugadores:** Dos jugadores llegan a showdown, uno con mejor mano en main pot y otro con mejor mano en pique. Verificar que el pique se resuelve por jerarquía correcta (SEGUNDA > CHIVO > PRIMERA), no heredado al ganador del main pot.
7. **Timeout de acción:** Un jugador no actúa en `DESCARTE` por más de X segundos. Verificar que se ejecuta un auto-fold o auto-discard.
8. **Remoción del dealer:** La Mano se va en medio del juego. Verificar que `dealerId` se actualiza correctamente y los turnos siguen funcionando.

---

*Documento generado a partir de la auditoría formal y la inspección directa del código fuente del game-server (`apps/game-server/src/rooms/`).*
