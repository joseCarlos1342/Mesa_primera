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

La experiencia del jugador vive dentro de un layout común con navegación inferior, soporte, notificaciones y presencia en línea.

### Navegación inferior

Las secciones visibles hoy son:

- `Inicio`.
- `Billetera`.
- `Estadísticas`.
- `Amigos`.
- `Reglas`.

### Qué ve el jugador en Inicio

El dashboard principal concentra las acciones de mayor uso:

- Saldo actual.
- Botón `Cargar Saldo`.
- Botón `Ir al Lobby`.
- Accesos rápidos a estadísticas y amigos.
- Actividad reciente.

La home debe entenderse como el centro operativo del jugador, no solo como una portada.

## 3. Billetera

La billetera es uno de los recorridos más importantes porque condiciona el acceso a las mesas.

### Qué ofrece la billetera

- Visualización del saldo.
- Acceso a `Retirar`.
- Acceso a `Transferir`.
- Packs rápidos de recarga.
- Entrada a historial completo.
- Detalle modal por transacción.

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

La pantalla de retiro pide monto y datos bancarios. La interfaz expone hoy estas reglas al jugador:

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

- Depósito.
- Retiro.
- Reembolso.
- Transferencia enviada.
- Transferencia recibida.
- Ajustes.

Los estados visibles para el jugador son:

- `Éxito`.
- `Procesando`.
- `Fallido`.

## 4. Soporte y ayuda

Mesa Primera distingue dos tipos de ayuda y conviene separarlos en la documentación audiovisual.

### Soporte general

En el layout del jugador existe un disparador de cabecera identificado como `Soporte con el Host`.

Desde allí el jugador puede:

- Abrir tickets.
- Ver historial de tickets.
- Seguir conversaciones en tiempo real.
- Adjuntar archivos.
- Cerrar tickets.

Estados del ticket hoy:

- `pending`.
- `attended`.
- `finalized`.

La sección `Reglas` también ofrece un CTA `Contactar` que abre el mismo soporte general.

### Llamar al admin dentro de la mesa

Dentro de la mesa existe un flujo separado para incidentes en vivo. Se abre desde el menú superior de la mesa con la opción `Llamar al Admin`.

Motivos disponibles hoy:

- `Disputa en la Mesa`.
- `Juego Desleal`.
- `Problema Técnico`.
- `Otro Motivo`.

Regla editorial útil para tutoriales:

- `Soporte con el Host` = dudas generales de cuenta, billetera o atención.
- `Llamar al Admin` = incidente puntual mientras la partida está abierta.

## 5. Reglas básicas visibles en la experiencia actual

La app expone reglas en dos lugares:

- La pestaña `Reglas` del layout del jugador.
- El modal `Reglas del Juego` dentro de la mesa.

Para tutoriales del flujo real de partida, hoy conviene priorizar el modal de mesa, porque describe el juego por fases.

### Fases que ve el jugador en el modal de mesa

1. `Sorteo de mano`.
2. `Pique`.
3. `Completar`.
4. `Apuesta de 4 cartas`.
5. `Descarte`.
6. `Reemplazo de descarte`.
7. `Carta del fondo`.
8. `Guerra`.
9. `Canticos` y `Declarar juego` cuando aplica.
10. `Showdown`.

### Jerarquías visibles en el reglamento rápido

El modal enumera esta jerarquía de referencia:

1. `Segunda`.
2. `Chivo`.
3. `Primera`.
4. `Mayor Puntaje`.

Además, la interfaz comunica criterios de fair play y una advertencia importante de reconexión.

## 6. Otras secciones útiles para el jugador

### Estadísticas

La sección `Estadísticas` consolida rendimiento, leaderboard y estado de bonus cuando aplica.

### Amigos

La sección `Amigos` sirve para:

- Ver contactos.
- Gestionar solicitudes.
- Agregar nuevos amigos.
- Chatear de forma directa.
- Ver presencia o disponibilidad.

