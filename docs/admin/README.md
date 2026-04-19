# Guía Operativa del Admin

Documento base para onboarding, operación diaria, soporte interno y futuros videos del panel administrativo de Mesa Primera. Esta guía describe el recorrido del administrador desde el acceso inicial hasta la supervisión operativa del sistema, apoyándose en la UI real y en los módulos actualmente disponibles.

**Complementos:** [ADMIN.md](ADMIN.md) · [ADMIN_SECURITY.md](ADMIN_SECURITY.md) · [ADMIN_TECHNICAL.md](ADMIN_TECHNICAL.md)

## Alcance

- Acceso privilegiado y MFA.
- Panel principal y lectura del estado operativo.
- Operación financiera: depósitos, retiros, ledger y rake.
- Gestión de usuarios, fraude y sanciones.
- Supervisión de mesas, alertas y espectado.
- Soporte, broadcast, reglamento y evidencia histórica.
- Límites reales del rol admin.

## Mapa rápido del recorrido admin

1. Ingresar con correo y contraseña.
2. Completar configuración o verificación TOTP.
3. Entrar al dashboard y leer salud operativa.
4. Atender caja: depósitos y retiros pendientes.
5. Revisar usuarios, fraude y ajustes de saldo.
6. Supervisar mesas activas y alertas en vivo.
7. Resolver soporte, disputas y comunicaciones masivas.
8. Auditar replays, logs y trazabilidad.

## 1. Qué es el rol admin en Mesa Primera

El administrador trabaja en una interfaz separada de la app del jugador. Su espacio es el panel bajo rutas `/admin/*`, con foco en:

- Operación financiera.
- Supervisión del juego.
- Moderación de cuentas.
- Atención de incidencias.
- Comunicación operativa.
- Trazabilidad y auditoría.

El admin no es un jugador con más botones. Es un operador de backoffice y supervisión con límites explícitos de seguridad.

## 2. Acceso al panel

### Ruta de entrada

- `/login/admin`

### Credenciales requeridas

La UI actual pide:

- Correo autorizado.
- Contraseña.

No se usa el mismo flujo de ingreso del jugador. El panel admin arranca con credenciales propias, no con teléfono ni OTP de jugador.

### Qué pasa después del login

El sistema distingue dos estados:

1. Admin sin TOTP configurado.
2. Admin con TOTP ya configurado.

Si el factor TOTP todavía no existe, el flujo redirige a:

- `/login/admin/mfa/setup`

Si el factor ya existe, redirige a:

- `/login/admin/mfa`

### Configuración inicial de 2FA

En la pantalla de setup el admin ve:

- Código QR para app autenticadora.
- Clave manual.
- Campo para ingresar el código de 6 dígitos.

La activación se completa cuando el código TOTP queda validado.

### Verificación 2FA en accesos posteriores

En accesos normales, el admin ingresa:

- Código de 6 dígitos.

La interfaz nombra explícitamente herramientas como:

- Google Authenticator.
- Authy.

### Reglas operativas del acceso admin

- El panel exige MFA.
- La sesión admin es de un solo dispositivo activo a la vez.
- Una nueva sesión invalida la sesión anterior.
- El acceso al panel requiere nivel de sesión elevado después de MFA.

## 3. Primer vistazo al panel

### Layout general

Una vez autenticado, el admin entra a un layout simple y utilitario:

- Marca superior `Admin` con acceso al dashboard.
- Acciones de cabecera.
- Área principal para cada módulo.

### Acciones de cabecera

Según la pantalla, el header muestra atajos contextuales:

- Botón `Broadcast` cuando el admin está en `/admin`.
- Botón de volver al libro mayor cuando está en `/admin/ledger/[userId]`.
- Botón de volver a broadcast cuando está en `/admin/broadcast/history`.
- Botón de cierre de sesión.

Esto convierte el header en una barra de acciones operativas, no en navegación decorativa.

## 4. Dashboard principal

### Ruta

- `/admin`

### Para qué sirve

Es la pantalla de control central. Resume el estado financiero, operativo y de riesgo antes de entrar en módulos específicos.

### Qué ve el admin

El dashboard actual expone indicadores como:

- Fichas en plataforma.
- Ganancias o rake.
- Mesas en curso.
- Alertas de fraude.
- Estado de bóveda.
- Estado del libro mayor.

### Tarjetas de estado clave

#### Bóveda

Resume cobertura financiera del sistema y compara:

- Depósitos.
- Retiros.
- Bóveda neta.

Estados visibles:

- `OPERATIVO`.
- `ALERTA`.
- `CRÍTICO`.
- `DESCONOCIDO`.

#### Libro Mayor

Compara:

- Neto del ledger.
- Suma de wallets.
- Diferencia entre ambos.

