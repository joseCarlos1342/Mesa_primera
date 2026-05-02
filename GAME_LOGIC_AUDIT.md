# Auditoría Formal y Verificación de Lógica de Juego - Mesa Primera

**Fecha de Auditoría:** Mayo 2026
**Objetivo:** Verificación formal exhaustiva de la máquina de estados del servidor de juego (Colyseus) para detectar condiciones de carrera (*race conditions*), bloqueos lógicos (*deadlocks*) y vulnerabilidades en la persistencia del estado económico (Ledger).

---

## 1. Análisis y Expansión de Fases del Motor

El diseño original contempla 14 fases continuas. Sin embargo, para un entorno competitivo multijugador asíncrono con transacciones reales, el "camino feliz" es insuficiente. Se deben integrar estados de sincronización, validación económica y limpieza.

### Flujo de Estados Expandido

Las fases marcadas con `[+]` representan estados sistémicos o transversales obligatorios que deben integrarse al motor de estados (`game-server/src/runtime-state.ts` o equivalente).

1.  **`[+] ESPERA_JUGADORES (LOBBY_WAIT)`**: Estado inicial. La mesa requiere un cuórum mínimo (ej. 2 jugadores activos y listos) para iniciar.
2.  **`[+] COBRO_ANTE_Y_VALIDACION (ANTE_COLLECTION)`**: Previo a repartir cartas, se debe cobrar obligatoriamente la ciega o *ante*. Jugadores sin el saldo mínimo requerido en la *Banda* deben ser pasados a estado *sit-out* o expulsados. Si tras la expulsión queda < 2 jugadores, la ronda se aborta.
3.  `SORTEO_MANO`
4.  `PIQUE_DEAL`
5.  `PIQUE`
6.  `COMPLETAR`
7.  `APUESTA_4_CARTAS`
8.  `DESCARTE`
9.  `COMPLETAR_DESCARTE`
10. `REVELAR_CARTA`
11. `GUERRA`
12. `CANTICOS`
13. `DECLARAR_JUEGO`
14. `GUERRA_JUEGO`
15. `SHOWDOWN` (Resolución de ganadores 100% *server-authoritative*).
16. `PAYOUT` (Liquidación económica. **Transacción atómica** hacia el `wallets_ledger` según `mesa-ledger-atomicity`).
17. **`[+] LIMPIEZA_RONDA (ROUND_CLEANUP)`**: Reset de variables efímeras de la sala, vaciado de botes (*pots*), reseteo de temporizadores y re-evaluación del estado de la mesa antes de ciclar de vuelta a `ESPERA_JUGADORES`.

### Estados Transversales (Interrupciones)

*   **`[!] PAUSA_RECONEXION (GRACE_PERIOD)`**: Puede ocurrir en CUALQUIER fase activa. Si el jugador con el turno actual (o cualquier jugador, dependiendo de la política de pausa) se desconecta, el juego entra en un *grace period* estricto de 60s (gobernado por Colyseus `allowReconnection`). Si el timer expira, se inyecta un evento idempotente de `AUTO_FOLD` o `TIMEOUT`.

---

## 2. Simulación de Escenarios Totales (Estrés de Red y Lógica)

El sistema debe comportarse de forma determinista en mesas con diferente número de actores (3 a 7 jugadores) bajo las siguientes condiciones adversas:

### 2.1 Unanimidad vs. "Early Win"
*   **Todos pasan (Check):** Si todos los jugadores activos realizan "Check" en una fase de apuestas (ej. `APUESTA_4_CARTAS`), la máquina de estados debe detectar la igualdad económica (`highestBet == 0`) y transicionar inmediatamente a la siguiente fase.
*   **Todos se retiran menos 1 (Fold to 1):** Si todos los jugadores menos uno hacen "Fold", el motor debe interrumpir la secuencia de fases actual, cancelar las rondas restantes y saltar **inmediatamente** a la fase `PAYOUT` otorgando el bote al jugador restante. Esperar el descarte o cantos de jugadores inactivos es un error crítico.

