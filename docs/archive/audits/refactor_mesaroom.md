# Plan de Refactorización: MesaRoom.ts

> **Versión**: 2.0 — Abril 2026  
> **Estrategia**: Strangler Fig + Characterization Tests primero  
> **Principio**: Sin tests de cobertura completa, no hay refactor seguro

---

## 1. Estado Actual — La "Clase Dios"

`MesaRoom.ts` tiene **3,400+ líneas** y centraliza **6 responsabilidades distintas**:

| # | Responsabilidad | Líneas aprox. | Acoplamiento |
|---|----------------|---------------|--------------|
| 1 | Ciclo de vida de red (onJoin, onLeave, reconexiones) | ~400 | Colyseus + Redis + Supabase |
| 2 | Enrutamiento de mensajes (18 handlers `onMessage`) | ~300 | Colyseus Client |
| 3 | Máquina de estados (16 fases, timers, turnos) | ~1,200 | `clock`, `state`, broadcasts |
| 4 | Reglas de negocio puras (baraja, side pots, evaluación) | ~400 | Ninguno (lógica pura) |
| 5 | Persistencia e infraestructura (Supabase, Redis, replays) | ~600 | 26 llamadas Supabase, Redis pub/sub |
| 6 | Administración (kick, mute, ban, delete-room) | ~100 | Supabase + broadcast |

Esto viola SRP y hace que cualquier cambio tenga riesgo de romper lógica no relacionada.

### Métricas actuales
- **Tests existentes**: ~80 en MesaRoom.test.ts + 15 en combinations.test.ts + 93 en services
- **Cobertura mínima configurada**: 50% statements, 40% branches, 50% functions
- **Handlers sin test**: 6 de 18 (admin:kick, admin:mute, admin:ban, lookup-player, transfer, delete-room)
- **Funcionalidades sin cobertura**: reconexión mid-fase, timeout auto-advance, session kick Redis, Canticos con apuesta

---

## 2. Reglas Estrictas del Refactor

### Gate de avance
No se avanza al siguiente paso si alguno de estos falla:
```bash
npm run test --workspace=game-server
npx tsc --noEmit -p apps/game-server/tsconfig.json
```

### Principios inquebrantables
1. **Lift and Shift**: Al extraer código se copia EXACTO. Cero mejoras, cero renombramientos. La optimización es una fase separada posterior.
2. **Un archivo por PR**: Cada extracción genera su propio commit atómico. Si falla, `git revert` y se re-intenta.
3. **Aislamiento progresivo**: Primero lo que no toca Colyseus (puro), luego mensajes, luego fases.
4. **Tests como contrato**: Los tests existentes son el contrato. Si un test falla después de extraer, el refactor está mal — NO el test.
5. **Branch dedicado**: Todo el trabajo se hace en `refactor/mesa-room` con merges frecuentes desde `main`.

---

## 3. FASE 0 — Red de Seguridad (BLOQUEANTE)

> **Sin esta fase completa y verde, NO se toca ni una línea de MesaRoom.ts**

### 3.1 Objetivo
Alcanzar **cobertura de characterization tests** que capture el comportamiento actual como contrato inmutable. No estamos testeando "lo correcto" — estamos capturando "lo que hace ahora" para detectar cualquier regresión.

### 3.2 Baseline: verificar estado actual
```bash
npm run test --workspace=game-server           # Todos los tests pasan
npx tsc --noEmit -p apps/game-server/tsconfig.json  # 0 errores de tipo
npm run test:coverage --workspace=game-server   # Capturar baseline de cobertura
```

### 3.3 Tests a crear — Handlers faltantes (Prioridad ALTA)

Cada test sigue el patrón existente con `createMesaTestContext()` de `mesa-room-test-helpers.ts`.

#### 3.3.1 Admin Moderation Suite
**Archivo**: `apps/game-server/src/rooms/__tests__/MesaRoom.test.ts` (agregar describe block)

