# Mejoras Futuras: Sistema Anti-Trampas Avanzado para Mesa Primera

> Este es el roadmap maestro para todas las medidas anti-trampas de la plataforma: multi-cuenta, colusión, chip dumping, ban real-time y score de riesgo. Recopila lo que ya se ha hecho, lo que falta del plan original (`mejoras_anti_colusion.md` ya implementado parcialmente) y nuevas medidas resultado de revisar el código actual.

El sistema actual tiene fragmentos dispersos de anti-trampas, pero no hay un motor coherente: la colusión se chequea con un cron cada 2 horas, el `AntiCheatService` solo hace rate-limiting y registro post-hoc, el "fraude" del dashboard solo es multi-cuenta por fingerprint, y nada bloquea a un jugador sospechoso de seguir jugando. Este documento es el plan para consolidar todo en un sistema accionable.

## 0. Mesa Primera: cómo juega y dónde se puede hacer trampa

Mesa Primera es un juego de cartas con apuestas (Primera), dominó, parqués y más. En Primera los jugadores apuestan fichas en rondas con un pote. Las formas de trampa más relevantes:

- **Multi-cuenta stalking:** un mismo humano crea varias cuentas para sentarse en la misma mesa e impulsar pote sin riesgo.
- **Colusión en mesa:** dos jugadores (no necesariamente multi-cuenta) intercambian señas de cartas o coordinan folds para miel-brillar a un tercero y repartirse ganancias.
  - **Chip dumping / soft-play:** un jugador A foldea deliberadamente a un jugador B para transferir fichas sin que B arriesgue su mano.
- **Pago-dumpster (Web):** desde la web se puede intentar comprar fichas con tarjetas robadas, recibir "depósito" y retirar inmediatamente.
- **Abuso de red/automatización:** spamear mensajes WebSocket, forzar resincronizar para revertir estado, usar herramientas externas.

Este roadmap cubre los cuatro frentes (multi-cuenta, colusión en directo, abuso de web y abuso de red).

---

## 1. Estado actual (qué se ha hecho del plan original)

### 1.1 Multi-cuenta por dispositivo compartido (parcialmente hecho)

- **Tabla `user_devices`** activa desde Sprint 1, con `fingerprint`, `device_id`, `trusted_until`, `credential_id` (passkey) y columnas para WebAuthn.
- **`registerDevice` en `anti-fraud.ts`** persiste el fingerprint del navegador al iniciar sesión.
- **Dashboard KPI "Alertas de Fraude"** (`apps/web/src/app/actions/admin-dashboard.ts:162-180`): cuenta usuarios con `fingerprint` compartido. Es solo un **conteo** — no hay scoring ni vista detallada.
- **Link del KPI** lleva a `/admin/users?q=fraud` que filtra por multi-cuenta en la lista de usuarios. No es una vista de investigación, solo un filtro del directorio.

**Estado:** detección pasiva post-hoc. El sistema sabe que dos cuentas comparten dispositivo, pero **las deja sentarse juntas en la misma mesa**. Nadie lo impide en tiempo real.

### 1.2 Colusión por emparejamiento frecuente (parcialmente hecho)

- **Cron anti-colusión** (`apps/game-server/src/cron/antiCollusion.ts`): corre cada 2 horas, ejecuta el RPC `detect_potential_collusion` y genera alertas.
- **RPC `detect_potential_collusion`** (`supabase/migrations/20260408000001_detect_potential_collusion_rpc.sql`):
  - Ventana: 7 días.
  - Threshold: 10 juegos compartidos.
  - Overlap: >80% (de los juegos del jugador con menos juegos totales).
  - Devuelve pares `(player_1, player_2, games_together, total_games_p1, total_games_p2, overlap_pct)`.
- **`AlertService.collusion`** emite alerta `warning` a `server_alerts`.
- **Auditoría:** cada par detectado se inserta en `admin_audit_log` con acción `SYSTEM_ANTI_COLLUSION_ALERT`.
- **Tests:** cubierto en `antiCollusion.test.ts`.

**Limitaciones críticas:**

1. Es **batch post-hoc**, no real-time. Dos jugadores pueden coludir 50 minutos antes de que el cron despierte.
2. Solo mira **frecuencia**, no patrones financieros. No detecta chip dumping ni soft-play.
3. El threshold fijo de 10 juegos/80% puede no servir para mesas VIP de bajo volumen.
4. El alert va a `server_alerts` pero no tiene acción asociada. El admin ve el alert, abre la alerta, y... listo. No hay link directo a las partidas afectadas, no hay bloqueo de los involucrados, no hay marcado de caso.

