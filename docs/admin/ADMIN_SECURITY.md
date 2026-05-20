# Seguridad y Permisos del Administrador — Mesa Primera

> **Versión:** 1.0 — _Abril 2026_
> **Audiencia:** Equipos de seguridad, auditores técnicos y desarrolladores que necesiten revisar los mecanismos de autorización, restricciones de acceso a datos y trazabilidad del perfil administrativo.
> **Relacionado:** [ADMIN.md](ADMIN.md) · [ADMIN_TECHNICAL.md](ADMIN_TECHNICAL.md)

---

## Tabla de Contenidos

1. [Arquitectura de autorización](#1-arquitectura-de-autorización)
2. [Autenticación y MFA](#2-autenticación-y-mfa)
3. [Segregación de roles en base de datos](#3-segregación-de-roles-en-base-de-datos)
4. [Políticas RLS por tabla](#4-políticas-rls-por-tabla)
5. [Ceguera Administrativa (Admin Blindness)](#5-ceguera-administrativa-admin-blindness)
6. [Inmutabilidad financiera](#6-inmutabilidad-financiera)
7. [Sistema de sanciones](#7-sistema-de-sanciones)
8. [Log de auditoría](#8-log-de-auditoría)
9. [Separación UI admin / UI jugador](#9-separación-ui-admin--ui-jugador)
10. [Política de sesión única](#10-política-de-sesión-única)
11. [Hardening y remediaciones aplicadas](#11-hardening-y-remediaciones-aplicadas)
12. [Modelo de amenazas y defensas](#12-modelo-de-amenazas-y-defensas)

---

## 1. Arquitectura de Autorización

La autorización del administrador opera en **tres capas independientes** que se complementan:

```
┌─────────────────────────────────────────────────┐
│  Capa 1 — Middleware de Next.js (Edge)          │
│  Verifica rol + nivel MFA en cada petición HTTP │
│  Fuente: apps/web/src/utils/supabase/middleware │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  Capa 2 — Server Actions de Next.js             │
│  Re-validan rol antes de ejecutar cada acción   │
│  Función: ensureAdmin() / verifyAdmin()         │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  Capa 3 — Row Level Security (Supabase/Postgres)│
│  Políticas por tabla, función is_admin()        │
│  Tablas sensibles sin política admin = denegado │
└─────────────────────────────────────────────────┘
```

### Por qué tres capas

- El middleware protege la navegación del lado del cliente pero puede eludirse si se llama a una server action directamente.
- Las server actions validan en el servidor pero dependen de la sesión del SDK de Supabase.
- RLS opera en la base de datos y es la defensa que no puede eludirse desde la aplicación; incluso si las capas superiores fallaran, las políticas de base de datos siguen activas.

---

## 2. Autenticación y MFA

### Proveedor y método

| Aspecto | Detalle |
|---|---|
| Proveedor | Supabase Auth |
| Método del admin | Email + contraseña |
| 2do factor | TOTP (Time-based One-Time Password) via Google Authenticator o app compatible |
| Nivel de aseguramiento requerido | **AAL2** (NIST SP 800-63) |
| Nivel sin TOTP | AAL1 — insuficiente para `/admin/*` |

### Flujo de verificación de nivel MFA en middleware

```typescript
// middleware.ts — verificación efectiva
const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

if (aalData) {
  const { currentLevel, nextLevel } = aalData

  // Sin factor TOTP enrollado → forzar setup
  if (nextLevel === 'aal1' && !isMfaSetupPage) {
    redirect('/login/admin/mfa/setup')
  }

  // TOTP enrollado pero no verificado en esta sesión → forzar verificación
  if (nextLevel === 'aal2' && currentLevel !== 'aal2' && !isMfaPage) {
    redirect('/login/admin/mfa')
  }
}
```

El middleware intercepta **toda petición a `/admin/*`**, incluido el path `/`. No existe ruta bajo el panel que omita esta verificación.

### Rutas de autenticación del admin

| Ruta | Propósito |
|---|---|
| `/login/admin` | Credenciales email + contraseña |
| `/login/admin/recovery` | Solicitud pública de enlace de restablecimiento para el correo admin autorizado |
| `/login/admin/password` | Rotación de contraseña después de validar el enlace firmado |
| `/login/admin/mfa` | Verificación TOTP o canje de recovery code cuando el factor ya está enrollado |
| `/login/admin/mfa/setup` | Enrolamiento inicial del factor TOTP |
| `/admin/security` | Panel endurecido para cambio de correo, reset de TOTP, recovery codes y revocación de sesiones |
| `/api/auth/confirm` | Route handler interno para verificar `token_hash` y completar enlaces de Auth |

### Controles de recuperación y rotación

- La recuperación de contraseña admin ya no depende de acceso manual a Supabase: el flujo público en `/login/admin/recovery` envía un enlace firmado al correo administrativo actual.
- El enlace solo se materializa si `/api/auth/confirm` valida el `token_hash` emitido por Supabase Auth y redirige a `/login/admin/password`.
- El cambio de correo desde `/admin/security` exige un código TOTP vigente antes de solicitar el cambio a Supabase Auth.
- El reseteo del factor TOTP desde `/admin/security` también exige un código TOTP vigente; no existe un bypass silencioso del segundo factor.
- `/admin/security` puede regenerar un lote de recovery codes de un solo uso; el lote anterior se invalida en la misma operación.
- `/login/admin/mfa` acepta recovery codes válidos para consumir el código, desinscribir el TOTP perdido y enviar al admin a `/login/admin/mfa/setup`.
- La revocación de sesiones puede ejecutarse desde `/admin/security` en dos alcances: cerrar otras sesiones o forzar cierre global.

### Runbook manual de break-glass

Si un admin pierde tanto el factor TOTP como los recovery codes, el flujo deja de ser self-service y pasa a operación manual controlada:

1. Verificar identidad por un canal externo aprobado por la operación.
2. Forzar rotación de contraseña o enviar un nuevo enlace de recuperación desde un operador autorizado.
3. Eliminar el factor TOTP anterior desde Supabase Auth y borrar cualquier fila activa en `public.admin_mfa_recovery_codes` para ese `admin_id`.
4. Revocar sesiones activas si hay sospecha de compromiso.
5. Exigir nuevo enrolamiento en `/login/admin/mfa/setup` y regenerar recovery codes desde `/admin/security`.

### Lo que no está permitido

- No existe bypass de MFA bajo ninguna condición; la verificación es obligatoria en cada sesión nueva.
- Las cookies de sesión tienen una vida máxima de **7 días** (`maxAge: 604800`), tras los cuales el admin debe re-autenticarse.

---

## 3. Segregación de Roles en Base de Datos

### Tipo enumerado

```sql
-- Migration: 20260304000001_auth_triggers_and_roles.sql
CREATE TYPE public.user_role AS ENUM ('player', 'admin');
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'player';
```

Solo existen dos roles en el tipo `user_role`. No existe rol intermedio ni sistema de permisos granulares por funcionalidad.

### Asignación al crear cuentas

El trigger `handle_new_user` (migración `20260305000005_security_hardening.sql`) **hardcodea el rol a `'player'`** sin importar el payload de la petición de registro:

```sql
INSERT INTO public.profiles (id, username, role)
VALUES (
  NEW.id,
  COALESCE(NEW.raw_user_meta_data->>'username', NEW.phone, NEW.email, ...),
  'player' -- HARDCODED. Roles se asignan externamente, no en el flujo de registro.
);
```

### Qué se hardcodeó y por qué

La versión original del trigger tomaba el rol desde `raw_user_meta_data->>'role'`, lo que permitía que un cliente malicioso enviara `role: "admin"` al momento del registro y obtuviera privilegios elevados sin autorización. La remediación en `20260305000005` elimina completamente esa posibilidad.

### Riesgo de escalada por RLS

La política original `"Users can update own profile"` sobre `profiles` permitía que un jugador se asignara el rol `admin` mediante un `UPDATE` de su propio perfil. La migración `20260305000005` la reemplaza con una política endurecida que bloquea cualquier cambio al campo `role`:

```sql
CREATE POLICY "Users can update own non-sensitive profile data"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);
```

### Función auxiliar de verificación

```sql
-- Migration: 20260304000003_rls_admin_blindness.sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

`is_admin()` es SECURITY DEFINER, lo que significa que se ejecuta con los privilegios del propietario de la función, no del llamador. Esto garantiza que la consulta a `profiles` no puede ser interceptada ni manipulada por políticas del usuario llamante.

---

## 4. Políticas RLS por Tabla

### Resumen de accesos del administrador

| Tabla | SELECT | INSERT | UPDATE | DELETE | Observaciones |
|---|---|---|---|---|---|
| `profiles` | ✅ Todos | — | — | — | Solo lectura vía `is_admin()` |
| `user_devices` | ✅ Todos | — | — | — | Detección de fraude |
| `wallets` | ✅ Todos | — | — | — | Supervisión financiera |
| `ledger` | ✅ Todos | ✅ (vía RPC) | ❌ Bloqueado | ❌ Bloqueado | Inmutabilidad garantizada por políticas explícitas `USING (false)` |
| `transactions` | ✅ Todos | ✅ | ❌ `USING (false)` | ❌ `USING (false)` | Tabla legacy; mismas garantías que ledger |
| `tables` (mesas) | ✅ | ✅ | ✅ | ✅ | Control total de configuración |
| `games` | ✅ Metadata | — | — | — | Solo campos no sensibles; sin cartas ni acciones |
| `game_rounds` | ❌ Sin política | — | — | — | **Admin blindness** — sin acceso |
| `game_actions` | ❌ Sin política | — | — | — | **Admin blindness** — sin acceso |
| `game_participants` | ❌ Sin política SELECT admin | — | — | — | **Admin blindness** — sin acceso directo |
| `game_replays` | ✅ (post-partida) | — | — | — | Solo `status = 'finished'` |
| `admin_audit_log` | ✅ Todos | ✅ (system) | ❌ | ❌ | Solo admins leen; INSERT solo vía `logAdminAction` |
| `admin_dispute_cases` | ✅ Todos | ✅ | ✅ | — | CRUD completo de disputas |
| `user_sanctions` | ✅ Todos | ✅ | ✅ | — | Gestión de sanciones |
| `deposit_requests` | ✅ Todos | — | ✅ (status) | — | Aprobación/rechazo |
| `withdrawal_requests` | ✅ Todos | — | ✅ (status) | — | Aprobación/rechazo |
| `notifications` | — | ✅ | — | — | Solo inserción masiva (broadcast) |
| `site_settings` | ✅ | — | ✅ | — | Edición del reglamento |
| `support_messages` | ✅ Todos | ✅ | ✅ (`is_resolved`) | — | Chat de soporte bidireccional |
| `server_alerts` | ✅ Todos | — | ✅ (status) | — | Resolución de alertas del sistema |

### Lectura importante sobre tablas sin política admin

En Supabase/PostgreSQL con RLS habilitado, **la ausencia de una política SELECT para el admin equivale a un DENY implícito**. Las tablas `game_rounds` y `game_actions` no tienen política que permita a `is_admin()` seleccionar filas; por lo tanto, cualquier consulta admin sobre esas tablas devuelve cero resultados, no un error.

---

## 5. Ceguera Administrativa (Admin Blindness)

### Definición

La ceguera administrativa es el principio que garantiza que **ningún administrador del sistema, ni a través de la interfaz ni mediante consultas directas a la base de datos con token de cliente**, puede acceder al estado activo de una partida en curso: cartas de los jugadores, acciones de la mano ni historia de rondas mientras la partida está en progreso.

### Motivación

El administrador, al tener acceso a la plataforma con más privilegios que cualquier jugador, podría influir en el resultado de una partida si conociera las cartas de los participantes. Esta restricción protege la integridad del juego.

### Tres niveles de implementación

#### Nivel 1 — RLS en Supabase (base de datos)

No se crea ninguna política SELECT para el admin en:

- `game_rounds`: contiene el historial de rondas de cada partida, incluyendo información de cartas y acciones.
- `game_actions`: registro acción-por-acción de lo que hace cada jugador durante una mano.

Resultado: cualquier consulta del SDK cliente con sesión admin devuelve `[]` sin error.

#### Nivel 2 — Servidor de Juego (Colyseus)

El Game Server expone el estado de las salas a través del protocolo Colyseus. El estado completo (incluyendo las cartas de los jugadores) **nunca se envía a clientes con rol admin**. El sistema genera un token de supervisión diferenciado (`generateSupervisionToken`) que restringe el estado visible del admin al conjunto de metadata pública (estado de la sala, jugadores presentes, montos del pote) sin exponer el estado privado de cada jugador.

#### Nivel 3 — UI del panel de control

Los componentes de `TableControls` y la vista de supervisión no renderizan ningún elemento visual de cartas para partidas en curso. Desde el punto de vista del admin, los jugadores tienen "cartas ocultas" hasta que la partida finaliza y el replay queda disponible.

### Alcance de la restricción

| Estado de la partida | Admin puede ver |
|---|---|
| En curso (`in_progress` o `waiting`) | Metadata: estado, jugadores, pote. No: cartas, acciones |
| Finalizada (`finished`) | Replay completo disponible en `/admin/replays` |

### Evidencia funcional

El test E2E `e2e/admin-blindness.spec.ts` valida que el WebSocket del admin no filtre datos de cartas privadas durante una partida activa. El test verifica que el elemento `.private-card-reveal-admin` permanezca oculto y que el panel no exponga valores de cartas individuales.

---

## 6. Inmutabilidad Financiera

### El ledger como fuente de verdad

El ledger (`public.ledger`) es la tabla de registro histórico de todas las operaciones financieras. Su inmutabilidad está garantizada a nivel de base de datos mediante políticas RLS explícitas:

```sql
-- Migration: 20260328000000_immutable_ledger_and_replays.sql
CREATE POLICY "ledger_no_update" ON public.ledger
  FOR UPDATE USING (false);

CREATE POLICY "ledger_no_delete" ON public.ledger
  FOR DELETE USING (false);
```

`USING (false)` hace que la política se evalúe como falsa para todas las filas, bloqueando la operación para **todos los roles**, incluido el admin.

### Único punto de entrada para mutaciones de saldo

La RPC `process_ledger_entry()` es la funcion central que inserta entradas en el ledger. Corre como `SECURITY DEFINER`, serializa escrituras por usuario y valida:

1. `direction` debe ser `'credit'` o `'debit'`.
2. `p_amount_cents` debe ser mayor que cero.
3. Si la operación es un débito, el balance resultante (`v_new_balance`) no puede ser negativo.
4. Actualiza `wallets.balance_cents` en la misma transaccion para mantener sincronia.
5. En su version actual admite tambien `transfer` y `bonus` como tipos validos.

### Consecuencia para el administrador

El admin **no puede** ejecutar correcciones retroactivas. Si aprobó un depósito incorrecto, la corrección operativa correcta es generar una nueva entrada de tipo `refund` o `adjustment`. La entrada original queda en el ledger de forma permanente como evidencia del error y de la corrección posterior.

### Integridad continua

El dashboard compara permanentemente:
- `SUM(amount_cents) WHERE direction = 'credit' - SUM(amount_cents) WHERE direction = 'debit'` (saldo del ledger)
- `SUM(balance_cents) FROM wallets` (saldo espejo de wallets)

Si la diferencia supera el umbral esperado, el estado de integridad cambia de `OPERATIVO` a `ALERTA` o `CRÍTICO`.

---

## 7. Sistema de Sanciones

Las sanciones son restricciones sobre cuentas que el admin puede aplicar, con mayor granularidad que el ban básico de `profiles.is_banned`.

### Tipos de sanción

```sql
-- Migration: 20260416000000_user_sanctions.sql
CREATE TYPE public.sanction_type AS ENUM (
  'full_suspension',  -- Bloquea login + acceso a la plataforma
  'game_suspension',  -- Solo bloquea participación en nuevas partidas
  'permanent_ban'     -- Sin fecha de expiración, bloquea todo
);
```

### Modelo de datos de una sanción

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | UUID | Usuario afectado |
| `sanction_type` | `sanction_type` | Tipo de restricción |
| `reason` | TEXT | Motivo obligatorio |
| `applied_by` | UUID | Admin que aplicó la sanción |
| `source_room_id` | UUID (nullable) | Sala desde donde se aplicó |
| `starts_at` | TIMESTAMPTZ | Inicio de la sanción (default: NOW()) |
| `expires_at` | TIMESTAMPTZ (nullable) | Fin de la sanción; NULL = permanente |
| `revoked_at` | TIMESTAMPTZ (nullable) | Si fue revocada por un admin |
| `revoked_by` | UUID (nullable) | Admin que revocó |

### Verificación en tiempo de login

La RPC `check_account_eligibility(p_user_id)` es evaluada durante el proceso de login del jugador. Si el usuario tiene una sanción activa (`full_suspension` o `permanent_ban` vigentes), el acceso es denegado antes de completar la sesión.

### Trazabilidad

Toda aplicación o revocación de sanción genera automáticamente:
1. Entrada en `user_sanctions` con todos los campos de contexto.
2. Entrada en `admin_audit_log` mediante `logAdminAction` con `action = 'sanction_created'` o `'sanction_revoked'`.

---

## 8. Log de Auditoría

### Tabla `admin_audit_log`

El log de auditoría es INSERT-only (inmutable por política RLS) y captura todas las acciones relevantes del administrador.

### Garantías de inmutabilidad

Igual que el ledger, la tabla `admin_audit_log` tiene políticas que bloquean `UPDATE` y `DELETE` para todos los roles.

### Campos de cada entrada

| Campo | Tipo | Descripción |
|---|---|---|
| `admin_id` | UUID (nullable) | Admin que ejecutó la acción; NULL si fue el sistema |
| `action` | TEXT | Nombre de la acción (`balance_adjusted`, `user_banned`, etc.) |
| `target_type` | TEXT | Tipo del objeto afectado (`user`, `transaction_request`, `dispute`, etc.) |
| `target_id` | TEXT | ID del objeto afectado |
| `details` | JSONB | Payload específico de la acción |
| `context` | TEXT | Área del sistema (`settings`, `communications`, etc.) |
| `before_state` | JSONB | Estado del objeto antes del cambio |
| `after_state` | JSONB | Estado del objeto después del cambio |
| `actor_kind` | `admin` o `system` | Distingue acciones humanas de automáticas |
| `actor_label` | TEXT | Nombre descriptivo del actor, si aplica |
| `ip_address` | TEXT | IP de origen, cuando esté disponible |
| `created_at` | TIMESTAMPTZ | Timestamp UTC; asignado por la base de datos |

### Cuándo lo escribe el sistema (no el admin)

Además de las acciones manuales del admin, el sistema registra automáticamente:
- Aplicación de correcciones de seguridad (migración `20260305000005`).
- Eventos de integridad del ledger cuando la reconciliación detecta discrepancias.
- Eventos del game server que afectan cuentas (reembolsos automáticos, penalizaciones).

---

## 9. Separación UI Admin / UI Jugador

La arquitectura Dual-UI de Next.js usa Route Groups para separar físicamente los dos conjuntos de rutas:

```
apps/web/src/app/
├── (player)/     ← Interfaz del jugador: PWA mobile-first
└── (admin)/      ← Interfaz del administrador: dashboard de control
```

### Consecuencias técnicas de la separación

- Los layouts son independientes; el admin tiene su propio `layout.tsx` con header de control.
- No existen componentes compartidos que mezclen datos de jugador con contexto administrativo.
- La redirección es bidireccional y obligatoria: un admin que intente acceder a `/wallet` o cualquier ruta de jugador es redirigido a `/admin`; un jugador que intente acceder a `/admin/*` es redirigido a `/` (inicio del jugador).

### Código de redirección en middleware

```typescript
// Admins no acceden a rutas de jugador
if (role === 'admin' && !isAdminPath && !isAuthPage && !isMfaPage && !isMfaSetupPage && pathname !== '/') {
  redirect('/admin')
}

// Jugadores no acceden a rutas de admin
if (isAdminPath && role !== 'admin') {
  redirect('/')
}
```

---

## 10. Política de Sesión Única

El sistema implementa sesión única por cuenta: un admin (o jugador) solo puede tener una sesión activa a la vez. El mecanismo opera comparando el `session_device_id` de la cookie actual con el `last_device_id` almacenado en el perfil.

Si detecta un mismatch (otro dispositivo inició sesión):
1. Cierra la sesión actual con `supabase.auth.signOut()`.
2. Redirige al login con `?kicked=true` para informar al usuario.
3. Elimina la cookie `session_device_id` del dispositivo expulsado.

Esta política protege contra acceso concurrente no autorizado desde múltiples dispositivos.

---

## 11. Hardening y Remediaciones Aplicadas

A continuación se documentan las vulnerabilidades identificadas y corregidas durante el desarrollo:

### 11.1 Escalada de privilegios vía metadatos (CVE-style: IDOR en registro)

**Descripción:** El trigger original `handle_new_user` leía el rol desde `raw_user_meta_data->>'role'`. Un atacante podía registrarse con `{ "role": "admin" }` en el payload y obtener acceso de administrador.

**Corrección aplicada:** Migración `20260305000005_security_hardening.sql`. El trigger ahora ignora completamente `raw_user_meta_data` para el campo de rol y usa el literal `'player'`.

### 11.2 Escalada de privilegios vía UPDATE propio (IDOR en profiles)

**Descripción:** La política `"Users can update own profile"` permitía que un jugador ejecutara `UPDATE profiles SET role = 'admin' WHERE id = auth.uid()`.

**Corrección aplicada:** Misma migración `20260305000005`. La nueva política incluye una `WITH CHECK` que valida que el valor de `role` no cambie respecto al almacenado en la base de datos.

### 11.3 Discrepancia ledger-wallet (integridad financiera)

**Descripción:** La función `process_ledger_entry` original referenciaba la columna `wallets.balance` (inexistente). Esto causaba que todas las apuestas y ganancias fallaran silenciosamente: el ledger no se escribía pero las wallets tampoco se actualizaban.

**Corrección aplicada:** Migración `20260402000000_fix_ledger_wallet_column.sql`. La columna correcta es `balance_cents`. Se reescribió la función y se sembraron entradas de ajuste para usuarios con saldos huérfanos.

### 11.4 RPC con tabla incorrecta

**Descripción:** La función `get_total_users_balance()` referenciaba una tabla `users` inexistente en el schema público.

**Corrección aplicada:** Migración `20260406100000_fix_users_balance_rpc_and_vault.sql`. La función usa `SELECT SUM(balance_cents) FROM wallets`.

### 11.5 Filtro de ledger que ocultaba partidas a jugadores

**Descripción:** La migración `20260406000000` introdujo una política de visibilidad del ledger para jugadores que filtraba las entradas de tipo `bet`, `win` y `rake`. Los jugadores no podían ver sus transacciones de juego en el historial.

**Estado:** Documentado como comportamiento conocido. Los jugadores solo ven transacciones de vault (`deposit`, `withdrawal`, `refund`, `adjustment`). Las transacciones de juego son visibles en el historial de replays, no en el ledger de la wallet.

---

## 12. Modelo de Amenazas y Defensas

### Anti-colusion actual

El sistema actual no hace bloqueo preventivo en tiempo real, pero si tiene deteccion operativa activa:

- `apps/game-server/src/cron/antiCollusion.ts` ejecuta un cron cada 2 horas.
- Llama a la RPC `detect_potential_collusion(threshold := 10)`.
- La RPC analiza coincidencia de parejas en partidas de los ultimos 7 dias y marca pares con superposicion mayor al 80%.
- Cuando encuentra casos, emite alertas operativas y registra eventos en `admin_audit_log` para revision manual.

### Amenazas consideradas y mitigaciones activas

| Amenaza | Vector | Mitigación |
|---|---|---|
| Acceso no autorizado al panel | Credenciales robadas sin 2FA | MFA TOTP obligatorio (AAL2) |
| Escalada de privilegios por registro | Payload con `role: admin` | Trigger hardcodeado a `player` |
| Escalada de privilegios por UPDATE | `UPDATE profiles SET role = admin` | Política RLS con `WITH CHECK` |
| Admin viendo cartas activas | Consulta directa a `game_rounds` | Ausencia de política SELECT admin = DENY implícito |
| Admin viendo cartas activas vía WebSocket | Protocolo Colyseus | Token de supervisión diferenciado |
| Modificación de entradas de ledger | `UPDATE` o `DELETE` sobre `ledger` | Políticas `USING (false)` en ambas operaciones |
| Saldo negativo | Débito mayor al saldo | Check en `process_ledger_entry`: `IF v_new_balance < 0 THEN RETURN error` |
| Sesión concurrente desde dos dispositivos | Acceso paralelo | Cookie `session_device_id` + `last_device_id` en tabla |
| Acción sin traza | Cualquier operación admin sin log | `logAdminAction` integrado en todas las server actions sensibles |
| Phishing a nivel de ruta (acceso indirecto) | URL crafteada a `/admin/...` | Middleware verifica rol + AAL2 en cada petición |

### Limitaciones conocidas

- El log de auditoría no captura la dirección IP de forma automática en todos los flujos; el campo `ip_address` está disponible en el esquema pero la server action debe pasarlo explícitamente al llamar a `logAdminAction`.
- La colusión se detecta mediante análisis estadístico post-facto (`docs/security/mejoras_anti_colusion.md`), no en tiempo real durante la partida.
- La restricción de ceguera administrativa aplica a datos en `game_rounds` y `game_actions`, pero el admin con acceso directo a la interfaz de Supabase (servicio administrado externo) puede consultar esas tablas con el service role. Su mitigación es operativa: el service role no debe compartirse con el rol de administrador de aplicación.

---

*Ver también:*
- [ADMIN.md](ADMIN.md) — Guía funcional completa del administrador.
- [ADMIN_TECHNICAL.md](ADMIN_TECHNICAL.md) — Referencia técnica de server actions, RPCs y tipos.
- [plan_primera.md](../../plan_primera.md) — Contexto arquitectónico y decisiones de diseño originales.
