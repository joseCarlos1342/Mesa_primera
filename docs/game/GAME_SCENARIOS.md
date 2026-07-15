# Registro de Escenarios de Juego — Mesa Primera

Documento vivo que registra cada escenario de comportamiento del motor de juego (`MesaRoom`), su lógica reglamentaria, estado de corrección y ejemplo paso a paso. Se actualiza cada vez que se corrige o agrega un escenario nuevo.

---

## Índice de Escenarios

| ID | Fase | Escenario | Estado | Versión |
|----|------|-----------|--------|---------|
| E-001 | APUESTA_4_CARTAS | Paso sin juego → fold inmediato | ✅ Correcto | 0.7.0 |
| E-002 | APUESTA_4_CARTAS | Paso con juego → "Llevo Juego" (pique diferido) | ✅ Correcto | 0.7.0 |
| E-003 | APUESTA_4_CARTAS | Doble "Llevo Juego" → resolución por jerarquía | ✅ Correcto | 0.7.0 |
| E-004 | APUESTA_4_CARTAS | Nadie tiene juego → Mano gana pique por defecto | ✅ Correcto | 0.7.0 |
| E-005 | APUESTA_4_CARTAS | Cruzado — Mano reingresa tras apuesta de otro | ✅ Correcto | 0.7.0 |
| E-006 | APUESTA_4_CARTAS | Excepción 7 jugadores — cartas de Mano barajadas | ✅ Correcto | 0.7.0 |
| E-007 | APUESTA_4_CARTAS | Animación de recogida de cartas al naipe | ✅ Correcto | 0.7.1 |
| E-008 | Recovery | Crash recovery con roster bloqueado, deadline y refund idempotente | ✅ Correcto | 0.7.2 |

---

## E-001: Paso Sin Juego → Fold Inmediato

**Fase**: APUESTA_4_CARTAS  
**Regla**: Cuando un jugador pasa la apuesta principal y NO tiene juego (mano tipo `NINGUNA`), sale inmediatamente de la mano. Sus cartas se recogen al naipe.

**Lógica del servidor**:
1. `evaluateHand(player.cards)` → tipo `NINGUNA`
2. `player.isFolded = true`, `player.hasActed = true`
3. `collectPlayerCards()` → cartas devueltas al deck, `cardCount = 0`
4. Broadcast `fold-return-cards` → cliente anima cartas volando al naipe

**Ejemplo**:
```
Mesa: 3 jugadores (P1=Mano, P2, P3)
Cartas: P1=PRIMERA, P2=NINGUNA, P3=NINGUNA

1. P1 apuesta $500k
2. P2 pasa → NINGUNA → fold inmediato, cartas recogidas
3. P3 pasa → NINGUNA → fold inmediato, cartas recogidas
4. P1 queda solo → showdown/resolución
```

**Tests**: `P2/P3 sin juego pasan → fold inmediato, cartas recogidas al naipe`

---

## E-002: Paso Con Juego → "Llevo Juego" (Pique Diferido)

**Fase**: APUESTA_4_CARTAS  
**Regla**: Cuando un jugador pasa la apuesta principal y SÍ tiene juego (PRIMERA, CHIVO o SEGUNDA), el servidor le pregunta si "lleva juego". Si dice sí, sale del pozo principal pero compite por el pique. El pique se resuelve al final de la fase, no inmediatamente.

**Lógica del servidor**:
1. `evaluateHand(player.cards)` → tipo ≠ `NINGUNA`
2. Servidor envía `paso-juego-choice` al jugador
3. Si responde `llevaJuego: true`:
   - `player.isFolded = true` (fuera del pozo principal)
   - `player.passedWithJuego = true` (compite por pique)
   - `player.revealedCards = player.cards` (Board muestra face-up, dimmed)
   - Broadcast `pique-fold-reveal` → cliente puede mostrar overlay
   - Ronda de apuestas **continúa** (pique diferido)
4. Al terminar la fase → `resolvePiqueAfterApuesta4()` resuelve el pique

**Ejemplo**:
```
Mesa: 3 jugadores (P1=Mano, P2, P3)
Cartas: P1=PRIMERA, P2=PRIMERA, P3=NINGUNA

1. P1 apuesta $500k
2. P2 pasa → tiene juego → "Llevo Juego"
   → isFolded=true, passedWithJuego=true
   → Board muestra cartas de P2 boca arriba (dimmed)
3. P3 pasa → NINGUNA → fold inmediato
4. P1 queda solo en pozo principal
5. Resolución de pique: P2 gana el pique (único contestant)
6. Cartas de P2 recogidas al naipe
```

**Tests**: `P2 con juego Llevo → sale de pozo principal, compite solo por pique`

---

## E-003: Doble "Llevo Juego" → Resolución por Jerarquía