### 1.3 Anti-cheat en game server (hecho, pero solo rate-limiting y logging)

- **`AntiCheatService`** en `apps/game-server/src/services/AntiCheatService.ts`:
  - **Rate limit por sesión WebSocket** (Redis): 30 mensajes/minuto, 10 burst/5s por tipo.
  - **Señales** que persiste en `anti_cheat_events`:
    - `rate_limit` y `burst` (warning) — excede velocidad.
    - `out_of_turn` (warning) — intenta actuar fuera de turno.
    - `invalid_payload` — payload ilegal.
    - `server_override` (warning) — cliente mintió y el server forzó la verdad (ej. cliente dice "no tengo primera", server resuelve "sí tienes primera").
    - `resync_abuse` — abusa de la petición de resincronización.
  - **Escalado a `AlertService`** solo cuando la severidad es `critical`. Hoy ninguna señal se marca como `critical`.
  - **Fails open**: si Redis cae, permite el mensaje para no bloquear gameplay.

**Limitaciones:**

1. **Persiste señales, pero no toma acciones.** Si un jugador dispara 30 `server_override` en 20 minutos, el sistema lo loguea pero no lo kickea ni banea.
2. **No hay umbral de strike acumulativo.** No existe "3 strikes = ban temporal" ni nada similar.
3. **No hay alertas `critical` activas.** Todas las señales críticas requieren código nuevo en `MesaRoom` que llame a `recordSignal` con `severity: 'critical'`.
4. **No hay prevención.** Es puramente telemetría.

### 1.4 Rate limiting web (hecho, pero simple)

- **`enforceRateLimiting`** en `apps/web/src/app/actions/anti-fraud.ts`:
  - Rate limit por IP (no por usuario) para login, retiro y OTP.
  - Single-action configurable (limit/windowSecs).
  - Falla abierto si Redis no contesta.
- **Test coverage:** bueno.

**Lo que no cubre:**

- No limita por usuario autenticado, solo por IP. Un botnet con IPs distribuidas no se ve afectado.
- No limita creación de cuentas (registro) por IP.
- No limita intentos de passkey fallidos por usuario.
- No es rate-limit en seating (sentarse en mesa) — ahí todo el control le toca al game server.

### 1.5 Admin blindness

El admin no ve cartas privadas de partidas activas (regla de oro). Esto significa que el admin **no puede** revisar manualmente colusión en directo mirando las cartas de los sospechosos. El sistema anti-trampas es entonces fundamental: debe autoservir evidencia (replays, ledger, alerts) al admin para que investigue post-hoc sin ver el juego en vivo.

---

## 2. Lo que falta del plan original

### 2.1 Detección de colusión estructural en cascada (no implementado)

El plan original pedía **bloqueos pre-juego**:

- **Validación de Subredes IP:** bloquear a dos usuarios de la misma IP pública (o nodo VPN conocido) sentarse en la misma mesa.
  - **Falta:** no existe el checkeo en el matchmaker de Colyseus, ni tabla de nodos VPN conocidos, ni captura de IP pública del cliente al sentarse.

- **Fingerprinting de Dispositivos como sentencia:** la tabla `user_devices` existe, pero el matchmaker no la consulta antes de aceptar un join. Dos cuentas con mismo `device_id` pueden sentarse juntas libremente.
  - **Falta:** middleware/onJoin del `MesaRoom` que consulte `user_devices` y rechace si un dispositivo está representado dos veces en la misma sala.

**Coste estimado:** 2-3 días. Modifica `MesaRoom.onAuth` + nueva RPC `users_share_device(user_ids[])` + tests + policy.

### 2.2 Prevención de "Chip Dumping" algorítmico (no implementado)

- **Modelos estadísticos ML:** NO existe ningún modelo. No se analiza el patrón de folds consecutivos, manos ganadoras foldeadas ni comparación histórica de agresividad.
- **Rastreo de Flujo Financiero Cruzado:** NO existe RPC ni query que detecte "X% de las fichas perdidas por A acabaron en B vía folds". El ledger no se cruza con `game_participants` para identificar dumping.

**Coste estimado:**