El estado ayuda a detectar drift financiero sin tener que abrir el ledger manualmente.

### Accesos rápidos del dashboard

El dashboard funciona también como hub de navegación hacia:

- `/admin/deposits`
- `/admin/withdrawals`
- `/admin/users`
- `/admin/ledger`
- `/admin/support`
- `/admin/alerts`
- `/admin/replays`
- `/admin/audit`
- `/admin/server-log`
- `/admin/consultas`
- `/admin/disputes`

### Cuándo usarlo

El dashboard es la primera parada cuando el admin:

- inicia turno,
- vuelve al panel después de una pausa,
- recibe una alerta externa,
- necesita saber si el problema es financiero, operativo o de soporte.

## 5. Caja y tesorería

La operación financiera diaria se concentra en cuatro áreas:

- Depósitos.
- Retiros.
- Ledger.
- Ganancias o rake.

## 6. Depósitos pendientes

### Ruta

- `/admin/deposits`

### Qué ve el admin

Cada solicitud muestra:

- Usuario.
- Fecha y hora.
- Saldo actual del jugador.
- Monto del depósito.
- Comprobante de pago.
- Observaciones del jugador.

### Acciones disponibles

- `Aprobar`.
- `Rechazar`.

### Cómo se usa bien

Antes de aprobar, el admin debería validar:

- Que el comprobante exista y sea legible.
- Que el monto coincida con la solicitud.
- Que el usuario correcto reciba la acreditación.
- Que no haya una observación del jugador que cambie el contexto.

### Señal visual importante

Si no hay trabajo pendiente, la pantalla queda vacía con el estado `Bandeja de entrada limpia`.

## 7. Retiros pendientes

### Ruta

- `/admin/withdrawals`

### Qué ve el admin

Cada retiro expone:

- Usuario.
- Fecha y hora.
- Saldo actual.
- Monto solicitado.
- Destino de transferencia o datos bancarios.

### Acciones disponibles

- Aprobar.
- Rechazar.

### Qué validar antes de aprobar

- Que el saldo del usuario cubra el retiro.
- Que el destino bancario tenga sentido y esté completo.
- Que no exista contexto de fraude, disputa o sanción que justifique frenar la salida.

## 8. Libro mayor

### Rutas

- `/admin/ledger`
- `/admin/ledger/[userId]`

### Qué representa

Es la fuente de verdad financiera. No es una vista auxiliar: es el historial trazable de créditos, débitos, rake, reembolsos y ajustes.

### Qué hace el admin en la vista global

- Revisar movimientos recientes.
- Filtrar por tipo.
- Detectar inconsistencias o patrones raros.
- Saltar al historial individual de un usuario.

### Qué hace el admin en la vista por usuario

- Ver saldo actual.
- Ver total de créditos.
- Ver total de débitos.
- Ver cantidad de operaciones.
- Revisar trazabilidad completa de esa cuenta.

### Regla importante

El ledger no es editable desde la operación normal. Se consulta, se audita y se usa como evidencia.

## 9. Ganancias y rake

### Ruta

- `/admin/ganancias`

### Para qué sirve

Centraliza la lectura económica del negocio por partidas y comisiones.

### Qué ve el admin

- Total de rake.
- Volumen asociado.
- Ganadores.
- Premios.
- Total apostado.
- Ganancia de la casa.

Es la pantalla indicada para responder preguntas del tipo:

- cuánto produjo la operación,
- qué tan activas estuvieron las mesas,
- qué partidas generaron más movimiento.

## 10. Directorio de usuarios

### Ruta

- `/admin/users`

### Qué ve el admin

El módulo de usuarios muestra:

- Nombre visible.
- Username.
- Teléfono.
- ID abreviado.
- Balance.
- Partidas jugadas.
- Último login.
- Estado de ban.
- Señales de multi-cuenta sospechosa.

### Herramientas disponibles

- Búsqueda.
- Ajuste de saldo.
- Ban o desban.

### Detección de fraude visible

La UI marca cuentas con dispositivos compartidos como sospecha de multi-cuenta. Este indicador no condena por sí solo, pero sí sirve para priorizar revisión.

### Cuándo abrir este módulo

- Para revisar identidad operativa del jugador.
- Para corregir saldo vía ajuste administrativo.
- Para banear o levantar una restricción.
- Para investigar comportamiento sospechoso antes de aprobar retiros o resolver disputas.

## 11. Consultas globales y disputas

### Rutas

- `/admin/consultas`
- `/admin/disputes`
- `/admin/disputes/[id]`

### Consultas globales

Este módulo funciona como búsqueda transversal. Es útil cuando el admin necesita encontrar rápidamente:

- usuario,
- UUID,
- entidad,
- referencia operativa,
- evidencia útil para abrir un caso.

