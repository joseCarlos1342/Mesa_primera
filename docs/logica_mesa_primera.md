# Documentación Completa: Lógica de Mesa Primera

Este documento detalla exhaustivamente las reglas, fases, mecánicas y casos especiales (edge cases) de la lógica del juego **Mesa Primera** implementada en el servidor (Colyseus).

---

## 1. Estructura General y Participantes

- **Cupo:** Mínimo 3, máximo 7 jugadores activos sentados.
- **La Mano (`activeManoId`):** Es el jugador que reparte y tiene **ventaja de +1 punto** en el desempate de manos. Actúa primero en cada turno y tiene poder para fijar el monto del Pique. La Mano se inicializa como el Dealer y rota en ciertas circunstancias (reinicio de pique, por ejemplo).
- **El Dealer (`dealerId`):** Determina el orden circular de los asientos (`seatOrder`). "La Mano" inicial es el Dealer.
- **Fichas (Chips):** Los saldos están representados en centavos internamente (ej: `500_000` = $5,000).
- **Espectadores (`isWaiting`):** Si un jugador se une mientras hay una partida en curso, queda marcado como `isWaiting = true`. **Se le asigna un puesto en la mesa** (aparece sentado), pero NO participa de la mano actual. Cuando la partida termina y vuelve al LOBBY, los espectadores son promovidos automáticamente a jugadores activos (`promoteWaitingPlayers()`) y se les agrega al `seatOrder`.
- **Dos Pozos (Pots) separados:**
  - **Pozo Principal (`pot`):** Acumula el Ante obligatorio + todas las apuestas hechas con 4 cartas (fases APUESTA_4_CARTAS, GUERRA, CANTICOS).
  - **Pote del Pique (`piquePot`):** Acumula **exclusivamente** las apuestas de la ronda de 2 cartas (El Pique). Si los jugadores configuran un Pique Fijo, ese monto va al `piquePot`, NO al pozo principal.

---

## 2. Pique Fijo (Votación Democrática)

Antes de empezar una partida (en fase LOBBY), cualquier jugador sentado puede **proponer un Pique Fijo**:

1. El proponente envía un monto (mínimo $5,000, máximo $500,000).
2. Los demás jugadores sentados votan (Aprobar / Rechazar).
3. Se necesita **mayoría simple** para aprobar.
4. Si se aprueba, el `minPique` de la mesa se actualiza al monto propuesto.
5. **La Mano debe respetar este Pique Fijo**: no puede picar por debajo del mínimo configurado. Puede picar por encima si lo desea, pero el mínimo es obligatorio.

---

## 3. Flujo del Juego: Fases por Etapa

### Fase 1: Entrada Obligatoria (Ante) y Reparto Inicial (`BARAJANDO` → `PIQUE_DEAL`)
1. Al empezar, todos los jugadores activos (NO los `isWaiting`) pagan el **Ante obligatorio** ($10).
2. Este monto va al **Pozo Principal (`pot`)**.
3. Se baraja el mazo y se reparten **2 cartas** a cada jugador en orden circular comenzando por La Mano, con animación de 3 segundos entre cada jugador.

### Fase 2: El Pique (`PIQUE`)
El Pique es la ronda de apuestas con solo 2 cartas. Todo lo apostado aquí va al **Pote del Pique (`piquePot`)**.

- **Acciones Disponibles:** `voy` (apostar) o `paso` (retirarse de esta mano).
- **Significado de PASO en el Pique:** Cuando un jugador dice "Paso" durante el pique (con solo 2 cartas, antes de haber apostado nada), simplemente **se retira de la mano**. No juega más hasta la próxima partida. No es un "check" — es un fold directo.
- **El Poder de La Mano:**
  - La Mano habla primero y es el **único** que puede elegir libremente el monto del pique, siempre respetando el `minPique` (o el Pique Fijo si fue configurado).
  - Una vez que La Mano fija el monto, los demás jugadores que digan "voy" **deben igualar exactamente** ese monto. Si no les alcanzan las fichas, pueden restiarse (all-in con lo que tienen).

#### La Banda (Penalización por cobardía)
Cuando solo **1 jugador dice "VOY"** y todos los demás pasan:

- El juego exige **al menos 2 jugadores** para continuar.
- **Cobro de La Banda:** El jugador valiente cobra una penalización a cada jugador que pasó:
  - Si el Pique Fijo (o `minPique`) es de **$10,000 o más** → La Banda es de **$5,000** por jugador.
  - Si el Pique Fijo es **menor de $10,000** → La Banda es de **$2,000** por jugador.
