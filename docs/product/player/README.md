# Guía del Jugador

Base documental para tutoriales, soporte y futuros videos del recorrido del jugador en Mesa Primera. Esta guía describe la interfaz actual desde el registro hasta la entrada a la mesa, y prioriza los flujos confirmados en la aplicación sobre supuestos de producto.

## Alcance

- Registro y acceso del jugador.
- Navegación principal de la app.
- Billetera: recarga, retiro, transferencias e historial.
- Soporte general y asistencia dentro de la mesa.
- Reglas básicas visibles hoy en la interfaz.
- Lobby, requisitos de entrada y acciones disponibles durante la partida.

## Mapa rápido del recorrido

1. Crear cuenta o iniciar sesión.
2. Configurar seguridad opcional.
3. Revisar saldo y navegación principal.
4. Cargar dinero si hace falta.
5. Entrar al lobby y elegir mesa.
6. Cumplir requisitos de entrada.
7. Marcarse como listo y comenzar.
8. Usar herramientas de mesa: audio, reglas, transferencias, recarga y llamada al admin.

## 1. Registro y acceso

### Registro del jugador

La pantalla de registro del jugador solicita hoy estos datos:

- Nombre completo.
- Apodo o nombre visible en mesa.
- Número de celular con prefijo Colombia `+57`.
- Avatar.
- Alternativa de alta con Google.

La intención del flujo es que el jugador quede listo para entrar rápido a la experiencia principal sin pasar por formularios extensos.

### Primer inicio de sesion

La pantalla de acceso del jugador contempla varias formas de entrada, según el estado de la cuenta:

- Celular + PIN de 6 digitos.
- Celular + OTP cuando la cuenta todavia no usa PIN.
- Google Sign-In.
- Inicio biometrico con passkey si el dispositivo ya fue registrado antes.

### Biometria y bloqueo de app

Después del registro existe una pantalla opcional para activar biometría. Además, desde Perfil el jugador puede gestionar:

- Biometria o passkey.
- Bloqueo de la app.
- Datos básicos del perfil.
- Cambio de teléfono con verificación OTP.

## 2. Inicio y navegación principal

La experiencia del jugador vive dentro de un layout común con cabecera, navegación inferior, soporte, notificaciones y presencia en línea. El diseño es móvil primero; en escritorio la barra inferior pasa a un riel lateral a la izquierda.

### Cabecera

- Avatar y alias del jugador: llevan al `Perfil`.
- Botón `Soporte`: abre el chat de soporte (muestra un punto dorado si hay mensaje nuevo).
- Botón `Notificaciones`: abre la lista de avisos con el número sin leer.
- Botón para activar notificaciones push, solo mientras el permiso del navegador no se ha decidido.

`Cerrar sesión` ya no está en la cabecera: vive al final del `Perfil` y pide confirmación.

### Navegación inferior

Las secciones visibles hoy son:

- `Inicio` (`/dashboard`).
- `Mesas` (`/lobby`).
- `Billetera` (`/wallet`, también marcada en depósito, retiro e historial).
- `Amigos` (`/friends`).
- `Perfil` (`/profile`, también marcada en `Estadísticas`).

La barra se oculta dentro de la mesa de juego (`/play/...`).

### Qué ve el jugador en Inicio

El dashboard principal concentra las acciones de mayor uso:

- Saldo actual sobre el paño verde.
- Botón principal `Jugar ahora` (lleva a `Mesas`).
- Botones `Cargar saldo` y `Retirar`.
- `Tu juego`: partidas, ganadas y racha, con enlace a `Estadísticas`.
- `Últimos movimientos` (tres) con enlace `Ver todo` al historial.

La home debe entenderse como el centro operativo del jugador, no solo como una portada.

## 3. Billetera

La billetera es uno de los recorridos más importantes porque condiciona el acceso a las mesas.

### Qué ofrece la billetera

- Visualización del saldo.
- Acción principal `Cargar saldo`.
- Acceso a `Retirar`.
- Acceso a `Transferir` (hoja en 4 pasos: buscar por celular, confirmar jugador, monto y revisión).
- `Carga rápida` con montos fijos y `Otro monto`.
- Entrada a `Historial` (con filtros `Todos`, `Cargas`, `Retiros`, `Transferencias`, `Otros`, agrupado por mes).
- Detalle de cada movimiento en una hoja inferior (fecha, canal, saldo después, referencia y comprobante).

### Recargar saldo

La UI actual permite recargar de dos formas:

- Packs rápidos de `$50.000`, `$100.000`, `$200.000` y `$500.000`.
- Monto manual.

En el formulario de recarga actual, la app muestra estas condiciones operativas:

- Destino de transferencia actual: Nequi `3125822841`.
- Monto mínimo: `$10.000 COP`.
- Monto máximo: `$50.000.000 COP`.
- Comprobante obligatorio.
- Formatos admitidos: JPG, PNG, WebP y GIF.
- Peso máximo del archivo: `5 MB`.
- Campo opcional de nota.

Cuando el envío sale bien, el mensaje de producto deja claro que la solicitud fue enviada y que la acreditación no es instantánea: se acredita después de validación.

### Retirar saldo

La pantalla de retiro pide monto y la cuenta donde se recibe el dinero (entidad, número y titular). Si la solicitud falla, el error se muestra en la misma pantalla. La interfaz expone hoy estas reglas al jugador:

- Tiempo estimado: `1 a 12 horas hábiles`.
- La cuenta o alias debe coincidir con el titular.
- No se procesan retiros a terceros.

Este flujo debe explicarse siempre como un proceso de solicitud, no como una salida inmediata de fondos.

### Transferir saldo

La transferencia existe en dos contextos:

- Desde la billetera.
- Desde la mesa de juego.

Reglas visibles hoy:

- Monto mínimo: `$1.000`.
- No puede exceder el saldo disponible.
- Requiere confirmación final.
- Se presenta como una acción irreversible.

### Historial y estados

El historial expone movimientos como:

- Carga de saldo.
- Retiro.
- Reembolso.
- Transferencia enviada.
- Transferencia recibida.
- Ajustes.

Los estados visibles para el jugador son:

- `Completado` (no se muestra etiqueta en la lista; solo en el detalle).
- `En revisión`.
- `Rechazado`.

## 4. Soporte y ayuda

Mesa Primera distingue dos tipos de ayuda y conviene separarlos en la documentación audiovisual.

### Soporte general

En la cabecera del jugador existe el botón `Soporte`; también se abre desde `Perfil` → `Ayuda` → `Hablar con soporte`. En móvil ocupa la pantalla completa y en escritorio es un panel lateral.

Desde allí el jugador puede:

- Abrir tickets.
- Ver historial de tickets.
- Seguir conversaciones en tiempo real.
- Adjuntar archivos.
- Cerrar tickets.
- `Reportar un problema` (carga no acreditada, transferencia no recibida, retiro no recibido, error en mesa u otro) y seguirlo en `Mis reclamos`.

Estados del ticket hoy:

- `pending`.
- `attended`.
- `finalized`.


### Llamar al admin dentro de la mesa

Dentro de la mesa existe un flujo separado para incidentes en vivo. Se abre desde el menú superior de la mesa con la opción `Llamar al Admin`.

Motivos disponibles hoy:

- `Disputa en la Mesa`.
- `Juego Desleal`.
- `Problema Técnico`.
- `Otro Motivo`.

Regla editorial útil para tutoriales:

- `Soporte` = dudas generales de cuenta, billetera o atención.
- `Llamar al Admin` = incidente puntual mientras la partida está abierta.

## 5. Reglas básicas visibles en la experiencia actual

La app expone reglas en dos lugares:

- `Perfil` → `Ayuda` → `Reglas del juego` (abre `/rules`).
- El modal `Reglas del Juego` dentro de la mesa.

El contenido canónico está versionado en `apps/web/src/lib/official-rulebook.ts` y se presenta completo en `/rules`. El modal de mesa es un resumen operativo coherente con esa misma fuente.

### Fases que ve el jugador en el modal de mesa

1. `Sorteo de mano` y reparto del `Pique`.
2. `Completar` y `Apuesta de 4 cartas`.
3. `Validación de juego` cuando todos hicieron check.
4. `Descarte`, `Reemplazo de descarte` y `Carta del fondo`.
5. `Guerra`, `Cánticos` y `Declarar juego` cuando aplica.
6. `Guerra de Juego` y `Showdown`.

### Jerarquías visibles en el reglamento rápido

El modal enumera esta jerarquía de referencia:

1. `Segunda`.
2. `Chivo`.
3. `Primera`.
4. `Puntos`.

La Mano recibe `+1` solo para el desempate. Si el empate continúa, se divide el pozo. La reconexión oficial es de `60 segundos`.

## 6. Otras secciones útiles para el jugador

### Estadísticas

La sección `Estadísticas` se abre desde `Inicio` y desde `Perfil`. Tiene dos pestañas: `Mis números` (partidas, porcentaje de victorias, racha, manos especiales Segunda/Chivo/Primera con sus cartas y `Bono del mes`) y `Ranking` (categorías `Partidas`, `Rachas`, `Especiales`, con la fila del jugador marcada como `Tú`).

### Amigos

La sección `Amigos` sirve para:

