---
version: alpha
name: Mesa Primera — Admin
description: Identidad visual del panel de administración. Interfaz oscura, corporativa y funcional orientada a operadores y gestión de plataforma.
colors:
  background: "#111827"
  surface: "#1f2937"
  surface-elevated: "#374151"
  surface-card: "#111827"
  surface-card-hover: "#0b0f19"
  primary: "#6265f1"
  primary-light: "#818cf8"
  primary-dark: "#4338ca"
  text-primary: "#ffffff"
  text-secondary: "#cbd5e1"
  text-tertiary: "#94a3b8"
  text-muted: "#64748b"
  text-on-primary: "#ffffff"
  border-subtle: "#f8f9fa"
  border-default: "#f1f3f5"
  border-hover: "#e9ecef"
  success: "#34d399"
  warning: "#fbbf24"
  danger: "#f87171"
  info: "#60a5fa"
  accent-indigo: "#6366f1"
  accent-emerald: "#34d399"
  accent-blue: "#60a5fa"
  accent-amber: "#fbbf24"
  accent-red: "#f87171"
  accent-purple: "#a78bfa"
  accent-teal: "#2dd4bf"
  accent-pink: "#f472b6"
  accent-rose: "#fb7185"
typography:
  headline-display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.3
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.3
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  label-lg:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: 0.1em
  label-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.1em
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 6px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  card: 32px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 24px
  section: 40px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-on-primary}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    typography: "{typography.label-md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-light}"
  button-primary-active:
    backgroundColor: "{colors.primary-dark}"
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    typography: "{typography.label-md}"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: 24px
    typography: "{typography.body-md}"
  card-hover:
    backgroundColor: "{colors.surface-card-hover}"
    textColor: "{colors.text-primary}"
  header:
    backgroundColor: "#111827cc"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: 14px 24px
    typography: "{typography.headline-sm}"
  stat-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: 20px
    typography: "{typography.label-sm}"
  nav-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: 24px
    typography: "{typography.headline-sm}"
  nav-card-hover:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    typography: "{typography.body-md}"
  input-focus:
    backgroundColor: "{colors.surface-elevated}"
  metadata:
    textColor: "{colors.text-tertiary}"
    typography: "{typography.label-sm}"
  divider-subtle:
    backgroundColor: "{colors.border-subtle}"
    height: 1px
  divider-default:
    backgroundColor: "{colors.border-default}"
    height: 1px
  divider-hover:
    backgroundColor: "{colors.border-hover}"
    height: 1px
  status-success:
    textColor: "{colors.success}"
    typography: "{typography.label-md}"
  status-warning:
    textColor: "{colors.warning}"
    typography: "{typography.label-md}"
  status-info:
    textColor: "{colors.info}"
    typography: "{typography.label-md}"
  status-danger:
    textColor: "{colors.danger}"
    typography: "{typography.label-md}"
  status-neutral:
    textColor: "{colors.text-muted}"
    typography: "{typography.label-md}"
  incident-log-marker:
    textColor: "{colors.accent-rose}"
    typography: "{typography.label-sm}"
---

## Overview

El panel de administración de **Mesa Primera** está diseñado para operadores que necesitan información crítica al instante. El diseño es:

- **Funcional y denso:** Máxima densidad de información sin sacrificar legibilidad. Labels pequeños (10-11px), números grandes y monoespaciados.
- **Oscuro y profesional:** Fondo gris-azulado oscuro (#111827) para reducir fatiga visual en sesiones prolongadas de monitoreo.
- **Semántico por color:** Cada funcionalidad tiene un color de acento distintivo (indigo para finanzas, emerald para usuarios, rojo para alertas) que permite identificar secciones a golpe de vista.
- **Tipografía técnica:** Inter para UI limpia, fuente monoespaciada para datos numéricos y auditoría.

## Colors

La paleta sigue una estructura semántica funcional:

- **Background (#111827):** Gris azulado muy oscuro. Fondo principal del dashboard.
- **Surface (#1f2937):** Gris azulado para tarjetas, inputs y elementos elevados.
- **Surface Elevated (#374151):** Gris medio para estados hover y elementos secundarios.
- **Surface Card (rgba(17,24,39,0.4)):** Tarjetas con fondo semitransparente y backdrop-blur.
- **Surface Card Hover (rgba(17,24,39,0.6)):** Estado hover de tarjetas.
- **Primary (#6366f1):** Indigo. Color principal de interacción: enlaces, botones primarios, acentos de navegación.
- **Primary Light (#818cf8):** Indigo claro para hovers.
- **Primary Dark (#4338ca):** Indigo oscuro para estados activos.
- **Text Primary (#ffffff):** Blanco puro para títulos y datos críticos.
- **Text Secondary (#cbd5e1):** Gris claro para subtítulos y descripciones.
- **Text Tertiary (#94a3b8):** Gris medio para metadata y labels.
- **Text Muted (#64748b):** Gris apagado para texto deshabilitado o menos relevante.
- **Border Subtle (rgba(255,255,255,0.05)):** Bordes casi invisibles para separar secciones sin romper la continuidad visual.
- **Border Default (rgba(255,255,255,0.1)):** Bordes estándar para tarjetas y contenedores.
- **Border Hover (rgba(255,255,255,0.2)):** Bordes más visibles en estado hover.

### Acentos Funcionales

Cada área del admin tiene un color semántico asignado:

- **Indigo (#6366f1):** Finanzas, saldos, bóveda, ledger.
- **Emerald (#34d399):** Usuarios, estados operativos, éxito.
- **Blue (#60a5fa):** Mesas en curso, juego activo.
- **Amber (#fbbf24):** Retiros, advertencias, estados de alerta.
- **Red (#f87171):** Alertas de fraude, disputas, errores críticos.
- **Purple (#a78bfa):** Soporte, repeticiones, tickets.
- **Teal (#2dd4bf):** Consultas, investigación, búsquedas.
- **Pink (#f472b6):** Disputas, mediación.
- **Rose (#fb7185):** Logs del servidor, incidentes.

## Typography

La tipografía es puramente funcional y técnica:

- **Inter:** Fuente sans-serif neutra y altamente legible en tamaños pequeños. Usada en toda la interfaz.
- **JetBrains Mono / ui-monospace:** Usada exclusivamente para datos numéricos, balances, timestamps y auditoría.

Los tamaños tipográficos son deliberadamente pequeños para maximizar la densidad de información:

- **Labels:** 10-11px, uppercase, tracking 0.1em, font-weight 700. Identifican secciones y métricas.
- **Datos numéricos:** 10px monoespaciado para alineación perfecta en tablas de balances.
- **Headlines:** 28-36px, font-weight 900, tracking tight. Solo para títulos de página.
- **Body:** 12-14px para descripciones y tooltips.

## Layout

El layout es denso y eficiente:

- **Header fijo:** Altura compacta (~56px), fondo semitransparente con blur.
- **Grid de stats:** 2 columnas en móvil, 4 en desktop. Tarjetas de estadísticas con ancho mínimo cero para truncamiento controlado.
- **Grid de navegación:** 1 columna en móvil, 2 en tablet, 3-5 en desktop.
- **Spacing:** Basado en 8px. Padding de tarjetas: 20-24px. Gap entre tarjetas: 24px.

## Elevation & Depth

La profundidad es mínima y funcional:

- **Backdrop blur:** blur-sm (8px) en el header; blur-lg (16px) en tarjetas de navegación.
- **Sombras:** shadow-lg y shadow-2xl sutiles para tarjetas interactivas.
- **Gradientes:** Degradados muy sutiles de color/10 a transparente para crear jerarquía sin peso visual (ej: `from-indigo-500/10 to-transparent`).
- **Sin sombras planas:** No se usan sombras duras. La separación se logra mediante bordes y transparencia.

## Shapes

Las formas son modernas y amplias:

- **Tarjetas:** Radio extremo de 32px (rounded-card). Proporciona un aspecto moderno y distintivo.
- **Iconos contenedores:** 48x48px con radio 16px (rounded-2xl), fondo color/20, borde color/30.
- **Botones:** Radio 12px (rounded-md).
- **Inputs:** Radio 12px (rounded-md).

## Components

### Buttons

- **Primary:** Fondo indigo (#6366f1), texto blanco, radio 12px, padding 10px 20px. Hover: indigo claro.
- **Secondary:** Fondo transparente, borde blanco/10, texto gris claro. Hover: fondo elevado.

### Cards

- **Stat Card:** Fondo semitransparente (#111827/40), borde blanco/5, radio 32px, padding 20px. Contiene: icono con fondo de color, label uppercase 10px, valor numérico grande en blanco.
- **Nav Card:** Degradado desde color de acento/10 hacia transparente, borde color/20, radio 32px. Hover: borde color/40, scale 1.02.

### Header

- Fijo top-0, z-50.
- Fondo #111827/80 con backdrop-blur-sm.
- Borde inferior blanco/10.
- Contiene: logo "Admin" en blanco (hover indigo-300), acciones del header a la derecha.

### Status Cards

- Componentes específicos para estados operativos (Bóveda, Ledger Mayor).
- Icono + label + título + detalle + tooltip informativo.
- Colores semánticos: emerald para OPERATIVO, amber para ALERTA, red para CRÍTICO, slate para DESCONOCIDO.

### Inputs

- Fondo #1f2937, borde blanco/10, radio 12px.
- Texto blanco, placeholder en gris muted.
- Focus: borde indigo.

## Do's and Don'ts

- **Do** usar el color de acento semántico correcto para cada sección (indigo para finanzas, emerald para usuarios, etc.).
- **Don't** usar los colores dorados/verdes del tema de jugadores en el admin. Son mundos visuales separados.
- **Do** mantener los números de balance en fuente monoespaciada para alineación perfecta.
- **Don't** usar tipografía grande (18px+) para labels o metadata. Reservar tamaños grandes solo para valores críticos.
- **Do** usar bordes blanco/5 para separación sutil y blanco/10 para contenedores.
- **Don't** usar fondos opacos pesados. Preferir transparencia + backdrop-blur.
- **Do** respetar la secuencia de colores semánticos para estados: emerald (éxito), amber (alerta), red (crítico), slate (neutral).