### Disputas

El módulo de disputas sirve para formalizar casos de:

- fraude,
- conflicto financiero,
- revisión operativa,
- incidentes conectados con soporte o mesa.

En el detalle de una disputa el admin puede:

- revisar descripción,
- ver evidencia vinculada,
- relacionar ticket de soporte,
- ejecutar acciones de resolución o descarte,
- asignar seguimiento.

## 12. Control de mesas

### Ruta

- `/admin/tables`

### Qué cubre

Este módulo mezcla tres capas distintas:

- salas activas,
- auditoría financiera por mesa,
- gestión del catálogo de mesas.

### Salas en vivo

La sección `Salas en Vivo` muestra:

- room ID,
- estado,
- nombre,
- pote principal,
- pote pique,
- saldo mínimo de entrada,
- jugadores actuales,
- estado individual de cada jugador.

### Acciones sobre mesas en vivo

Según la configuración disponible, el admin puede:

- pausar,
- reanudar,
- supervisar,
- expulsar jugadores,
- limpiar juegos obsoletos,
- inspeccionar información de mesa.

### Ceguera administrativa

La UI avisa explícitamente `CEGUERA ADMIN ACTIVA`. Eso significa que el admin puede ver contexto operativo de la sala, pero no cartas privadas ni estado oculto del jugador.

### Auditoría financiera por mesa

La segunda sección del módulo permite leer:

- partidas por mesa,
- jugadores únicos,
- total apostado,
- premios,
- rake,
- última actividad.

### Gestión de mesas

También existe un bloque de gestión para la configuración del local, donde el admin puede:

- crear mesas,
- definir capacidad,
- configurar saldo mínimo de entrada,
- fijar pique mínimo,
- trabajar con categorías comunes o personalizadas,
- eliminar configuraciones cuando corresponda.

## 13. Supervisión y alertas en vivo

### Ruta principal

- `/admin/alerts`

### Ruta de espectado

- `/admin/spectate/[roomId]`

### Qué resuelve este módulo

Es la consola de incidentes en mesa. Une información de salas activas con solicitudes de ayuda en tiempo real.

### Qué ve el admin en alertas

- Conteo de `Pendientes`.
- Conteo de `Atendiendo`.
- Lista de mesas activas.
- Solicitudes de ayuda de jugadores.
- Motivo de la solicitud.
- Estado de la atención.
- Mensajes adicionales y notas del admin.

### Motivos de ayuda visibles hoy

- `Disputa`.
- `Juego Desleal`.
- `Técnico`.
- `Otro`.

### Estados visibles hoy

- `pending`.
- `attending`.
- `resolved`.
- `dismissed`.

### Acciones operativas más importantes

- Tomar una solicitud pendiente.
- Marcarla como atendida.
- Resolverla.
- Descartarla.
- Ir a supervisar la sala en vivo.

### Cuándo usar `spectate`

El espectado sirve para seguir la mesa como operador, no como jugador privilegiado. Debe usarse cuando hay:

- disputa en progreso,
- sospecha de juego desleal,
- problema técnico dentro de una sala,
- necesidad de correlacionar alerta con estado de la mesa.

## 14. Soporte técnico

### Ruta

- `/admin/support`

### Qué hace el módulo

Centraliza conversaciones de soporte con jugadores fuera del incidente puntual de mesa.

### Qué ve el admin

- Lista de tickets.
- Datos del usuario asociado.
- Conversación en tiempo real.
- Estado del servicio.

### Cuándo usar soporte en vez de alertas

- `Support` para dudas generales, problemas de cuenta, billetera o flujo.
- `Alerts` para incidentes en vivo dentro de una mesa.

## 15. Broadcast masivo

### Rutas

- `/admin/broadcast`
- `/admin/broadcast/history`

### Para qué sirve

Permite notificar masivamente a toda la base de usuarios desde el panel.

### Tipos de broadcast visibles hoy

- `Anuncio del Sistema`.
- `Mantenimiento`.
- `Promoción / Bono`.
- `Alerta de Seguridad`.

### Qué carga el admin

- Título.
- Cuerpo del mensaje.
- Tipo de notificación.

### Confirmación de envío

La UI exige confirmación porque el envío es masivo y no reversible. Al completarse, informa a cuántos dispositivos activos se notificó.

### Buen uso operativo

Abrir broadcast solo cuando el mensaje aplica a una audiencia global. Si la incidencia es individual, debe resolverse por soporte o acción administrativa directa.

## 16. Reglamento del local

### Ruta

- `/admin/rules`

### Para qué sirve

El admin edita el reglamento visible para los jugadores y normas públicas del sistema.

### Capacidades visibles hoy

- Editor en Markdown.
- Ayuda de formato.
- Persistencia con trazabilidad.

