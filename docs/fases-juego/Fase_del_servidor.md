# Fases del Servidor (Server Phases)

Este documento detalla absolutamente todas las fases por las que puede pasar un jugador en el flujo del juego, explicando dónde aparecen, por qué ocurren y qué sucede en cada una de ellas.

### 1. LOBBY
- **Por qué ocurre:** Es el estado inicial de la mesa antes de que el juego comience o el estado intermedio entre rondas.
- **Qué sucede:** Los jugadores se unen a la mesa, se validan los buy-ins y se espera a que se cumplan las condiciones para iniciar la partida.
- **Transición:** Pasa a `SORTEO_MANO` cuando hay suficientes jugadores para empezar.

### 2. SORTEO_MANO ("Sorteando La Mano")
- **Por qué ocurre:** Determina quién será el jugador "mano" (el que reparte, habla primero y tiene ventaja en empates).
- **Qué sucede:** Se elige al jugador mano, normalmente rotando tras cada ronda, o mediante sorteo al inicio de la partida.
- **Transición:** Pasa a `PIQUE_DEAL` o directamente a la fase de `PIQUE`.

### 3. PIQUE_DEAL / PIQUE ("¡A Picar!")
- **Por qué ocurre:** Los jugadores reciben su primera carta (o cartas iniciales) para decidir si quieren entrar al juego principal ("ir") o retirarse ("no ir").
- **Qué sucede:** Cada jugador, empezando por el mano, decide si participa en la mano actual. Si decide participar, aporta la apuesta inicial del pique al pozo.
- **Transición:** Si hay jugadores que continúan, pasa a `PIQUE_REVEAL` o `COMPLETAR`.

### 4. PIQUE_REVEAL
- **Por qué ocurre:** Para mostrar información temporal sobre una carta o una decisión clave durante el pique.
- **Qué sucede:** Se revela la carta a los participantes según la lógica del pique.
- **Transición:** Vuelve al flujo principal para seguir completando las manos.

### 5. COMPLETAR ("Completando Manos")
- **Por qué ocurre:** Es necesario entregar el resto de cartas a los jugadores que decidieron ir en el pique.
- **Qué sucede:** Se reparten cartas hasta que cada jugador activo en la mano alcance sus 4 cartas.
- **Transición:** Pasa a la fase de `APUESTA_4_CARTAS`.

### 6. APUESTA_4_CARTAS ("¡Apuesta! — 4 cartas")
- **Por qué ocurre:** Es la primera ronda de apuestas donde los jugadores ya tienen sus 4 cartas iniciales.
- **Qué sucede:** Los jugadores pueden "Pasar", "Apostar" (Envite), o "Igualar".

### 7. JUEGO_VALIDACION (Validación de Juego) - *Corrección del Flujo*
- **Por qué ocurre:** Anteriormente, si en la fase `APUESTA_4_CARTAS` todos pasaban, se iba directo al descarte. Esta fase se interpone para asegurar que, si alguien tiene "juego" servido, tenga la oportunidad de reclamar el pique.
- **Qué sucede:** Si todos los jugadores pasan en `APUESTA_4_CARTAS` y un jugador tiene "juego":
  - El sistema vuelve a preguntar a todos los participantes si desean "Pasar" o "Ir" (Call).
  - El jugador con juego tiene un botón especial: **"Llevar Juego"** (Claim Juego), que generalmente usaría para ganar el pique inmediatamente.
  - Además de "Llevar Juego", las opciones estándar de "Ir" o igualar la apuesta de la mano siguen disponibles (por si el jugador desea ocultar su juego momentáneamente).
- **Resolución de la Acción:**
  - Si el jugador selecciona "Llevar Juego", sus cartas se revelan públicamente poniéndolas sobre el mazo.
  - **Opción A (Oponentes Van):** Si los oponentes "van" (call), el juego continúa normalmente dentro de la mano actual.
  - **Opción B (Oponentes NO Van):** Si los oponentes "no van", la apuesta se devuelve a la mano. Se inicia una nueva ronda y el turno pasa al siguiente jugador.
- **Transición:** Si se determina continuar, pasa a `DESCARTE`.

### 8. DESCARTE ("La Bajada")
- **Por qué ocurre:** Permite a los jugadores mejorar sus manos deshaciéndose de cartas no deseadas.
- **Qué sucede:** Cada jugador selecciona qué cartas descartar. Pueden optar por quedarse servidos (no descartar ninguna).
- **Transición:** Pasa a `COMPLETAR_DESCARTE` / `REEMPLAZO_DESCARTE`.

### 9. COMPLETAR_DESCARTE / REEMPLAZO_DESCARTE ("Entregando reemplazos")
- **Por qué ocurre:** Reponer las cartas que los jugadores han descartado.
- **Qué sucede:** El servidor reparte nuevas cartas a cada jugador para que vuelvan a tener 4 en mano.
- **Transición:** Pasa a `REVELAR_CARTA`.

### 10. REVELAR_CARTA ("¡Carta del fondo!")
- **Por qué ocurre:** Revelar una carta comunitaria o del fondo del mazo que interactúa con la partida (según las reglas de esta variante).
- **Qué sucede:** Se muestra la carta y se evalúan posibles combinaciones automáticas.
- **Transición:** Pasa a la ronda de `GUERRA`.

### 11. GUERRA ("¡Guerra!")
- **Por qué ocurre:** Segunda ronda de apuestas, ya con las manos definitivas formadas post-descarte.
- **Qué sucede:** Se habilita una nueva fase de envites, pases e igualadas sobre las manos finales.
- **Transición:** Pasa a `CANTICOS` o `DECLARAR_JUEGO`.

### 12. CANTICOS ("¡Cánticos!")
- **Por qué ocurre:** Fase para cantar combinaciones de pares u otras jugadas menores antes del recuento final.
- **Qué sucede:** Se registran los cánticos que sumarán puntos o influirán en el resultado final.
- **Transición:** Pasa a `DECLARAR_JUEGO`.

### 13. DECLARAR_JUEGO ("¿Tienes Juego?")
- **Por qué ocurre:** Fase específica para preguntar qué jugadores tienen "juego" (suma de 31 u otra combinación mayor, dependiendo de las reglas del Mus).
- **Qué sucede:** Los jugadores con cartas suficientes declaran si tienen juego o no.
- **Transición:** Si varios declaran juego, pasa a `GUERRA_JUEGO`. De lo contrario, va a `SHOWDOWN`.

### 14. GUERRA_JUEGO ("¡Guerra de Juegos!")
- **Por qué ocurre:** Apuestas exclusivas entre jugadores que han declarado tener juego.
- **Qué sucede:** Como se sabe que las combinaciones son muy fuertes, se abre un último periodo de apuestas y envites grandes.
- **Transición:** Pasa a `SHOWDOWN`.

### 15. SHOWDOWN / SHOWDOWN_WAIT ("¡Cartas sobre la mesa!")
- **Por qué ocurre:** Momento de la verdad para determinar al ganador de los lances de la mano (Grande, Chica, Pares, Juego/Punto).
- **Qué sucede:** Todos los jugadores activos muestran sus cartas. El servidor evalúa y determina quién gana cada lance.
- **Transición:** Pasa a `PAYOUT`.

### 16. PAYOUT ("Repartiendo el Pozo")
- **Por qué ocurre:** Final de la mano para distribuir el pozo y actualizar saldos.
- **Qué sucede:** El servidor paga los premios a los ganadores según lo resuelto en el Showdown y deduce comisiones si las hubiera. 
- **Transición:** Vuelve a la fase `LOBBY` para preparar la siguiente ronda.