- Ver contactos con su estado en texto (`En línea`, `En partida`, `Desconectado`).
- Gestionar solicitudes (`Aceptar` / `Rechazar`).
- Agregar nuevos amigos con el botón `Agregar` (búsqueda por nombre, apodo o celular).
- Enviar `Mensaje` (chat a pantalla completa en móvil) e `Invitar` a jugar.
- Cambiar el apodo de un amigo.
- Eliminar un amigo, con confirmación.

### Repeticiones

La sección `Repeticiones` (`/replays`) se abre desde `Mesas`. Lista las mesas jugadas con fecha, horario, rivales, número de partidas y resultado neto, filtrables por `7 días`, `30 días`, `90 días`, `Todo` o un rango de fechas (`Elegir fechas`). Cada mesa abre sus partidas (`Ganaste` / `Perdiste`, bote y resultado) y cada partida abre el reproductor.

El reproductor usa **la misma mesa que la partida en vivo** (nogal, canto, paño, pozos y mazo salen del componente compartido `TableSurface`). Tiene barra para arrastrar a cualquier momento, paso anterior y siguiente, reproducir o pausar, velocidad `0.5x` a `4x` y pantalla completa. En un teléfono en horizontal la mesa ocupa toda la pantalla con controles flotantes. Debajo aparecen `Resumen`, `Manos finales` con las cartas reales y la `Línea de tiempo`.

Las cartas privadas de los demás jugadores solo se muestran si se revelaron en la partida.

### Salón de la Fama

La sección `Leaderboard` se presenta como `Salón de la Fama` con categorías competitivas visibles para el jugador.

### Perfil

Desde Perfil se editan:

- Username.
- Nombre completo.
- Teléfono (cambiarlo exige un código SMS).
- Avatar.
- Seguridad de acceso (bloqueo con huella o rostro).

Además muestra `Tu juego` con enlace a `Estadísticas`, la sección `Ayuda` (soporte, reglas, términos y privacidad) y `Cerrar sesión` al final.

## 7. Del inicio al lobby

El acceso al lobby nace desde la pestaña `Mesas` o desde `Inicio` con el botón `Jugar ahora`, aunque el jugador también termina llegando allí después de revisar saldo o explorar mesas.

### Qué ofrece el lobby

- Estado real de la conexión con el servidor de juego: punto verde `Mesas en línea` con los contadores de mesas, mesas en juego y jugadores; dorado `Conectando con las mesas…`; rojo `Sin conexión con las mesas` con botón `Reintentar` (también reintenta solo cada 8 segundos). Sin conexión, los botones de las mesas quedan deshabilitados.
- Saldo con `Cargar saldo` (abre la misma hoja de carga de la Billetera sin salir del lobby) y acceso a `Repeticiones`.
- `Mesas del club` y, si existen, `Otras mesas` (personalizadas o abiertas por el admin).
- Para el admin: `Nueva mesa`, `Mesa personalizada` y `Cerrar` en cada mesa abierta, con confirmación.

### Qué ve el jugador en cada mesa

Cada mesa se muestra sobre paño con:

- Nombre de la mesa y estado: `Libre`, `Con jugadores` o `Llena`.
- `Entrada`, `Pique` y `Jugadores` ocupados sobre la capacidad (por ejemplo `3/7`), con una barra de puestos.
- Un único botón: `Abrir mesa` (nadie sentado), `Entrar` (ya hay jugadores) o `Mesa llena`.

Valores de referencia confirmados para la configuración común por defecto:

- Entrada mínima común: `$50.000`.
- Pique mínimo común: `$5.000`.
- Capacidad máxima: `7 jugadores`.

Nota importante:

Los valores exactos pueden cambiar si la mesa fue creada con configuración personalizada. Por eso, el tutorial siempre debe enseñarle al jugador a leer la tarjeta de la mesa antes de entrar.

## 8. Requisitos para entrar a una mesa

### Saldo mínimo

La app valida el saldo antes de dejar entrar. Si no alcanza la entrada de la mesa (en la configuración común, `$50.000`), aparece el aviso `Necesitas al menos $X de saldo para entrar a <mesa>…` y se abre la hoja de `Cargar saldo`. Si el servidor rechaza la entrada (por ejemplo, por una sanción), el lobby muestra su motivo.

### Jugadores mínimos para iniciar

Reglas de arranque confirmadas en el room:

- Primera partida de la sesión: mínimo `3` jugadores listos.
- Partidas siguientes: mínimo `2` jugadores listos.

### Capacidad máxima

- Una mesa admite hasta `7` jugadores.

### Si el jugador entra con la partida comenzada

Cuando alguien entra fuera de `LOBBY`, no se incorpora de inmediato a la mano en curso. Queda marcado en espera y la UI le comunica que deberá aguardar la próxima partida.

## 9. Sala de espera dentro de la mesa

