# Fases del Servidor

Fuente viva del flujo que ejecuta `apps/game-server/src/rooms/phases/`. Los
ids de este documento deben coincidir con `GameState.phase` y con el reglamento
oficial versionado en `apps/web/src/lib/official-rulebook.ts`.

## Flujo de una mano

```text
LOBBY → STARTING → BARAJANDO → SORTEO_MANO → BARAJANDO → PIQUE_DEAL → PIQUE
→ COMPLETAR → APUESTA_4_CARTAS → JUEGO_VALIDACION (si aplica) → DESCARTE
→ COMPLETAR_DESCARTE → REVELAR_CARTA → GUERRA → CANTICOS (si aplica)
→ DECLARAR_JUEGO → GUERRA_JUEGO (si aplica) → SHOWDOWN/SHOWDOWN_WAIT → LOBBY
```

## Fases y propósito

| Fase | Propósito |
| --- | --- |
| `LOBBY` | Esperar jugadores listos y validar el inicio de la mano. |
| `STARTING` | Cuenta regresiva de cinco segundos. |
| `BARAJANDO` | Preparar un mazo controlado por el servidor. |
| `SORTEO_MANO` | En la primera mano, elegir La Mano con el primer Oro. |
| `PIQUE_DEAL` | Repartir dos cartas a cada jugador activo. |
| `PIQUE` | Resolver Voy/Paso y el pique separado. |
| `COMPLETAR` | Repartir dos cartas adicionales hasta completar cuatro. |
| `APUESTA_4_CARTAS` | Primera ronda de apuestas del pozo principal. |
| `JUEGO_VALIDACION` | Decisión simultánea de juego tras todos los checks; dura 30 segundos. |
| `DESCARTE` | Elegir cartas para conservar o descartar. |
| `COMPLETAR_DESCARTE` | Reponer las cartas descartadas desde el fondo. |
| `REVELAR_CARTA` | Mostrar la carta del fondo; no cambia el resultado. |
| `GUERRA` | Ronda fuerte de apuestas con cuatro cartas. |
| `CANTICOS` | Segunda ronda normal si Guerra tuvo apuestas. |
| `DECLARAR_JUEGO` | Confirmar juego mediante evaluación autoritativa del servidor. |
| `GUERRA_JUEGO` | Apuesta exclusiva entre quienes declararon juego. |
| `SHOWDOWN` | Revelar, comparar y liquidar los pozos. |
| `SHOWDOWN_WAIT` | Ventana de mostrar/ocultar cuando queda un ganador por abandono. |

## Reglas transversales

- La Mano activa abre cada ronda y recibe `+1` punto solo para desempates.
- Si La Mano se retira o pierde el asiento, `transferMano()` asigna el siguiente jugador activo.
- Los empates que persistan después del bono dividen el pozo correspondiente.
- Cada side pot se compara y divide de forma independiente.
- Las acciones inválidas no deben cancelar el temporizador del turno válido.
- El turno normal dura 120 segundos; la reconexión no consentida dura 60 segundos.
- `JUEGO_VALIDACION` entrega opciones privadas para no revelar las cartas de otro jugador.
- La carta de `REVELAR_CARTA` es informativa: no interviene en puntos, apuestas ni ganador.

## Referencias de implementación

- Estado: `apps/game-server/src/schemas/GameState.ts`.
- Acciones: `apps/game-server/src/rooms/commands/PlayerActionCommand.ts` y `ShowdownCommand.ts`.
- Comparación: `apps/game-server/src/rooms/combinations.ts`.
- Pozos: `apps/game-server/src/rooms/core/PotManager.ts`.
- Reconexión: `apps/game-server/src/rooms/core/ConnectionManager.ts`.
- Reglamento visible: `apps/web/src/lib/official-rulebook.ts`.
