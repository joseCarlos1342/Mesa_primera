# Guía del Administrador — Mesa Primera

> **Versión:** 1.0 — _Abril 2026_
> **Audiencia:** Equipos técnicos externos, auditores, operadores y colaboradores que necesiten entender el alcance completo del perfil administrativo dentro de Mesa Primera.
> **Complementos:** [README.md](README.md) · [ADMIN_SECURITY.md](ADMIN_SECURITY.md) · [ADMIN_TECHNICAL.md](ADMIN_TECHNICAL.md)

---

## Tabla de Contenidos

1. [Descripción del Rol](#1-descripción-del-rol)
2. [Acceso y Autenticación (2FA)](#2-acceso-y-autenticación-2fa)
3. [Dashboard — Panel Principal](#3-dashboard--panel-principal)
4. [Gestión de Usuarios](#4-gestión-de-usuarios)
5. [Libro Mayor (Ledger)](#5-libro-mayor-ledger)
6. [Control de Mesas](#6-control-de-mesas)
7. [Depósitos](#7-depósitos)
8. [Retiros](#8-retiros)
9. [Ganancias (Rake)](#9-ganancias-rake)
10. [Búsqueda Global](#10-búsqueda-global)
11. [Disputas](#11-disputas)
12. [Auditoría](#12-auditoría)
13. [Broadcast](#13-broadcast)
14. [Soporte](#14-soporte)
15. [Alertas](#15-alertas)
16. [Server Log](#16-server-log)
17. [Reglamento](#17-reglamento)
18. [Repeticiones (Replays)](#18-repeticiones-replays)
19. [Supervisión en Vivo](#19-supervisión-en-vivo)
20. [Renderizado de Partidas](#20-renderizado-de-partidas)
21. [Resumen de Facultades y Límites](#21-resumen-de-facultades-y-límites)

---

## 1. Descripción del Rol

El perfil **administrador** en Mesa Primera es el único rol con acceso al panel de control del sistema. Su responsabilidad abarca la supervisión operativa, la gestión financiera, el control de integridad del juego y la atención de incidencias.

El administrador trabaja sobre una **interfaz completamente separada** de la interfaz del jugador. Las rutas `/admin/*` son exclusivas; un admin que intente acceder a rutas de jugador es redirigido automáticamente.

### Principios que gobiernan el rol

| Principio | Descripción |
|---|---|
| **Separación de interfaz** | El admin opera bajo `/admin/*`; nunca comparte UI con los jugadores |
| **Ceguera administrativa** | El admin no puede ver el estado vivo de una partida: ni cartas, ni acciones en curso |
| **Ledger inmutable** | Ninguna operación financiera modifica saldos directamente; toda transacción pasa por RPCs atómicas auditables |
| **MFA obligatorio** | El acceso al panel requiere verificación TOTP (Google Authenticator o equivalente) en cada sesión |
| **Todo queda registrado** | Cada acción relevante del admin se persiste en un log de auditoría inmutable |
| **Cero elevación de privilegios** | Los jugadores no pueden obtener el rol admin; el rol solo puede ser asignado directamente en base de datos por un admin existente |

---

## 2. Acceso y Autenticación (2FA)

**Ruta:** `/login/admin`

### Flujo completo de autenticación

```
1. Admin ingresa email + contraseña  →  Supabase Auth valida credenciales
2. Si el TOTP no está configurado    →  Redirección a /login/admin/mfa/setup
3. Si el TOTP está configurado       →  Redirección a /login/admin/mfa
4. Admin ingresa código TOTP         →  Supabase eleva sesión a AAL2
5. Acceso concedido a /admin         →  Middleware verifica rol + nivel MFA en cada petición
```

### Verificación por sesión

El middleware de Next.js (`middleware.ts`) intercepta cada petición a `/admin/*` y valida:

1. Que el usuario esté autenticado (`supabase.auth.getUser()`).
2. Que el perfil tenga `role = 'admin'` en la tabla `profiles`.
3. Que la sesión haya completado MFA (`currentLevel === 'aal2'`). Si no, redirige a `/login/admin/mfa`.

> [!IMPORTANT]
> El nivel de autenticación requerido es **AAL2** (Authenticator Assurance Level 2), definido por el estándar NIST 800-63. Una sesión estándar sin TOTP verificado tiene nivel AAL1 y es insuficiente para acceder al panel, aunque las credenciales sean correctas.

### Política de sesión única

El sistema implementa restricción de **una sesión activa por cuenta**. Si el mismo admin inicia sesión desde otro dispositivo, la sesión anterior queda invalidada y el dispositivo anterior es redirigido al login con el parámetro `?kicked=true`.

### Qué no puede hacer el admin al autenticarse

- No puede autenticarse mediante OTP por SMS (ese canal es exclusivo para jugadores).
- No puede delegar autenticación en sistemas OAuth externos para acceso al panel admin.
- No puede omitir el paso TOTP aunque la contraseña sea correcta.

---

## 3. Dashboard — Panel Principal

**Ruta:** `/admin`

### Objetivo

Vista consolidada del estado operativo y financiero de la plataforma. Es el punto de entrada del panel y la primera pantalla que el admin ve tras autenticarse.

### KPIs disponibles

| Indicador | Descripción |
|---|---|
| **Usuarios activos** | Total de cuentas registradas activas en la plataforma |
| **Balance total en wallets** | Suma de los saldos de todos los jugadores en centavos |
| **Balance del ledger (neto)** | Diferencia `SUM(créditos) - SUM(débitos)` en el registro histórico |
| **Integrity check** | Comparación entre balance del ledger y balance de wallets; dispara alertas si hay discrepancia |
| **Rake total** | Acumulado de comisiones cobradas por la casa (5%) |
| **Volumen 24h** | Monto total transaccionado en las últimas 24 horas |
| **Mesas activas** | Número de salas con al menos un jugador en el servidor de juego |
| **Depósitos pendientes** | Solicitudes de depósito esperando revisión |
| **Retiros pendientes** | Solicitudes de retiro esperando aprobación |
| **Tickets de soporte** | Mensajes sin respuesta del admin |
| **Alertas pendientes** | Solicitudes de ayuda en vivo sin atender |
| **Estado del vault** | Cobertura financiera del sistema (OPERATIVO / ALERTA / CRÍTICO) |
| **Cuentas con fraude detectado** | Usuarios marcados por el sistema anti-fraude |

### Advertencias automáticas

Si el servidor de juego no responde, el dashboard activa un fallback desde la base de datos para estimar partidas activas, y muestra un banner de advertencia explicando que los datos pueden estar desactualizados.

Si la diferencia entre el ledger neto y el balance total de wallets supera cierto umbral, el estado de integridad cambia a `ALERTA` o `CRÍTICO` con el valor exacto de la discrepancia.

### Auto-refresh

El dashboard implementa refresco automático periódico mediante el componente `DashboardAutoRefresh`. El admin no necesita recargar manualmente para ver actualizaciones de estado.

---

## 4. Gestión de Usuarios

**Ruta:** `/admin/users`

### Objetivo

Visibilidad completa sobre todos los jugadores registrados, herramientas de búsqueda, detección de dispositivos compartidos y capacidad de aplicar restricciones de cuenta.

### Qué puede hacer el admin

#### Consultar usuarios

- Listar todos los usuarios con estado de cuenta, saldo, fecha de registro y dispositivos asociados.
- Buscar por nombre, apodo (`@username`) o número de teléfono.
- Filtrar cuentas marcadas como fraude potencial: el sistema detecta cuando múltiples cuentas comparten el mismo `device_fingerprint`.
- Ver estadísticas de partidas: total jugadas y total ganadas.

#### Modificar saldo de usuario

El admin puede hacer **ajustes administrativos de saldo** cargando o debitando fichas de una cuenta. Esta operación:

1. Requiere un motivo obligatorio (texto libre).
2. Llama a la RPC `process_ledger_entry` con `type = 'adjustment'`.
3. Genera una notificación automática al usuario afectado.
4. Queda registrada en el log de auditoría con `before_state` y `after_state`.

**No es posible** colocar un saldo en negativo; la RPC rechaza la operación si el balance resultante sería menor a cero.

#### Banear y desbanear usuarios

- **Banear:** Requiere un motivo. Marca `is_banned = true` en `profiles`. El usuario queda impedido de ingresar a la plataforma.
- **Desbanear:** Revierte el estado. El admin puede reactivar una cuenta en cualquier momento.

> [!NOTE]
> El ban básico (`is_banned`) difiere del sistema de **sanciones** (`user_sanctions`). Las sanciones permiten restricciones más granulares como suspensión temporal de juego o bans permanentes sin fecha de expiración, aplicadas principalmente desde la supervisión en vivo.

### Qué no puede hacer el admin

- No puede ver contraseñas, PINs ni tokens de sesión de los jugadores.
- No puede modificar el número de teléfono ni el email de un jugador directamente desde la UI (requiere acceso directo a Supabase Auth).
- No puede ver el historial de partidas en vivo del jugador (ceguera administrativa).

---

## 5. Libro Mayor (Ledger)

**Rutas:** `/admin/ledger` · `/admin/ledger/[userId]`

### Objetivo

Registro histórico, **inmutable** y completo de todas las transacciones financieras de la plataforma. Es la fuente de verdad del sistema financiero.

### Qué puede hacer el admin

- **Vista global:** Ver las transacciones más recientes con filtro por tipo.
- **Vista por usuario:** Navegar a `/admin/ledger/[userId]` para ver el historial completo de un jugador específico, incluyendo cada movimiento: depósitos, retiros, apuestas, ganancias, rake y ajustes.
- **Filtrar** por tipo de transacción: `deposit`, `withdrawal`, `bet`, `win`, `rake`, `refund`, `adjustment`, `bonus`.
- **Resumen de balances:** Ver el balance actual de cada usuario calculado directamente desde el ledger.
- **Refresco en tiempo real:** El componente `LedgerRealtimeRefresh` actualiza la vista automáticamente al detectar nuevas entradas.

### Tipos de transacción

| Tipo | Dirección | Quién lo genera |
|---|---|---|
| `deposit` | Crédito | Admin (aprobación de solicitud) |
| `withdrawal` | Débito | Admin (aprobación de solicitud) |
| `bet` | Débito | Game Server (durante la partida) |
| `win` | Crédito | Game Server (al cerrar la mano) |
| `rake` | Débito | Game Server (comisión del 5%) |
| `refund` | Crédito | Admin (disputas resueltas) |
| `adjustment` | Crédito o débito | Admin (ajuste manual con motivo) |
| `bonus` | Crédito | Sistema de bonificación automático |

### Garantías del sistema

- **INSERT-only:** Ninguna fila del ledger puede modificarse ni eliminarse. Las políticas RLS bloquean `UPDATE` y `DELETE` para todos los roles.
- **Atomicidad:** Toda inserción pasa por la RPC `process_ledger_entry`, que actualiza ledger y wallet en una única transacción.
- **Saldo calculado:** El balance actual de un usuario es `balance_after_cents` de la última entrada del ledger, no una suma en tiempo real.

### Qué no puede hacer el admin

- No puede editar, eliminar ni modificar ninguna entrada del ledger.
- No puede insertar entradas directamente en el ledger; toda transacción pasa por RPCs.
- No puede ver entradas de tipo `bet`, `win` y `rake` con su contexto de juego completo (las cartas y acciones de esa mano son inaccesibles por admin blindness).

---

## 6. Control de Mesas

**Ruta:** `/admin/tables`

### Objetivo

Visión operativa de todas las mesas y salas activas, con herramientas para gestionar su estado, los jugadores dentro de ellas, y la configuración de tablas en el lobby.

### Qué puede hacer el admin

#### Sobre mesas en vivo

- **Ver salas activas:** Estado de cada sala (`waiting`, `in_progress`), potencial del pote principal y pique, jugadores actuales.
- **Pausar / reanudar** una sala activa (sin eliminarla ni afectar el estado de las apuestas).
- **Expulsar jugadores** de una mesa con motivo registrado.
- **Ver financieros por mesa:** Rake total generado, apuestas totales, créditos y débitos acumulados por mesa.

#### Sobre la configuración del lobby

- **Crear nuevas mesas:** El admin puede crear mesas con nombre, tipo de juego, apuesta mínima, capacidad máxima, denominaciones de fichas permitidas y posición en el lobby.
- **Asignar categoría:** `common` (mesa estándar) o `custom` (personalizada).
- **Controlar el slot de lobby:** Define en qué posición aparece la mesa dentro del listado para los jugadores.

#### Limitaciones explícitas de la vista

> [!IMPORTANT]
> El control de mesas muestra **metadata de juego** (estado, jugadores conectados, montos del pote) pero **no el contenido activo de las manos**. El admin puede ver cuántos jugadores hay y cuánto hay en juego, pero no sus cartas ni las acciones que se están ejecutando.

### Denominaciones de fichas

Las denominaciones válidas para configurar en una mesa están limitadas al conjunto predefinido: `$1.000`, `$2.000`, `$5.000`, `$10.000`, `$20.000`, `$50.000` (expresadas en centavos: `100000`, `200000`, `500000`, `1000000`, `2000000`, `5000000`). No es posible creaar fichas fuera de este conjunto.

---

## 7. Depósitos

**Ruta:** `/admin/deposits`

### Objetivo

Cola de aprobación para las solicitudes de depósito enviadas por los jugadores. El admin revisa, valida y aprueba o rechaza cada recarga manualmente.

### Flujo completo

```
1. Jugador sube comprobante de transferencia       →  Formulario en /wallet/deposit
2. Se crea registro en deposit_requests (pending)   →  Alerta en dashboard
3. Admin abre /admin/deposits                       →  Lista de solicitudes pendientes
4. Admin revisa comprobante (URL de Storage)        →  Visualización del archivo firmado
5a. Aprobación → RPC process_admin_transaction      →  Acredita monto en ledger + wallet
5b. Rechazo → Registro con motivo                  →  Estado cambia a 'failed', ledger no se toca
6. Auditoría → logAdminAction                      →  Registro inmutable de la decisión
```

### Datos visibles al admin por solicitud

- Nombre/apodo del usuario.
- Monto solicitado (en centavos, presentado con formato COP).
- Saldo actual del usuario antes de procesar.
- Comprobante adjunto (imagen desde Supabase Storage con URL firmada).
- Fecha y hora de la solicitud.

### Qué puede hacer el admin

- **Aprobar:** Llama a `process_admin_transaction(requestId, 'completed')`. La RPC acredita el monto en el ledger con tipo `deposit` y dirección `credit`, actualiza el wallet y cierra la solicitud.
- **Rechazar:** Llama a `process_admin_transaction(requestId, 'failed')`. El ledger no se modifica. La solicitud queda marcada como `failed`.

### Qué no puede hacer el admin

- No puede editar el monto solicitado; debe aprobar o rechazar el monto original.
- No puede aprobar una solicitud ya procesada; la RPC valida el estado `pending` antes de operar.
- No puede revertir una aprobación ya ejecutada (el ledger es inmutable).

---

## 8. Retiros

**Ruta:** `/admin/withdrawals`

### Objetivo

Cola de aprobación para las solicitudes de retiro enviadas por los jugadores. El proceso es similar al de depósitos, con validaciones adicionales sobre la cuenta de destino.

### Flujo completo

```
1. Jugador completa el formulario en /wallet/withdraw   →  withdrawal_requests (pending)
2. Admin abre /admin/withdrawals                        →  Lista de solicitudes pendientes
3. Admin verifica datos del jugador y cuenta destino    →  Nombre, monto, banco
4a. Aprobación → process_admin_transaction              →  Debita monto en ledger
4b. Rechazo → motivo obligatorio                       →  Estado: failed
5. Auditoría → logAdminAction                          →  Registro en audit log
```

### Validación de nombre

Cada solicitud incluye el campo `destination_holder_name` (nombre del titular de la cuenta destino) que debe coincidir con el nombre registrado del jugador en `profiles.display_name`. El campo `name_match_verified` indica si la verificación fue satisfactoria.

### Qué puede hacer el admin

- **Aprobar:** La RPC debita el monto del wallet y registra el movimiento en el ledger como `withdrawal` con dirección `debit`.
- **Rechazar:** Solo cambia el estado de la solicitud a `failed`. El saldo del jugador no se toca.

### Qué no puede hacer el admin

- No puede ejecutar el retiro real en el sistema bancario externo desde esta interfaz; la aprobación dentro del sistema habilita el pago, pero la transferencia bancaria es un proceso externo manual o automatizado.
- No puede modificar el monto ni la cuenta de destino; debe rechazar y pedir al jugador que vuelva a solicitar.
- No puede revertir una aprobación ya procesada.

---

## 9. Ganancias (Rake)

**Ruta:** `/admin/ganancias`

### Objetivo

Desglose detallado de la comisión del 5% que la casa cobra en cada mano ganada. Permite monitorear el rendimiento financiero de la plataforma.

### Qué puede hacer el admin

- **Ver estadísticas** de rake: total acumulado, rake de las últimas 24h, rake de los últimos 7 días, número total de manos cobradas.
- **Explorar el historial** paginado de cada entrada de rake en el ledger: hora, monto, partida (`game_id`), mesa (`table_id`) y monto del premio correspondiente a esa mano.
- **Navegar el historial** mediante paginación (50 entradas por página por defecto).

### Regla de negocio del rake

- El rake es **5% del pote ganado** en cada mano.
- Lo genera automáticamente el Game Server al cerrar cada mano mediante la RPC `award_pot`.
- La RPC inserta dos entradas atómicamente: una de tipo `win` (crédito al ganador) y una de tipo `rake` (débito de la comisión).
- El admin **no puede** modificar el porcentaje de rake desde la interfaz; está fijado en la lógica del Game Server.

---

## 10. Búsqueda Global

**Ruta:** `/admin/consultas`

### Objetivo

Motor de búsqueda omnicanal que permite al admin localizar cualquier entidad del sistema a partir de un identificador único, sea cual sea su tipo.

### Tipos de búsqueda soportados

| Tipo de entrada | Ejemplo | Entidades que busca |
|---|---|---|
| **UUID** | `a1b2c3d4-...` | Ledger, depósitos, retiros, replays, tickets, alertas |
| **Seed hexadecimal** | `4f2a7b...` (32–64 chars) | Replays (RNG seed de la partida) |
| **Username** | `@pepito` o `pepito` | Perfiles, tickets de soporte, alertas, disputas |

### Funcionamiento interno

El sistema detecta automáticamente el tipo de entrada mediante regex:

- UUID: patrón `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-...`
- Seed: hexadecimal puro de 32 a 64 caracteres que no sea UUID
- Username: cualquier otra cadena (con o sin `@`)

Según el tipo detectado, lanza búsquedas en paralelo sobre las tablas relevantes y consolida los resultados en un reporte unificado (`AdminSearchReport`) con enlaces directos a cada entidad encontrada.

### Qué puede hacer el admin

- Localizar una transacción del ledger por su ID o por el `reference_id` de la solicitud.
- Encontrar una partida por seed o por `game_id` y acceder directamente a su replay.
- Buscar todos los registros asociados a un usuario por su username.
- Vincular entidades relacionadas (ticket de soporte, alerta, replay y ledger correspondientes a un mismo incidente).

---

## 11. Disputas

**Ruta:** `/admin/disputes`

### Objetivo

Sistema interno de gestión de casos. Permite a los administradores documentar, investigar y resolver incidentes formales relacionados con el comportamiento del juego, movimientos financieros sospechosos o conflictos entre jugadores.

### Ciclo de vida de una disputa

```
  open  →  investigating  →  resolved
        ↘                 ↗
          dismissed
```

### Qué puede hacer el admin

- **Crear una disputa:** Requiere título, descripción, prioridad y puede incluir evidencia vinculada (snapshot de otras entidades: replays, ledger, tickets).
- **Asignar a un admin:** El caso pasa a estado `investigating` y queda asignado al admin responsable.
- **Resolver:** Cierra el caso con notas de resolución obligatorias. Registra `resolved_by` y `resolved_at`.
- **Desestimar:** Cierra el caso sin acción concreta; requiere también justificación.
- **Vincular a ticket de soporte:** La disputa puede referenciar un ticket previo de soporte para mantener trazabilidad completa.
- **Filtrar por estado:** `open`, `investigating`, `resolved`, `dismissed`.
- **Filtrar por prioridad:** `low`, `medium`, `high`, `critical`.

### Qué no puede hacer el admin

- No puede eliminar una disputa una vez creada.
- No puede cambiar la evidencia vinculada después de crear el caso.

---

## 12. Auditoría

**Ruta:** `/admin/audit`

### Objetivo

Log inmutable de todas las acciones realizadas por administradores dentro del sistema. Proporciona trazabilidad completa para revisiones internas, auditorías externas y resolución de incidentes.

### Acciones registradas automáticamente

| Acción | `action` en el log | Contexto |
|---|---|---|
| Depósito aprobado | `transaction_approved` | `transaction_request` |
| Depósito rechazado | `transaction_rejected` | `transaction_request` |
| Saldo ajustado | `balance_adjusted` | `user` |
| Usuario baneado | `user_banned` | `user` |
| Usuario desbaneado | `user_unbanned` | `user` |
| Broadcast enviado | `broadcast_sent` | `communications` |
| Respuesta de soporte | `support_reply` | `support` |
| Disputa creada | `dispute_created` | `dispute` |
| Disputa asignada | `dispute_assigned` | `dispute` |
| Disputa resuelta | `dispute_resolved` | `dispute` |
| Sanción aplicada | `sanction_created` | `user` |
| Sanción revocada | `sanction_revoked` | `user` |
| Reglamento actualizado | `rulebook_updated` | `settings` |

### Estructura de cada entrada

Cada entrada del log contiene:
- `admin_id`: quién ejecutó la acción (o `null` si fue el sistema).
- `action`: nombre de la acción (`balance_adjusted`, `user_banned`, etc.).
- `target_type`: tipo de entidad afectada (`user`, `transaction_request`, `dispute`, etc.).
- `target_id`: identificador del objeto afectado.
- `details`: payload JSON con contexto específico de la acción (motivo, montos, estado anterior/posterior).
- `before_state` / `after_state`: snapshots del estado antes y después del cambio cuando aplica.
- `actor_kind`: `admin` o `system`.
- `created_at`: timestamp UTC inmutable.

### Qué puede hacer el admin

- Ver el log completo con hasta 200 entradas por defecto.
- Filtrar por acción específica, contexto, admin responsable o rango de fechas.

### Qué no puede hacer el admin

- No puede eliminar ni editar entradas del log de auditoría.
- No puede desactivar el registro de acciones; `logAdminAction` se llama siempre de forma programática desde las server actions.

---

## 13. Broadcast

**Rutas:** `/admin/broadcast` · `/admin/broadcast/history`

### Objetivo

Envío masivo de notificaciones a todos los jugadores activos de la plataforma. Permite comunicar mantenimientos, anuncios, promociones y alertas de seguridad.

### Tipos de notificación disponibles

| Tipo | Identificador | Caso de uso |
|---|---|---|
| Anuncio del sistema | `system_announcement` | Comunicados generales |
| Mantenimiento | `maintenance` | Ventanas de mantenimiento programadas |
| Promoción o bono | `promotion` | Torneos, bonos, eventos especiales |
| Alerta de seguridad | `security_alert` | Advertencias críticas para todos los usuarios |

### Proceso de envío

1. El admin redacta título y cuerpo del mensaje y selecciona el tipo.
2. El sistema **solicita confirmación explícita** antes de enviar (el envío es irreversible).
3. El broadcast se inserta en la tabla `notifications` para **todos los jugadores** con `role = 'player'`.
4. La acción queda registrada en el log de auditoría con el conteo de destinatarios.

### Historial

`/admin/broadcast/history` muestra todos los broadcasts enviados anteriormente, con fecha, tipo, título y conteo de destinatarios.

### Qué no puede hacer el admin

- No puede enviar un broadcast dirigido a un único usuario (para eso existe el chat de soporte).
- No puede programar un envío futuro desde la interfaz actual; el envío es inmediato.
- No puede retirar un broadcast ya enviado.

---

## 14. Soporte

**Ruta:** `/admin/support`

### Objetivo

Centro de comunicación bidireccional entre el administrador y los jugadores. Permite atender consultas, resolver dudas y cerrar tickets de soporte.

### Qué puede hacer el admin

- **Ver todas las conversaciones** activas organizadas por ticket y usuario.
- **Leer el historial** completo de cada conversación.
- **Responder** al jugador en tiempo real.
- **Marcar conversaciones como resueltas** para retirarlas de la cola activa.
- Ver el avatar y nombre del jugador en cada conversación.

### Estructura de mensajes

Cada mensaje en la tabla `support_messages` incluye:
- `user_id`: quién envió el mensaje.
- `from_admin`: booleano que distingue si el mensaje lo escribió el admin o el jugador.
- `is_resolved`: flag de cierre del ticket.

### Qué no puede hacer el admin

- No puede iniciar una conversación de soporte con un jugador sin que el jugador haya abierto el ticket primero.
- No puede eliminar mensajes de soporte.

---

## 15. Alertas

**Ruta:** `/admin/alerts`

### Objetivo

Monitor en tiempo real de solicitudes de ayuda enviadas por los jugadores desde dentro de las mesas. Permite al admin intervenir rápidamente ante incidentes durante el juego.

### Tipos de solicitud

| Tipo | Descripción |
|---|---|
| `dispute` | El jugador reporta una irregularidad en la partida |
| `unfair_play` | El jugador sospecha de juego desleal por otro participante |
| `technical_issue` | Problema técnico que afecta la experiencia de juego |
| `other` | Solicitud miscelánea |

### Ciclo de vida

```
  pending  →  attending  →  resolved
           ↘              ↗
             dismissed
```

### Qué puede hacer el admin

- Ver todas las alertas activas con datos del usuario, sala, motivo y tiempo transcurrido desde la solicitud.
- Cambiar el estado de cada alerta.
- Acceder directamente a la sala o al usuario relacionado desde la alerta.

---

## 16. Server Log

**Ruta:** `/admin/server-log`

### Objetivo

Consola de alertas automáticas generadas por el sistema (no por usuarios). Detecta anomalías técnicas y patrones de comportamiento sospechoso que requieren atención del admin.

### Categorías de alerta

| Categoría | Descripción |
|---|---|
| `identity` | Posible suplantación de identidad o múltiples cuentas en un mismo dispositivo |
| `settlement` | Irregularidades en el cierre de una mano o liquidación de saldos |
| `discrepancy` | Discrepancias detectadas entre ledger y wallets |
| `collusion` | Patrones estadísticos que sugieren colusión entre jugadores |
| `refund` | Reembolsos automáticos o situaciones que requieren revisión de devoluciones |
| `system` | Errores de infraestructura, timeouts o caídas del game server |

### Severidad

| Nivel | Significado |
|---|---|
| `CRITICAL` | Requiere intervención inmediata |
| `ALERTA` | Situación a revisar en el corto plazo |
| `INFO` | Registro informativo sin acción requerida |

### Qué puede hacer el admin

- Filtrar por categoría y/o severidad.
- Marcar alertas como resueltas una vez atendidas.
- Navegar a las entidades relacionadas (game_id, player_id) directamente desde la alerta.

---

## 17. Reglamento

**Ruta:** `/admin/rules`

### Objetivo

Editor de contenido para el reglamento público del local, que los jugadores pueden consultar desde `/rules`.

### Qué puede hacer el admin

- **Leer el reglamento actual** almacenado en la tabla `site_settings` con clave `rulebook`.
- **Editar el contenido** con un editor Markdown en vivo con vista previa.
- **Guardar cambios,** que se persisten en `site_settings` con registro del admin que realizó el cambio (`updated_by`) y fecha de actualización.

### Trazabilidad

Cada actualización del reglamento genera una entrada en el log de auditoría con:
- El ID del admin que hizo el cambio.
- Un snapshot de los primeros 500 caracteres del contenido anterior (`before_state`) y del nuevo (`after_state`).
- La longitud total del nuevo contenido.

### Qué no puede hacer el admin

- No existe versioning automático del reglamento; si se sobreescribe por error, la única fuente de historial parcial es el log de auditoría.
- No puede redirigir el reglamento a una URL externa; el contenido siempre se almacena en la base de datos.

---

## 18. Repeticiones (Replays)

**Ruta:** `/admin/replays`

### Objetivo

Acceso administrativo al archivo histórico de partidas jugadas. Permite revisar el desarrollo de cualquier mano para validar integridad, investigar disputas o generar material de evidencia.

### Qué puede hacer el admin

- **Listar todas las partidas** con fecha, jugadores involucrados y rake generado.
- **Ver resúmenes estadísticos:** total de partidas registradas, rake acumulado, número de jugadores únicos.
- **Acceder a un replay individual** directamente desde el listado para reproducirlo visualmente.
- **Enlazar con renderizado** (`/admin/render/[gameId]`) para generar un video MP4 de la partida.

### Cuándo están disponibles

Los replays solo son accesibles después de que la partida concluye. El sistema almacena el estado final de la mano en `game_replays` con `status = 'finished'`.

> [!NOTE]
> Esta es la única forma en que el admin puede revisar el desarrollo de una partida. La restricción de ceguera administrativa aplica **durante** el juego; una vez finalizado, el replay completo está disponible.

### Qué no puede hacer el admin

- No puede acceder a replays de partidas en curso.
- No puede editar, eliminar ni manipular los datos del replay; los archivos son generados y sellados por el Game Server.

---

## 19. Supervisión en Vivo

**Ruta:** `/admin/spectate/[roomId]`

### Objetivo

Acceso a la sala activa desde la perspectiva del administrador para monitorear el juego, escuchar el canal de voz si está habilitado, y aplicar sanciones sin necesidad de interrumpir la Mesa.

### Qué puede hacer el admin

- **Observar la sala:** Ver estado general de la sala y jugadores presentes.
- **Escuchar el canal de voz** (LiveKit WebRTC) cuando esté disponible.
- **Aplicar sanciones** desde la sala activa, sin ver el contenido de las manos:

| Sanción | Tipo | Efecto |
|---|---|---|
| Suspensión completa | `full_suspension` | Bloquea login y acceso a la plataforma |
| Suspensión de juego | `game_suspension` | Bloquea solo la participación en nuevas partidas (N días o N meses) |
| Baneo permanente | `permanent_ban` | Bloquea todo el acceso de forma indefinida |

Todas las sanciones requieren un **motivo obligatorio** y quedan registradas con el `source_room_id` de donde se aplicaron, para mantener contexto del incidente.

### Límite explícito: ceguera administrativa en vivo

> [!CAUTION]
> Aunque el admin puede supervisar la sala, **no puede ver las cartas de los jugadores** ni el desarrollo de las acciones de la mano en curso. Esta restricción se implementa tanto a nivel de RLS en Supabase (tablas `game_rounds` y `game_actions` no tienen política SELECT para admins) como en la lógica del Game Server, que no expone el estado completo a clientes con rol admin.

### Token de supervisión

El acceso a la sala genera un token de supervisión mediante `generateSupervisionToken`. Este token distingue al observador admin del resto de participantes de la sala.

---

## 20. Renderizado de Partidas

**Ruta:** `/admin/render/[gameId]`

### Objetivo

Motor interno de renderizado de partidas históricas a video MP4. Este apartado es de uso técnico/automatizado y no forma parte del flujo diario del administrador.

### Funcionamiento

- Accesible únicamente con el token correcto en el query string: `?token=RENDER_SECRET_TOKEN`.
- Obtiene el replay del Game Server para el `gameId` indicado.
- Renderiza el componente visual de reproducción completa de la partida.
- Señaliza `data-render-done="true"` en el DOM cuando la reproducción termina, lo que indica al worker que el video está listo para capturar.

### Quién lo usa

El worker del Game Server lo invoca automáticamente para generar videos MP4 de partidas seleccionadas o de todos los replays del archivo. No es una herramienta que el admin opere manualmente de forma habitual.

### Seguridad

El acceso **requiere** el valor exacto de la variable de entorno `RENDER_SECRET_TOKEN`. Sin el token correcto, la ruta retorna error y no renderiza ningún contenido. Esto protege la ruta de accesos externos no autorizados.

---

## 21. Resumen de Facultades y Límites

### Tabla rápida de referencia

| Facultad | Puede | No puede |
|---|---|---|
| **Autenticación** | Email + contraseña + TOTP | SMS OTP, OAuth para panel admin |
| **Usuarios** | Ver, buscar, banear, ajustar saldo | Ver contraseñas, modificar email/teléfono |
| **Ledger** | Ver todo, filtrar, exportar por usuario | Editar, eliminar o insertar directamente |
| **Mesas** | Crear, pausar, expulsar jugadores | Ver cartas o acciones activas |
| **Depósitos** | Aprobar o rechazar con motivo | Editar montos, revertir aprobaciones |
| **Retiros** | Aprobar o rechazar | Ejecutar transferencias bancarias externas |
| **Rake** | Ver estadísticas y detalle paginado | Cambiar porcentaje (fijado en game server) |
| **Búsqueda** | UUID, seed, username en todas las entidades | | 
| **Disputas** | Crear, asignar, resolver, desestimar | Eliminar casos, cambiar evidencia posterior |
| **Auditoría** | Ver y filtrar el log completo | Editar o eliminar entradas |
| **Broadcast** | Enviar a todos los jugadores | Envío selectivo, envío programado |
| **Soporte** | Ver, responder, cerrar tickets | Iniciar conversación sin ticket del jugador |
| **Alertas** | Ver, atender, resolver solicitudes en vivo | |
| **Server Log** | Ver y filtrar alertas del sistema | |
| **Reglamento** | Editar y guardar el Markdown | Versioning automático de cambios |
| **Replays** | Ver historial completo post-partida | Ver replays de partidas en curso |
| **Supervisión** | Observar sala, escuchar voz, aplicar sanciones | Ver cartas o acciones de la mano en curso |
| **Renderizado** | Trigger con token secreto | Acceso sin token válido |

### Reglas de negocio críticas que el admin debe respetar

1. **Inmutabilidad financiera:** No existe mecanismo de corrección directa sobre el ledger. Si se aprobó un depósito por error, la corrección requiere un `refund` o `adjustment` mediante una nueva entrada; la aprobación original no se revierte.
2. **Proceso atómico:** Toda modificación de saldo pasa obligatoriamente por `process_ledger_entry`. No hay camino alternativo disponible desde la UI.
3. **Ceguera administrativa:** Es una restricción de integridad, no un defecto. Asegura que el admin no pueda beneficiarse de conocer las cartas de una partida activa para interferir en su resultado.
4. **Audit trail universal:** No existe acción administrativa significativa que no genere entrada en `admin_audit_log`. Si una acción no aparece en el log, no fue ejecutada por el flujo estándar del sistema.
5. **Un admin no puede elevarse a sí mismo:** El rol admin solo puede asignarse fuera del flujo de la aplicación (directamente en base de datos o mediante script autorizado). La UI no expone ningún mecanismo de gestión de roles.

---

*Ver también:*
- [ADMIN_SECURITY.md](ADMIN_SECURITY.md) — Autenticación, RLS, políticas y mecanismos de seguridad en detalle.
- [ADMIN_TECHNICAL.md](ADMIN_TECHNICAL.md) — Server actions, RPCs, tipos y trazabilidad técnica.
- [ROUTES.md](../product/ROUTES.md) — Mapa completo de rutas del sistema.