- Se le devuelve su apuesta del pique al que fue "VOY".
- **Rotación de La Mano:** La Mano pasa al siguiente jugador en el `seatOrder`.
- **Reinicio:** Se recogen las cartas, se rebaraja, y se vuelven a repartir 2 cartas por jugador. **NO se vuelve a cobrar el Ante** (ya fue pagado).
- **Límite de reinicios:** Máximo 10 reinicios consecutivos. Si se supera, la partida se aborta y se vuelve al LOBBY devolviendo el pozo principal al último jugador.

### Fase 3: Completar Mano (`COMPLETAR`)
Una vez que 2 o más jugadores igualaron el Pique:
- Se les reparten sus **2 cartas faltantes** para completar un mazo de **4 cartas** por jugador.
- El reparto es round-robin (1 carta a cada uno, luego otra ronda), con 3 segundos entre cada carta.
- Las cartas de los jugadores que se retiraron en el Pique se recogen y se devuelven al tope del mazo antes de repartir.

### Fase 4: Cantar Juego (`CANTAR_JUEGO`)
Después de completar las 4 cartas, cada jugador tiene la **opción** de "Cantar Juego" para ganar el Pote del Pique de forma anticipada.

- **Los que NO tienen juego válido** (mano = `NINGUNA`) pasan automáticamente — no se les pregunta.
- **Los que SÍ tienen juego** (par, trío, etc.) reciben la opción de **Cantar** o **Pasar**:
  - **Cantar:** "Quiero pelear por el Pote del Pique con mi juego."
  - **Pasar:** "Prefiero NO arriesgar mi juego aquí y seguir jugando por el Pozo Principal." Tener juego **no obliga** a cantar. Es decisión estratégica del jugador.

#### Resolución del Pique:

1. **Nadie canta (0 cantaron):** El Pote del Pique se mantiene intacto. Se continúa a la fase de apuestas de 4 cartas (APUESTA_4_CARTAS). El Pote del Pique se sumará al premio del ganador final.

2. **1 jugador canta:** Gana automáticamente el Pote del Pique.
   - Le salen **5 segundos** para decidir si muestra sus cartas o no (`SHOWDOWN_WAIT`).
   - Si elige **Mostrar**: sus cartas se revelan durante **10 segundos** con animación cinematográfica antes de entregarle el pique.
   - Si elige **No Mostrar** (o se le acaba el tiempo): se lleva el pique en secreto.
   - **⚠️ El ganador se retira del juego principal.** Se marca `isFolded = true` y NO participa en Descarte, Guerra, ni por el Pozo Principal.

3. **2 o más jugadores cantan:** Ocurre un **Showdown exclusivo del Pique**.
   - Se revelan las cartas de todos los que cantaron durante **10 segundos**.
   - Se comparan las manos. El jugador con mayor puntaje gana.
   - **Bonus de La Mano (+1 punto):** Si La Mano cantó juego, tiene +1 punto automático. En caso de empate técnico, La Mano gana.
   - El ganador cobra el Pote del Pique (menos el Rake del 5%).
   - **⚠️ TODOS los que cantaron juego** (ganador y perdedores) **se retiran** de la partida. Ninguno juega por el Pozo Principal.

### Fase 5: Apuestas de 4 Cartas (`APUESTA_4_CARTAS`)
Quienes NO cantaron juego en el pique (y no se retiraron) inician una ronda de apuestas por el **Pozo Principal**.

- **Acciones:** `paso` (check/fold), `voy` (raise), `igualar` (call), `resto` (all-in).
- Si **nadie ha apostado** aún → "Paso" = Check (no te botas, solo pasas el turno).
- Si **alguien ya apostó** y tú dices "Paso":
  - Si **no tienes juego** (mano `NINGUNA`) → te botas automáticamente (fold).
  - Si **tienes juego** válido → te quedas con tu juego (side-pot implícito, como un all-in tácito sin poner dinero extra).
- El turno rota en círculo. Si alguien sube (`voy`), todos los que ya pasaron/igualaron deben volver a actuar hasta que todos igualen `currentMaxBet` o se retiren.

### Fase 6: El Descarte (`DESCARTE`)
Los sobrevivientes pueden descartar de **0 a 4 cartas** y recibir reemplazos del mazo.
- Las cartas descartadas se devuelven al mazo.
- El servidor les repone la misma cantidad de cartas desde el `deck`.
- Un jugador también puede **Botarse** (fold) en esta fase si no quiere seguir.