```
describe('admin:kick', () => {
  it('expulsa jugador activo y lo marca como removed')
  it('rechaza kick si el emisor no tiene token de supervisión válido')
  it('avanza el turno si el jugador expulsado era el activo')
  it('recalcula side pots si el jugador tenía apuesta activa')
  it('broadcast notificación de kick a todos los clientes')
})

describe('admin:mute', () => {
  it('silencia jugador y marca flag en estado')
  it('rechaza mute sin token de supervisión')
  it('permite unmute del mismo jugador')
})

describe('admin:ban', () => {
  it('banea jugador y lo desconecta de la sala')
  it('persiste ban en Supabase')
  it('rechaza reconexión de jugador baneado')
  it('rechaza ban sin token de supervisión')
})
```

#### 3.3.2 Reconexión Mid-Fase
**Archivo**: `apps/game-server/src/rooms/__tests__/MesaRoom.test.ts`

```
describe('reconexión', () => {
  it('restaura cartas privadas del jugador al reconectarse en PIQUE')
  it('restaura cartas privadas al reconectarse en COMPLETAR')
  it('restaura cartas privadas al reconectarse en GUERRA')
  it('mantiene turno activo si el jugador reconectado era el de turno')
  it('respeta grace period de 5 minutos — no expulsa antes')
  it('expulsa jugador ghost después del grace period')
  it('no permite reconexión con deviceId diferente al original')
  it('resync completo: envía estado de fase + cartas + pot al reconectarse')
})
```

#### 3.3.3 Timeout Auto-Advance
```
describe('timeout auto-advance', () => {
  it('auto-avanza turno después de turn_timeout_seconds en PIQUE')
  it('auto-avanza turno después de timeout en APUESTA_4_CARTAS')
  it('auto-avanza turno después de timeout en GUERRA')
  it('aplica acción por defecto (paso) cuando el jugador no actúa a tiempo')
  it('no aplica timeout si el jugador ya actuó')
})
```

#### 3.3.4 Transfer (room-level)
```
describe('transfer handler', () => {
  it('transfiere chips entre jugadores conectados')
  it('rechaza transferencia a sí mismo')
  it('rechaza transferencia con monto inferior al mínimo')
  it('rechaza transferencia si el emisor no tiene saldo suficiente')
  it('actualiza chips de ambos jugadores en el state')
  it('persiste transferencia en ledger')
})
```

#### 3.3.5 Lookup Player
```
describe('lookup-player', () => {
  it('retorna datos de jugador por teléfono normalizado')
  it('rechaza lookup de espectador sin permiso')
  it('retorna error para teléfono no encontrado')
})
```

#### 3.3.6 Delete Room
```
describe('delete-room', () => {
  it('destruye sala con token de supervisión válido')
  it('rechaza destrucción sin token válido')
  it('rechaza destrucción durante partida activa')
})
```

#### 3.3.7 Session Kick (Redis)
```
describe('session kick', () => {
  it('desconecta sesión anterior cuando el mismo usuario conecta desde otro dispositivo')
  it('envía mensaje de kick al cliente desconectado')
  it('no afecta a otros jugadores de la misma sala')
})
```

#### 3.3.8 Canticos con Apuesta
```
describe('CANTICOS con apuesta', () => {
  it('permite ronda de apuestas en CANTICOS cuando currentMaxBet > 0')
  it('avanza turnos correctamente en CANTICOS')
  it('resuelve CANTICOS y transiciona a DECLARAR_JUEGO')
})
```

### 3.4 Tests a crear — Escenarios de integración completa (Prioridad MEDIA)

Estos tests juegan partidas completas de principio a fin para capturar las transiciones entre fases:

```
describe('partida completa E2E', () => {
  it('3 jugadores: LOBBY → SORTEO → PIQUE → COMPLETAR → APUESTA → DESCARTE → GUERRA → SHOWDOWN → LOBBY')
  it('partida con all-in genera side pots correctos y resuelve showdown')
  it('partida donde todos pasan pique → todos fold → nueva ronda')
  it('partida con pique restart (max 10 restarts safety)')
  it('partida con "Llevo Juego" en APUESTA_4_CARTAS')
})
```

