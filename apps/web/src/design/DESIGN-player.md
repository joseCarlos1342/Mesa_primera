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
  primary: "#e2b044"
  primary-dark: "#8b6b2e"
  primary-light: "#f0d78c"
  primary-muted: "#c5a059"
  text-primary: "#f3edd7"
  text-secondary: "#a0a0b0"
  text-on-primary: "#0a0a0a"
  border-brass: "#8b6b2e"
  border-gold: "#c5a059"
  danger: "#e74c3c"
  overlay-black: "#000000"
typography:
  display:
    fontFamily: Cinzel
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0.05em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.3
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  label-lg:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.1em
  label-md:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Outfit
    fontSize: 10px
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
  button-gold-shimmer:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.text-on-primary}"
    rounded: "{rounded.button}"
    padding: 14px 32px
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
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: 24px
    typography: "{typography.body-md}"
  card-premium:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: 24px
    typography: "{typography.body-md}"
  header:
    backgroundColor: "{colors.overlay-black}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: 12px 24px
    typography: "{typography.label-md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    padding: 10px 16px
    typography: "{typography.body-md}"
  input-focus:
    backgroundColor: "{colors.surface-card}"
  avatar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    size: 40px
    typography: "{typography.label-sm}"
  bottom-nav:
    backgroundColor: "#000000cc"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: 12px 16px
    typography: "{typography.label-sm}"
---

## Overview

La interfaz de jugadores de **Mesa Primera** evoca la experiencia de un casino tradicional argentino combinada con tecnología moderna. El diseño prioriza:

- **Accesibilidad**: La base tipográfica es de 18px para facilitar la lectura a personas mayores, nuestro público principal.
- **Lujo sutil**: Tonos oscuros profundos, acentos dorados/bronce y texturas de fieltro verde que rememoran las mesas de póker clásicas.
- **Inmersión**: Fondos con gradientes radiales y ruido texturizado que crean profundidad sin distracciones.
- **Contraste**: Texto crema (#f3edd7) sobre fondos oscuros para máxima legibilidad.

## Colors

La paleta está inspirada en los materiales de un casino tradicional:

- **Background (#0a0a0a):** Negro profundo para crear inmersión y enmarcar el contenido.
- **Surface (#1a1a2e):** Azul oscuro casi negro para tarjetas y contenedores principales.
- **Surface Card (#16213e):** Azul medianoche para tarjetas secundarias y paneles.
- **Surface Poker (#1b4d3e):** Verde bosque para elementos relacionados con el juego (mesas, fondos de juego).
- **Surface Felt (#0a2a1f):** Verde fieltro oscuro para texturas de mesa.
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

La estrategia tipográfica usa dos familias:

- **Cinzel (Display):** Fuente serif con inspiración romana para títulos heroicos, logos y encabezados premium. Evoca tradición y prestigio.
- **Outfit (Sans):** Fuente sans-serif geométrica y legible para todo el cuerpo del texto, labels y UI. Su construcción clara facilita la lectura a tamaños grandes.

Todos los tamaños de fuente están escalados sobre una base de 18px (html { font-size: 18px }) para accesibilidad de personas mayores.

## Layout

El layout usa un modelo fluido en móvil y un contenedor máximo de 7xl (80rem / 1280px) en desktop.

- **Spacing scale:** Basado en 8px con medio paso de 4px para micro-ajustes.
- **Grid:** CSS Grid y Flexbox según el contexto. Las tarjetas usan grid de 2-4 columnas.
- **Safe areas:** Se respetan las áreas seguras del dispositivo (env(safe-area-inset-*)) para evitar notch y barras del sistema.
- **Padding global:** 12px en móvil, 32px en desktop.

## Elevation & Depth

La profundidad se logra mediante **capas tonales y sombras** en lugar de sombras planas:

- **Fondo base:** Negro profundo con gradiente radial verde póker.
- **Capa de ruido:** Textura SVG de ruido fractal al 3% de opacidad para simular fieltro.
- **Capa de viñeta:** Degradado radial negro al 40% en los bordes para enmarcar el contenido.
- **Sombras:** `0 10px 30px rgba(0,0,0,0.6)` para tarjetas premium; `0 10px 30px rgba(0,0,0,0.5)` para header.
- **Backdrop blur:** `blur(2xl)` (24px) en el header para efecto cristal sobre el fondo dinámico.

## Shapes

El lenguaje de formas combina lo clásico con lo moderno:

- **Botones y inputs:** Radio mínimo de 8px (rounded-button) para suavidad moderna.
- **Avatares y badges:** Completamente redondos (pill/full).
- **Tarjetas:** Radio grande de 24px (rounded-card) para un aspecto premium y acogedor.
- **Header:** Sin radio, borde inferior sutil.

## Components

### Buttons

- **Primary:** Fondo dorado (#e2b044), texto negro, padding 12px 24px, radio 8px. Hover: dorado claro (#f0d78c). Active: bronce oscuro (#8b6b2e).
- **Gold Shimmer:** Degradado lineal 135deg de dorado claro a bronce oscuro. Usado para CTAs principales como "Jugar" o "Depositar".
- **Secondary:** Fondo transparente, borde dorado, texto dorado. Hover: fondo blanco al 5%.
- **Danger:** Fondo rojo coral, texto blanco. Usado para "Salir", "Retirarse".

### Cards

- **Standard:** Fondo azul medianoche (#16213e), radio 24px, padding 24px.
- **Premium:** Fondo azul oscuro (#1a1a2e), borde dorado/bronce sutil (1-2px), sombra profunda. Usado para perfiles, estadísticas, información VIP.

### Header

- Sticky top-0, z-50.
- Fondo negro al 60% con backdrop-blur de 24px.
- Borde inferior dorado/bronce al 20% de opacidad.
- Altura adaptativa con safe-area-inset-top.
- Contiene: avatar del jugador (redondo, borde dorado), username, botones de notificación y soporte.

### Bottom Navigation

- Fijo en la parte inferior.
- Fondo negro al 80%, borde superior dorado sutil.
- Iconos + labels, estado activo con color dorado.
- Padding inferior con safe-area-inset-bottom.

### Inputs

- Fondo blanco al 5%, borde blanco al 10%, radio completo (pill).
- Texto crema (#f3edd7), placeholder en gris secundario.
- Focus: borde dorado muted (#c5a059).

## Do's and Don'ts

- **Do** usar dorado (#e2b044) solo para acciones primarias y acentos. Un máximo de 2-3 elementos dorados por pantalla.
- **Don't** usar blanco puro (#ffffff) para texto. Siempre usar crema (#f3edd7) o gris secundario (#a0a0b0).
- **Do** mantener el font-size base de 18px en html. Nunca reducir la base tipográfica global.
- **Don't** usar esquinas muy afiladas (0px) en elementos interactivos. Mínimo 8px de radio.
- **Do** usar el verde póker (#1b4d3e) exclusivamente para áreas de juego y mesas.
- **Don't** mezclar colores de acento funcionales del admin (indigo, purple, etc.) en la interfaz de jugadores.
- **Do** respetar las safe areas del dispositivo en elementos fijos (header, bottom nav).
