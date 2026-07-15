# Mejoras Futuras: Acciones del Admin en `/admin/recovery`

La página `/admin/recovery` es hoy **estrictamente informativa**: lista incidentes terminales (status `cancelled_crash` o `manual_review`) con su progreso de refunds, pero no permite al admin hacer nada sobre ellos. La información que muestra es valiosa para auditoría y diagnóstico, pero para sacarle más jugo operativo necesita volverse parcialmente accionable.

## 1. Estado actual

### Dónde está

- Página: `apps/web/src/app/(admin)/admin/recovery/page.tsx`
- Server action: `getAdminRecoveryIncidents` en `apps/web/src/app/actions/admin-recovery.ts` (única acción expuesta, solo lectura)
- RPC consumido: `public.list_admin_recovery_incidents()` en `supabase/migrations/20260713090000_admin_recovery_history.sql`
- Tablas: `game_recovery_incidents` y `game_recovery_refunds` en `supabase/migrations/20260713000000_game_crash_recovery.sql`

### Lo que el admin ve hoy

- Lista de incidentes terminales con sala, juego, causa, status, motivo, progreso de refunds, timestamps de detección y resolución.
- Header con totales (cantidad de incidentes + refunds completados/totales).
- No hay botones, no hay filtros, no hay enlaces a acciones derivadas.

### Lo que el admin no puede hacer

- Filtrar por status, rango de fechas, causa o sala.
- Ver el detalle de un incidente en una vista propia.
- Saltar al replay de la partida afectada.
- Saltar al historial financiero del jugador afectado por un refund incompleto.
- Reintentar refunds pendientes manualmente.
- Marcar un `manual_review` como revisado.
- Exportar el histórico (CSV / XLSX).
- Confirmar visualmente "vi este caso, lo dejo como referencia".

## 2. Por qué importa

El admin consulta esta página cuando:

- Un jugador reporta "perdí fichas sin explicación" → busca el `gameId` aquí y cruza con `/admin/consultas` o `/admin/disputes`.
- Quiere validar que los refunds se completaron tras una caída → mira la barra `5/7`.
- Quiere detectar patrones de causa → ve qué `cause_code` se repiten.

Sin filtros ni enlaces, el admin hace ese cruce **manualmente** abriendo otras pestañas y pegando IDs. Es trabajo extra que se repite varias veces al día.

## 3. Roadmap propuesto

Dividido en tres niveles por coste y valor.

### Nivel 1 — Coste bajo, valor alto (un día de trabajo)

Mejoras puramente de UI y enlaces, sin tocar BD ni server actions.

#### 3.1 Filtros en la cabecera de la lista

Tres controles visibles solo cuando hay más de 1 incidente:

- **Status**: `Todos` / `Cancelado por caída` / `Revisión manual`.
- **Causa**: dropdown con los `cause_code` distintos presentes en la lista actual.
- **Rango de fechas**: dos inputs `date` (desde / hasta) que filtran por `detected_at`.

Implementación: estado client-side con `useState` en un componente nuevo `RecoveryFilters.tsx` (la página actual es server component, así que se necesitará extraer la lista a un client component que reciba `incidents` como prop). Los filtros no añaden query al backend — son sobre el array ya cargado.

Beneficio: encontrar incidentes específicos sin scroll. Útil cuando hay 50+ terminales en producción.

#### 3.2 Link al replay de cada incidente

Añadir a la card de cada incidente un botón/link:

```
[ Ver replay ] → /admin/replays/{gameId}
```

El `gameId` ya está disponible en el modelo `AdminRecoveryIncident`. El destino (`/admin/replays/[gameId]`) ya existe y muestra la auditoría completa de la partida.

Beneficio: el admin ve "esta partida tuvo un crash con 2 refunds incompletos" y en un click entra a revisar el replay para entender qué pasó antes de la caída. Cierra el loop de diagnóstico.

Coste: 5 minutos, un `<Link>` en la card.

#### 3.3 Link al historial del jugador (si hay refund incompleto)

Cuando `completedRefunds < totalRefunds`, añadir debajo de la barra de progreso:

