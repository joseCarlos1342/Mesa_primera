# Fases del Servidor

Fuente de verdad resumida de las fases activas del motor segun `apps/game-server/src/rooms/phases/`.

## Fases registradas hoy

### 1. `LOBBY`

- Estado de espera antes de iniciar una mano o entre manos.
- Se suman jugadores, se validan condiciones de arranque y se marca readiness.

### 2. `SORTEO_MANO`

- Determina la mano inicial y orden de juego.
- Implementada en `SorteoPhase`.

### 3. `PIQUE`

- Fase inicial de entrada al juego y cobro del pique.
- Tambien se gestiona desde `SorteoPhase`/`piquePhase` segun la extraccion actual.

### 4. `COMPLETAR`

- Reparte hasta completar 4 cartas para quienes siguen activos.

### 5. `APUESTA_4_CARTAS`

- Primera ronda de apuesta con mano completa inicial.
- Aqui tambien viven validaciones de flujo como juego servido y resolucion del pique segun escenario.
- Si nadie gana o reclama el pique en esta ronda, el `piquePot` no se adjudica por defecto: se suma al pozo principal y lo cobra quien gane el `SHOWDOWN`.

### 6. `DESCARTE`

- Cada jugador decide que cartas descarta.

### 7. `REEMPLAZO_DESCARTE`

- El servidor repone cartas despues del descarte.

### 8. `REVEAL_BOTTOM_CARD`

- Se revela la carta del fondo cuando aplica la variante.

### 9. `GUERRA`

- Ronda principal de apuesta con manos ya consolidadas.

### 10. `CANTICOS`

- Registro y procesamiento de canticos antes del cierre.

### 11. `DECLARAR_JUEGO`

- Declaracion de juego cuando la mano lo exige.
- Si exactamente un jugador declara juego valido y los demas declaran `No Tengo Juego`, ese jugador gana por prueba de juego y pasa a `SHOWDOWN` con revelacion obligatoria.
- Ese caso no usa `SHOWDOWN_WAIT`: el rival llego a la fase final y tiene derecho a verificar la combinacion ganadora.

### 12. `GUERRA_JUEGO`

- Apuesta exclusiva entre jugadores que declararon juego.

### 13. `SHOWDOWN`

- Revelacion final, evaluacion de manos y cierre logico de la mano.
- Cuando 2+ jugadores compiten, las cartas se revelan obligatoriamente.
- Cuando queda un unico ganador por `DECLARAR_JUEGO`, tambien hay revelacion obligatoria para probar el juego ganador.
- `SHOWDOWN_WAIT` queda reservado para victoria por abandono/default, cuando el resto se retiro antes del cierre y el ganador puede elegir mostrar o no mostrar.

## Notas Importantes

- La documentacion antigua que hablaba de `PIQUE_DEAL`, `PIQUE_REVEAL`, `JUEGO_VALIDACION` o `PAYOUT` como fases separadas ya no representa la implementacion actual.
- El cierre financiero ocurre como parte del flujo de resolucion de mano, pero no esta modelado hoy como fase publica separada registrada en `phases/index.ts`.
- La reconexion del jugador no es una fase: se gestiona transversalmente en `ConnectionManager.ts` con un grace period real de `120s`.
