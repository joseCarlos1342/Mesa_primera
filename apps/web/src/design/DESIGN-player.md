---
version: alpha
name: Mesa Primera — Player
description: Identidad visual de la interfaz para jugadores. Estilo casino premium inspirado en mesas de póker clásicas, con accesibilidad priorizada para personas mayores.
colors:
  background: "#0a0a0a"
  surface: "#1a1a2e"
  surface-card: "#16213e"
  surface-poker: "#1b4d3e"
  surface-felt: "#0a2a1f"
  surface-leather: "#0a2c20"
  surface-wood: "#120806"
  surface-wood-rim: "#35180f"
  surface-felt-highlight: "#45996c"
  primary: "#e2b044"
  primary-dark: "#8b6b2e"
  primary-light: "#f0d78c"
  primary-muted: "#c5a059"
  text-primary: "#f3edd7"
  text-secondary: "#a0a0b0"
  text-on-primary: "#0a0a0a"
  border-brass: "#8b6b2e"
  border-gold: "#c5a059"
  text-muted-warm: "#bdb7a6"
  text-body-warm: "#d9d3bf"
  success: "#2ecc71"
  danger: "#e74c3c"
  overlay-black: "#000000"
typography:
  display:
    fontFamily: Alegreya
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0.05em
  headline-lg:
    fontFamily: Source Sans 3
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Source Sans 3
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
  headline-sm:
    fontFamily: Source Sans 3
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.3
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  label-lg:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.1em
  label-md:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.1em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 16px
  3xl: 24px
  full: 9999px
  pill: 9999px
  card: 24px
  button: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  section: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-on-primary}"
    rounded: "{rounded.button}"
    padding: 12px 24px
    typography: "{typography.label-lg}"
  button-primary-hover:
    backgroundColor: "{colors.primary-light}"
  button-primary-active:
    backgroundColor: "{colors.primary-dark}"
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary}"
    rounded: "{rounded.button}"
    padding: 12px 24px
    typography: "{typography.label-lg}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.background}"
    rounded: "{rounded.button}"
    padding: 12px 24px
    typography: "{typography.label-lg}"
  game-table:
    backgroundColor: "{colors.surface-poker}"
  game-felt:
    backgroundColor: "{colors.surface-felt}"
  game-leather-surface:
    backgroundColor: "{colors.surface-leather}"
  game-felt-highlight:
    backgroundColor: "{colors.surface-felt-highlight}"
  game-wood-base:
    backgroundColor: "{colors.surface-wood}"
  game-wood-rim:
    backgroundColor: "{colors.surface-wood-rim}"
  chip-casino-plate:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 4px 8px
    typography: "{typography.label-md}"
  betting-display-panel:
    backgroundColor: "{colors.surface-wood}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: 8px
    typography: "{typography.body-md}"
  player-console:
    backgroundColor: "{colors.surface-wood}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: 8px 16px
    typography: "{typography.body-md}"
  label-muted:
    textColor: "{colors.primary-muted}"
    typography: "{typography.label-sm}"
  caption:
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
  divider-brass:
    backgroundColor: "{colors.border-brass}"
    height: 1px
  divider-gold:
    backgroundColor: "{colors.border-gold}"
    height: 1px
  balance-panel:
    backgroundColor: "{colors.surface-leather}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: 28px 24px
    typography: "{typography.body-lg}"
  sheet:
    backgroundColor: "{colors.surface-wood}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: 20px
    typography: "{typography.body-lg}"
  list-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 12px 0px
    typography: "{typography.body-lg}"
  header:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: 12px 20px
    typography: "{typography.body-lg}"
  input:
    backgroundColor: "{colors.surface-wood}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 16px
    typography: "{typography.body-lg}"
  input-focus:
    backgroundColor: "{colors.surface-wood}"
  avatar:
    backgroundColor: "{colors.surface-leather}"
    textColor: "{colors.primary-light}"
    rounded: "{rounded.full}"
    size: 44px
    typography: "{typography.headline-sm}"
  bottom-nav:
    backgroundColor: "{colors.surface-wood}"
    textColor: "{colors.text-muted-warm}"
    rounded: "{rounded.none}"
    padding: 8px 4px
    typography: "{typography.body-sm}"
  bottom-nav-active:
    textColor: "{colors.primary-light}"
  sheet-backdrop:
    backgroundColor: "{colors.overlay-black}"
  page-lead:
    textColor: "{colors.text-body-warm}"
    typography: "{typography.body-lg}"
  money-credit:
    textColor: "{colors.success}"
    typography: "{typography.body-lg}"