### 3.5 Tests a crear — RNG y Auditabilidad (Prioridad BAJA)

```
describe('RNG audit trail', () => {
  it('genera hash de estado RNG en cada acción')
  it('currentTimeline es consistente y reconstruible')
})
```

### 3.6 Criterios de completitud de Fase 0

| Criterio | Meta |
|----------|------|
| Handlers con test | **18/18** (actualmente 12/18) |
| Reconexión | ≥ 5 escenarios cubiertos |
| Timeout | ≥ 3 escenarios cubiertos |
| Partida completa E2E | ≥ 3 escenarios de flujo completo |
| Coverage statements | **≥ 65%** (subir de 50%) |
| Coverage branches | **≥ 55%** (subir de 40%) |
| Todos los tests | ✅ GREEN |
| TypeCheck | ✅ 0 errores |

### 3.7 Subida de thresholds en vitest.config.ts

Después de completar Fase 0, **subir los thresholds** para que el refactor no pueda degradar cobertura:

```typescript
thresholds: {
  statements: 65,
  branches: 55,
  functions: 65,
  lines: 65,
},
```

---

## 4. Estructura de Directorios Objetivo

```text
apps/game-server/src/rooms/
├── MesaRoom.ts                    # Orquestador delgado (~300 líneas)
├── combinations.ts                # (ya existe — no tocar)
├── core/
│   ├── DeckManager.ts             # createDeck(), shuffleDeck() — lógica pura
│   ├── PotManager.ts              # calculateSidePots(), awardPot logic — pura
│   ├── HandEvaluator.ts           # evaluateHand(), compareHands() — si se extrae de combinations
│   └── ConnectionManager.ts       # onJoin, onLeave, reconexión, grace period
├── commands/                      # Patrón Command (sin @colyseus/command por ahora)
│   ├── PlayerActionCommand.ts     # switch gigante del onMessage("action")
│   ├── PiqueVotingCommand.ts      # propose_pique, vote_pique
│   ├── AdminCommand.ts            # kick, mute, ban, delete-room
│   ├── TransferCommand.ts         # transfer entre jugadores
│   └── LookupCommand.ts          # lookup-player
├── phases/                        # State Machine
│   ├── types.ts                   # IGamePhase, PhaseContext interfaces
│   ├── BasePhase.ts               # Clase abstracta con helpers compartidos
│   ├── SorteoPhase.ts
│   ├── PiquePhase.ts              # Incluye advanceTurnPique, resolveDoublePaso, restartPique
│   ├── CompletarPhase.ts
│   ├── Apuesta4CartasPhase.ts
│   ├── DescartePhase.ts
│   ├── GuerraPhase.ts
│   ├── CanticosPhase.ts
│   ├── DeclararJuegoPhase.ts
│   ├── GuerraJuegoPhase.ts
│   └── ShowdownPhase.ts
└── services/
    └── SessionEnforcer.ts         # Redis pub/sub para sesión única
```

---

## 5. FASE 1 — Domain Services (Riesgo Casi Nulo)

> **Prerequisito**: Fase 0 completa y verde

Extraer funciones que NO dependen de `this.state`, `this.broadcast`, ni `this.clock`.

### Paso 1.1: DeckManager

| Acción | Detalle |
|--------|---------|
| Crear | `core/DeckManager.ts` |
| Mover | `createDeck()`, `shuffleDeck()` — copiar exacto |
| En MesaRoom | `private deck = new DeckManager()` → reemplazar `this.createDeck()` por `this.deck.create()` |
| Test | Crear `core/__tests__/DeckManager.test.ts` con tests unitarios puros |
| Verificar | `npm run test --workspace=game-server` ✅ + `npx tsc --noEmit` ✅ |
| Commit | `refactor(game): extraer DeckManager como servicio puro` |

### Paso 1.2: PotManager