### Qué comunica la propia pantalla

- Se pueden editar reglas públicas.
- Se puede modificar contenido visible para jugadores.
- Las modificaciones quedan registradas en auditoría.

## 17. Repeticiones y evidencia histórica

### Rutas

- `/admin/replays`
- `/admin/replays/[gameId]`
- `/admin/render/[gameId]`

### Repeticiones

Este módulo muestra:

- total de partidas,
- rake total,
- jugadores únicos,
- lista de partidas,
- ganador,
- bote,
- rake por partida.

### Para qué sirve

- auditar partidas cerradas,
- revisar contexto de disputas,
- consultar histórico,
- reunir evidencia antes de sancionar o responder reclamos.

### Render

La ruta de render complementa replays cuando hace falta convertir evidencia de juego en material más fácil de revisar o compartir internamente.

## 18. Auditoría y logs

### Rutas

- `/admin/audit`
- `/admin/server-log`

### Auditoría

Es la traza de acciones administrativas. Se consulta cuando el equipo necesita responder:

- quién aprobó,
- quién rechazó,
- quién modificó,
- cuándo cambió una regla,
- qué hizo el panel sobre una entidad específica.

### Server log

El log del servidor sirve para leer eventos operativos del engine y del backend, y ayuda a diferenciar:

- error de negocio,
- error técnico,
- comportamiento esperado,
- degradación de servicio.

## 19. Límites reales del admin

El panel tiene mucho alcance, pero no es omnipotente. Estos límites son parte del diseño del sistema.

### El admin no puede

- ver cartas privadas de jugadores en partidas activas,
- saltarse el ledger para tocar balances de forma opaca,
- usar el login de jugador como login admin,
- omitir MFA para entrar al panel,
- transformar el panel en una vista de trampa dentro de la mesa,
- editar arbitrariamente el historial financiero como si fuera un spreadsheet.

### Qué significa esto en la práctica

Si hay un problema en vivo, el admin puede supervisar y decidir, pero no romper el modelo de seguridad para “ver más”. La operación debe resolverse con trazabilidad, no con privilegios invisibles.

## 20. Flujos recomendados de operación

### Apertura de turno

1. Abrir `/admin`.
2. Revisar bóveda y libro mayor.
3. Confirmar si hay depósitos o retiros pendientes.
4. Verificar alertas activas.
5. Confirmar si hay tickets de soporte sin respuesta.

### Flujo de depósito

1. Ir a `/admin/deposits`.
2. Revisar comprobante y monto.
3. Confirmar coherencia con usuario y contexto.
4. Aprobar o rechazar.
5. Si algo no cuadra, revisar `/admin/users` o `/admin/ledger/[userId]`.

### Flujo de retiro

1. Ir a `/admin/withdrawals`.
2. Revisar monto, saldo y destino bancario.
3. Confirmar que no exista señal de fraude o sanción pendiente.
4. Aprobar o rechazar.
5. Si hay dudas, cruzar con `/admin/users`, `/admin/ledger` o `/admin/disputes`.

### Flujo de incidente en mesa

1. Ir a `/admin/alerts`.
2. Identificar si la solicitud está `pending` o `attending`.
3. Tomar el caso.
4. Abrir `/admin/spectate/[roomId]` si hace falta ver el contexto operativo.
5. Resolver o descartar.
6. Si el caso escala, documentarlo en disputas.

### Flujo de fraude o multi-cuenta

1. Abrir `/admin/users`.
2. Buscar por nombre, teléfono o filtro de fraude.
3. Revisar dispositivos compartidos.
4. Cruzar información con ledger, disputas y replays.
5. Aplicar restricción o dejar evidencia para seguimiento.

## 21. Orden sugerido para videos o capacitación interna

1. Acceso admin y MFA.
2. Dashboard y lectura de salud operativa.
3. Depósitos y retiros.
4. Ledger y ganancias.
5. Usuarios, fraude y sanciones.
6. Mesas en vivo y alertas.
7. Soporte, disputas y broadcast.
8. Reglas, replays y auditoría.

## 22. Documentación complementaria

- [ADMIN.md](ADMIN.md): referencia funcional extensa de módulos admin.
- [ADMIN_SECURITY.md](ADMIN_SECURITY.md): restricciones, ceguera administrativa y superficie de seguridad.
- [ADMIN_TECHNICAL.md](ADMIN_TECHNICAL.md): rutas, server actions, RPCs y trazabilidad técnica.

## Regla de mantenimiento de esta guía

Actualizar este documento cuando cambien:

- los flujos de login o MFA,
- los KPIs del dashboard,
- los módulos disponibles en `/admin`,
- las acciones de supervisión en vivo,
- la operación financiera,
- las restricciones reales del rol admin.