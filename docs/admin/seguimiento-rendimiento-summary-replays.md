# Seguimiento: rendimiento del summary de replays

**Estado:** pendiente de medición con volumen representativo antes de optimizar.

## Contexto

`public.get_admin_replays_summary()` agrega juegos `finished` con replay, rake
`completed` asociado y participantes observados. Expande `players` con
`jsonb_array_elements`, por lo que su coste crece con el histórico de replays.

## Tarea

1. Ejecutar como admin sobre un entorno con volumen representativo:

   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM public.get_admin_replays_summary();
   ```

2. Registrar tamaño de `game_replays` y `ledger`, latencia fría/caliente y si
   `COUNT(DISTINCT ...)` genera spill a disco.
3. Mantener la consulta directa si el p95 de la acción permanece bajo 300 ms.
4. Solo si la medición lo justifica:
   - evaluar un índice parcial de `ledger(game_id)` para rake `completed`;
   - normalizar participantes históricos de replay;
   - considerar agregados incrementales. No añadir GIN sobre `players` para
     este agregado: no acelera `jsonb_array_elements`.

## Criterios de cierre

- Resultado de `EXPLAIN` adjuntado a la tarea operativa.
- Decisión documentada: sin optimización, índice parcial, normalización o
  agregado incremental.
- Si se cambia la consulta, añadir regresión SQL y medición posterior.
