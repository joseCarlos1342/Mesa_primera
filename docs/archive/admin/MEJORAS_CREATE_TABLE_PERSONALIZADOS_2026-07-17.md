# Valores personalizados en `CreateTableModal` — Implementado

> **Archivado:** 2026-07-17
> **Estado:** implementado y cubierto por pruebas.

Esta propuesta habilitó importes personalizados al crear mesas de categoría `custom` desde `/admin/tables`.

## Decisiones aplicadas

- El operador ingresa montos en pesos COP enteros: `750000` equivale a `$750.000 COP`.
- Los presets siguen disponibles como atajos en `src/config/table-presets.ts`.
- Entrada y pique deben ser positivos, múltiplos de `$1.000 COP` y la entrada no puede ser menor que el pique.
- La UI convierte los montos a centavos y muestra errores inline; el servidor repite la validación en `createCustomTable` y `updateTable`.
- No se creó migración ni se persistieron presets por local.

## Fuente operativa

- [Guía de administrador](../../admin/ADMIN.md)
- [Guía operativa](../../admin/README.md)
- [Referencia técnica](../../admin/ADMIN_TECHNICAL.md)
