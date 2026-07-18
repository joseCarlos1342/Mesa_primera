# Acciones del Admin en `/admin/recovery` — Implementado

> **Archivado:** 2026-07-18
> **Estado:** implementado, validado y aplicado en el entorno de desarrollo enlazado.

> **Actualización 2026-07-18:** las fases operativas aprobadas están implementadas y validadas en el repositorio: detalle terminal de refunds con enlaces al ledger, conciliación mediante RPC, CSV seguro, cierre irreversible y alerta persistente deduplicada para `manual_review`. Las migraciones fueron aplicadas en el entorno de desarrollo enlazado. Las acciones preservan Admin Blindness y no aceptan créditos, montos ni `operation_id` desde el cliente.

> **Corrección de premisas:** el flujo actual de expiración de recovery es transaccional y no tiene una cola periódica de refunds pendientes; si falla, deriva a `manual_review`. Los incidentes `manual_review` generan una alerta crítica persistente y deduplicada en `server_alerts`.

## Gate de reconciliación de migraciones

Para un entorno que todavía termine en `20260713100000`, la aplicación queda bloqueada hasta reconciliar el historial remoto. El entorno de desarrollo enlazado ya tiene la secuencia completa.

- **No usar `supabase migration repair --status applied`** para este caso: solo inserta una marca en el historial y no ejecuta SQL.
- Antes de una ventana de mantenimiento, ejecutar prechecks de incidentes `recovery_pending`, refunds no completados, admins disponibles, evidencia JSON histórica inválida y duplicados de operaciones de compensación.
- Drenar recovery y detener binarios antiguos antes de aplicar, en este orden: investigaciones (`140000`), fencing de mapping (`140100`), fencing de resolución (`140200`), explorador (`18010833`), reconciliación (`18020246`), reconocimiento (`18024605`), operaciones admin (`18033000`), deduplicación de alertas (`18033100`) y hardening de evidencia ledger al cerrar (`18034000`).
- Aplicar con `pnpm exec supabase db push --linked` únicamente tras backup verificable, prechecks limpios y aprobación de la ventana. Luego regenerar tipos y ejecutar pruebas SQL contra el esquema actualizado.

La reconciliación no tiene rollback automático seguro: `140000` transforma evidencia histórica y `140100`/`140200` cambian contratos RPC del game server.

El código preparado convierte `/admin/recovery` en una consola terminal parcialmente accionable: filtra y pagina incidentes `cancelled_crash`, `manual_review` o `closed`, enlaza replays/refunds, permite reconocer y cerrar revisiones, y exporta CSV sin exponer estado activo de juego.

## 1. Baseline previo que motivó el cambio

Esta sección conserva el estado anterior a la implementación para explicar el problema original; no describe el código preparado actualmente.

### Dónde estaba

- Página: `apps/web/src/app/(admin)/admin/recovery/page.tsx`
- Server action: `getAdminRecoveryIncidents` en `apps/web/src/app/actions/admin-recovery.ts` (única acción expuesta, solo lectura)
- RPC consumido: `public.list_admin_recovery_incidents()` en `supabase/migrations/20260713090000_admin_recovery_history.sql`
- Tablas: `game_recovery_incidents` y `game_recovery_refunds` en `supabase/migrations/20260713000000_game_crash_recovery.sql`

### Lo que veía el admin

- Lista de incidentes terminales con sala, juego, causa, status, motivo, progreso de refunds, timestamps de detección y resolución.
- Header con totales (cantidad de incidentes + refunds completados/totales).
- No hay botones, no hay filtros, no hay enlaces a acciones derivadas.

### Lo que el admin no podía hacer

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

## 3. Implementación realizada

Dividido en tres niveles por coste y valor.

### Nivel 1 — Consulta terminal (preparado, pendiente de aplicar migración)

Mejoras puramente de UI y enlaces, sin tocar BD ni server actions.

#### 3.1 Filtros en la cabecera de la lista

Tres controles visibles solo cuando hay más de 1 incidente:

- **Status**: `Todos` / `Cancelado por caída` / `Revisión manual`.
- **Causa**: dropdown con los `cause_code` distintos presentes en la lista actual.
- **Rango de fechas**: dos inputs `date` (desde / hasta) que filtran por `detected_at`.

Implementación aplicada: `RecoveryExplorer.tsx` mantiene el formulario cliente, pero los filtros se representan en `searchParams` y llegan a `list_admin_recovery_incidents_v2`. La RPC pagina con cursor `(detected_at, game_id)`, límite en servidor y búsqueda por prefijo de sala o `gameId` exacto; no descarga todo el histórico al navegador.

Beneficio: encontrar incidentes específicos sin scroll. Útil cuando hay 50+ terminales en producción.

#### 3.2 Link al replay de cada incidente

Añadir a la card de cada incidente un botón/link:

```
[ Ver replay ] → /admin/replays/{gameId}
```

El destino (`/admin/replays/[gameId]`) ya existe. El enlace solo se muestra cuando `replay_available` es verdadero; una caída puede no haber persistido una grabación y entonces se informa `Replay no disponible`.

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