```
Refunds incompletos: 2 de 4
[ Ver jugadores afectados ] → /admin/recovery/[gameId]/refunds
```

Esto requiere una nueva ruta `/admin/recovery/[gameId]/refunds` que liste los refunds pendientes con `userId` y monto, cada uno enlazado a `/admin/ledger/[userId]` para el historial financiero individual.

Beneficio: el admin identifica al jugador afectado, va a su ledger, y ve si la caída le dejó saldo inconsistente. Decisión informada sobre si escalar a disputa.

Coste: 2-3 horas. Server action nueva (`getAdminRecoveryRefunds(gameId)`) que devuelva los refunds con `user_id` y `amount_cents`, y la página de detalle.

#### 3.4 Búsqueda rápida por sala o gameId

Input de búsqueda en la cabecera que filtra en cliente sobre `roomId` y `gameId`. Mismo patrón que los filtros de 3.1.

Beneficio: cuando el admin tiene un `roomId` o `gameId` de un reporte, lo pega aquí y encuentra el incidente sin scroll.

Coste: 30 minutos.

### Nivel 2 — Coste medio, valor medio (un sprint)

Requiere mutaciones controladas y nueva server action. No toca dinero directamente.

#### 3.5 Marcaje de "revisado" para `manual_review`

Un incidente en `manual_review` representa un caso que el game server cerró sin completar el flujo automático de recovery (porque detectó algo raro que necesita ojos humanos). El admin debería poder cerrarlos explícitamente.

Cambios necesarios:

1. **Migración nueva**: añadir `acknowledged_by UUID REFERENCES profiles(id)` y `acknowledged_at TIMESTAMPTZ` a `game_recovery_incidents`.
2. **Server action nueva**: `acknowledgeRecoveryIncident(incidentId)` que valide que el admin esté autenticado, que el incidente esté en `manual_review`, y haga el update.
3. **UI**: un botón "Marcar como revisado" visible solo en cards con status `manual_review` y no reconocidas. Tras el click, la card muestra "Revisado por <display_name> · <fecha>".
4. **RPC de listado actualizado**: incluir `acknowledged_by` y `acknowledged_at` en el SELECT.

Beneficio: el admin tiene registro de quién vio cada caso y cuándo. Si el volumen crece, esto evita que dos admins investiguen lo mismo.

Riesgo: si dos admins hacen click casi simultáneamente, ambos registran su reconocimiento. No es grave (ambos son legítimos), pero si se quiere evitar, añadir un check `WHERE acknowledged_at IS NULL` en la action y devolver error si ya está reconocida.

Coste: 1-2 días (migración + action + UI + tests + RLS).

#### 3.6 Exportar a CSV

Botón "Exportar" en la cabecera que genera un CSV con todas las columnas visibles: `roomId`, `gameId`, `cause`, `status`, `resolutionReason`, `completedRefunds`, `totalRefunds`, `detectedAt`, `resolvedAt`.

Implementación: endpoint `GET /api/admin/recovery/export` que use la misma `getAdminRecoveryIncidents` y devuelva `text/csv` con `Content-Disposition: attachment`.

Beneficio: auditoría mensual o trimestral. El admin baja el CSV, lo pasa al equipo financiero o de operaciones, y tienen registro offline.

Coste: 2-3 horas (endpoint + tests).

### Nivel 3 — Coste alto, requiere conversación de producto (no hacer sin discusión)

Estas son ideas que tocan dinero o flujo de operaciones, y deben decidirse con producto antes de implementarse.

#### 3.7 Reintento manual de refunds pendientes

Hoy si un refund queda en `pending`, el game server lo intenta vía cron / reintentos automáticos. Si tras N intentos sigue colgado, no hay forma humana de forzarlo.

Propuesta: acción `forceRetryRefund(refundId)` que re-emplace el refund en la cola. Requiere:

- Endpoint con rate limit (no más de N retries por hora).
- Auditoría de quién forzó el retry y por qué.
- Validación de que el refund no esté ya en `completed`.
- Coordinación con el game server para que el nuevo intento no duplique la acreditación (idempotency key obligatoria).