### Fase 7: Guerra (`GUERRA`)
Tras el descarte, se inicia otra ronda de apuestas. **No es una sola ronda limitada** — los jugadores pueden ir y subir la apuesta **cuantas veces quieran**. Es guerra psicológica: si dos jugadores quieren seguir subiendo, lo hacen indefinidamente hasta que uno ceda (iguale, pase, o se restie).

- La fase termina cuando todos los jugadores activos han igualado la apuesta máxima o se han retirado.
- Las apuestas van al Pozo Principal.

### Fase 8: Cánticos (`CANTICOS`)
Otra ronda de apuestas con la misma mecánica ilimitada que Guerra. Es la última oportunidad de apostar antes del Showdown.

### Fase 9: Showdown (`SHOWDOWN`)
Si queda más de 1 jugador activo:
- Se revelan las 4 cartas de cada jugador.
- Se evalúan las manos con el **bonus de +1 punto para La Mano**.
- El jugador con la mano más alta gana el **Pozo Principal** (menos Rake del 5%).
- Si todos los demás se retiraron en alguna fase anterior, el último sobreviviente gana el pozo **sin necesidad de mostrar cartas** (automáticamente le ofrecen mostrar u ocultar en `SHOWDOWN_WAIT` con 5 segundos para decidir).

---

## 4. El Bonus de La Mano (+1 Punto)

El jugador que es "La Mano" (`activeManoId`) tiene un **bonus permanente de +1 punto** en la evaluación de su mano. Esto se aplica en:
- El Showdown del Pique (si canta juego).
- El Showdown final del Pozo Principal.
- El frontend también lo muestra: en el HUD de "Puntos" del jugador, si eres La Mano, se suma +1 visualmente.

**Efecto práctico:** Si La Mano y otro jugador empatan en tipo de mano y puntos base, **La Mano gana** por su bonus.

---

## 5. Restiados (All-In)

### Restiado desde el Pique
- **Escenario:** La Mano pica $5,000 y el Jugador B solo tiene $2,000.
- **Acción:** B aprieta "Resto $2,000" → apuesta todo lo que tiene.
- **Resultado:** B entra al juego con sus 2 cartas. Se le completan las 4 cartas en la fase COMPLETAR. Sin embargo, **B ya no puede actuar** en las fases de apuestas posteriores (APUESTA_4_CARTAS, GUERRA, CANTICOS) porque no tiene fichas. Debe esperar hasta el **Showdown final** para ver si ganó algo proporcional a lo que aportó.

### Restiado en fases de 4 cartas
- **Escenario:** El Jugador A apuesta $10,000. El Jugador B solo tiene $3,000 → selecciona "Resto $3,000".
- B queda `isAllIn = true` y no se le pregunta más en rondas futuras.
- En el Showdown, el servidor calcula la porción del pot que B puede ganar (proporcional a su aporte).

---

## 6. Espectadores y Nuevos Jugadores

- Si hay 4 jugadores jugando y **2 más se unen** durante la partida:
  - Los 2 nuevos quedan marcados con `isWaiting = true`.
  - **Se les asigna un puesto visual en la mesa** (aparecen sentados con su avatar y nickname).
  - NO participan de la mano actual (no reciben cartas, no apuestan, no actúan).
  - Cuando la partida termina y el juego vuelve a LOBBY, se promueven automáticamente a jugadores activos para la siguiente mano.
- Los espectadores NO cuentan para quórum ni para votaciones de Pique Fijo.

---

## 7. Ejemplos Prácticos

### Ejemplo A: La Banda y Re-Pique
- **Jugadores:** Ana (La Mano), Beto, Carlos. Mesa con pique mínimo de $5,000.
- **Fase Pique:**
  - Ana (La Mano) dice **"VOY $5,000"**. Su apuesta va al `piquePot`.
  - Beto dice **"PASO"** → se retira de la mano.
  - Carlos dice **"PASO"** → se retira de la mano.
- **Resultado:** Solo Ana fue "VOY" → inválido (< 2 jugadores).
- **La Banda:** Como el pique mínimo es $5,000 (menor a $10,000), la banda es de **$2,000** por persona. Beto paga $2,000 y Carlos paga $2,000 a Ana. Ana cobra **$4,000** en total de banda + recupera su apuesta original de $5,000 del piquePot.
- **Reinicio:** Se baraja de nuevo, **Beto asume como La Mano**, se reparten 2 cartas nuevas. No se cobra Ante otra vez.