**Fase**: APUESTA_4_CARTAS  
**Regla**: Cuando 2+ jugadores pasan con juego, ambos compiten solo por el pique. La resolución compara jerarquía de juego: `SEGUNDA > CHIVO > PRIMERA`. En empate, gana el más cercano a Mano en `seatOrder`.

**Lógica del servidor**:
1. Ambos jugadores: `isFolded=true`, `passedWithJuego=true`, `revealedCards=cartas`
2. Ronda de apuestas continúa entre jugadores activos
3. Al terminar → `resolvePiqueAfterApuesta4()`:
   - Compara `typeRank`: SEGUNDA=3, CHIVO=2, PRIMERA=1
   - Empate → distancia más corta a Mano en `seatOrder`
   - `awardPiqueToContestant(winner)` → paga pique con 5% rake
   - **Todos** los contestants: `revealedCards=""`, `collectPlayerCards()` → animación

**Ejemplo**:
```
Mesa: 3 jugadores (P1=Mano, P2, P3)
Cartas: P1=PRIMERA, P2=CHIVO, P3=PRIMERA

1. P1 apuesta $500k
2. P2 pasa → "Llevo Juego" (CHIVO)
3. P3 pasa → "Llevo Juego" (PRIMERA)
4. P1 queda solo en pozo principal
5. Resolución pique: CHIVO > PRIMERA → P2 gana el pique
6. Cartas de P2 Y P3 recogidas al naipe (ambos, no solo ganador)
```

**Tests**: `P2 y P3 ambos con juego → pique resuelto por jerarquía al final`

---

## E-004: Nadie Tiene Juego → Mano Gana Pique por Defecto

**Fase**: APUESTA_4_CARTAS  
**Regla**: Cuando todos pasan sin juego, la Mano gana el pique por defecto (devolución de los $20 iniciales). La Mano **conserva sus cartas** porque sigue activo en el pozo principal.

**Lógica del servidor**:
1. Ningún jugador tiene `passedWithJuego = true` → `contestants.length === 0`
2. `awardPiqueToContestant(manoId)` → pague pique a Mano
3. **NO** se llama `collectPlayerCards(manoId)` — Mano sigue jugando
4. Pique resetado a 0

**Ejemplo**:
```
Mesa: 3 jugadores (P1=Mano, P2, P3)
Cartas: P1=PRIMERA, P2=NINGUNA, P3=NINGUNA
Pique: $300k

1. P1 apuesta $500k
2. P2 pasa → NINGUNA → fold, cartas recogidas
3. P3 pasa → NINGUNA → fold, cartas recogidas
4. Pique → Mano gana por defecto ($300k - 5% rake)
5. P1 conserva sus cartas → showdown (solo queda él)
```

**Tests**: `nadie tiene juego → Mano gana pique por defecto`

---

## E-005: Cruzado — Mano Reingresa

**Fase**: APUESTA_4_CARTAS  
**Regla**: Cuando la Mano pasa (check, con `currentMaxBet=0`) y luego otro jugador apuesta, la Mano recibe el turno de vuelta para igualar, subir o pasar definitivamente.

**Lógica del servidor**:
1. Mano pasa con `currentMaxBet=0` → check (no fold)
2. P2 apuesta → `currentMaxBet > 0`
3. P3 responde (iguala/sube/pasa)
4. `advanceTurnBetting()` detecta `Mano.roundBet < currentMaxBet` + `hasActed=true` → le devuelve el turno
5. Mano puede: igualar (→ DESCARTE), subir (→ ciclo continúa), pasar definitivo (→ fold)

**Ejemplo**:
```
Mesa: 3 jugadores (P1=Mano, P2, P3)

1. P1 pasa (check, maxBet=0)
2. P2 apuesta $500k
3. P3 iguala
4. Turno vuelve a P1 (roundBet=0 < maxBet=500k)
5a. Si P1 iguala → DESCARTE (P1 descarta primero)
5b. Si P1 sube a $1M → turno a P2
5c. Si P1 pasa definitivo → fold (si tiene juego, se le pregunta "Llevo Juego")
```

**Tests**: `Mano recibe turno de vuelta`, `Mano iguala tras reentrada → DESCARTE`, `Mano sube tras reentrada → P2 responde`, `Mano pasa definitivamente → P2 gana pozo`, `P3 con juego muestra inmediatamente al pasar`

---

## E-006: Excepción de 7 Jugadores

**Fase**: APUESTA_4_CARTAS  
**Regla**: Cuando hay exactamente 7 jugadores sentados y la Mano pasa definitivamente, sus cartas se **barajan** antes de colocarse sobre el naipe. Con menos de 7 jugadores, las cartas van en orden original.

**Lógica del servidor**:
1. `collectPlayerCards(playerId, shuffle=true)` cuando `seatOrder.length === 7` y `wasMano === true`
2. Fisher-Yates shuffle sobre las cartas antes de `deck.push()`
3. Para otros jugadores o mesas < 7: `shuffle=false`