Riesgo: si se implementa mal, **doble acreditación**. Mesa Primera tiene regla de oro en el ledger (idempotencia + atomicidad), así que cualquier acción de reintento debe pasar por el mismo RPC de inserción con `operation_id` único. Ver `docs/admin/ADMIN_SECURITY.md` y skill `mesa-ledger-atomicity` antes de implementar.

#### 3.8 Cierre de incidente desde el admin

Cambiar el status de `manual_review` a `closed` cuando el admin determina que el caso ya no requiere atención. Similar a 3.5 pero altera el status, no solo añade un campo.

Riesgo: un incidente cerrado por error deja de aparecer en la lista activa. Habría que añadir un filtro "incluir cerrados" o un periodo de gracia.

#### 3.9 Notificación al admin cuando hay `manual_review` nuevo

Hoy si llega un `manual_review` mientras el admin no está mirando la página, no se entera hasta que la abre.

Propuesta: broadcast o email cuando se inserta un incidente en `manual_review`. Requiere tocar el game server (que es quien crea el incidente) y el sistema de broadcast ya existente.

Riesgo: si el game server detecta falsos positivos seguido, el admin se inunda de notificaciones. Umbral de confianza necesario.

## 4. Trabajo relacionado a revisar

Si se hace cualquiera de los niveles anteriores, actualizar:

- `docs/admin/README.md` (sección 17 sobre replays puede crecer para mencionar el flujo de recovery, o crear sección propia).
- `docs/admin/ADMIN_TECHNICAL.md` (rutas, server actions, RPCs nuevos).
- `docs/admin/ADMIN_SECURITY.md` si se añaden mutaciones que toquen ledger o RLS.

## 5. Parche temporal viable (si urge)

Si el admin empieza a quejarse de fricción antes de que entre cualquiera de los niveles:

1. **Lo único que recomiendo ya**: añadir el link "Ver replay" (3.2). Es 5 minutos, sin riesgo, y cierra el caso de uso más común (correlacionar crash con auditoría de la partida).
2. Si la lista crece mucho, añadir paginación simple (mostrar 20 por página con botón "Cargar más") sin filtros ni mutaciones.

## 6. Riesgos generales

- **Fugas de información sensibles**: el RPC actual filtra explícitamente checkpoints, roster y datos por jugador. Cualquier acción nueva (sobre todo Nivel 3) debe respetar esa misma política: el admin ve **resúmenes**, no estados internos de la partida. Ver `supabase/migrations/20260713090000_admin_recovery_history.sql` líneas 1-2 del comentario.
- **Doble acción**: si se añaden mutaciones, hay que garantizar idempotencia con `operation_id` y check de estado previo en la action.
- **RLS**: la tabla `game_recovery_incidents` ya tiene RLS restrictivo (los admins solo leen lo terminal). Si se añade `acknowledge`, hay que validar que la policy de UPDATE esté alineada.
- **Concurrencia**: si dos admins ven el mismo `manual_review` y ambos le dan a "Marcar como revisado" al mismo tiempo, el efecto debe ser idempotente o devolver error limpio.

## 7. Resumen de prioridad sugerida

| Mejora | Coste | Valor | Prioridad |
|---|---|---|---|
| 3.2 Link al replay | 5 min | Alto | **Hacer ya** |
| 3.4 Búsqueda rápida | 30 min | Medio | Hacer si hay >20 terminales |
| 3.1 Filtros | 1 día | Alto | Hacer si la lista crece |
| 3.3 Link a jugadores afectados | 3 h | Alto | Hacer tras 3.2 |
| 3.6 Exportar CSV | 3 h | Medio | Hacer si auditoría lo pide |
| 3.5 Marcaje de revisado | 1-2 días | Medio | Sprint dedicado |
| 3.7 Reintento manual | 1-2 semanas | Alto | Solo si P1 de producto |
| 3.8 Cierre desde admin | 1 semana | Medio | Solo si P1 de producto |
| 3.9 Notificación | 1 semana | Medio | Solo si P1 de producto |