---

## Overview

La interfaz de jugadores de **Mesa Primera** evoca la experiencia de un club tradicional de cartas latinoamericano combinada con tecnología moderna. El diseño prioriza:

- **Accesibilidad**: La base tipográfica es de 18px para facilitar la lectura a personas mayores, nuestro público principal.
- **Lujo sutil**: Tonos oscuros profundos, acentos dorados/bronce y materiales de nogal y cuero verde que rememoran un club clásico.
- **Inmersión**: Fondos con gradientes radiales y ruido texturizado que crean profundidad sin distracciones.
- **Contraste**: Texto crema (#f3edd7) sobre fondos oscuros para máxima legibilidad.

## Colors

La paleta está inspirada en los materiales de un casino tradicional:

- **Background (#0a0a0a):** Negro profundo para crear inmersión y enmarcar el contenido.
- **Surface (#1a1a2e):** Azul oscuro casi negro para tarjetas y contenedores principales.
- **Surface Card (#16213e):** Azul medianoche para tarjetas secundarias y paneles.
- **Surface Poker (#1b4d3e):** Verde bosque para elementos relacionados con el juego (mesas, fondos de juego).
- **Surface Felt (#0a2a1f):** Verde fieltro oscuro para texturas de mesa.
- **Surface Leather (#0a2c20):** Verde botella mate para la superficie principal de la mesa, con grano orgánico.
- **Surface Wood (#120806):** Nogal profundo para el perímetro y la base física de la mesa.
- **Surface Wood Rim (#35180f):** Nogal rojizo para el canto elevado y sus sombras.
- **Surface Felt Highlight (#45996c):** Verde medio usado únicamente como luz radial sobre el fieltro.
- **Primary (#e2b044):** Dorado/bronce premium. El color de interacción principal: botones, acentos, bordes.
- **Primary Dark (#8b6b2e):** Bronce oscuro para estados activos, bordes y sombras.
- **Primary Light (#f0d78c):** Dorado claro para hovers y destellos.
- **Primary Muted (#c5a059):** Dorado apagado para bordes sutiles y elementos secundarios.
- **Text Primary (#f3edd7):** Crema cálida para todo el texto principal. Más suave que el blanco puro.
- **Text Secondary (#a0a0b0):** Gris púrpura para captions, metadata y texto deshabilitado.
- **Text on Primary (#0a0a0a):** Negro para texto sobre fondos dorados.
- **Border Brass (#8b6b2e):** Bronce para bordes decorativos.
- **Border Gold (#c5a059):** Dorado para bordes de tarjetas premium.
- **Success (#2ecc71):** Verde esmeralda para confirmaciones y estados positivos.
- **Danger (#e74c3c):** Rojo coral para errores y acciones destructivas.

## Typography

La estrategia tipográfica usa dos familias de comunicación y una familia de datos:

- **Alegreya (Marca/display):** Serif editorial cálida para marca, hero y encabezados premium. Sus cursivas reales permiten expresar tradición sin deformaciones sintéticas.
- **Source Sans 3 (UI):** Sans humanista para cuerpo, labels, formularios y controles. Mantiene claridad en móvil y deja que Alegreya aporte personalidad.
- **Geist Mono (Datos):** Monoespaciada exclusiva para saldos, apuestas, IDs, timestamps y auditoría.

Landing y player usan una base de lectura de 18px para accesibilidad. El admin conserva la base de 16px para evitar que la densidad operativa se amplíe accidentalmente.

## Layout

El layout usa un modelo fluido en móvil y un contenedor máximo de 7xl (80rem / 1280px) en desktop.

- **Spacing scale:** Basado en 8px con medio paso de 4px para micro-ajustes.
- **Grid:** CSS Grid y Flexbox según el contexto. Las tarjetas usan grid de 2-4 columnas.
- **Safe areas:** Se respetan las áreas seguras del dispositivo (env(safe-area-inset-*)) para evitar notch y barras del sistema.
- **Padding global:** 12px en móvil, 32px en desktop.

## Elevation & Depth

La profundidad se logra mediante **capas tonales y sombras** en lugar de sombras planas:

- **Fondo base:** Negro profundo con gradiente radial verde póker.
- **Base de mesa:** Nogal oscuro con vetas longitudinales muy sutiles y un canto elevado que enmarca el cuero.
- **Superficie:** Cuero verde botella en forma ovalada, iluminado en el centro y oscurecido en los bordes mediante gradientes radiales, poros y ruido local.
- **Capa de ruido:** Textura SVG de ruido fractal al 3% de opacidad para simular fieltro.
- **Capa de viñeta:** Degradado radial negro al 40% en los bordes para enmarcar el contenido.
- **Sombras:** `0 10px 30px rgba(0,0,0,0.6)` para tarjetas premium; `0 10px 30px rgba(0,0,0,0.5)` para header.
- **Backdrop blur:** no se usa en la app del jugador; la cabecera es negra al 95%.

## Shapes

El lenguaje de formas combina lo clásico con lo moderno:

- **Botones y inputs:** Radio mínimo de 8px (rounded-button) para suavidad moderna.
- **Avatares y badges:** Completamente redondos (pill/full).
- **Tarjetas:** Radio grande de 24px (rounded-card) para un aspecto premium y acogedor.
- **Header:** Sin radio, borde inferior sutil.

## Components

### Buttons

- **Primary:** Fondo dorado (#e2b044), texto negro, alto mínimo 56px, radio 8px. Hover: dorado claro (#f0d78c). Active: bronce oscuro (#8b6b2e). Uno por pantalla.
- **Secondary:** Fondo transparente, borde de latón (#8b6b2e), texto crema. Hover: borde y texto dorados.
- **Danger:** Borde rojo coral con texto rosado para "Cerrar sesión"; la confirmación final ("Sí, salir", "Sí, eliminar") usa relleno rojo coral con texto negro.
- No se usan degradados con brillo (shimmer), bordes 3D (`inset 0 -8px 0`) ni `active:scale`.

### Cards

- La app del jugador no usa tarjetas de cristal ni azul medianoche: las listas son filas separadas por filetes de latón (ver "App del jugador").
- `surface` (#1a1a2e) y `surface-card` (#16213e) quedan solo para la mesa de juego y el lobby mientras no se rediseñen.

### Landing pública ("La baraja abierta")

- **Superficie de mesa:** paño de cuero (`surface-leather` → `surface-felt`, luz `surface-felt-highlight`) dentro de un canto de nogal (`surface-wood-rim`/`surface-wood`) dibujado con sombras internas. Se usa en el hero/tablero y en el cierre; el resto alterna negro (`background`) y nogal.
- **PlayingCard:** cartas reales de `public/cards` vía `next/image`, sombra física con offset, reparto con volteo CSS 3D solo al cargar (desactivado con `prefers-reduced-motion`). El reverso es `public/cards/dorso.svg` (vectorial, el mismo de la mesa).
- **Tablero que enseña:** rejilla 4 palos × 7 valores; al leer cada mano se atenúa la baraja y se ilumina la combinación con anillo dorado. Valores en Geist Mono.
- **Separadores:** filetes de latón de 1px (`border-brass`) en lugar de tarjetas; las listas (pasos, servicios, FAQ) son filas con regla, no cajas.

### Autenticación de jugador (login, registro, códigos, recuperación)

Extiende "La baraja abierta" al auth (`src/components/auth/`). Sin tarjetas de cristal, botones 3D con brillo ni texto degradado.

- **AuthShell (composición dividida):** `PageNav` arriba; en desktop, panel izquierdo de paño (`surface-leather`) con canto de nogal, abanico de los 4 ases, titular Alegreya con acento en cursiva `primary-light` y dirección del club; a la derecha el formulario sobre `background` en una columna de 30rem (38rem si hay dos columnas y avatares). En móvil el panel se vuelve una cabecera corta con el abanico pequeño y el titular. Un único `h1` por pantalla, en el formulario.
- **Movimiento:** el reparto con volteo de las cartas solo ocurre en `/login/player` y `/register/player`; los pasos siguientes muestran las cartas quietas. Con `prefers-reduced-motion` no hay animación.
- **AuthStepper:** "Paso X de N" en `primary-muted` con números en Geist Mono y un filete por paso (hecho `primary`, actual `primary-light`, pendiente `border-brass` al 40%). Registro: Tus datos → Código → Clave → Huella (celular y Google). Recuperación: Celular → Código → Nueva clave.
- **AuthField:** label visible de 16px, campo de 56px sobre `surface-wood` con borde `border-brass`; foco dorado, error `danger`, válido `success` con icono. El prefijo `+57` y el celular van en Geist Mono. Ayuda y error enlazados con `aria-describedby`; el error se anuncia con `role="alert"`.
- **CodeInput:** seis casillas de 64–72px en Geist Mono para código SMS y clave (`masked` las oculta). Pegado y autocompletar del SMS (`one-time-code`), retroceso y flechas; el valor viaja en un `input hidden` con el `name` que espera la server action.
- **Botones:** primario `button-primary` de 56px (uno por pantalla); secundario con borde de latón para "Entrar con huella", Google y "Ahora no". Las acciones de la barra superior usan la variante discreta para no competir con el dorado del formulario.
- **Avisos:** error con borde `danger` sobre nogal rojizo; aviso informativo sobre `surface-leather` con borde de latón (`role="status"`).

### App del jugador (después de iniciar sesión)

Extiende "La baraja abierta" a la zona `(player)` (`src/components/player/`). Modo de uso diario: legibilidad y acciones claras antes que efectos. Móvil primero; en escritorio se conserva la misma jerarquía.

- **Marco:** fondo `background` liso, sin degradados radiales ni ruido. `PlayerHeader` fijo sobre negro al 95% con filete de latón inferior: avatar + alias (lleva a Perfil), `Soporte` y `Notificaciones` como botones de 48px con borde de latón; con avisos pendientes pasan a `surface-leather` con borde dorado y contador en Geist Mono. Sin "Salir" en la cabecera.
- **Navegación (`BottomNav`):** cinco pestañas `Inicio · Mesas · Billetera · Amigos · Perfil` sobre nogal (`landing.wood`) con filete de latón superior, 68px de alto más `safe-area-inset-bottom`. Activa: icono `primary`, texto `primary-light` y una lengüeta dorada de 3px arriba; inactiva: `text-muted-warm`. La pestaña activa se resuelve por prefijo (`/wallet/*` → Billetera, `/stats` → Perfil). Desde `lg` se vuelve un riel lateral de 112px con el logo arriba. Se oculta en `/play/`.
- **BalancePanel:** la única superficie de mesa de la app: paño (`landing.felt`) con canto de nogal (`landing.rim`), etiqueta "Tu saldo" y monto en Geist Mono (44–64px) con el `$` en `primary-muted`. Debajo, una acción primaria y dos secundarias.
- **PageHeader:** título Alegreya 34px (44px en `lg`), bajada de 18px en `text-body-warm` y, si aplica, enlace "volver" y una acción a la derecha. Un `h1` por pantalla.
- **Section:** título Alegreya 24px con filete de latón y enlace dorado subrayado a la derecha ("Ver todo", "Estadísticas"). Sin caja alrededor.
- **ListRow / TransactionRow:** fila de 72px mínimo, icono en casilla de 44px (`credit` verde sobre cuero, `debit` crema sobre nogal, `danger` coral), título de 18px, dato secundario de 16px en `text-muted-warm`, monto en Geist Mono a la derecha (`+` verde para créditos, `−` crema para débitos). Las filas completadas no llevan etiqueta; `En revisión` y `Rechazado` sí (`StatusTag`).
- **Cifras:** métricas en Geist Mono de 28–36px con etiqueta encima y filete de latón a la izquierda o separadores verticales; nada de tarjetas de colores por métrica.
- **PlayerSheet:** toda ventana es una hoja de nogal: en móvil sube desde abajo con asa y esquinas de 16px, en escritorio es un diálogo centrado; la variante `full` (chats, soporte) ocupa la pantalla en móvil y es un panel derecho de 448px en escritorio. `role="dialog"`, foco atrapado, Escape y toque en el fondo cierran, devuelve el foco y respeta las safe areas. Acciones fijas en el pie.
- **Pestañas:** `SegmentedTabs` (48px, `role="tablist"`, flechas): activa sobre `surface-leather` con anillo dorado. Filtros (`aria-pressed`) como píldoras de 44px.
- **Formularios:** se reutilizan `AuthField`, `CodeInput`, `AuthButton` y `AuthAlert` del auth; `TextareaField` sigue el mismo lenguaje. Los errores de servidor se muestran en la pantalla, no con `alert()`.
- **Estados:** carga con esqueletos de nogal (sin girar), vacíos con icono en círculo de latón, título Alegreya y una acción que enseña qué hacer. La presencia de amigos se dice en texto (`En línea`, `En partida`, `Desconectado`) además del punto de color.
- **Avisos:** `Toast` y `PWAInstallPrompt` sobre nogal con borde de latón (verde o coral según el tono) por encima de la barra; `BroadcastBanner` igual, arriba, con la etiqueta del tipo en color y sin brillo animado.
- **Movimiento:** solo transiciones de 150–260ms en hojas y estados; con `prefers-reduced-motion` todo queda quieto (incluido el confeti del bono).
- **Tipografía:** nada funcional por debajo de 14px; cuerpo de 18px; sin `font-black`, cursivas forzadas ni mayúsculas con tracking extremo.

### Mesas, sala de espera y repeticiones

- **Una sola mesa:** la superficie (nogal, canto, paño, filete) y el centro (pozos `Apuesta Principal` / `Apuesta Pique` con el mazo y la carta del fondo) viven en `src/components/game/TableSurface.tsx` (`TableSurface`, `TablePots`). Los usan la partida (`Board`), la repetición (`ReplayBoard`), la sala de espera y las pantallas de carga y error de `/play`. No se dibuja otra mesa.
- **Lobby:** `PageHeader` "Mesas", barra de estado con punto de 12px (verde `success` en línea, dorado conectando, rojo `danger` sin conexión + `Reintentar`) y contadores en Geist Mono. Cada mesa es una tarjeta de paño con canto (`landing.felt` + `landing.rim`): nombre Alegreya 30px, etiqueta de estado (`Libre`, `Con jugadores`, `Llena`), tres datos en mono (Entrada, Pique, Jugadores), barra de puestos dorada y un único botón de 56px.
- **Sala de espera:** panel de nogal con canto de latón sobre `TableSurface`; dos columnas en horizontal (pique y acción | jugadores). Estado escrito de cada jugador (`Listo` / `No listo`), `Estoy listo` como único dorado, votación de pique con botones de borde verde/coral. Con alturas ≤ 480px se compactan espacios para caber en 844×390.
- **Menú de la mesa:** botón cuadrado de 44–48px en nogal translúcido con borde de latón; menú (`role="menu"`) de nogal con filas de 48px, iconos `primary-muted` y "Abandonar partida" en coral al final.
- **Repeticiones:** listas con `ListRow` (resultado con `Money`), periodo en píldoras y fechas en `<details>`. Reproductor: `ReplayBoard` + barra de controles de nogal (rango arrastrable con `accent-color` dorado, botones de 48px, velocidad segmentada). En teléfonos horizontales (≤ 500px de alto) pasa a modo inmersivo con controles flotantes.
- **Confirmaciones:** `ConfirmDialog` (sobre `PlayerSheet`) sustituye a `alert`/`confirm`. Acciones destructivas: `Cancelar` secundario con el foco inicial y confirmación `dangerSolid`. Avisos del sistema (micrófono, audio pausado, bloqueo de la app) siguen el mismo nogal, latón y Alegreya.
- **Legales:** `/terms` y `/privacy` usan `PageNav`, cabecera de paño con título Alegreya (acento en cursiva `primary-light`), columna de lectura de 48rem a 18px y `LandingFooter`. Viñetas como puntos de latón y prohibiciones con icono X coral.

## Do's and Don'ts

- **Do** usar dorado (#e2b044) solo para acciones primarias y acentos. Un máximo de 2-3 elementos dorados por pantalla.
- **Do** usar Alegreya solo en marca, titulares y momentos narrativos; Source Sans 3 en controles y lectura.
- **Do** usar Geist Mono para datos alineados y `tabular-nums` en saldos, apuestas y estadísticas.
- **Don't** usar blanco puro (#ffffff) para texto. Siempre usar crema (#f3edd7) o gris secundario (#a0a0b0).
- **Don't** usar textos funcionales por debajo de 11px; la navegación y las acciones deben preferir 12px o más.
- **Don't** usar `font-black` o tracking extremo como sustituto de jerarquía.
- **Don't** usar esquinas muy afiladas (0px) en elementos interactivos. Mínimo 8px de radio.
- **Do** usar el verde póker (#1b4d3e) exclusivamente para áreas de juego y mesas; en la app del jugador el paño se reserva para el saldo y los estados activos.
- **Don't** usar cristal (`backdrop-blur`), texto degradado ni botones con brillo en la app del jugador.
- **Don't** mezclar colores de acento funcionales del admin (indigo, purple, etc.) en la interfaz de jugadores.
- **Do** respetar las safe areas del dispositivo en elementos fijos (header, bottom nav).