- **Versión simple (post-game batch, sin ML):** 3-5 días. RPC nuevo que, dada una partida, analice la secuencia de acciones (`game_actions` o timeline del replay) y detecte (a) folds de manos con equity alta según ranking de Primera, (b) transferencia neta positiva A→B tras folds. Sin ML, solo heurística.
- **Versión ML:** 4-6 semanas. Modelado + entrenamiento + integración. Fuera de alcance del corto plazo.

### 2.3 Resolución automatizada "Zero Tolerance" (no implementado)

- **Inmovilización del Ledger:** NO existe el estado `locked` en `wallets`. Todas las wallets son igualmente operables. No hay forma de bloquear retiros/transferencias de un jugador sospechoso sin banearlo entero.
- **Baneo Inmediato por WebSocket:** el kick de Colyseus existe pero no hay automatismo. El ban se ejecuta desde la UI admin (`toggleBanStatus` en `admin-users.ts`), no desde el game server tras una señal.
- **Alerta de Nivel Escalable:** las alertas van a `server_alerts`, pero no hay un rol "Super Admin" con potestad de confiscar fondos. Hoy cualquier admin puede banear, pero la "confiscación" (cobrar el saldo a favor de la casa) no está modelada en el ledger.

**Coste estimado:**

- **Lock de wallets:** 1 día para añadir `is_locked boolean not null default false` a `wallets` + RLS que niegue INSERT en `ledger` desde esa wallet + UI para lock/unlock.
- **Auto-kick del game server:** 2-3 días para在那个当 `AntiCheatService.recordSignal` detecta strike grave, llamar a `client.kick(4001, "Suspended for ToS violation")` de `MesaRoom` + crear `banned_session` en Redis con TTL.
- **Confiscación de saldo:** 1-2 sprints. Requiere diseño del ledger (¿tipo `confiscation`?, ¿quién firma el crédito a la casa?) y conversación con producto/legal.

---

## 3. Lo que NO estaba en el plan original y vamos a añadir

Estos son frentes nuevos que surgieron al auditar el código:

### 3.1 Página de investigación de fraude consolidada `/admin/fraud`

Hoy el KPI del dashboard solo lleva a `/admin/users?q=fraud` (filtro de multi-cuenta). El admin necesita una vista consolidada que cruce **todas** las señales:

- Multi-cuenta por dispositivo (`user_devices`).
- Multi-cuenta por IP (Nuevo § 3.6).
- Pares de colusión (`detect_potential_collusion` resultados).
- Eventos anti-cheat (`anti_cheat_events`) por jugador.
- Discrepancias ledger-wallet (`AlertService.discrepancy`).

La página `/admin/fraud` debería ser un dashboard con:

- **Tab de cuentas sospechosas** (multi-cuenta + colusión) con score de riesgo por jugador (Ver § 3.4).
- **Tab de eventos anti-cheat** recientes agrupados por jugador.
- **Tab de discrepancies financieras** (alerts critical con `category: 'discrepancy'`).
- **Cada item enlaza al perfil del jugador** (`/admin/users/[id]`), al histórico de partidas y a la creación de disputa.

El KPI del dashboard principal pasaría de apuntar a `/admin/users?q=fraud` a apuntar a `/admin/fraud`.

**Coste estimado:** 1-2 semanas para tener la primera versión usable (query multi-tabla + tabla de scores + UI Bounded). La versión final con 3 tabs + scoring y drill-down 2-3 sprints.

### 3.2 Score de riesgo por jugador (Player Risk Score)

Cada jugador debería tener un score de riesgo 0-100 que agregue señales:

- Dispositivos compartidos con otros jugadores (+20 c/perfil compartido, +10 por perfil extra).
- Pares de colusión detectados (+25 por par con overlap >80%).
- Eventos anti-cheat acumulados (+5 por cada 10 señales `warning`, +15 por cada `critical`).
- Discrepancia ledger-wallet (+30 si tiene discrepancia >0 activa).
- Retiros recientes superiores a depósitos (+10 si `withdrawals_total > deposits_total * 1.5` en últimos 30 días).

El score se muestra en `/admin/users` como badge y en el nuevo `/admin/fraud` como columna ordenable. Permite al admin priorizar quién investigar primero.

**Implementación:** RPC nueva `compute_player_risk_score(user_id)` que calcule en vivo, o columna `risk_score` en `profiles` recalculada por cron. RPC en vivo es másutm_actual para dev pero más cara por request; columna + cron es más escalable pero se puede quedar desactualizada.