| Acción | Detalle |
|--------|---------|
| Crear | `core/PotManager.ts` |
| Mover | `calculateSidePots()` — copiar exacto |
| Test | `core/__tests__/PotManager.test.ts` — exhaustivo con all-in asimétricos, side pots múltiples, heads-up |
| Verificar | Gate completo |
| Commit | `refactor(game): extraer PotManager como servicio puro` |

### Paso 1.3: Métodos utilitarios puros

Identificar y extraer cualquier otro método que sea función pura (sin side effects de red):
- Cálculo de banda
- Orden de turnos (seat rotation)
- Normalización de teléfono (si existe en MesaRoom)

---

## 6. FASE 2 — Patrón Command para Mensajes (Riesgo Bajo)

> **Prerequisito**: Fase 1 completa y verde

### Decisión: NO usar `@colyseus/command`

En vez de agregar una dependencia nueva, usar un patrón Command simple con funciones/clases que reciben `(room, client, payload)`. Esto reduce acoplamiento y es más fácil de testear.

```typescript
// Ejemplo de interfaz Command
export interface MesaCommand {
  execute(ctx: CommandContext): void;
}

export interface CommandContext {
  room: MesaRoom;       // referencia a la sala para state/broadcast
  client: Client;
  payload: unknown;
}
```

### Paso 2.1: Comandos Admin (más aislados, menos riesgo)

| Acción | Detalle |
|--------|---------|
| Crear | `commands/AdminCommand.ts` |
| Mover | Contenido exacto de `admin:kick`, `admin:mute`, `admin:ban`, `delete-room` |
| En MesaRoom | `this.onMessage("admin:kick", (c, m) => adminKick(this, c, m))` |
| Test | Los tests de admin de Fase 0 deben seguir pasando sin cambio |
| Verificar | Gate completo |
| Commit | `refactor(game): extraer comandos admin a AdminCommand` |

### Paso 2.2: Comandos de Votación Pique

| Acción | Detalle |
|--------|---------|
| Crear | `commands/PiqueVotingCommand.ts` |
| Mover | `propose_pique`, `vote_pique` |
| Verificar | Gate completo |
| Commit | `refactor(game): extraer votación de pique a PiqueVotingCommand` |

### Paso 2.3: Transfer y Lookup

Misma mecánica. Un archivo por responsabilidad.

### Paso 2.4: El Gigante — PlayerActionCommand

| Acción | Detalle |
|--------|---------|
| Crear | `commands/PlayerActionCommand.ts` |
| Mover | TODO el contenido del `onMessage("action")` exacto |
| Nota | El command puede recibir `room: any` temporalmente para llamar métodos internos como `advanceTurnPique()`. Esto se limpiará en Fase 4. |
| Verificar | Gate completo — TODOS los tests de acciones deben pasar |
| Commit | `refactor(game): extraer action handler a PlayerActionCommand` |

---

## 7. FASE 3 — Conexión y Sesión (Riesgo Medio)

> **Prerequisito**: Fase 2 completa y verde

### Paso 3.1: SessionEnforcer

| Acción | Detalle |
|--------|---------|
| Crear | `services/SessionEnforcer.ts` |
| Mover | `setupSessionKickListener()`, `handleSessionKick()`, lógica de Redis pub/sub |
| En MesaRoom | `this.sessionEnforcer = new SessionEnforcer(redisClient)` en `onCreate` |
| Test | Los tests de session kick de Fase 0 deben pasar |
| Verificar | Gate completo |
| Commit | `refactor(game): extraer SessionEnforcer` |

### Paso 3.2: ConnectionManager

| Acción | Detalle |
|--------|---------|
| Crear | `core/ConnectionManager.ts` |
| Mover | `onJoin` (validación de saldo, creación/restauración de Player), `onLeave` (grace period, ghost cleanup) |
| Nota | Esta es la extracción más delicada porque `onJoin`/`onLeave` son métodos del lifecycle de Colyseus. El ConnectionManager será un helper que MesaRoom llama dentro de sus propios `onJoin`/`onLeave`. |
| En MesaRoom | `async onJoin(client, options) { await this.connectionMgr.handleJoin(this, client, options); }` |
| Verificar | Gate completo + tests de reconexión E2E |
| Commit | `refactor(game): extraer ConnectionManager` |