Una vez dentro de la ruta de juego, el jugador entra primero a la `Sala de espera`, dibujada sobre la misma mesa (nogal y paño). En un teléfono en horizontal entra completa sin desplazarse.

### Elementos visibles en espera

- Contador de jugadores, por ejemplo `Jugadores 2/7`.
- `Pique mínimo` con la banda por jugador, `Proponer otro pique` y la votación (`Aceptar` / `Rechazar`, votos a favor y en contra).
- Lista de jugadores con avatar, saldo y estado escrito: `Listo` o `No listo`, más `Puesto libre` hasta completar el mínimo.
- Botón `Estoy listo` (o `Ya no estoy listo` si ya se marcó).
- Mensajes de estado: `Falta 1 jugador para empezar…`, `Listos X de Y…` y la cuenta regresiva `La partida empieza en N`.
- Aviso de saldo insuficiente con `Cargar saldo`.

### Permisos y orientación

La experiencia de mesa añade dos condiciones importantes:

- En móvil, la UI pide usar orientación horizontal para jugar (`Gira tu teléfono`).
- Puede aparecer el aviso no bloqueante `Activa la voz y los avisos` con el botón `Permitir` para `Micrófono` y `Notificaciones`.
- Si el navegador pausa el audio, aparece `Activa el sonido de la mesa`.

## 10. Acciones disponibles durante la partida

El encabezado de mesa concentra las acciones rápidas del jugador.

### Menú de mesa

Opciones visibles hoy:

Se abre con el botón `Opciones de la mesa` (arriba a la izquierda, en sala de espera y en partida):

- `Audio de jugadores`.
- `Reglas del juego`.
- `Llamar al admin`.
- `Transferir saldo`.
- `Cargar saldo`.
- `Pantalla completa`.
- `Abandonar partida`.

### Acceso rápido a recarga

En la esquina superior derecha existe un botón de carrito que abre la recarga sin salir de la mesa.

### Audio de jugadores

La mesa incorpora chat de voz. Desde `Audio de jugadores` cada jugador puede silenciar a otros solo para sí. Si el micrófono no está disponible, el aviso aparece junto al botón del micrófono (no como alerta del navegador).

### Abandonar la partida

La salida de mesa pide confirmación (`¿Abandonar la mesa?` → `Sí, salir`) y advierte que lo ya apostado se queda en la mesa. Al salir, el jugador vuelve a `Mesas`.

### Confirmaciones y avisos

Todas las confirmaciones del jugador (cerrar sesión, abandonar la mesa, eliminar amigo, cerrar mesa en el lobby) usan la misma hoja de la app: sube desde abajo en móvil y aparece centrada en pantallas grandes, con `Cancelar` y la acción en rojo. La app ya no usa ventanas nativas del navegador (`alert` / `confirm`) en la zona del jugador. Si otra persona inicia sesión con la misma cuenta, la mesa se cierra y el login muestra el aviso de sesión iniciada en otro dispositivo.

## 11. Reconexion y continuidad

La experiencia actual opera con una ventana de reconexión de `60 segundos`.

Si el jugador pierde conexión:

- La app intenta preservar la sesión de la mesa.
- Puede regresar usando el mismo enlace o la misma sesion.
- Si no vuelve a tiempo, la sala aplica el flujo de expiracion correspondiente y el jugador pierde proteccion de reconexion.

## 12. Datos operativos confirmados hoy

Resumen corto para tutoriales, soporte y material audiovisual:

- Registro con nombre, apodo, celular `+57`, avatar y opción Google.
- Login con PIN, OTP, Google o biometria si ya fue configurada.
- Saldo mínimo común para entrar a mesa: `$50.000`.
- Pique mínimo común por defecto: `$5.000`.
- Capacidad máxima por mesa: `7 jugadores`.
- Inicio de primera partida con `3` listos; luego con `2`.
- Recarga manual entre `$10.000` y `$50.000.000`.
- Transferencia mínima visible: `$1.000`.
- Reconexión disponible durante `60 segundos`.

## 13. Orden sugerido para futuros videos

1. Registro y primer acceso.
2. Cómo funciona Inicio y la navegación inferior.
3. Cómo recargar saldo correctamente.
4. Cómo retirar y entender los tiempos de procesamiento.
5. Cómo usar soporte y cuándo llamar al admin.
6. Cómo leer el lobby y elegir mesa.
7. Qué necesita un jugador para entrar y arrancar una partida.
8. Qué acciones tiene disponibles dentro de la mesa.

## Regla de mantenimiento de esta guía

Actualizar este documento cada vez que cambien:

- Los requisitos de entrada a mesa.
- Los montos mínimos o máximos visibles al jugador.
- La navegación inferior.
- Los flujos de soporte.
- Las acciones disponibles dentro de la mesa.