**Coste estimado:** 3-5 días (RPC + cron de recálculo + UI badge).

### 3.3 Notificación proactiva al admin cuando se detecta fraude

Hoy si el cron detecta colusión o el `AntiCheatService` persiste una señal `warning`, el admin **no se entera** hasta que abre el dashboard. Necesitamos:

- **Broadcast al admin** cuando:
  - Cron detecta un par de colusión nuevo (no detectado en run previo).
  - `AlertService.emit` con `severity: 'critical'` (`settlement`, `refund`, `discrepancy`, `anti_cheat` critical).
  - `AntiCheatService.recordSignal` con `severity: 'critical'`.
- **Canal:** usar el broadcast ya existente (`/admin/broadcast`) orientado a admins, o un email simple a los admins registrados, o push notification via service worker del dashboard.

**Coste estimado:** 2-3 días. Reusa el `/admin/broadcast` con un `target_role = 'admin'` y un popover de notificación en el header cuando el admin tenga sesión abierta.

### 3.4 Sistema de strikes acumulativos con auto-ban temporal

El `AntiCheatService` guarda señales pero no aplica consecuencias. Necesitamos:

- **Strike counter por jugador** en Redis con TTL de 7 días (resetea si no reincide en el periodo).
- **Umbrales configurables** (por settings, no hardcodeados):
  - 3 strikes `warning` en 24h → kick con aviso "Comportamiento sospechoso" + alerta al admin.
  - 3 kicks en 7 días → ban temporal 24h automático.
  - 1 strike `critical` → ban temporal 1h instantáneo.
  - 2 strikes `critical` en 30 días → ban permanente escalado a admin.
- **Apelación:** el ban temporal_deck tiene campo `reason` y `expires_at`. El jugador recibe mensaje en `/login` con el motivo y link a soporte.

**Coste estimado:** 1 semana. Implementa en `MesaRoom` onMessage + hook nuevo en `AntiCheatService.processMessage` que decida si kickear. Tabla `player_suspensions` nueva + RLS.

### 3.5 Validación de IP/subredes en el matchmaker

- Capturar IP pública del cliente al conectar al `MesaRoom` (si no se captura ya).
- Consultar `server_alerts` o Redis para ver si la IP está en blacklist de nodos VPN conocidos.
- Rechazar `onJoin` con código 4003 si la IP matchea un nodo bloqueado.

**Coste estimado:** 2-3 días. Tabla `blocked_ips` (CIDR + motivo) + integración en `onAuth`. Combinable con § 2.1.

### 3.6 Detección de multi-cuenta por IP (no solo por dispositivo)

El fingerprint de navegador es fácil de evadir (incognito, limpiar localStorage, browser distinct). La IP pública es harder. añadimos:

- Capturar IP del cliente al crear cuenta y al iniciar sesión (control `client_ips` con tabla de histórico `login_events`).
- Detectar dos cuentas que comparten IP en los últimos 30 días (no es muy restrictivo — pueden ser hermano/hermana mismo WiFi — pero está como marca amarilla).
- Score más bajo que dispositivo compartido (+10 vs +20).

**Coste estimado:** 1-2 días. Tabla `login_events` + RPC que aggregue.

### 3.7 Revisión post-partida de chip dumping por heurística (sin ML)

Mientras no entremos en ML, implementamos heurística post-game:

- RPC `analyze_game_for_chip_dumping(game_id)` que revisa el `game_timeline` (del replay) y aplica reglas:
  - Si un jugador foldea una mano con equity >= 0.7 (según ranking de Primera) cuando el pote es > X% del bankroll y no hay raise enemigo → flag de fold sospechoso.
  - Si un jugador foldea systematicamente al mismo oponente en 3+ partidas → flag de soft-play.
- Salida: lista de partidas con flag `chip_dumping_possible`/`softplay_possible`.
- El admin las ve en `/admin/disputes` con un badge `AUTO-FLAG`.

**Coste estimado:** 1-2 sprints. Requiere acceso a `game_timeline` estructurado (campos de acción, jugador, pote, equity estimada). Si la equity no se está calculando hoy, hay que añadirla o estimarla via heurística de Primera.

### 3.8 Rate limiting por usuario autenticado en web

Hoy `enforceRateLimiting` solo mira IP. Necesitamos también rate limit por `user.id`:

