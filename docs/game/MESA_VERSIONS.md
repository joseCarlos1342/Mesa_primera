# Versionado del Motor de Mesa — Mesa Primera

Registro de versiones del motor de juego (`MesaRoom`) basado en correcciones y validaciones de escenarios de juego. Cada versión documenta qué escenarios se corrigieron, qué archivos cambiaron y el estado de los tests.

Este archivo se actualiza con cada fix o mejora del motor de juego. El versionado sigue `MAJOR.MINOR.PATCH`:
- **MAJOR**: cambio de reglas fundamentales o reestructuración del motor
- **MINOR**: corrección o adición de escenarios de juego
- **PATCH**: corrección de bugs visuales, animaciones o ajustes menores

---

## v1.0.0 — 2026-04-27

### Reestructuración arquitectónica del motor: state machine extraída + cleanup de tipos

**Tipo**: MAJOR (reestructuración interna del motor sin cambio de reglas; comportamiento idéntico).

**Resumen**:
- Fase 4: Se extraen las 12 fases de juego de `MesaRoom.ts` a archivos dedicados bajo `apps/game-server/src/rooms/phases/`, gobernadas por `PhaseRouter` e `IGamePhase`.
  - `RevealBottomCardPhase`, `SorteoPhase` (incluye `piquePhase`), `CanticosPhase`, `ReemplazoDescartePhase`, `CompletarPhase`, `DescartePhase`, `DeclararJuegoPhase`, `Apuesta4CartasPhase`, `GuerraJuegoPhase`, `GuerraPhase`, `ShowdownPhase`.
  - Tabla estática `NEXT_PHASE_TRANSITIONS` reemplaza el switch de `getNextPhaseCallback`.
  - Barrel `phases/index.ts` autoregistra cada fase en el router.
- Fase 5: Cleanup de tipos.
  - `PhaseContext` ya no es `any`: ahora es `MesaRoom`. Lo mismo para `RoomCtx` en `commands/`.
  - Constantes consolidadas en `apps/game-server/src/rooms/core/constants.ts` (`MIN_BALANCE_CENTS`, `COLYSEUS_CONSENTED_CLOSE_CODE`).
  - Thresholds de cobertura subidos: 50/40/50/50 → **75/65/75/75** (real: ~91/81/90/92).
- Refactors previos consolidados en esta versión: `DeckManager`, `PotManager`, `ConnectionManager`, comandos extraídos (`Admin`, `Lookup`, `PiqueVoting`, `PlayerAction`, `RoomLifecycle`, `Showdown`, `Transfer`), `SessionEnforcer`.

**Métricas**:
- `MesaRoom.ts`: **3.496 → 1.933 líneas** (-45%).
- Tests: **671/671 passing** (vitest, 13 suites).
- `tsc --noEmit`: limpio en `apps/game-server` y `apps/web`.

**Compatibilidad**:
- Cero cambios de reglas, cero cambios de protocolo Colyseus, cero cambios de schema.
- Replays antiguos siguen siendo legibles.

**Archivos clave**:
- `apps/game-server/src/rooms/MesaRoom.ts`
- `apps/game-server/src/rooms/phases/*.ts` (15 archivos nuevos)
- `apps/game-server/src/rooms/commands/*.ts` (7 archivos nuevos)
- `apps/game-server/src/rooms/core/{ConnectionManager,DeckManager,PotManager,constants}.ts`
- `apps/game-server/src/services/SessionEnforcer.ts`
- `apps/game-server/vitest.config.ts` (thresholds)



### Replay móvil 7 asientos: showdown sin ghosting + layout inferior + parser tolerante

**Escenarios afectados**: ninguno (corrección visual + retrocompatibilidad de datos)

**Fixes**:
- `SHOWDOWN`/`SHOWDOWN_WAIT` mostraban cartas reveladas de jugadores foldeados con `opacity: 0.3` + `grayscale`, dando un efecto fantasma. Ahora el tratamiento atenuado solo se aplica fuera de fases de revelación (`!isRevealPhase`); en showdown las cartas se ven nítidas a 100%.
- Mismo bug existía paralelamente en la mesa viva (`Board.tsx`); también corregido.
- `parseCard` aceptaba sólo el formato canónico `valor-Palo`. Replays antiguos en formato compacto (`"7O"`) se renderizaban como dorsos. Ahora parsea ambos formatos.