---

## 8. FASE 4 — Máquina de Estados (Riesgo Alto)

> **Prerequisito**: Fases 1-3 completas y verdes. MesaRoom ya debe estar ~1,500 líneas menos.

### 8.1 Definir la interfaz

```typescript
// phases/types.ts
export interface IGamePhase {
  readonly name: string;
  onEnter(ctx: PhaseContext): void;
  onAction(ctx: PhaseContext, playerId: string, action: unknown): void;
  advanceTurn(ctx: PhaseContext, startFromId?: string): void;
  onExit(ctx: PhaseContext): void;
}

export interface PhaseContext {
  state: GameState;           // El schema de Colyseus
  clock: Clock;               // Para timers
  broadcast: (type: string, data: unknown) => void;
  send: (client: Client, type: string, data: unknown) => void;
  deck: DeckManager;
  pot: PotManager;
  changePhase: (phase: IGamePhase) => void;  // Transición
  // ... otros servicios necesarios
}
```

### 8.2 Migrar una fase a la vez

**Orden de migración** (de menor a mayor riesgo):

| Orden | Fase | Razón |
|-------|------|-------|
| 1 | `SorteoPhase` | Más simple, solo reparte 3 cartas y transiciona |
| 2 | `DeclararJuegoPhase` | Aislada, validación server-side |
| 3 | `ShowdownPhase` | Compleja pero terminal (no transiciona a otra fase de juego) |
| 4 | `CanticosPhase` | Relativamente simple |
| 5 | `DescartePhase` | Descarte + fold |
| 6 | `CompletarPhase` | Recoger cartas, repartir |
| 7 | `Apuesta4CartasPhase` | Apuestas + paso-juego-choice + pique diferido |
| 8 | `GuerraPhase` | Ronda de apuestas con all-in |
| 9 | `GuerraJuegoPhase` | Variante de guerra |
| 10 | `PiquePhase` | **La más compleja**: advanceTurn, restart, reopen, resolveDoublePaso, banda |

### 8.3 Proceso por cada fase

Para cada fase (ejemplo con SorteoPhase):

1. **Crear** `phases/SorteoPhase.ts` con una clase que implementa `IGamePhase`
2. **Copiar exacto** el contenido de `startPhase1Sorteo()` al método `onEnter()`
3. **En MesaRoom**, reemplazar la llamada:
   ```typescript
   // Antes:
   this.startPhase1Sorteo();
   // Después:
   this.changePhase(new SorteoPhase());
   ```
4. **Ejecutar gate**: `npm run test --workspace=game-server` + `tsc --noEmit`
5. **Commit**: `refactor(game): extraer SorteoPhase de MesaRoom`

### 8.4 El caso especial: PiquePhase

PiquePhase es la fase más compleja del juego. Incluye:
- `startPhase2Pique()` — setup inicial
- `advanceTurnPique()` — rotación de turnos con lógica de reopen
- `resolveDoublePaso()` — cuando ambos pasan
- `restartPique()` — refund y nuevo pique
- `awardPiqueToContestant()` — resolución
- Lógica de Mano (fija pique)

**Estrategia**: Migrar como UN solo bloque monolítico primero. Refactorizar internamente después, en un PR separado.

---

## 9. FASE 5 — Limpieza y Optimización (Post-Refactor)

> **Prerequisito**: MesaRoom.ts ≤ 300 líneas, todos los tests verdes

### 9.1 Subir thresholds finales
```typescript
thresholds: {
  statements: 75,
  branches: 65,
  functions: 75,
  lines: 75,
},
```