- Login fallido por user → limita intentos.
- Intentos de passkey fallidos → limita.
- Creación de cuentas por IP por hora → evita account farming.

**Coste estimado:** 1-2 días. Mismo patrón que `enforceRateLimiting`, añadiendo un key `by_user` opcional.

### 3.9 KYC opcional para mesas VIP

Si un jugador quiere jugar en mesas de entrada >= $500K, requerir verificación de identidad:

- Foto del documento + selfie (puede usar servicio externo como Cloudflare Turnstile + un proveedor KYC).
- Check si dos cuentas NO comparten documento (no solo dispositivo).

**Coste estimado:** depende del proveedor; 2-4 sprints si integramos un proveedor. **Solo vale la pena si la escala lo justifica.** Hoy es sobre-ingeniería para el volumen actual.

### 3.10 Reabrir el concepto de "Super Admin" con potestad de confiscación

El plan original habla de un Super Admin que puede confiscar saldo a favor de la casa. Eso requiere:

- Rol `super_admin` en `profiles`.
- Acción RPC `confiscate_balance(user_id, reason)` que:
  - Verifica que el caller es `super_admin`.
  - Bloquea la wallet (`is_locked`).
  - Inserta una fila en `ledger` con `type: 'confiscation'`, `direction: 'debit'`, `metadata: { confiscation_reason, recipient: 'house' }`.
  - Crea registro en `admin_audit_log` con acción `SUPER_ADMIN_CONFISCATION`.
  - Muestra la confiscación en el histórico del jugador y en el ledger global.

**Coste estimado:** 1 sprint. Incluye modelar el `type: 'confiscation'` en ledger + UI para super admin + auditoría.

### 3.11 Telemetría de rendimiento de la detección

Lo que no se mide no se puede mejorar. Necesitamos métricas cómo:

- Falsos positivos del detector de colusión (cuántos pares detectados llevan a ban real).
- Latencia del cron (cuánto tarda en detectar tras el juego que disparó la alerta).
- Ratio de señales anti-cheat por jugador por hora.
- Distribución de severidades.

Publicarlas en el dashboard admin en una sub-ruta `/admin/anti-cheat/telemetry`. Reás que simple vista de counter.

**Coste estimado:** 2-3 días (dashboards de KPIs ya existentes).

---

## 4. Plan de ejecución priorizado

### Fase 1 (1-2 sprints) — "Cerrar el ciclo básico"

Objetivo: que lo que ya existe pase de "log y alerta" a "acción accionable".

1. **3.4 Strikethem y auto-ban temporal** — el `AntiCheatService` ya registra, ahora toma acciones.
2. **2.3 Lock de wallets** — añadir `is_locked` a wallets, negar retiros de wallets locked, UI para lock/unlock.
3. **3.3 Notificación proactiva al admin** — alerts criticals se notifican activamente.
4. **3.8 Rate limit por user en web** — sin nuevo esquema, solo copy-paste del patrón IP.

**Reversibilidad:** todo se controla por flags en settings (`risk_engine_enabled`, `auto_ban_enabled`, `wallet_lock_enabled`) para que se pueda apagar en producción sin deploy.

### Fase 2 (2-3 sprints) — "Deducción en tiempo real y vista consolidada"

5. **3.1 Página `/admin/fraud`** consolidada — ya hay bastante telemetría generada, ahora se consume.
6. **3.2 Score de riesgo por jugador** — para priorizar, no para automatizar.
7. **3.6 Multi-cuenta por IP + § 3.5 validación en matchmaker** — cubre más surface attack que el fingerprint.
8. **2.1 Bloqueo pre-juego por dispositivo compartido** — en el `MesaRoom.onAuth` usando datos que ya existen.

### Fase 3 (2-3 sprints) — "Chip dumping post-game analizis"

9. **3.7 Análisis post-game de chip dumping por heurística** — el primer paso hacia anti soft-play sin ML.
10. **2.2.1 Rastreo de flujo financiero cruzado** — RPC SQL sobre el ledger + `game_participants`.

### Fase 4 (no priorizar hasta tener volumen) — "ML + legal + KYC"

11. **2.2 ML de chip dumping en directo** —.RowStyle solo si el volumen de partidas justifica ML (millones de manos).
12. **3.10 Super Admin + confiscación** — requiere conversación legal + producto.
13. **3.9 KYC para mesas VIP** — si el movimiento real crece.
14. **2.3.3 Alerta escalable con potestad de confiscación** — depende de § 3.10.