**Cambios de layout (móvil-first)**:
- El clúster central de botes + mazo + bottom card pasa de centrado vertical a anclado al tercio inferior, liberando la franja superior para las manos de hasta 7 jugadores.
- Cada asiento expone `data-seat-zone="avatar"` y `data-seat-zone="cards"` (zonas separadas explícitamente para avatar perimetral y cartas hacia el centro).

**Tests**:
- +9 tests en `apps/web/src/components/replay/__tests__/ReplayBoard.test.tsx`.
- 470/470 tests passing en `apps/web`.

**Archivos modificados**:
- `apps/web/src/components/replay/ReplayBoard.tsx`
- `apps/web/src/components/game/Board.tsx`
- `apps/web/src/types/replay.ts`
- `apps/web/src/components/replay/__tests__/ReplayBoard.test.tsx`

---

## v0.7.3 — 2026-04-25

### Fullscreen del replay aislado al contenedor de la mesa

**Escenarios afectados**: ninguno (corrección de scope visual)

**Fixes**:
- El fullscreen del replay se invocaba sobre `document.documentElement`, lo que arrastraba la NAV, sidebars y todo el shell a la pantalla completa.
- `useFullscreen` ahora acepta un `RefObject<HTMLElement>` opcional; sin argumento mantiene `documentElement` (compatibilidad con `game-header.tsx`).
- `ReplayController` envuelve la mesa + controles flotantes en un contenedor dedicado (`replay-fullscreen-target`) y lo pasa al hook. En fullscreen el contenedor pasa a `fixed inset-0 z-[1000] w-screen h-screen` y la mesa expande con `!h-full !min-h-0 !rounded-none !border-0` (100vw/100vh, sin márgenes).
- La barra de progreso y los controles de escritorio se ocultan automáticamente en fullscreen; solo permanecen visibles los controles flotantes (Anterior, Play/Pause, Siguiente, Salir).
- Los floating controls se reubicaron DENTRO del target fullscreen para que el navegador no los oculte al entrar en pantalla completa.

**Tests**:
- `apps/web/src/components/replay/__tests__/ReplayController.test.tsx` actualizado: el spy se aplica a `HTMLElement.prototype.requestFullscreen` y se verifica que el target NO sea `document.documentElement` y SÍ sea el div `replay-fullscreen-target`.
- 461/461 tests passing en `apps/web`.

**Archivos modificados**:
- `apps/web/src/hooks/useFullscreen.ts`
- `apps/web/src/components/replay/ReplayController.tsx`
- `apps/web/src/components/replay/__tests__/ReplayController.test.tsx`

---

## v0.7.2 — 2026-04-25

### Fidelidad temporal y geometría del replay (3–7 asientos, fullscreen móvil)

**Escenarios afectados**: ninguno (no cambian reglas; ajuste de visualización del replay)

**Fixes**:
- `ReplayController` construía un mapa global de cartas recorriendo TODOS los frames + `final_hands`, lo que provocaba que el primer paso del timeline mostrara las cartas reveladas en SHOWDOWN. Reemplazado por una memoria progresiva indexada por frame (0..i).
- El board del replay sólo soportaba 6 asientos hardcodeados; el motor admite hasta 7.
- En los asientos inferiores la mano quedaba tapada por el badge/bote central (mismo `z-20`).
- Las "Manos Finales" usaban una grilla fija (`sm:grid-cols-2 lg:grid-cols-4`) que dejaba huecos al haber 3 manos y se sentía estrecha con 7.

**Mejoras**:
- Fullscreen móvil al pulsar Play (`useFullscreen`, best-effort), con controles flotantes (anterior/play/pause/siguiente/salir) sobre la mesa. Salir vuelve a la vista normal del replay.
- Layout adaptativo de asientos para 3, 4, 5, 6 y 7 jugadores distribuidos por todo el perímetro.
- Grid de Manos Finales que se ajusta al número real de manos.