### 9.2 Mejoras de diseño (AHORA sí se permite)
- Renombrar métodos para mayor claridad
- Eliminar `any` donde se usó temporalmente en Commands
- Tipar el `PhaseContext` con interfaces precisas
- Eliminar dead code detectado durante la extracción

### 9.3 Documentación
- Actualizar `docs/game/MESA_VERSIONS.md` con versión MAJOR (v1.0.0) por reestructuración
- Actualizar `docs/game/GAME_SCENARIOS.md` si algún escenario cambió de ubicación
- Agregar JSDoc a las interfaces públicas de cada módulo

---

## 10. Plan de Rollback

| Situación | Acción |
|-----------|--------|
| Test falla después de extracción | `git revert <commit>` del último paso |
| Error de tipo no resuelto | No avanzar. Arreglar in-situ o revert |
| Degradación de cobertura | Los thresholds de vitest lo bloquean automáticamente |
| Bug en producción durante refactor | Mergear fix en `main`, rebase `refactor/mesa-room`, continuar |
| Fase completa genera regresión sutil | Revert toda la fase, agregar test de characterization para el caso, reintentar |

---

## 11. Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Timers (`clock.setTimeout`) pierden referencia al extraer fases | Alta | Alto | PhaseContext expone `clock` directamente; tests con `vi.useFakeTimers()` |
| `this` binding se rompe en Commands | Media | Alto | Usar funciones en vez de clases, o `.bind()` explícito |
| Reconexión restaura estado de fase anterior (no la nueva estructura) | Media | Alto | Tests de reconexión mid-fase en Fase 0 lo capturan |
| Broadcasts cambian de orden/timing | Baja | Medio | Characterization tests capturan secuencia exacta |
| Side pots calculados distinto al extraer | Baja | Crítico | PotManager tiene tests unitarios exhaustivos desde Fase 1 |
| `@colyseus/testing` no soporta escenarios complejos | Media | Medio | Usar el helper `createMesaTestContext` existente que ya funciona |

---

## 12. Criterios de Éxito Final

| Métrica | Antes | Después |
|---------|-------|---------|
| Líneas de MesaRoom.ts | 3,400+ | ≤ 300 |
| Archivos en `rooms/` | 2 | ~20 (bien organizados) |
| Coverage statements | ~50% | ≥ 75% |
| Coverage branches | ~40% | ≥ 65% |
| Handlers sin test | 6/18 | 0/18 |
| Tiempo para agregar nueva fase | Horas | Minutos (crear archivo, implementar interface) |
| Riesgo de regresión por cambio | Alto | Bajo (cambio aislado por módulo) |

---

## 13. Orden de Ejecución Resumido

```
FASE 0  ─── Characterization Tests (BLOQUEANTE)
  │         ├── 3.3.1  Admin moderation suite
  │         ├── 3.3.2  Reconexión mid-fase
  │         ├── 3.3.3  Timeout auto-advance
  │         ├── 3.3.4  Transfer room-level
  │         ├── 3.3.5  Lookup player
  │         ├── 3.3.6  Delete room
  │         ├── 3.3.7  Session kick Redis
  │         ├── 3.3.8  Canticos con apuesta
  │         ├── 3.4    Partidas completas E2E
  │         └── 3.7    Subir thresholds
  │
FASE 1  ─── Domain Services (puro, sin red)
  │         ├── DeckManager
  │         ├── PotManager
  │         └── Utilidades puras
  │
FASE 2  ─── Commands (mensajes)
  │         ├── AdminCommand
  │         ├── PiqueVotingCommand
  │         ├── Transfer + Lookup
  │         └── PlayerActionCommand
  │
FASE 3  ─── Conexión y Sesión
  │         ├── SessionEnforcer
  │         └── ConnectionManager
  │
FASE 4  ─── State Machine (alto riesgo)
  │         ├── Interfaces + PhaseContext
  │         └── 10 fases migradas una a una
  │
FASE 5  ─── Limpieza + Optimización
            ├── Subir thresholds finales
            ├── Eliminar any + dead code
            └── Documentación MESA_VERSIONS
```
