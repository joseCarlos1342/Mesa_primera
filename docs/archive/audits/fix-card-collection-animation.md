# Fix: Animación de Recogida de Cartas y Separación Pique/Pozo Principal

## Resumen

Corrección de múltiples bugs que causaban que las cartas de jugadores que pasaban en APUESTA_4_CARTAS quedaran "congeladas" en pantalla (como pila colapsada opaca) sin animarse de vuelta al naipe. También se corrige un bug crítico donde Mano perdía sus cartas al ganar el pique por defecto.

## Bugs Corregidos

### 1. Cartas de perdedores del pique nunca recogidas (Bug principal)

**Síntoma**: Cuando 2+ jugadores pasaban con juego en APUESTA_4_CARTAS, el pique se resolvía correctamente pero solo se recogían las cartas del *ganador*. Los perdedores mostraban una pila colapsada (opacity 0.25, scale 0.7) que permanecía congelada hasta el fin de la mano.

**Causa**: `awardPiqueToContestant()` llamaba `collectPlayerCards()` solo para el `winnerId`. No existía lógica para recoger las cartas de los demás participantes.

**Fix**: Se movió la recolección de cartas de `awardPiqueToContestant()` a `resolvePiqueAfterApuesta4()`, donde ahora se itera sobre **TODOS** los contestants:

```typescript
// resolvePiqueAfterApuesta4() — después de premiar al ganador:
for (const contestant of contestants) {
  contestant.revealedCards = "";
  this.collectPlayerCards(contestant.id, false);
}
```

### 2. Mano perdía cartas al ganar pique por defecto (Bug crítico)

**Síntoma**: Cuando nadie pasaba con juego, Mano ganaba el pique por defecto. Pero `awardPiqueToContestant(manoId)` llamaba `collectPlayerCards(manoId)`, destruyendo las cartas de Mano que aún necesitaba para DESCARTE, GUERRA, SHOWDOWN, etc.

**Causa**: `awardPiqueToContestant()` siempre llamaba `collectPlayerCards()` sin verificar si el jugador seguía activo en el pozo principal.

**Fix**: Se eliminó `collectPlayerCards()` de `awardPiqueToContestant()`. La recolección de cartas queda exclusivamente en `resolvePiqueAfterApuesta4()`, que solo recoge cartas de contestants (`passedWithJuego = true`), nunca de jugadores activos en el pozo principal.

### 3. `revealedCards` no se establecía en "Llevo Juego" de APUESTA_4_CARTAS

**Síntoma**: Cuando un jugador decía "Llevo Juego" en APUESTA_4_CARTAS, el servidor hacía broadcast de `pique-fold-reveal` pero NO establecía `player.revealedCards` en el estado de Colyseus. El Board del cliente solo mostraba la pila colapsada (dorso de cartas grisáceo) en vez de las cartas boca arriba.

**Fix**: Se agregó `player.revealedCards = player.cards` en el handler de "Llevo Juego" para APUESTA_4_CARTAS. Tras la resolución del pique, `revealedCards` se limpia a `""`.

### 4. Board solo mostraba cartas reveladas en fases de reveal

**Síntoma**: El componente `Board.tsx` usaba la condición `isRevealPhase && opponentVisibleCards.length > 0` para renderizar cartas boca arriba. Como `isRevealPhase` es true solo en `SORTEO_MANO` y `SHOWDOWN`, durante APUESTA_4_CARTAS las cartas reveladas (por "Llevo Juego") no se mostraban.

**Fix**: Se cambió la condición a `opponentVisibleCards.length > 0`, que ya incorpora la verificación de `revealedCards` existente.

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `apps/game-server/src/rooms/MesaRoom.ts` | 4 modificaciones en lógica de pique/cartas |
| `apps/web/src/components/game/Board.tsx` | 1 línea: condición de renderizado face-up |
| `apps/game-server/src/rooms/__tests__/MesaRoom.test.ts` | 5 tests actualizados con nuevas assertions |

## Escenarios de Juego Cubiertos

### Escenario 1: Paso Sin Juego → Fold Inmediato

```
P1 (Mano) apuesta → P2 (NINGUNA) pasa → P3 (NINGUNA) pasa
```

- P2 y P3: `isFolded = true`, cartas recogidas al naipe inmediatamente
- Broadcast `fold-return-cards` → AnimationLayer anima cartas volando al naipe
- P1 queda solo → resuelve pique + showdown

### Escenario 2: Paso Con Juego → "Llevo Juego" (Pique Diferido)

```
P1 (Mano) apuesta → P2 (PRIMERA) pasa → "Llevo Juego"
```

- P2: `isFolded = true`, `passedWithJuego = true`, `revealedCards = cartas`
- Board muestra cartas de P2 boca arriba pero dimmed (opacity 0.3, grayscale)
- Ronda de apuestas continúa (pique se resuelve al final de APUESTA_4_CARTAS)
- Tras resolución: `revealedCards = ""`, cartas recogidas → `fold-return-cards` → animación

### Escenario 3: Doble "Llevo Juego" → Resolución por Jerarquía

```
P1 apuesta → P2 (CHIVO) "Llevo" → P3 (PRIMERA) "Llevo"
```

- Ambos salen del pozo principal, compiten solo por pique
- Resolución: `SEGUNDA > CHIVO > PRIMERA` → P2 (CHIVO) gana pique
- Empate: se resuelve por cercanía a Mano en `seatOrder`
- **Ambos** contestants tienen cartas recogidas al naipe (no solo el ganador)

### Escenario 4: Nadie Tiene Juego → Mano Gana Pique

```
P1 (Mano, PRIMERA) apuesta → P2 (NINGUNA) pasa → P3 (NINGUNA) pasa
```

- P2 y P3 fold inmediato (sin juego), cartas recogidas
- Mano gana pique por defecto (nadie con `passedWithJuego`)
- **Mano conserva sus cartas** — sigue activo en el pozo principal

### Escenario 5: Cruzado — Mano Reingresa

```
P1 (Mano) pasa → P2 apuesta → P3 iguala → P1 recibe turno de vuelta
```

- P1 puede: igualar (→ DESCARTE), subir (→ ciclo continúa), pasar definitivo (→ fold)
- Si P3 tenía juego al pasar: `revealedCards` se muestra boca arriba en el Board

### Escenario 6: Excepción de 7 Jugadores

```
7 jugadores → Mano pasa definitivamente en APUESTA_4_CARTAS
```

- Cartas de Mano se **barajan** antes de colocarse en el naipe
- Menos de 7 jugadores: cartas van al naipe en orden original

## Flujo de Animación (Client-Side)

```
Servidor                          Cliente
────────                          ───────
player.isFolded = true        →   Board: muestra pila colapsada (si cardCount > 0)
                                       o cartas face-up (si revealedCards)
collectPlayerCards()           →   setPlayerCards("") → cardCount = 0
                                   Board: nada renderizado
broadcast("fold-return-cards") →   page.tsx: dispatch "animate-discard"
                                   AnimationLayer: crea cards overlay z-9999
                                   Framer Motion: vuela cards de seat → naipe (0.5s)
                                   Auto-cleanup a 0.6s
```

## Tests

253 tests pasan (0 fallos). Assertions actualizados:

- `revealedCards` se establece al decir "Llevo Juego" en APUESTA_4_CARTAS
- Cartas y `revealedCards` de **todos** los contestants se limpian tras resolución del pique
- Mano conserva cartas cuando gana pique por defecto (no es contestant)
- P3 en escenario cruzado muestra `revealedCards` al pasar con juego