**Archivos modificados**:
| Archivo | Cambio |
|---------|--------|
| `apps/web/src/components/replay/ReplayController.tsx` | Memoria progresiva por índice; `finalHands` ya no alimenta pasos intermedios; integración con `useFullscreen`; controles flotantes en fullscreen. |
| `apps/web/src/components/replay/ReplayBoard.tsx` | `seatPositionsFor(N)` para 3–7 asientos; `z-30` en manos de asientos inferiores; sin slots vacíos. |
| `apps/web/src/components/replay/__tests__/ReplayController.test.tsx` | +3 tests: no-bleed inicial, no-fallback de `finalHands` en intermedios, fullscreen móvil + controles flotantes. |
| `apps/web/src/components/replay/__tests__/ReplayBoard.test.tsx` | +2 tests: 7 asientos, 3 jugadores sin slots vacíos. |
| `apps/web/src/app/(player)/replays/[gameId]/page.tsx` | Grid adaptativo de Manos Finales. |
| `apps/web/src/app/(admin)/admin/replays/[gameId]/page.tsx` | Grid adaptativo de Manos Finales. |

**Tests**:
- web (Jest): 461 pass / 0 fail (53 suites)
- game-server (Vitest, `src/services`): 87 pass / 0 fail
- TypeScript: clean (web y game-server, exit 0)
- ESLint web (archivos tocados): clean

---

## v0.7.1 — 2026-04-18

### Animación de recogida de cartas

**Escenarios afectados**: E-001 a E-007

**Fixes**:
- Cartas de perdedores del pique no se recogían al naipe (solo las del ganador)
- Mano perdía sus cartas al ganar pique por defecto (`collectPlayerCards` destructivo)
- `revealedCards` no se establecía al decir "Llevo Juego" en APUESTA_4_CARTAS
- Board solo renderizaba cartas face-up en fases SORTEO_MANO/SHOWDOWN

**Archivos modificados**:
| Archivo | Cambio |
|---------|--------|
| `apps/game-server/src/rooms/MesaRoom.ts` | Separar `collectPlayerCards` de `awardPiqueToContestant`, set `revealedCards` en Llevo Juego APUESTA_4_CARTAS, recoger cartas de todos los contestants |
| `apps/web/src/components/game/Board.tsx` | Cambiar condición `isRevealPhase && cards` → `cards` para renderizado face-up |
| `apps/game-server/src/rooms/__tests__/MesaRoom.test.ts` | 5 assertions actualizados |

**Tests**: 253 pass, 0 fail  
**TypeScript**: clean (exit 0)

---

## v0.7.0 — 2026-04-17

### Separación pique/pozo principal y paso inmediato

**Escenarios afectados**: E-001 a E-006

**Fixes**:
- Eliminado mecanismo provisional `pasoPendienteIds` que re-preguntaba a jugadores que ya habían pasado
- Paso es ahora definitivo e inmediato: sin juego → fold, con juego → pregunta "Llevo Juego" al instante
- Pique diferido en APUESTA_4_CARTAS: se resuelve al final de la fase, no durante
- Resolución de pique por jerarquía (`SEGUNDA > CHIVO > PRIMERA`) con tiebreak por cercanía a Mano
- Mano reingresa cuando alguien apuesta después de su check (escenario cruzado)
- Excepción 7 jugadores: cartas de Mano barajadas antes del naipe

**Nuevos métodos en MesaRoom**:
- `collectPlayerCards(playerId, shuffle)` — recoge cartas al deck con broadcast
- `resolveAndStartDescarte()` — resuelve pique diferido + inicia DESCARTE
- `resolvePiqueAfterApuesta4()` — compara contestants por jerarquía de juego
- `awardPiqueToContestant(winnerId)` — paga pique con 5% rake

**Archivos modificados**:
| Archivo | Cambio |
|---------|--------|
| `apps/game-server/src/rooms/MesaRoom.ts` | 6 cambios de producción + 4 métodos nuevos |
| `apps/game-server/src/rooms/__tests__/MesaRoom.test.ts` | 11 tests nuevos + 7 reemplazos |

**Tests**: 253 pass, 0 fail  
**TypeScript**: clean (exit 0)

---

## Historial de Escenarios por Versión

| Versión | Escenarios validados | Total tests |
|---------|---------------------|-------------|
| v0.7.1  | E-001 – E-007       | 253         |
| v0.7.0  | E-001 – E-006       | 253         |
