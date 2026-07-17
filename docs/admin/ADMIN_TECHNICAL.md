# Referencia Técnica del Administrador — Mesa Primera

> **Versión:** 1.0 — _Abril 2026_
> **Audiencia:** Desarrolladores que integren, extiendan o mantengan el panel administrativo y necesiten trazabilidad entre capacidades funcionales, server actions, tipos TypeScript y RPCs de Supabase.
> **Relacionado:** [ADMIN.md](ADMIN.md) · [ADMIN_SECURITY.md](ADMIN_SECURITY.md)

---

## Tabla de Contenidos

1. [Estructura de archivos del admin](#1-estructura-de-archivos-del-admin)
2. [Patrón de autorización en server actions](#2-patrón-de-autorización-en-server-actions)
3. [Server actions — referencia por módulo](#3-server-actions--referencia-por-módulo)
4. [RPCs de Supabase relevantes para el admin](#4-rpcs-de-supabase-relevantes-para-el-admin)
5. [Tipos TypeScript del dominio admin](#5-tipos-typescript-del-dominio-admin)
6. [Componentes compartidos del panel](#6-componentes-compartidos-del-panel)
7. [Token de supervisión (Colyseus)](#7-token-de-supervisión-colyseus)
8. [Integración con el Game Server](#8-integración-con-el-game-server)
9. [Tabla de trazabilidad funcional](#9-tabla-de-trazabilidad-funcional)

---

## 1. Estructura de Archivos del Admin

```
apps/web/src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx                  ← Layout del panel (header + logout)
│   │       ├── page.tsx                    ← Dashboard /admin
│   │       ├── users/page.tsx              ← /admin/users
│   │       ├── ledger/
│   │       │   ├── page.tsx                ← /admin/ledger
│   │       │   └── [userId]/page.tsx       ← /admin/ledger/[userId]
│   │       ├── tables/page.tsx             ← /admin/tables
│   │       ├── deposits/
│   │       │   ├── page.tsx                ← /admin/deposits
│   │       │   └── DepositActions.tsx      ← Client component de acciones
│   │       ├── withdrawals/page.tsx        ← /admin/withdrawals
│   │       ├── ganancias/page.tsx          ← /admin/ganancias
│   │       ├── consultas/page.tsx          ← /admin/consultas
│   │       ├── disputes/
│   │       │   ├── page.tsx                ← /admin/disputes (URL legacy, Investigaciones internas)
│   │       │   ├── new/page.tsx            ← Creación manual o desde búsqueda
│   │       │   └── [id]/page.tsx           ← Expediente y acciones
│   │       ├── audit/page.tsx              ← /admin/audit
│   │       ├── broadcast/
│   │       │   ├── page.tsx                ← /admin/broadcast
│   │       │   └── history/page.tsx        ← /admin/broadcast/history
│   │       ├── support/page.tsx            ← /admin/support
│   │       ├── alerts/page.tsx             ← /admin/alerts
│   │       ├── server-log/page.tsx         ← /admin/server-log
│   │       ├── rules/page.tsx              ← /admin/rules
│   │       ├── replays/page.tsx            ← /admin/replays
│   │       └── spectate/[roomId]/page.tsx  ← /admin/spectate/[roomId]
│   └── actions/
│       ├── admin-dashboard.ts              ← KPIs y estadísticas
│       ├── admin-users.ts                  ← Gestión de usuarios
│       ├── admin-ledger.ts                 ← Consultas del ledger
│       ├── admin-tables.ts                 ← Control de mesas
│       ├── admin-wallet.ts                 ← Depósitos y retiros
│       ├── admin-rake.ts                   ← Datos de rake/ganancias
│       ├── admin-search.ts                 ← Búsqueda global
│       ├── admin-disputes.ts               ← Gestión de disputas
│       ├── admin-audit.ts                  ← Log de auditoría
│       ├── admin-broadcast.ts              ← Broadcast de notificaciones
│       ├── admin-settings.ts               ← Reglamento y configuración
│       ├── admin-server-alerts.ts          ← Alertas del sistema
│       ├── admin-supervision.ts            ← Token de supervisión Colyseus
│       ├── admin-sanctions.ts              ← Sanciones sobre cuentas
│       └── withdrawals.ts                  ← Utilidad de retiros (también usada por player)
├── components/
│   └── admin/
│       ├── AdminGlobalSearch.tsx           ← Búsqueda global en header
│       ├── AuditFilters.tsx                ← Filtros de auditoría
│       ├── DashboardAutoRefresh.tsx        ← Auto-refresh del dashboard
│       ├── DashboardWarnings.tsx           ← Banner de alertas críticas
│       ├── DepositActions.tsx              ← Botones aprobar/rechazar depósitos
│       ├── LedgerFilters.tsx               ← Filtros del ledger
│       ├── LedgerRealtimeRefresh.tsx       ← Suscripción en tiempo real del ledger
│       ├── SupportConversationList.tsx     ← Lista de tickets de soporte
│       ├── TableControls.tsx               ← Controles de mesa en vivo
│       ├── PlayerControls.tsx              ← Expulsar jugadores
│       ├── CreateTableModal.tsx            ← Modal de creación de mesas
│       ├── UserBanControl.tsx              ← Toggle de ban en usuarios
│       ├── UserBalanceControl.tsx          ← Ajuste de saldo
│       ├── UserLedgerTable.tsx             ← Tabla de ledger por usuario
│       └── UserSearch.tsx                  ← Filtro de búsqueda de usuarios
└── types/
    └── admin-search.ts                     ← Tipos de búsqueda y disputas
```

---

## 2. Patrón de Autorización en Server Actions

Todas las server actions del admin utilizan un helper interno de verificación. Hay dos variantes según el estilo del módulo:

### Variante `ensureAdmin` (throw on error)

```typescript
// Patrón usado en: admin-users.ts, admin-tables.ts, admin-broadcast.ts, admin-settings.ts, admin-sanctions.ts
async function ensureAdmin(supabase: any): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("No autenticado");

  const { data: userRecord } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") throw new Error("Acceso denegado");
  return userData.user.id; // Retorna adminId para uso posterior
}
```

**Uso típico:**
```typescript
export async function someAdminAction() {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);
  // ... lógica de negocio
}
```

### Variante `verifyAdmin` (return error)

```typescript
// Patrón usado en: admin-disputes.ts, admin-search.ts
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return { supabase: null, adminId: null, error: 'No autenticado' } as const

  const { data: userRecord } = await supabase
    .from('profiles').select('role').eq('id', userData.user.id).single()

  if (userRecord?.role !== 'admin') return { supabase: null, adminId: null, error: 'Acceso denegado' } as const
  return { supabase, adminId: userData.user.id, error: null } as const
}
```

**Uso típico:**
```typescript
export async function someAdminAction(): Promise<ActionResult<Data>> {
  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }
  // ... lógica de negocio
}
```

### Diferencia funcional

| Aspecto | `ensureAdmin` | `verifyAdmin` |
|---|---|---|
| Error al fallar | Lanza excepción (`throw`) | Retorna objeto `{ error: string }` |
| Patrón de retorno | `adminId: string` | `{ supabase, adminId, error }` |
| Típico en módulos | Dashboard, usuarios, mesas, wallet | Disputas, búsqueda |
| Tipo de respuesta | No usa `ActionResult<T>` | Usa `ActionResult<T>` |

---

## 3. Server Actions — Referencia por Módulo

### `admin-dashboard.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `getAdminDashboardStats()` | — | `Promise<AdminDashboardStats>` | Recopila todos los KPIs del dashboard mediante múltiples queries y una consulta al game server |

**Fuentes de datos de `getAdminDashboardStats`:**

| KPI | Fuente |
|---|---|
| `pendingDeposits` | `deposit_requests` WHERE `status = 'pending'` |
| `pendingWithdrawals` | `withdrawal_requests` WHERE `status = 'pending'` |
| `activeUsers` | RPC `get_active_users_count()` |
| `activeGames` | `GET {GAME_SERVER_URL}/matchmake/` → fallback DB |
| `totalUsersBalance` | RPC `get_total_users_balance()` → fallback SUM de `wallets` |
| `totalLedgerBalance` | RPC `get_ledger_net_balance()` → fallback cálculo en JS |
| `totalRake` | `ledger` WHERE `type = 'rake'` AND `direction = 'debit'` |
| `pendingSupport` | `support_tickets` WHERE `status != 'resolved'` |
| `pendingAlerts` | `server_alerts` WHERE `resolved = false` |
| `vaultStatus` | RPC `get_vault_status()` |

---

### `admin-users.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `getUsersList()` | — | `Promise<AdminUserView[]>` | Lista todos los perfiles con su wallet, dispositivos y estadísticas de juego |
| `adjustUserBalance(userId, deltaCents, reason)` | `string`, `number`, `string` | `Promise<void>` | Débita o acredita el saldo de un usuario vía `process_ledger_entry` con `type = 'adjustment'` |
| `toggleBanStatus(userId, ban, reason)` | `string`, `boolean`, `string` | `Promise<void>` | Cambia `is_banned` en `profiles` y registra la acción en auditoría |

**Notas de `adjustUserBalance`:**
- `deltaCents > 0` → `direction = 'credit'`
- `deltaCents < 0` → `direction = 'debit'` (con `Math.abs(deltaCents)`)
- `deltaCents = 0` → lanza error `"El monto debe ser diferente de cero"`
- Envía notificación a `notifications` del usuario afectado con el monto y motivo.

---

### `admin-wallet.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `processTransaction(requestId, status)` | `string`, `'completed' \| 'failed'` | `Promise<{ success?: true; error?: string }>` | Delega en RPC `process_admin_transaction`; registra en auditoría |
| `getPendingDeposits()` | — | `Promise<{ deposits: DepositRow[]; error?: string }>` | Lista solicitudes con `status = 'pending'` + perfiles + wallets |

**Flujo de `processTransaction`:**

```
processTransaction(requestId, 'completed')
  → RPC process_admin_transaction(p_request_id, 'completed')
    → Llama process_ledger_entry() (tipo 'deposit' o 'withdrawal')
    → Actualiza deposit_requests o withdrawal_requests → 'completed'
  → logAdminAction('transaction_approved', 'transaction_request', requestId)
  → revalidatePath('/admin/deposits', '/admin/withdrawals', '/wallet')
```

---

### `admin-tables.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `getTablesList(category?)` | `TableCategory?` | `Promise<Table[]>` | Lista mesas con conteo de partidas activas |
| `getActiveGames()` | — | `Promise<AdminGameView[]>` | Partidas en `waiting` o `in_progress` con jugadores visibles |
| `createTable(input)` | `CreateTableInput` | `Promise<LobbyTable>` | Crea una nueva mesa; valida denominaciones de fichas |
| `setGameStatus(gameId, status)` | `string`, `string` | `Promise<void>` | Pausa o reanuda una sala |
| `kickPlayer(gameId, userId, reason)` | `string`, `string`, `string` | `Promise<void>` | Expulsa a un jugador de la sala activa |
| `getTableFinancials()` | — | `Promise<TableFinancials[]>` | Agregados financieros por mesa (rake, apuestas, créditos) |

**Denominaciones de fichas válidas** (`VALID_CHIP_DENOMS`):

```typescript
const VALID_CHIP_DENOMS = [100000, 200000, 500000, 1000000, 2000000, 5000000] as const;
// Equivalen a: $1.000, $2.000, $5.000, $10.000, $20.000, $50.000 COP
```

---

### `admin-rake.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `getAdminRakeData(page?, pageSize?)` | `number = 1`, `number = 50` | `Promise<{ entries: RakeEntry[]; stats: RakeStats; count: number }>` | Paginación del ledger filtrado por `type = 'rake'` con métricas de 24h y 7d |

---

### `admin-search.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `detectIdentifier(raw)` | `string` | `DetectedIdentifier` | Función pura que clasifica el input como `uuid`, `seed` o `username` mediante regex |
| `globalSearch(query)` | `string` | `Promise<ActionResult<AdminSearchReport>>` | Valida el identificador, detecta tipo y lanza búsquedas paralelas en entidades históricas relevantes |

**Entidades que indexa `globalSearch` según tipo:**

| Tipo | Tablas buscadas |
|---|---|
| `uuid` | `ledger`, `deposit_requests`, `withdrawal_requests`, `game_replays`, reclamos, `server_alerts` |
| `seed` | `game_replays` (campo `rng_seed`) |
| `username` | `profiles`, reclamos y alertas del perfil; investigaciones relacionadas |

`/admin/consultas` también contiene la bandeja de reclamos de jugadores. Esos reclamos no son investigaciones internas: el enlace de escalamiento abre `/admin/disputes/new?q=...`, y el servidor vuelve a ejecutar `globalSearch` para construir la evidencia.

---

### `admin-disputes.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `createDispute(input)` | título, descripción, tipo, prioridad, fuente, sujetos y referencias opcionales | `Promise<ActionResult<{ id: string }>>` | Crea la investigación mediante `create_admin_investigation`; si recibe `source_query`, resuelve la evidencia de nuevo en el servidor y la base de datos la normaliza |
| `startDispute(disputeId)` | `string` | `Promise<ActionResult<...>>` | Ejecuta `start_admin_investigation`; toma el admin desde `auth.uid()`, lo asigna y cambia `open` a `investigating` |
| `resolveDispute(disputeId, resolution)` | `string`, `{ outcome, notes }` | `Promise<ActionResult<...>>` | Cierra desde `investigating` con `no_action`, `warning` o `sanction` |
| `proposeDisputeCompensation(disputeId, input)` | `string`, `{ userId, amountCents, reason }` | `Promise<ActionResult<...>>` | Registra una compensación propuesta sin tocar el ledger |
| `cancelDisputeCompensation(disputeId, reason)` | `string`, `string` | `Promise<ActionResult<...>>` | Cancela una propuesta pendiente, conserva un evento auditado y permite proponer una corrección |
| `approveDisputeCompensation(disputeId)` | `string` | `Promise<ActionResult<...>>` | Confirma la compensación, acredita el ledger de forma atómica/idempotente y resuelve con `compensation` |
| `dismissDispute(disputeId, reason)` | `string`, `string` | `Promise<ActionResult<...>>` | Cambia `investigating` a `dismissed` con resultado `no_action` |
| `listDisputes(filters?)` | estado, prioridad, tipo y límite opcionales | `Promise<ActionResult<AdminDisputeCase[]>>` | Filtra por `status`, `priority` e `investigation_type` |

La evidencia que llega desde una búsqueda no se acepta desde el cliente: `createDispute` conserva la consulta e invoca `globalSearch` en el servidor. Después, `create_admin_investigation` verifica en la base de datos la existencia de cada entidad, exige estado `finished` para toda referencia asociada a una partida y reconstruye etiquetas normalizadas. Si una alerta aporta `room_id` sin `game_id`, debe existir un replay que demuestre una partida histórica terminada; de lo contrario, se rechaza. El trigger impide modificar después la clasificación, los sujetos y la evidencia.

---

### `admin-audit.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `logAdminAction(adminId, action, targetType, targetId, details?, options?)` | ver más abajo | `Promise<void>` | Inserta en `admin_audit_log`; llamado internamente por todas las demás actions |
| `getAuditLog(filters?)` | `AuditLogFilters \| number` | `Promise<AuditLogEntry[]>` | Consulta el log con filtros opcionales; acepta número como shorthand para `limit` |

**Firma completa de `logAdminAction`:**

```typescript
logAdminAction(
  adminId:    string | null,        // UUID del admin (null si fue el sistema)
  action:     string,               // Nombre descriptivo de la acción
  targetType: string,               // Tipo de entidad afectada
  targetId:   string,               // ID de la entidad afectada
  details?:   Record<string, unknown>,
  options?: {
    context?:      string
    before_state?: Record<string, unknown> | null
    after_state?:  Record<string, unknown> | null
    actor_kind?:   'admin' | 'system'
    actor_label?:  string
    ip_address?:   string
  }
): Promise<void>
```

---

### `admin-broadcast.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `sendBroadcast(data)` | `{ title: string, body: string, type: string }` | `Promise<{ success: true; count: number }>` | Inserta notificaciones en masa para todos los perfiles con `role = 'player'` |
| `getBroadcastHistory()` | — | `Promise<BroadcastEntry[]>` | Lista broadcasts previos ordenados por fecha |

---

### `admin-settings.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `getRulebook()` | — | `Promise<string>` | Lee `site_settings WHERE id = 'rulebook'`; retorna string Markdown |
| `updateRulebook(newContent)` | `string` | `Promise<{ success: true }>` | Actualiza el reglamento con upsert; guarda snapshot en auditoría |

---

### `admin-server-alerts.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `getServerAlerts(limit?)` | `number = 100` | `Promise<ServerAlert[]>` | Lista alertas del sistema ordenadas por fecha |
| `resolveAlert(alertId)` | `string` | `Promise<void>` | Marca alerta como resuelta y registra en auditoría |
| `getUnresolvedAlertCount()` | — | `Promise<number>` | Conteo rápido para el badge del dashboard |

---

### `admin-supervision.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `generateSupervisionToken(roomId)` | `string` | `Promise<{ token: string }>` | Genera UUID y lo almacena en Redis con TTL de 60s; permite al cliente Colyseus conectarse a la sala como espectador |

**Flujo del token de supervisión:**
```
Admin accede a /admin/spectate/[roomId]
  → Server action generateSupervisionToken(roomId)
    → token = crypto.randomUUID()
    → redis.setex(`supervision:${token}`, 60, JSON.stringify({ adminId, roomId }))
    → logAdminAction('supervision_token_generated', ...)
  → Cliente usa token para conectarse a Colyseus con rol de espectador
  → Colyseus valida token en Redis antes de permitir unión
```

---

### `admin-sanctions.ts`

| Función exportada | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `createSanction(input)` | `SanctionInput` | `Promise<{ success: boolean; sanction?: SanctionRecord }>` | Inserta en `user_sanctions`; registra en auditoría con `source_room_id` |
| `revokeSanction(sanctionId, reason)` | `string`, `string` | `Promise<{ success: boolean }>` | Actualiza `revoked_at` y `revoked_by`; registra revocación en auditoría |
| `getActiveSanctions(userId)` | `string` | `Promise<SanctionRecord[]>` | Lista sanciones activas (no revocadas o no expiradas) de un usuario |

---

## 4. RPCs de Supabase Relevantes para el Admin

### `process_ledger_entry()`

Vía central de inserción en el ledger. Corre como `SECURITY DEFINER` y su versión actual contempla serialización por usuario y tipos ampliados.

```sql
process_ledger_entry(
  p_user_id       UUID,
  p_amount_cents  INT,
  p_type          TEXT,     -- 'deposit'|'withdrawal'|'bet'|'win'|'rake'|'refund'|'adjustment'|'transfer'|'bonus'
  p_direction     TEXT,     -- 'credit' | 'debit'
  p_game_id       UUID   DEFAULT NULL,
  p_table_id      UUID   DEFAULT NULL,
  p_description   TEXT   DEFAULT NULL,
  p_reference_id  TEXT   DEFAULT NULL,
  p_counterpart_id UUID  DEFAULT NULL,
  p_approved_by   UUID   DEFAULT NULL,
  p_metadata      JSONB  DEFAULT NULL
) RETURNS JSONB
```

**Retorno en caso de éxito:**
```json
{ "success": true, "ledger_id": "...", "balance_after": 12345 }
```

**Retorno en caso de error:**
```json
{ "error": "Saldo insuficiente" }
```

---

### `process_admin_transaction()`

Procesa solicitudes de depósito o retiro en un solo paso atómico.

```sql
process_admin_transaction(
  p_request_id UUID,     -- ID de deposit_requests o withdrawal_requests
  p_status     TEXT      -- 'completed' | 'failed'
) RETURNS JSONB
```

El RPC detecta automáticamente si el `p_request_id` corresponde a un depósito o a un retiro, y llama a `process_ledger_entry` internamente con el `type` y `direction` correctos.

---

### RPCs de investigaciones internas

| RPC | Garantía principal |
|---|---|
| `create_admin_investigation` | Crea el expediente y su evento `opened`; rechaza partidas no terminadas |
| `start_admin_investigation` | Transición única `open` → `investigating`; asigna `auth.uid()` sin UUID aportado por el cliente |
| `resolve_admin_investigation` | Transición `investigating` → `resolved` con `no_action`, `warning` o `sanction` |
| `dismiss_admin_investigation` | Transición `investigating` → `dismissed` con justificación |
| `propose_admin_investigation_compensation` | Guarda propuesta, beneficiario vinculado, monto, motivo y `operation_id`; no acredita saldo |
| `cancel_admin_investigation_compensation` | Cancela una propuesta pendiente con motivo, registra `compensation_cancelled` y libera el expediente para una propuesta corregida |
| `approve_admin_investigation_compensation` | Bajo bloqueo del expediente, valida íntegramente el movimiento idempotente si ya existe o llama a `process_ledger_entry`; acredita una sola vez y resuelve con `compensation` |

La idempotencia financiera se apoya en `compensation_operation_id` y en un índice único sobre el `operation_id` guardado en el metadata del ledger. Si encuentra un movimiento previo, la aprobación compara beneficiario, monto, dirección `credit`, tipo `adjustment`, referencia de investigación, `game_id`, estado `completed` y metadata de clase, operación e investigación. Cualquier diferencia aborta el flujo. La aprobación, el enlace al movimiento y el cierre se realizan en la misma RPC.

En la etapa de un solo admin, propuesta y confirmación no implementan separación de funciones: son dos pasos explícitos para revisar datos antes de una mutación financiera irreversible.

---

### `award_pot()`

Usado por el Game Server al cerrar cada mano. Inserta dos entradas atómicas: win (crédito al ganador) y rake (débito de la comisión).

```sql
award_pot(
  p_winner_id   UUID,
  p_payout      INT,   -- Monto neto al ganador (en centavos)
  p_rake        INT,   -- Comisión de la casa (en centavos)
  p_game_id     UUID,
  p_table_id    UUID   DEFAULT NULL
) RETURNS JSONB
```

---

### `get_total_users_balance()`

Suma de `balance_cents` en `wallets`. Usada en el dashboard para la verificación de integridad.

```sql
get_total_users_balance() RETURNS BIGINT
```

---

### `get_ledger_net_balance()`

Balance neto del ledger: `SUM(credits) - SUM(debits)`. Comparado contra `get_total_users_balance()` para detectar discrepancias.

```sql
get_ledger_net_balance() RETURNS BIGINT
```

---

### `get_vault_status()`

Calcula la cobertura del vault: relación entre el saldo total de usuarios y el capital total depositado.

```sql
get_vault_status() RETURNS TABLE(
  status           TEXT,    -- 'OPERATIVO' | 'ALERTA' | 'CRÍTICO' | 'DESCONOCIDO'
  coverage_percent NUMERIC,
  total_balance    BIGINT,
  total_deposits   BIGINT,
  total_withdrawals BIGINT
)
```

---

### `check_account_eligibility(p_user_id)`

Verifica si un usuario puede acceder a la plataforma (ausencia de sanciones activas).

```sql
check_account_eligibility(p_user_id UUID) RETURNS JSONB
-- { "eligible": true } | { "eligible": false, "reason": "...", "sanction_type": "..." }
```

---

## 5. Tipos TypeScript del Dominio Admin

### `AdminDashboardStats` (`admin-dashboard.ts`)

```typescript
type AdminDashboardStats = {
  activeUsers: number
  totalLedgerBalance: number
  totalUsersBalance: number
  totalRake: number
  fraudAccountsCount: number
  pendingDeposits: number
  pendingWithdrawals: number
  activeGames: number
  ledgerIntegrityStatus: "OPERATIVO" | "ALERTA" | "CRÍTICO"
  ledgerIntegrityDiff: number
  volume24h: number
  pendingSupport: number
  pendingAlerts: number
  vaultStatus: "OPERATIVO" | "ALERTA" | "CRÍTICO" | "DESCONOCIDO"
  vaultCoverage: number
  vaultBalance: number
  vaultTotalDeposits: number
  vaultTotalWithdrawals: number
  warnings: string[]
  fetchedAt: string
}
```

### `AdminUserView` (`admin-users.ts`)

```typescript
type AdminUserView = {
  id: string
  username: string
  display_name: string
  phone: string
  balance_cents: number
  role: string
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  created_at: string
  last_login: string
  devices: { id: string; fingerprint: string; is_trusted: boolean }[]
  stats?: { games_played: number; games_won: number }
}
```

### `AdminGameView` y `AdminPlayerView` (`admin-tables.ts`)

```typescript
type AdminGameView = {
  id: string
  status: string
  max_players: number
  min_bet_cents: number
  pique_pot_cents: number
  main_pot_cents: number
  started_at: string | null
  created_by: string
  name?: string
  table_id?: string
  players: AdminPlayerView[]
}

type AdminPlayerView = {
  id: string
  user_id: string
  status: string
  bet_current_cents: number
  seat_number: number
  display_name?: string
}
```

> [!NOTE]
> `AdminGameView` expone metadata del juego (estado, potes, asientos) pero nunca cartas ni acciones; la view es el reflejo exacto de lo que el RLS permite retornar.

### `AdminDisputeCase` (`types/admin-search.ts`)

```typescript
interface AdminDisputeCase {
  id: string
  status: DisputeStatus          // 'open' | 'investigating' | 'resolved' | 'dismissed'
  priority: DisputePriority      // 'low' | 'medium' | 'high' | 'critical'
  investigation_type: InvestigationType // integridad, colusión, fraude, abuso de bonos o conducta
  source: InvestigationSource    // 'manual' | 'global_search' | 'server_alert' | 'replay'
  title: string
  description: string
  opened_by: string
  assigned_to: string | null
  support_ticket_id: string | null // referencia legacy; no define el flujo actual
  subject_user_ids: string[]
  game_id: string | null          // solo partidas finished
  room_id: string | null
  evidence_snapshot: EvidenceLink[]
  resolution_notes: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolution_outcome: InvestigationOutcome | null // no_action | warning | sanction | compensation
  compensation_status: 'proposed' | 'approved' | null
  compensation_ledger_id: string | null
  created_at: string
  updated_at: string
}
```

### `AdminSearchReport` (`types/admin-search.ts`)

```typescript
interface AdminSearchReport {
  query: string
  detected: DetectedIdentifier   // { raw, type: 'uuid'|'seed'|'username'|'unknown', normalized }
  matches: SearchMatch[]         // [ { entity, id, label, detail } ]
  searched_at: string
}
```

### `SanctionType` y `SanctionRecord` (`admin-sanctions.ts`)

```typescript
type SanctionType = 'full_suspension' | 'game_suspension' | 'permanent_ban'

type SanctionRecord = {
  id: string
  user_id: string
  sanction_type: SanctionType
  reason: string
  applied_by: string
  source_room_id: string | null
  starts_at: string
  expires_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  metadata: Record<string, unknown>
  created_at: string
}
```

### `ServerAlert` (`admin-server-alerts.ts`)

```typescript
type ServerAlert = {
  id: string
  severity: "critical" | "warning" | "info"
  category: string               // 'identity' | 'settlement' | 'discrepancy' | 'collusion' | 'refund' | 'system'
  title: string
  message: string | null
  metadata: Record<string, any>
  room_id: string | null
  game_id: string | null
  player_id: string | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}
```

### `AuditLogEntry` (`admin-audit.ts`)

```typescript
type AuditLogEntry = {
  id: string
  admin_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown>
  context: string | null
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  actor_kind: 'admin' | 'system'
  actor_label: string | null
  ip_address: string | null
  created_at: string
  admin?: { display_name: string } | null
}
```

---

## 6. Componentes Compartidos del Panel

| Componente | Tipo | Descripción |
|---|---|---|
| `AdminGlobalSearch` | Client | Buscador omnisearch en el header del panel; llama a `globalSearch` |
| `DashboardAutoRefresh` | Client | Refresca el dashboard periódicamente en background |
| `DashboardWarnings` | Server | Renderiza banner de advertencias críticas desde `warnings[]` del dashboard |
| `LedgerRealtimeRefresh` | Client | Suscripción a Supabase Realtime en la tabla `ledger`; fuerza re-render al recibir INSERT |
| `LedgerFilters` | Client | Controles de filtro por tipo de transacción en la vista del ledger |
| `UserLedgerTable` | Client/Server | Tabla del historial de ledger de un usuario específico |
| `UserSearch` | Client | Input de búsqueda + filtros para la lista de usuarios |
| `UserBanControl` | Client | Toggle ban/unban con confirmación y campo de motivo; llama a `toggleBanStatus` |
| `UserBalanceControl` | Client | Formulario de ajuste de saldo con validación de monto y motivo; llama a `adjustUserBalance` |
| `TableControls` | Client | Botones de pausa/reanudación de sala; llama a `setGameStatus` |
| `PlayerControls` | Client | Botón de expulsión con confirmación; llama a `kickPlayer` |
| `CreateTableModal` | Client | Modal de formulario para crear mesas; valida denominaciones |
| `SupportConversationList` | Client | Lista de tickets + selección + respuesta en tiempo real |
| `AuditFilters` | Client | Filtros combinables para el log de auditoría |

---

## 7. Token de Supervisión (Colyseus)

Para que el admin pueda observar una sala sin ser un participante oficial, el sistema implementa un token de corta vida almacenado en Redis:

```
1. Admin navega a /admin/spectate/[roomId]
2. Next.js llama a generateSupervisionToken(roomId) en el servidor
3. Se genera token = crypto.randomUUID()
4. Redis almacena: supervision:{token} → { adminId, roomId }  con TTL 60s
5. El token se pasa al componente cliente de Colyseus
6. El cliente se une a la sala de Colyseus enviando el token
7. Colyseus valida el token en Redis antes de permitir la conexión
8. Si el token expiró o no existe, Colyseus rechaza la conexión
```

**Por qué 60 segundos:** El tiempo es suficiente para que el cliente abra el WebSocket; después, la sesión de Colyseus la gestiona el propio estado de la sala. Si el admin recarga la página, necesita un nuevo token.

---

## 8. Integración con el Game Server

El admin interactúa con el Game Server de dos formas:

### 8.1 Consulta del estado de salas (desde dashboard)

```typescript
// admin-dashboard.ts
const res = await fetch(`${gsUrl}/matchmake/`, {
  next: { revalidate: 0 },
  signal: AbortSignal.timeout(5000),
})
const rooms = await res.json() as any[]
activeGamesCount = rooms.filter(r => r.clients > 0).length
```

Esta consulta usa el endpoint `/matchmake/` de Colyseus (sin autenticación especial) que devuelve metadata pública de las salas activas (no estado interno de partidas).

### 8.2 Supervisión en vivo (WebSocket de Colyseus)

El admin se conecta a la sala como espectador usando el token de Redis generado por `generateSupervisionToken`. La sala de Colyseus filtra el estado enviado al espectador admin, omitiendo cartas y acciones privadas.

## 9. Tabla de Trazabilidad Funcional

Mapa completo de facultades administrativas a sus fuentes técnicas:

| Facultad | Server Action | RPC Supabase | Tablas involucradas | Audit action |
|---|---|---|---|---|
| Ver KPIs del dashboard | `getAdminDashboardStats` | `get_total_users_balance`, `get_ledger_net_balance`, `get_vault_status` | `deposit_requests`, `withdrawal_requests`, `wallets`, `ledger` | — |
| Listar usuarios | `getUsersList` | — | `profiles`, `wallets`, `user_devices`, `player_stats` | — |
| Ajustar saldo | `adjustUserBalance` | `process_ledger_entry` | `ledger`, `wallets`, `notifications` | `balance_adjusted` |
| Banear usuario | `toggleBanStatus` | — | `profiles` | `user_banned` / `user_unbanned` |
| Ver ledger global | `getLedgerEntries` | — | `ledger` | — |
| Ver ledger por usuario | `getUserLedgerEntries` | — | `ledger` | — |
| Ver mesas activas | `getActiveGames` | — | `games`, `game_participants`, `tables` | — |
| Crear mesa | `createTable` | — | `tables` | — |
| Pausar/reanudar sala | `setGameStatus` | — | `games` | — |
| Expulsar jugador | `kickPlayer` | — | `game_participants` | — |
| Aprobar depósito | `processTransaction('completed')` | `process_admin_transaction` | `deposit_requests`, `ledger`, `wallets` | `transaction_approved` |
| Rechazar depósito | `processTransaction('failed')` | `process_admin_transaction` | `deposit_requests` | `transaction_rejected` |
| Aprobar retiro | `processTransaction('completed')` | `process_admin_transaction` | `withdrawal_requests`, `ledger`, `wallets` | `transaction_approved` |
| Rechazar retiro | `processTransaction('failed')` | `process_admin_transaction` | `withdrawal_requests` | `transaction_rejected` |
| Ver rake | `getAdminRakeData` | — | `ledger` | — |
| Búsqueda global | `globalSearch` | — | `ledger`, `deposit_requests`, `withdrawal_requests`, `game_replays`, `support_tickets`, `server_alerts`, `profiles`, `admin_dispute_cases` | — |
| Crear investigación | `createDispute` | `create_admin_investigation` | `admin_dispute_cases`, `admin_dispute_case_events` | `dispute_created` |
| Iniciar investigación | `startDispute` | `start_admin_investigation` | `admin_dispute_cases`, `admin_dispute_case_events` | `dispute_started` |
| Resolver investigación | `resolveDispute` | `resolve_admin_investigation` | `admin_dispute_cases`, `admin_dispute_case_events` | `dispute_resolved` |
| Proponer compensación | `proposeDisputeCompensation` | `propose_admin_investigation_compensation` | `admin_dispute_cases`, `admin_dispute_case_events` | `dispute_compensation_proposed` |
| Cancelar propuesta | `cancelDisputeCompensation` | `cancel_admin_investigation_compensation` | `admin_dispute_cases`, `admin_dispute_case_events` | `dispute_compensation_cancelled` |
| Confirmar compensación | `approveDisputeCompensation` | `approve_admin_investigation_compensation` | `admin_dispute_cases`, `admin_dispute_case_events`, `ledger`, `wallets` | `dispute_compensation_approved` |
| Leer auditoría | `getAuditLog` | — | `admin_audit_log` | — |
| Enviar broadcast | `sendBroadcast` | — | `profiles`, `notifications` | `broadcast_sent` |
| Editar reglamento | `updateRulebook` | — | `site_settings` | `rulebook_updated` |
| Ver alertas del sistema | `getServerAlerts` | — | `server_alerts` | — |
| Resolver alerta | `resolveAlert` | — | `server_alerts` | `alert_resolved` |
| Supervisar sala en vivo | `generateSupervisionToken` | — | Redis | `supervision_token_generated` |
| Aplicar sanción | `createSanction` | — | `user_sanctions` | `sanction_created` |
| Revocar sanción | `revokeSanction` | — | `user_sanctions` | `sanction_revoked` |

---

*Ver también:*
- [ADMIN.md](ADMIN.md) — Guía funcional completa del administrador.
- [ADMIN_SECURITY.md](ADMIN_SECURITY.md) — Autenticación, RLS y restricciones de seguridad.
- [plan_primera.md](../../plan_primera.md) — Contexto arquitectónico y decisiones de diseño originales.