Input de búsqueda en la cabecera que consulta en servidor por prefijo de `roomId` o `gameId` exacto. Usa el mismo contrato de filtros y cursor de 3.1.

Beneficio: cuando el admin tiene un `roomId` o `gameId` de un reporte, lo pega aquí y encuentra el incidente sin scroll.

Coste: 30 minutos.

### Nivel 2 — Operación no financiera

Requiere mutaciones controladas y nueva server action. No toca dinero directamente.

#### 3.5 Marcaje de "revisado" para `manual_review`

Un incidente en `manual_review` representa un caso que el game server cerró sin completar el flujo automático de recovery (porque detectó algo raro que necesita ojos humanos). El admin debería poder cerrarlos explícitamente.

Implementado el 2026-07-18:

1. Migración `20260718024605_acknowledge_recovery_incident.sql` con `acknowledged_by`, `acknowledged_at` y constraint de consistencia.
2. RPC `acknowledge_game_recovery_incident` protegida, atómica e idempotente: solo admite incidentes terminales en `manual_review` y el primer reconocimiento prevalece.
3. Server action `acknowledgeRecoveryIncident(incidentId)` y botón "Marcar como revisado" solo para cards pendientes. Tras completar, se refresca la página y la card muestra "Revisado".
4. El listado complementa el resumen terminal con el ID y fecha de reconocimiento desde `game_recovery_incidents`, bajo RLS admin existente.

Beneficio: el admin tiene registro de quién vio cada caso y cuándo. Si el volumen crece, esto evita que dos admins investiguen lo mismo.

Riesgo controlado: dos admins pueden pulsar casi a la vez, pero el bloqueo de fila y `acknowledged_at IS NULL` preservan el primer actor; los reintentos no duplican auditoría.

Coste: 1-2 días (migración + action + UI + tests + RLS).

#### 3.6 Exportar a CSV

Botón "Exportar" en la cabecera que genera un CSV con todas las columnas visibles: `roomId`, `gameId`, `cause`, `status`, `resolutionReason`, `completedRefunds`, `totalRefunds`, `detectedAt`, `resolvedAt`.

Implementación: endpoint `GET /api/admin/recovery/export` que usa el contrato terminal filtrado y devuelve `text/csv` con `Content-Disposition: attachment`. Autentica y autoriza al admin antes de aplicar rate limit de `3` solicitudes por minuto por usuario e IP; la RPC lee como máximo `5001` filas para detectar excesos y el endpoint exige acotar filtros con `422` en lugar de truncar silenciosamente por encima de `5000`.

Beneficio: auditoría mensual o trimestral. El admin baja el CSV, lo pasa al equipo financiero o de operaciones, y tienen registro offline.

Coste: 2-3 horas (endpoint + tests).

### Nivel 3 — Datos por jugador y dinero (excepción aprobada, despliegue bloqueado por gates)

Estas son ideas que tocan dinero o flujo de operaciones, y deben decidirse con producto antes de implementarse.

#### 3.7 Reintento manual de refunds pendientes

El flujo actual no tiene cron ni cola de retries: la RPC terminal acredita y marca refunds en una sola transacción. Si la resolución falla, el incidente pasa a `manual_review`. Antes de diseñar una reconciliación manual hay que medir si existen filas reales `pending` o `failed`, explicar su origen y aprobar la excepción de datos por jugador.

**Validación de desarrollo 2026-07-18:** se detectaron dos refunds `pending` históricos de incidentes `manual_review`, sin crédito previo en ledger. Tras aplicar `reconcile_game_recovery_refund`, ambos quedaron `completed`, con el monto original, `operation_id` preservada y evento `recovery_refund_reconciled`. No se ejecutó ningún crédito duplicado.

Propuesta: acción `forceRetryRefund(refundId)` que re-emplace el refund en la cola. Requiere:

- Endpoint con rate limit (no más de N retries por hora).
- Auditoría de quién forzó el retry y por qué.
- Validación de que el refund no esté ya en `completed`.
- Coordinación con el game server para que el nuevo intento no duplique la acreditación (idempotency key obligatoria).

Riesgo: si se implementa mal, **doble acreditación**. Mesa Primera tiene regla de oro en el ledger (idempotencia + atomicidad), así que cualquier acción de reintento debe pasar por el mismo RPC de inserción con `operation_id` único. Ver `docs/admin/ADMIN_SECURITY.md` y skill `mesa-ledger-atomicity` antes de implementar.

#### 3.8 Cierre de incidente desde el admin

Implementado mediante `close_game_recovery_incident`: exige reconocimiento previo, todos los refunds completados, confirmación explícita y motivo de 10 a 500 caracteres. La operación es atómica e idempotente, registra `closed_by`, `closed_at` y `close_reason`, y conserva el motivo detallado en `admin_audit_log`; la lista y el CSV muestran el resumen terminal, no el detalle de auditoría.

Riesgo controlado: los incidentes cerrados siguen disponibles mediante el filtro `closed`; el cierre no admite montos ni mutaciones financieras desde el cliente.

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

## 7. Prioridad original

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