### 2.2 Fractura de Acciones y Ciclo de Turnos
*   **Mayoría vs. Minoría:** En una mesa de 6, los primeros 5 pasan (Check). El jugador 6 decide subir la apuesta (Raise).
*   **Comportamiento Obligatorio:** El índice de turno debe reajustarse (*wrap-around*) para obligar a los primeros 5 jugadores a igualar (Call) o retirarse (Fold). Avanzar de fase simplemente porque `currentPlayerIndex` llegó al final de la mesa resultaría en *Unmatched Bets* (apuestas desiguales), rompiendo la matemática del juego.

### 2.3 Fondos Insuficientes (Escenarios All-in)
*   **El Problema del Resteado:** Jugador A apuesta 100. Jugador B solo tiene 30 en su Banda. Jugador B va *All-in* (acepta con lo que le queda).
*   **Requerimiento del Motor:** El sistema debe soportar **Botes Secundarios (Side Pots)**. El Jugador B solo tiene derecho a disputar un bote principal máximo de `30 * N_jugadores_en_el_pot`. El excedente apostado por el Jugador A (y otros que igualen los 100) va a un Side Pot por el cual el Jugador B no compite. Una falla aquí permite que un jugador gane dinero que no arriesgó, destruyendo la integridad del Ledger.

### 2.4 Interrupción de Red y Sincronización
*   **Refresco de Navegador / Desconexión Súbita:** Un cliente pierde conexión justo al enviar una apuesta.
*   **Requerimiento de Idempotencia:** Al reconectarse (dentro de los 60s), el servidor debe re-enviar la totalidad del estado (`Room.state` de Colyseus). El cliente de UI (`apps/web/src/app/(player)`) debe ser capaz de redibujar la mesa en el punto exacto de la interrupción, sin emitir doble acción al renderizar.

---

## 3. Matriz de Resultados y Riesgos (Risk Matrix)

| Acción del Jugador | Fase Actual | Comportamiento Esperado (Happy Path) | Riesgo de Bug y Fallo Lógico | Impacto Económico / Estado | Transición de Estado Segura |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Join / Buy-in** | `ESPERA_JUGADORES` | Reserva de saldo de la BD y lo refleja en la *Banda* local del jugador. | Race condition por spam de peticiones: Se suma saldo a la Banda local varias veces procesando un solo descuento del wallet. | Banda inflada falsamente. | Permanece en `ESPERA` hasta cuórum. |
| **Fold** (Retirarse) | `APUESTA_4_CARTAS` (o similares) | Jugador inactivo. Si queda solo 1 activo, la ronda termina (`Early Win`). | El servidor no detecta el *Early Win* y detiene la partida esperando que el jugador que foldeó (o el sistema) haga su descarte. | El Pot actual se sella para el jugador retirado. | Avanza turno o salta a `PAYOUT`. |
| **Raise** (Subir) | `GUERRA` (o similares) | Se actualiza `highestBet`. El turno se reabre para quienes ya habían actuado con una apuesta menor. | El motor avanza de fase asumiendo que "todos ya jugaron su turno físico", dejando el bote desigual e inestable. | Banda disminuye, Pot absorbe el Raise. | Iterador de turnos se ajusta al agresor. |
| **All-in** (Resteado) | Cualquier fase de apuesta | Se acepta el saldo restante y se inicia la lógica de partición de botes (*Side Pots*). | Excepción de fondos insuficientes rompe el servidor, o el jugador compite por el total del bote con solo una fracción del dinero. | Partición entre Main Pot y Side Pot(s). | Avanza turno. |
| **Desconexión** | `CUALQUIERA` | Colyseus congela al jugador y arranca timer de `allowReconnection` (60s). | *Ghost Player*: Timer falla o no se configura limpieza onLeave. La sala se congela esperando la acción de un muerto. | Congelado. | `[PAUSA_RECONEXION]` transversal. |
| **Timeout (No action)** | `DESCARTE` / Fases con límite | Ejecución de acción por defecto (ej. descartar 0 cartas, hacer Fold o Check automático). | Cron de fallback no dispara. El índice de turno no avanza nunca. | Sin cambios, o pérdida de banda si hay un cobro forzado pendiente. | Salta a fase posterior correspondiente. |

