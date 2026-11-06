# Ledger: referencias duplicadas anteriores a la liquidación idempotente

Fecha del reporte: 2026-11-05. Fuente: `public.ledger` en Supabase Cloud (`mesa-primera`).

## Contexto

La migración `20260915000000_idempotent_pot_settlement.sql` crea un índice único `(user_id, reference_id)` para que un pozo no se pague dos veces. Al aplicarla, el ledger ya tenía 10 pares repetidos, de abril y mayo de 2026, de antes de que existiera la protección. Como el ledger es INSERT-only, esas filas no se borran: el índice se limitó a filas desde el `2026-09-15` y la función `process_ledger_entry` revisa todo el historial antes de insertar.

Respaldo previo a la migración: `supabase db dump --linked` (esquema y datos) del 2026-11-05, guardado fuera del repositorio.

## Casos

| Fecha (UTC) | Jugador | Referencia | Tipo | Montos | Separación | Lectura |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-04-04 00:11 | @Ximena | `pot-win-27150d8c-94c6-4319-82a7-4f42e6b1abea` | win (credit) | $4.000 + $50.000 | 0 s | Montos distintos con la misma referencia |
| 2026-04-09 17:54 | @Ximena | `pot-win-8fb30c16-190b-4333-93c0-9cba14be0eb5` | win (credit) | $100.000 + $100.000 | 39 s | Probable doble pago |
| 2026-04-11 02:30 | Midudev | `pot-win-5e08d5bc-ae9a-48da-a5a6-16a656b73f71` | win (credit) | $50.000 + $85.500 | 29 s | Montos distintos con la misma referencia |
| 2026-04-11 02:59 | Midudev | `pot-win-0cade276-909a-4ac4-aae9-02d6ca749be7` | win (credit) | $10.000 + $9.500 | 0 s | Montos distintos con la misma referencia |
| 2026-04-12 21:32 | @Ximena | `pot-win-85e48cd1-5bad-4741-a4b2-30b22763a655` | win (credit) | $9.500 + $9.500 | 3 s | Probable doble pago |
| 2026-04-12 21:32 | @Ximena | `rake-85e48cd1-5bad-4741-a4b2-30b22763a655` | rake (debit) | $500 + $500 | 3 s | Probable doble pago |
| 2026-04-25 03:01 | @Ximena | `pot-win-304647b7-5b8f-4789-86e5-0a5f1ccbf4ae` | win (credit) | $14.250 + $9.500 | 53 s | Montos distintos con la misma referencia |
| 2026-04-25 03:01 | @Ximena | `rake-304647b7-5b8f-4789-86e5-0a5f1ccbf4ae` | rake (debit) | $750 + $500 | 53 s | Montos distintos con la misma referencia |
| 2026-05-02 03:47 | @Dario | `pot-win-22505a2a-2eee-4161-b9ff-7fd8e7619890` | win (credit) | $14.250 + $14.250 | 97 s | Probable doble pago |
| 2026-05-02 03:47 | @Dario | `rake-22505a2a-2eee-4161-b9ff-7fd8e7619890` | rake (debit) | $750 + $750 | 97 s | Probable doble pago |

## Lectura

- **Probable doble pago:** mismo monto acreditado (o cobrado) dos veces a segundos de distancia. Si se confirma, la corrección es un asiento compensatorio (`adjustment`, débito por el monto repetido) con referencia propia, nunca un borrado.
- **Montos distintos con la misma referencia:** en abril la referencia era `pot-win-<gameId>` sin el monto; pozo principal y pique del mismo juego podían compartirla. Desde septiembre el game server incluye payout y rake en `operation_id`, así que ya no colisionan. Hay que revisar la repetición o el `timeline` de cada juego antes de tocar nada.

## Decisión pendiente

Confirmar caso por caso si se registran reversos. Ningún saldo se modificó al preparar este reporte.