**Ejemplo**:
```
Mesa: 7 jugadores, P1=Mano
Cartas P1: 02-O,03-O,05-O,04-C

1. P1 pasa definitivo (no tiene juego)
2. Cartas se barajan: [04-C,02-O,05-O,03-O] (orden aleatorio)
3. Se colocan sobre el naipe barajadas
4. Broadcast fold-return-cards → animación

En mesa de 3 jugadores:
1. P1 pasa definitivo → cartas van al naipe en orden: 02-O,03-O,05-O,04-C
```

**Tests**: `7 jugadores: Mano pasa → cartas barajadas`, `menos de 7: cartas NO se barajan`

---

## E-007: Animación de Recogida de Cartas al Naipe

**Fase**: Cualquiera (client-side)  
**Regla**: Cuando el servidor recoge las cartas de un jugador (`collectPlayerCards`), el cliente debe animar visualmente las cartas volando desde el asiento del jugador hasta el naipe central.

**Lógica client-side**:
1. Servidor: `setPlayerCards("") → cardCount=0` + broadcast `fold-return-cards`
2. `page.tsx`: crea `CustomEvent('animate-discard')` con cartas faceDown
3. `AnimationLayer.tsx`: calcula posiciones `seat → deck-center` vía `getBoundingClientRect()`
4. Framer Motion anima `m.div` con `duration: 0.5s`, easing `[0.25, 1, 0.5, 1]`
5. Auto-cleanup a 600ms

**Board rendering**:
- `revealedCards` poblado → cartas boca arriba (dimmed si `isFolded`)
- `cardCount > 0` sin `revealedCards` → dorsos de cartas (pila colapsada si `isFolded`)
- `cardCount = 0` → nada renderizado

**Bugs corregidos en v0.7.1**:
- Cartas de perdedores del pique no se recogían (solo las del ganador)
- Mano perdía cartas al ganar pique por defecto
- `revealedCards` no se establecía en "Llevo Juego" de APUESTA_4_CARTAS
- Board solo mostraba face-up en fases SORTEO_MANO/SHOWDOWN

**Tests**: assertions de `revealedCards`, `cards=""`, `cardCount` en todos los escenarios anteriores

---

## E-008: Crash Recovery con Roster Bloqueado

**Fase**: Recovery desde una fase estable (`APUESTA_4_CARTAS`, `PIQUE`, `DESCARTE`, `CANTICOS`, `DECLARAR_JUEGO`, `GUERRA`, `GUERRA_JUEGO` o `PIQUE_REVEAL`)
**Regla**: Tras un crash, el servidor reconstruye una replacement desde el checkpoint íntegro y solo el roster original puede volver. La mano permanece bloqueada hasta que todos regresen. Si el deadline expira con miembros ausentes, los refunds derivados del ledger se aplican con un `operationId` estable; un segundo crash no puede crear otra replacement ni duplicar créditos.

**Lógica del servidor**:
1. `CrashRecoveryService` verifica hash, versión, fase y roster del checkpoint.
2. Reclama el incidente de forma durable antes de crear la replacement y persiste su mapping.
3. `MesaRoom.restoreFromRecoverySnapshot()` activa `recoveryLocked` y desactiva `autoDispose`, para que un intento outsider rechazado no elimine la replacement vacía.
4. `onAuth` y `onJoin` rechazan identidades fuera del roster. Los rejoin se emparejan por `supabaseUserId` y conservan asiento y estado privado.
5. Cuando todo el roster queda conectado, se desbloquea la mano, se reactiva `autoDispose` y se rearma el timer de turno.
6. Al deadline, los importes se derivan del ledger y se envían con UUID determinista `recovery-refund:<gameId>:<userId>`. El RPC de expiración aplica cada operación una sola vez.

**Ejemplo**:
```
Checkpoint: Ana, Beto y Carla en APUESTA_4_CARTAS; pozo activo.

1. El proceso cae después del checkpoint.
2. El nuevo proceso reclama el incidente y crea una sola replacement bloqueada.
3. Un outsider intenta entrar: se rechaza; la replacement sigue viva sin clientes.
4. Ana, Beto y Carla hacen rejoin: se restauran sus tres asientos y la mano se desbloquea.

Alternativa con Carla ausente:
1. El deadline vence y deriva los tres refunds pendientes.
2. El proceso vuelve a caer durante recovery.
3. El claim existente impide una segunda replacement; repetir la expiración reutiliza los mismos operationId y no duplica refunds.
```

**Tests**: `CrashRecoveryChaos.test.ts` usa `@colyseus/testing`, reloj y scheduler inyectados, replacement local y ledger idempotente en memoria; no usa Redis, Supabase ni esperas arbitrarias.