---

## 4. Identificación de Deadlocks (Puntos Críticos de Bloqueo)

A continuación se detallan 4 arquitecturas de fallo letales detectadas mediante análisis estático que detendrán el servidor de juego irremediablemente si no son mitigadas en la lógica:

### 4.1 Deadlock por Cierre Falso de Ciclo (Unmatched Bet Deadlock)
*   **Condición:** En el último turno físico de la mesa (ej. Jugador 7), el jugador realiza un `Raise`.
*   **El Fallo:** El código confía ciegamente en `if (currentIndex === players.length - 1)` para transicionar a la siguiente fase (ej. `DESCARTE`), asumiendo erróneamente que la ronda de apuestas ha concluido.
*   **Efecto:** La máquina de estados avanza a la siguiente fase con discrepancias económicas (apuestas sin igualar). Cuando se intente repartir botes o resolver el ganador, los montos no cuadrarán, provocando pánicos en el cálculo matemático.

### 4.2 Deadlock de Jugador Desconectado en Fase Pasiva (Ghost Awaiting)
*   **Condición:** Un jugador se desconecta en la fase de `SHOWDOWN` o justo al iniciar `PAYOUT`.
*   **El Fallo:** El motor está programado para esperar un evento (ej. `ACK_ANIMATION_DONE` de la UI) del cliente para avanzar la lógica del servidor a la siguiente fase o limpiar la mesa.
*   **Efecto:** Como el cliente está desconectado, el servidor jamás recibirá el evento y se quedará atascado en `SHOWDOWN` infinitamente.
*   **Mitigación Obligatoria:** Todas las fases de resolución (`SHOWDOWN`, `PAYOUT`, `LIMPIEZA`) deben ser **estrictamente autoritativas del servidor** y avanzar de forma síncrona o mediante temporizadores de servidor independientemente del estado de conexión de los clientes.

### 4.3 Deadlock de Reconexión Competitiva (Timer Race Condition)
*   **Condición:** El período de gracia de desconexión de 60s dictado por `colyseus-reconnection-ghost-recovery` expira en el instante exacto en que el cliente logra reconectarse por WebSocket.
*   **El Fallo:** El servidor dispara el handler de timeout expulsando lógicamente al jugador y asignando el turno al siguiente. Simultáneamente, el *presence* de Colyseus acepta la conexión y marca al jugador como activo en la sala, pero su objeto lógico local interno está corrupto o marcado como `isOut = true`.
*   **Efecto:** Si el turno vuelve a recaer sobre él en el futuro, el motor le dará el turno, pero su cliente, estando en estado inconsistente, no proveerá botones de acción. La mesa queda congelada (*softlock*).

### 4.4 Deadlock de Bote Vacío (Zero-Sum Halt)
*   **Condición:** En la fase `COBRO_ANTE_Y_VALIDACION`, varios jugadores no tienen saldo y son extraídos de la mesa. Solo queda 1 jugador activo.
*   **El Fallo:** La máquina de estados transiciona a `SORTEO_MANO` ignorando que se requiere un mínimo de 2 jugadores para un flujo competitivo.
*   **Efecto:** El juego avanzará a través de fases extrañas (apostando contra nadie). Al llegar a `SHOWDOWN`, intentará comparar arreglos vacíos o `undefined`, disparando un error no capturado que botará el *Room process* y desconectará a todos los usuarios del servidor Node.js.
*   **Mitigación Obligatoria:** Si al inicio (o durante) de una mano la cantidad de jugadores activos (no foldeados) cae a 1, la máquina debe abortar e invocar el proceso `Early Win -> PAYOUT` de inmediato.

---

**Nota Final sobre el Ledger:** Para satisfacer la regla `mesa-ledger-atomicity` (ver `AGENTS.md`), ninguna mutación sobre `wallets_ledger` en base de datos debe ocurrir durante las fases 1 a 15. Todo cálculo se mantiene transaccionalmente en la memoria del proceso (Redis/Colyseus). Solo al llegar a `PAYOUT` se construye una carga (payload) única e idempotente para el registro en BD de PostgreSQL.
