# Documentación de Fase: Sprint 2 (Lobby + Colyseus Motor Base)

**Estado:** 100% Completado ✅

## Resumen del Sprint

El Sprint 2 estuvo centrado en cimentar la arquitectura base del **Game Server** mediante **Colyseus**. Resolvimos la seguridad criptográfica del mazo, las seis fases principales del juego (State Machine de "Mesa Primera"), y la interacción robusta del sistema de reconexión. Además, se finalizó el enlazado del `Lobby` a nivel de Interfaz React para creación e ingreso a mesas.

## Hitos Completados

### 1. Game Server: Seguridad y RNG

- **Colyseus `@filter`:** El esquema `GameState.ts` aplicó el decorador `@filter` a `Player.cards` garantizando que el paquete binario de red (JSON Patches) oculte las cartas privadas a contrincantes previniendo _Network Sniffing_ y _Wallhacks_.
- **Fisher-Yates RNG Crypto:** Refinamos el baraje implementando `crypto.randomInt()` y firmamos la mesa con `randomBytes(16)` en la variable de state `lastSeed` permitiendo auditorías de RNG innegables del Backend sin inferencia de clientes.
- **Reconexiones (allowReconnection):** Un cliente desconectado imprevistamente conserva su asiento 60 segundos bajo estado `connected: false` tolerando micro-cortes de la red móvil sin perder su `isFolded` o inventario de la mesa.

### 2. Máquina de Estados (State Machine)

La clase `MesaRoom.ts` orquesta el flujo en `startNewGame()` a través de un ciclo síncrono por timer e intercambio de WebSockets distribuyendo las las sig:

- **SORTEO_MANO (Fase 1):** Saca una carta pública para deducir mecánicamente al Dealer (`dealerId`).
- **PIQUE (Fase 2):** Reparte el "Ante" con 2 cartas y espera inputs `"voy"`/`"paso"`.
- **COMPLETAR (Fase 3):** Rellena mano de los sobrevivientes a 4 cartas totales en poder.
- **CANTICOS (Fase 4):** Evaluador automático base.
- **GUERRA (Fase 5):** Estructura base para apostar, llamar o retirarse (`bet`/`call`/`fold`).
- **SHOWDOWN (Fase 6):** Llama a liquidación definitiva donde distribuye el saldo.

### 3. Integración con el Ledger Financiero Directo

- Se levantó e inyectó un entorno independiente de `SupabaseService.ts` a nivel Colyseus.
- El servidor de juego ahora llama _automáticamente_ al API Root Role (Service_Role) al acabar una partida y emite el pago del ganador y retira el 5% de Rake sin falsificación del Frontend. Simultáneamente impacta `player_stats.wins`.

## Próximos Pasos de Proyecto (Sprint 3)

Lo siguiente será trabajar minuciosamente en las **Reglas Jerárquicas** y **Show/Hide Cards API** de forma visual, implementando las dinámicas interactivas in-game de React con tres.js/framer-motion sobre la mesa virtual e integrando el componente de amigos/ranking.