### Repeticiones

La sección `Replays` aparece como `MIS GRABACIONES` y funciona como archivo de partidas o grabaciones disponibles para revisión.

### Salón de la Fama

La sección `Leaderboard` se presenta como `Salón de la Fama` con categorías competitivas visibles para el jugador.

### Perfil

Desde Perfil se editan:

- Username.
- Nombre completo.
- Teléfono.
- Avatar.
- Seguridad de acceso.

## 7. Del inicio al lobby

El acceso al lobby normalmente nace desde `Inicio` con el botón `Ir al Lobby`, aunque el jugador también termina llegando allí después de revisar saldo o explorar mesas.

### Qué ofrece el lobby

- Recordatorio del balance.
- Acceso rápido a recarga.
- Entrada a repeticiones.
- Lista de mesas disponibles.

### Qué ve el jugador en cada mesa

Las tarjetas de mesa muestran, como mínimo:

- Nombre de la mesa.
- Entrada requerida.
- Pique configurado.
- Capacidad máxima.

Valores de referencia confirmados para la configuración común por defecto:

- Entrada mínima común: `$50.000`.
- Pique mínimo común: `$5.000`.
- Capacidad máxima: `7 jugadores`.

Nota importante:

Los valores exactos pueden cambiar si la mesa fue creada con configuración personalizada. Por eso, el tutorial siempre debe enseñarle al jugador a leer la tarjeta de la mesa antes de entrar.

## 8. Requisitos para entrar a una mesa

### Saldo mínimo

La app valida el saldo antes de dejar entrar. En la configuración común actual, si el jugador tiene menos de `$50.000`, verá un mensaje de fondos insuficientes y un camino directo para recargar.

### Jugadores mínimos para iniciar

Reglas de arranque confirmadas en el room:

- Primera partida de la sesión: mínimo `3` jugadores listos.
- Partidas siguientes: mínimo `2` jugadores listos.

### Capacidad máxima

- Una mesa admite hasta `7` jugadores.

### Si el jugador entra con la partida comenzada

Cuando alguien entra fuera de `LOBBY`, no se incorpora de inmediato a la mano en curso. Queda marcado en espera y la UI le comunica que deberá aguardar la próxima partida.

## 9. Sala de espera dentro de la mesa

Una vez dentro de la ruta de juego, el jugador entra primero a la `Sala de Espera`.

### Elementos visibles en espera

- Contador de jugadores, por ejemplo `Jugadores: X / 7`.
- Indicador de `Pique Mínimo`.
- Estado de preparación.
- Botón `¡Estoy Listo!`.
- Botón `Anular Listo` si ya se marcó.
- Acceso a recarga cuando falta saldo.

### Permisos y orientación

La experiencia de mesa añade dos condiciones importantes:

- En móvil, la UI pide usar orientación horizontal para jugar.
- Puede aparecer un banner no bloqueante para conceder `Micrófono` y `Notificaciones`.

## 10. Acciones disponibles durante la partida

El encabezado de mesa concentra las acciones rápidas del jugador.

### Menú de mesa

Opciones visibles hoy:

- `Audio de Jugadores`.
- `Reglas del Juego`.
- `Llamar al Admin`.
- `Transferir Saldo`.
- `Pantalla Completa`.
- `Abandonar Partida`.

### Acceso rápido a recarga

En la esquina superior derecha existe un botón de carrito que abre la recarga sin salir de la mesa.

### Audio de jugadores

La mesa incorpora chat de voz. El jugador puede abrir su panel de audio desde el menú y activar o desactivar micrófono según permisos y contexto del navegador.

### Abandonar la partida

La salida de mesa tiene confirmación explícita y la UI advierte que abandonar en ese momento implica perder lo ya apostado en la mano.

## 11. Reconexion y continuidad

La experiencia actual opera con una ventana de reconexion de `120 segundos`.

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
- Reconexion disponible durante `120 segundos`.

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