---

## 5. Riesgos transversales

- **Falsos positivos**: los jugadores legítimos pueden ser kickeados sin querer. Es crítico en el strike-counter: el "fails open" del `AntiCheatService` actual debe mantenerse para rate-limit (mejor permitir que desconectar un juego), pero el strike counter debe ser conservador (los "critical" must exigir evidencia muy sólida).
- **Admin blindness**: el admin no puede revisar manualmente colusión en directo. El sistema anti-trampas es la única vía de detectar. Nunca debe pedir al admin "mira las cartas de A y B" — eso rompe la regla de oro.
- **Rendimiento del RPC de colusión**: currently threshold 10 + 7 días. Si la base crece, el `JOIN` entre `game_participants` p1 x p2 puede ser costoso. Hay que medir. Si tarda >5s, mover a nightly materialized view con refresh incremental.
- **Privacy del fingerprint de dispositivo**: capturar fingerprint exacto solo de navegador, no de datos personales. La RLS ya limita solo el admin a verlo. Validar con GDPR/ley de protección de datos colombiana si se escala a servicios externos.
- **Idempotencia**: bans auto deben tener `ban_id` único para no duplicar. Si un strike counter se incrementa dos veces por la misma señal (por retry de Redis), un jugador legítimo se va a ban. Usar `claim` + `seen` table.
- **Multi-cuenta por IP sin falsos**: familia misma casa, cyber café, WiFi público. No debe auto-banear. Solo marcar como flag amarillo.

---

## 6. Trabajo relacionado a revisar al implementar

Cualquier fase que se ejecute debe actualizar:

- `docs/admin/ADMIN_SECURITY.md` — políticas de bloqueo de wallets, auto-ban, confiscación.
- `docs/admin/ADMIN_TECHNICAL.md` — nuevas RPCs, tablas, server actions.
- `docs/admin/README.md` — cualquier página nueva en `/admin/fraud` o `super_admin`.
- Esta documentación — mover los puntos completados de "Falta" a "Hecho".

---

## 7. KPIs del propio sistema anti-trampas (para el dashboard `/admin/anti-cheat/telemetry`)

- **Detección rate (día):** pares de colusión detectados por día + señales anti-cheat por día.
- **Latencia de detección:** tiempo medio entre la partida y el alert de colusión.
- **Tiempo de respuesta del admin:** tiempo medio entre alerta generada y acción tomada (ban/disputa).
- **Ratio falsos positivos:** acciones tomadas contra jugadores con score que resultaron no ser fraude (requiere feedback loop, ver § 3.9 台).
- **Wallets locked count:** cuántas wallets están bloqueadas y por cuánto tiempo.
- **Auto-bans ejecut:** strikes auto-ban temporales ejecutados per día.
- **Score distribution:** distribución de risk scores de todos los jugadores (histograma).

---

## 8. Regla de mantenimiento de este documento

- Si se implementa cualquier fase, mover los items de la lista "Falta" a "Hecho" con commit hash referenciando la migración+PR.
- Si se descubre una nueva forma de trampa (no prevista aquí), añadirla en § 0 con su contexto antes de cualquier implementación.
- Si cambia la regla de admin blindness o el modelo de confiscación, revisar § 5.
- Si un proveedor KYC entra, añadir § de proveedores y dependency audit.

---

## 9. Resumen ejecutivo para founders/producto

| Frente | Estado hoy | Lo crítico en 1 sprint | ML/legal | Sugerencia |
|---|---|---|---|---|
| Multi-cuenta (dispositivo) | Detección post-hoc, no bloquea | Bloquear en `onAuth` del MesaRoom | No | **Hacer ya** |
| Colusión por emparejamiento | Cron cada 2h, no accionable | Lock de wallets + auto-kick | No | **Hacer ya** |
| Chip dumping / soft-play | No existe | RPC heurístico post-game | Sí (largo plazo) | Fase 3 |
| Ban real-time | Manual desde UI | Strike counter + auto-kick | No | **Hacer ya** |
| Vista consolidada de fraude | No existe (solo filtro de users) | Página `/admin/fraud` con tabs | No | Fase 2 |
| Score de riesgo | No existe | RPC con heurística simple | Sí (mejora modelaje) | Fase 2 |
| Confiscación de saldo | No existe | Requires rol + ledger | Sí (legal) | Fase 4 |