### Ejemplo B: El Pique Ganado con Cantar Juego
- **Jugadores:** Carlos (La Mano), Daniela, Eduardo, Felipe. Pique mínimo $5,000.
- Carlos pica $5,000. Daniela, Eduardo y Felipe igualan. `piquePot = $20,000`.
- Se completan a 4 cartas cada uno.
- **Fase CANTAR_JUEGO:**
  - Carlos tiene `NINGUNA` → pasa automáticamente (no se le pregunta).
  - Daniela tiene Par → le sale opción. Elige **"Pasar"** (prefiere jugar por el Pozo Principal).
  - Eduardo tiene `NINGUNA` → pasa automáticamente.
  - Felipe tiene Trío → le sale opción. Elige **"Cantar"**.
- **Resolución:** Solo Felipe cantó → gana el Pote del Pique ($20,000 - 5% rake = $19,000).
  - Tiene 5 segundos para decidir mostrar cartas. Elige **Mostrar**. Sus cartas se revelan por **10 segundos**.
  - Felipe es marcado `isFolded = true` → **ya no juega por el Pozo Principal**.
- El juego continúa (APUESTA_4_CARTAS) con Carlos, Daniela y Eduardo.

### Ejemplo C: Dos Cantan Juego (Showdown de Pique)
- **Jugadores:** Hugo (La Mano), Iris, Juan. Pique de $5,000 cada uno → `piquePot = $15,000`.
- Se completan a 4 cartas.
- Hugo tiene Par (24 pts base + 1 bonus La Mano = 25 pts). Elige **Cantar**.
- Iris tiene Par (24 pts). Elige **Cantar**.
- Juan tiene `NINGUNA` → pasa automático.
- **Showdown del Pique:** Hugo (25 pts) vs Iris (24 pts). Hugo gana gracias al **bonus de La Mano**.
- Cartas se muestran por 10 segundos. Hugo cobra $14,250 ($15,000 - 5% rake).
- **⚠️ Tanto Hugo como Iris se retiran** del juego principal (`isFolded = true`). Solo queda Juan.
- Como solo queda 1 jugador → Juan recupera su aporte del Pozo Principal y la partida termina.

### Ejemplo D: Restiado desde el Pique
- **Jugadores:** Luis (La Mano, saldo $50,000), María (saldo $3,000), Nora (saldo $30,000). Pique mínimo $5,000.
- Luis pica $5,000. `piquePot = $5,000`.
- María no puede pagar $5,000 → aprieta **"Resto $3,000"**. `piquePot = $8,000`. María queda restiada.
- Nora iguala $5,000. `piquePot = $13,000`.
- Se completan a 4 cartas. María recibe sus 2 cartas extra normalmente.
- CANTAR_JUEGO: nadie canta → el pique se mantiene.
- APUESTA_4_CARTAS, GUERRA, CANTICOS: María **NO actúa** en ninguna de estas fases (ya está all-in desde el pique). Solo Luis y Nora hablan y apuestan entre ellos.
- **Showdown:** Se evalúan las 3 manos. Si María tiene la mejor mano, gana la porción proporcional del pot de acuerdo a su aporte.

### Ejemplo E: Guerra Psicológica Ilimitada
- **Jugadores:** Pablo y Rosa (los únicos que quedan tras el Descarte).
- Fase GUERRA:
  - Pablo va $10,000. Rosa iguala $10,000.
  - Pablo vuelve a ir $20,000. Rosa iguala $20,000.
  - Pablo va $50,000 más. Rosa dice "Paso" (check) → como tiene juego, **se queda** sin igualar (side-pot implícito).
  - *(O si Rosa no tiene juego y dice Paso → se bota.)*
- Fase CANTICOS: Pablo va $30,000 más. Solo él habla (Rosa está "retenida con juego" sin más fichas efectivas).
- Showdown: se comparan las manos y se resuelve el pot.

---

## 8. Resumen de Temporizadores

| Situación | Tiempo |
|---|---|
| Decidir mostrar cartas tras ganar pique/pot (SHOWDOWN_WAIT) | **5 segundos** |
| Mostrar cartas reveladas en el Showdown | **10 segundos** |
| Animación de barajado | **12 segundos** (10s GSAP + 2s buffer) |
| Intervalo entre reparto de cartas | **3 segundos** por jugador |

---
*Fin del documento de lógica.*