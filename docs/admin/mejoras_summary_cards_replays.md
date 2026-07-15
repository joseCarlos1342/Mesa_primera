# Mejoras Futuras: Summary Cards Reales en `/admin/replays`

Los tres summary cards de la pantalla `/admin/replays` ("Total Partidas", "Rake Total", "Jugadores Únicos") se calculan hoy sobre una **muestra de las últimas 100 partidas** pero se muestran bajo etiquetas absolutas. La UI induce al admin a creer que son totales del sistema cuando en realidad son agregados parciales.

## 1. Problema actual

### Dónde está

- Página: `apps/web/src/app/(admin)/admin/replays/page.tsx`
- Datos: server action `getAllReplays(100)` en `apps/web/src/app/actions/replays.ts:240`
- RPC consumido: `public.get_admin_replays(p_limit, p_offset)` en `supabase/migrations/20260329000000_replay_listing_rpcs.sql:60`

### Cálculo actual

```ts
// page.tsx:32  -> "Total Partidas"
replays.length

// page.tsx:10  -> "Rake Total"
replays.reduce((sum, r) => sum + r.total_rake, 0)

// page.tsx:47  -> "Jugadores Únicos"
new Set(replays.flatMap(r => r.players?.map(p => p.userId) || [])).size
```

Los tres valores provienen de `replays`, que es el array de hasta 100 partidas que devuelve `getAllReplays(100)`. El RPC tiene `LIMIT p_limit OFFSET p_offset` y nunca se pagina la lista, así que si el sistema tiene más de 100 partidas finalizadas, los tres números son de muestra, no del sistema.

### Por qué miente la UI

| Etiqueta visible | Lo que el admin entiende | Lo que realmente calcula |
|---|---|---|
| "Total Partidas" | Partidas totales del sistema | Partidas en la muestra (últimas 100) |
| "Rake Total" | Rake acumulado del sistema | Rake de la muestra |
| "Jugadores Únicos" | Jugadores únicos en la plataforma | Jugadores únicos presentes en la muestra |

Adicionalmente, el subtítulo de la página dice "Todas las partidas jugadas del sistema (N registros)", reforzando la idea de universo completo cuando en realidad es una muestra limitada.

El cálculo en sí mismo es correcto (el `Set` deduplica bien, el `reduce` suma bien). El problema es la **fuente de los datos** y la **etiqueta** que promete totales.

## 2. Escenario concreto del bug

Si el sistema tiene 200 partidas finalizadas con 50 jugadores únicos distintos en total, pero las últimas 100 solo tocaron a 16 de esos jugadores, la UI muestra:

- "Total Partidas": 100 (no 200)
- "Rake Total": solo el rake de esas 100 (no el acumulado)
- "Jugadores Únicos": 16 (no 50)

El admin que toma decisiones operativas con esos números está trabajando con datos subestimados y sesgados por la ventana temporal.

## 3. Solución propuesta

Añadir un RPC nuevo que devuelva los totales reales del sistema y reemplazar el cálculo en la página.

### 3.1 Nuevo RPC: `get_admin_replays_summary()`

Migración SQL nueva, en la línea de las migraciones existentes del listado de replays:

```sql
CREATE OR REPLACE FUNCTION public.get_admin_replays_summary()
RETURNS TABLE (
  total_replays BIGINT,
  total_rake_cents BIGINT,
  total_unique_players BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH finished_replays AS (
    SELECT gr.players
    FROM game_replays gr
    INNER JOIN games g ON g.id = gr.game_id AND g.status = 'finished'
  )
  SELECT
    (SELECT COUNT(*) FROM finished_replays)::BIGINT AS total_replays,
    COALESCE(
      (SELECT SUM(l.amount_cents) FROM ledger l WHERE l.type = 'rake'),
      0
    )::BIGINT AS total_rake_cents,
    (
      SELECT COUNT(DISTINCT (player->>'userId')::uuid)
      FROM finished_replays, jsonb_array_elements(finished_replays.players) AS player
      WHERE player->>'userId' IS NOT NULL
    )::BIGINT AS total_unique_players;
$$;

REVOKE ALL ON FUNCTION public.get_admin_replays_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_replays_summary() TO authenticated;
```

Decisiones de diseño:

- **`STABLE`** y **`SECURITY DEFINER`** igual que `get_admin_replays` para mantener la convención de los RPCs de replays.
- **`finished_replays` CTE** para no duplicar el filtro `g.status = 'finished'` en cada subquery.
- **Deduplicación por `userId`** se hace en SQL (no en TS) para que el cálculo no dependa del tamaño de la página.
- El RPC se monta sobre `game_replays` que es la fuente ya usada por `get_admin_replays`, así no introduce nueva dependencia de schema.
- `BETTER COUNT` o `EXPLAIN ANALYZE` recomendado antes de producción: `jsonb_array_elements` sobre N filas puede ser costoso si N crece. Si tarda, considerar índice GIN sobre `game_replays.players` o mover el cálculo a un job nocturno cacheado.

### 3.2 Nueva server action

En `apps/web/src/app/actions/replays.ts`:

```ts
export type AdminReplaysSummary = {
  total_replays: number
  total_rake_cents: number
  total_unique_players: number
}

export async function getAdminReplaysSummary(): Promise<AdminReplaysSummary | null> {
  const supabase = await verifyAdmin()

  const { data, error } = await supabase.rpc("get_admin_replays_summary")

  if (error) {
    console.error("[getAdminReplaysSummary] Error:", error)
    return null
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null

  return {
    total_replays: Number(row.total_replays ?? 0),
    total_rake_cents: Number(row.total_rake_cents ?? 0),
    total_unique_players: Number(row.total_unique_players ?? 0),
  }
}
```

### 3.3 Cambio en la página

Reemplazar el cálculo de los tres cards por la llamada al nuevo RPC y formatear `total_rake_cents` con `formatCurrency` (que ya existe y divide por 100):

```tsx
// Antes
const totalRake = replays.reduce((sum, r) => sum + r.total_rake, 0)
// ...
<p>{replays.length}</p>
<p>{formatCurrency(totalRake)}</p>
<p>{new Set(replays.flatMap(r => r.players?.map(p => p.userId) || [])).size}</p>

// Después
const summary = await getAdminReplaysSummary()
// ...
<p>{summary?.total_replays ?? 0}</p>
<p>{formatCurrency((summary?.total_rake_cents ?? 0) / 100)}</p>
<p>{summary?.total_unique_players ?? 0}</p>
```

Y actualizar el subtítulo para que no mienta: "Últimas 100 partidas del sistema (N registros visibles · X totales)" o mejor, eliminar la palabra "todas".

### 3.4 Tests

- **Test unitario del nuevo RPC** con datos de fixtures que cubran:
  - 0 partidas (totales en 0).
  - N partidas con jugadores repetidos (verifica deduplicación).
  - Partidas con `players` vacío o null (no debe romper).
  - Rake mixto con `NULL` (debe usar `COALESCE`).
- **Test del server action** mockeando el RPC.
- **Test de la página** verificando que los tres cards muestran los valores del summary, no los del array `replays`.
- **Test de regresión** del cálculo de deduplicación en TS (mantener el cálculo actual como test de la fórmula, aunque ya no se use en runtime) — útil si en el futuro se quiere mover el cálculo de vuelta al cliente.

## 4. Parche temporal viable (si urge)

Si la métrica correcta no puede entrar en el sprint actual, como mínimo:

1. Renombrar los tres cards a:
   - "Partidas (muestra)"
   - "Rake (muestra)"
   - "Jugadores únicos (muestra)"
2. Cambiar el subtítulo de "Todas las partidas jugadas del sistema" a "Últimas 100 partidas registradas".
3. Añadir un `title` tooltip en cada card explicando que el número es sobre la muestra visible.

Esto cuesta menos de 30 minutos, no requiere SQL ni tests nuevos, y elimina la mentira de la UI. **No** es la solución definitiva, solo un parche de honestidad hasta que entre el RPC real.

## 5. Trabajo relacionado que también se ve afectado

Si se hace este cambio, revisar:

- `docs/admin/README.md` (sección 17 sobre replays) para mantener consistencia con el nuevo cálculo.
- `docs/admin/ADMIN.md` y `docs/admin/ADMIN_TECHNICAL.md` si listan el cálculo de jugadores únicos como parte de las capacidades del admin.
- Cualquier test E2E que verifique los números de los cards.

## 6. Riesgos

- **Coste del RPC:** `jsonb_array_elements` sobre `game_replays.players` puede ser pesado si la tabla crece mucho. Medir antes de producción.
- **Regresión de UI:** cambiar las etiquetas rompe expectativas del admin que ya se acostumbró a los números (aunque fueran parciales). Coordinar con equipo de operaciones.
- **Consistencia de lectura:** si el admin navega entre dos páginas, los totales del sistema y los de la página de detalle de un replay pueden no coincidir exactamente porque la página de detalle también usa el RPC por partida. Documentar que la diferencia es normal.
